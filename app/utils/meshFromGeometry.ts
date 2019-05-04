import * as THREE from "three";
import { MeshPhysicalMaterial, DoubleSide } from 'three';



export const meshFromGeometry = (localPlane, model) => geometry => {
    
    const material = new MeshPhysicalMaterial({
        clippingPlanes: [ localPlane ],
        vertexColors: model ? undefined : THREE.VertexColors,
        color: model ? "#ec8080" : undefined,
        metalness: 0.4,
        roughness: 0.8,
        clearCoat: 0.2,
        depthWrite: ! model,
        clearCoatRoughness: 0.2,
        reflectivity: 0.2,
        side: DoubleSide,
        transparent : model,
        opacity: model ? 0.5 : 1,
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