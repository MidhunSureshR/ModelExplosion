import * as THREE from "./three";
import * as Geometry from "./Geometry";

class Attribute {

    findCommonCentroid(child) {
        this.centroidVector = Geometry.getCentroid(child);
    }

    addOffsetAttribute(j, child, len) {
        let offset = new Array(len).fill(j / 100);
        child.addAttribute(
            "offset",
            new THREE.BufferAttribute(new Float32Array(offset), 1)
        );
    }

    addAxesAttribute(child, len) {
        let axis = Geometry.getRandomAxis();
        let axes = new Array(len * 3).fill(0);

        for (let i = 0; i < len * 3; i = i + 3) {
            axes[i] = axis.x;
            axes[i + 1] = axis.y;
            axes[i + 2] = axis.z;
        }
        child.addAttribute(
            "axis",
            new THREE.BufferAttribute(new Float32Array(axes), 3)
        );
    }

    addCentroidAttribute(child, len) {

        let centroid = new Array(len * 3).fill(0);

        for (let i = 0; i < len * 3; i = i + 3) {
            centroid[i] = this.centroidVector.x;
            centroid[i + 1] = this.centroidVector.y;
            centroid[i + 2] = this.centroidVector.z;
        }

        child.addAttribute(
            "centroid",
            new THREE.BufferAttribute(new Float32Array(centroid), 3)
        );

    }
}

export default class GLSLAttributeManager {

    constructor(parentObject, j, volumeChild, surfaceChild) {
        this.veronoiObject = parentObject;
        this.j = j;
        this.volumeChild = volumeChild;
        this.surfaceChild = surfaceChild;
        this.Attribute = new Attribute();
    }


    addAttributes() {
        let lenVolume = this.veronoiObject.children[0].geometry.attributes.position.array.length / 3;
        let lenSurface = this.veronoiObject.children[1].geometry.attributes.position.array.length / 3;

        //  offset
        this.Attribute.addOffsetAttribute(this.j, this.volumeChild, lenVolume);
        this.Attribute.addOffsetAttribute(this.j, this.surfaceChild, lenSurface);

        // axis
        this.Attribute.addAxesAttribute(this.volumeChild, lenVolume);
        this.Attribute.addAxesAttribute(this.surfaceChild, lenSurface);

        // centroid
        this.Attribute.findCommonCentroid(this.volumeChild);
        this.Attribute.addCentroidAttribute(this.volumeChild, lenVolume);
        this.Attribute.addCentroidAttribute(this.surfaceChild, lenSurface);
    }

    get() {
        this.addAttributes();
        return { surface: this.volumeChild, volume: this.surfaceChild };
    }
}