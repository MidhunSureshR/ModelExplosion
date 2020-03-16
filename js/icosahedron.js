/*
   Exploding Models using THREE.js and GLSL shader
   R Midhun Suresh | https://github.com/MidhunSureshR
   Based on code written by Yuriy Artyukh | https://github.com/akella/
   Original Code can be found on https://github.com/akella/ExplodingObjects
 
  LICENSE
  ---------
  This resource can be used freely if integrated or build upon in personal or commercial projects such as websites, 
  web apps and web templates intended for sale. It is not allowed to take the resource "as-is" and sell it, redistribute, 
  re-publish it, or sell "pluginized" versions of it. Free plugins built using this resource should have a visible mention 
  and link to the original work. 
  
  Always consider the licenses of all included libraries, scripts and images used.

 */

import * as THREE from "./three";
import "./lib/gltfloader";
import "./lib/draco";
import "./lib/BufferUtils";
import GLSLAttributeManager from  "./GLSLmanager";

/**
 * Load fragment and vertex GLSL code
 * Vertex Shader is used for animating the explosion using GPU
 * Fragment Shader is used for colouring the inner surface of the exploded objects
**/
let fragment = document.getElementById("fragmentShader").textContent;
let vertex = document.getElementById("vertexShader").textContent;

export default class Sketch {


  /**
   * Constructor to class Sketch
   * @param {DOM element} selector - The container element where effect is loaded
   * @param {*} options - Options in JSON format
   * @param {*} inverted 
   */
  constructor(selector, options, inverted) {
    this.scene = new THREE.Scene();

    this.inverted = inverted || false;
    this.container = document.getElementById(selector);

    this.onLoad = options.onLoad;
    this.onClick = options.onClick;

    this.surfaceColor = options.surface;
    this.insideColor = options.inside;
    this.backgroundColor = options.background;
    this.surfaceColor = new THREE.Color(parseInt("0x" + this.surfaceColor));
    this.insideColor = new THREE.Color(parseInt("0x" + this.insideColor));

    this.raycaster = new THREE.Raycaster();
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: this.backgroundColor === "transparent"
    });
    if (this.backgroundColor === "transparent") {
      this.renderer.setClearColor(0x000000, 0);
    } else {
      this.backgroundColor = parseInt("0x" + this.backgroundColor, 16);
      this.renderer.setClearColor(this.backgroundColor, 1);
    }

    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetmouseX = 0;
    this.targetmouseY = 0;
    this.renderer.setSize(this.width, this.height);
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.001,
      1000
    );

    this.camera.position.set(0, 0, 7);
    this.time = 0;
    this.loader = new THREE.GLTFLoader().setPath("models/");
    THREE.DRACOLoader.setDecoderPath("js/lib/draco/");
    this.loader.setDRACOLoader(new THREE.DRACOLoader());

    this.setupResize();
    this.setupcubeTexture();
    this.resize();
    this.addObjects();
    this.animate();
    this.loadModel();
    this.settings();
  }



  settings() {
    this.settings = {
      progress: 0
    };
  }

  loadModel() {
    this.voronoiCollection = [];
    this.loader.load("model.glb", this.onModelSuccessfulLoad.bind(this), undefined, (error) => {console.error(error);});
  }

  onModelSuccessfulLoad(gltf){

    let that = this;
    gltf.scene.traverse(this.recursivelyAddChildObjects.bind(this));

    that.geometryVolume = []; //Geometry relating to the volume
    that.geometrySurface = []; //Geometry relating to the surface, we want this so that we can color it using the fragment Shader

    that.voronoiCollection = that.voronoiCollection.filter(this.splitSurfaceVolume.bind(this));

    that.scene.add(this.generateMeshFromArray(that.geometryVolume,that.material));
    that.scene.add(this.generateMeshFromArray(that.geometrySurface, that.material1));

    that.onLoad();
  }

  /**
   *  Creates a mesh from an array of objects and given material
   * @param {Array} objectArray - Array of objects 
   * @param {THREE.material} material - material to use 
   */
  generateMeshFromArray(objectArray,material){
    let combinedGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(objectArray,false);
    let mesh = new THREE.Mesh(combinedGeometry,material);
    return mesh;
  }

