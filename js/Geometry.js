import * as THREE from "./three";

/**
 * Returns a random direction
 * Used to animate the exploding particles in different directions.
 */
export function getRandomAxis() {
    return new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
    ).normalize();
}

/**
 * Returns x,y,z coordinates of centroid of given geometry 
 * @param {THREE.geometry} geometry 
 */
export function getCentroid(geometry) {

    let positionArray = geometry.attributes.position.array;
    let len = positionArray.length;
    let x = 0, y = 0, z = 0;

    for (let i = 0; i < len; i = i + 3) {
        x += positionArray[i];
        y += positionArray[i + 1];
        z += positionArray[i + 2];
    }

    return { x: (3 * x) / len, y: (3 * y) / len, z: (3 * z) / len };
}