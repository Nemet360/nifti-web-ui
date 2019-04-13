const SubdivisionModifier = THREE['SubdivisionModifier'];
import * as THREE from "three";
import { Vector3, WebGLRenderer, PerspectiveCamera, Scene, Light, Mesh, MeshPhysicalMaterial, DoubleSide, BufferGeometry } from 'three';



export const subdivide = geometry => {
      
    const geometry2 = new THREE.Geometry().fromBufferGeometry(geometry);

    const modifier = new SubdivisionModifier(3); 

    modifier.modify( geometry2 );

    geometry.computeFaceNormals();
    geometry.mergeVertices();
    geometry.computeVertexNormals();

    return new THREE.BufferGeometry().fromGeometry(geometry2);

}