/**
 *  Splits objects in voronoiObject array into two arrays volume and surface
 * @param {Object3D} voronoiObject - object in veronoiCollection 
 */
  splitSurfaceVolume(voronoiObject){

  let that = this;
  let j = 0;

  if (voronoiObject.isMesh) {
    return false;
  }
  else {
    j++;
    let vtempo = that.processSurface(voronoiObject, j);

    if (that.inverted) {
      that.geometrySurface.push(vtempo.surface);
      that.geometryVolume.push(vtempo.volume);
    } else {
      that.geometryVolume.push(vtempo.surface);
      that.geometrySurface.push(vtempo.volume);
    }

    return true;
  }
  }

  /**
   * This function find the child-objects in each group under "Voronoi_Fracture" in the .glb file 
   * and adds them to voronoiCollection array
   * This is to be used with the traverse function to add all the animating objects into an array.
   * @param {Object3D} child - the object whose children we will add to voronoiCollection array 
   */
  recursivelyAddChildObjects(child){
    let that = this;
    if (child.name === "Voronoi_Fracture") {

      that.obj = child;
      if (child.children[0].children.length > 2) {
        child.children.forEach(f => {
          f.children.forEach(m => {
            that.voronoiCollection.push(m.clone());
          });
        });
      } else {
        child.children.forEach(m => {
          that.voronoiCollection.push(m.clone());
        });
      }

    }
  }

  processSurface(veronoiObject, j) {

    let volumePosition=veronoiObject.children[0].position;
    let surfacePosition=veronoiObject.children[1].position;
    
    //Lambda method that takes child i of object v and translates it to position.
    let setChildPosition = (v,i,position) => {
      let temp = v.children[i].geometry.clone();
      let translationMatrix = new THREE.Matrix4().makeTranslation(position.x, position.y, position.z);
      return temp.applyMatrix(translationMatrix); 
    };

    let volumeChild, surfaceChild;
    volumeChild = setChildPosition(veronoiObject,0,volumePosition);
    surfaceChild = setChildPosition(veronoiObject,1,surfacePosition);

    
    return new GLSLAttributeManager(veronoiObject,j,volumeChild,surfaceChild).get();
  }

  setupResize() {
    window.addEventListener("resize", this.resize.bind(this));
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  setupcubeTexture() {
    let path = "img/newsky/";
    let format = ".jpg";
    let urls1 = [
      path + "px" + format,
      path + "nx" + format,
      path + "py" + format,
      path + "ny" + format,
      path + "pz" + format,
      path + "nz" + format
    ];
    this.textureCube = new THREE.CubeTextureLoader().load(urls1);
  }

  addObjects() {
    let that = this;
    this.material = new THREE.ShaderMaterial({
      extensions: {
        derivatives: "#extension GL_OES_standard_derivatives : enable"
      },
      side: THREE.DoubleSide,
      uniforms: {
        time: { type: "f", value: 0 },
        progress: { type: "f", value: 0 },
        inside: { type: "f", value: 0 },
        surfaceColor: { type: "v3", value: this.surfaceColor },
        insideColor: { type: "v3", value: this.insideColor },
        // matcap: { type: 't', value: new THREE.TextureLoader().load('img/matcap.jpg') },
        tCube: { value: that.textureCube },
        pixels: {
          type: "v2",
          value: new THREE.Vector2(window.innerWidth, window.innerHeight)
        },
        uvRate1: {
          value: new THREE.Vector2(1, 1)
        }
      },
      vertexShader: vertex,
      fragmentShader: fragment
    });

    this.material1 = this.material.clone();
    this.material1.uniforms.inside.value = 1;
  }

  animate() {
    this.time += 0.05;
    this.material.uniforms.progress.value = Math.abs(this.settings.progress);
    this.material1.uniforms.progress.value = Math.abs(this.settings.progress);
    requestAnimationFrame(this.animate.bind(this));
    this.render();
  }
}
