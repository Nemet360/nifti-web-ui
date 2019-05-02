import * as THREE from "three";
import { MeshPhysicalMaterial, DoubleSide } from 'three';



export const meshFromGeometry = localPlane => geometry => {
    
    const material = new MeshPhysicalMaterial({
        clippingPlanes: [ localPlane ],
        vertexColors: THREE.VertexColors,
        metalness: 0.1,
        roughness: 0.7,
        clearCoat: 0.2,
        clearCoatRoughness: 0.2,
        reflectivity: 0.2,
        side: DoubleSide,
        transparent: true, 
        opacity: 0.7,
        clipShadows: true,
        depthTest: true
    });

    const mesh = new THREE.Mesh(geometry, material);

    mesh.castShadow = true;

    mesh.receiveShadow = true;

    mesh.frustumCulled = false;

    mesh.userData.brain = true;

    return mesh;

}