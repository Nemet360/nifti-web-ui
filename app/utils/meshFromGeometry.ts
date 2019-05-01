import * as THREE from "three";
import { MeshPhysicalMaterial, DoubleSide } from 'three';



export const meshFromGeometry = localPlane => geometry => {
    
    const material = new MeshPhysicalMaterial({
        clippingPlanes: [ localPlane ],
        vertexColors: THREE.VertexColors,
        metalness: 0.4,
        roughness: 0.8,
        clearCoat: 0.8,
        //depthWrite: false,
        clearCoatRoughness: 0.8,
        reflectivity: 0.8,
        side: DoubleSide,
        transparent: true, 
        opacity:0.6,
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