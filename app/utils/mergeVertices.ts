import * as THREE from "three";
import { Vector3, WebGLRenderer, PerspectiveCamera, Scene, Light, Mesh, MeshPhysicalMaterial, DoubleSide, BufferGeometry } from 'three';
const SubdivisionModifier = require('three-subdivision-modifier');



export const mergeVertices = (buffer:BufferGeometry) => {

    const geometry = new THREE.Geometry().fromBufferGeometry( buffer );

    geometry.computeFaceNormals();
    geometry.mergeVertices();
    geometry.computeVertexNormals();

    //const modifier = new SubdivisionModifier(2); 

    //modifier.modify( geometry );
    
    return geometry ;//new THREE.BufferGeometry().fromGeometry(geometry);
   
}