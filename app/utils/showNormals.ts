import * as THREE from "three";
import { Geometry } from "three";



export const showNormals = (coloration1:Geometry) => {

    let lines = new THREE.Mesh();

    coloration1.faces.forEach((face,i) => {

        if(i%10!==0){ return }

        const v1 = coloration1.vertices[face.a];  
        const v2 = coloration1.vertices[face.b]; 
        const v3 = coloration1.vertices[face.c]; 

        const center = {
            x:(v1.x+v2.x+v3.x)/3,
            y:(v1.y+v2.y+v3.y)/3, 
            z:(v1.z+v2.z+v3.z)/3 
        };

        const to = {
            x:center.x + face.normal.x,
            y:center.y + face.normal.y,
            z:center.z //+ face.normal.z
        }

        let material = new THREE.LineBasicMaterial( { color: 0x0000ff } );

        let geometry = new THREE.Geometry();

        geometry.vertices.push(new THREE.Vector3(center.x, center.y, center.z));

        geometry.vertices.push(new THREE.Vector3(to.x, to.y, to.z));

        let line = new THREE.Line( geometry, material );

        lines.add(line);

    });

    return lines;

}