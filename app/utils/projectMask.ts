import * as THREE from "three";



export const projectMask = (coloration:THREE.BufferGeometry, indices) => (mesh:THREE.Mesh) => {

    const insider = new THREE.Geometry().fromBufferGeometry( coloration );

    const ray = new THREE.Raycaster();

    ray['firstHitOnly'] = true;

    const center = new THREE.Vector3(0,0,0);
        
    const direction = new THREE.Vector3(0,0,0);

    let v1;  
    let v2; 
    let v3; 
    let res;

    insider.faces.forEach((face,index) => {

        if(
            face.vertexColors[0].r===1 && face.vertexColors[0].g===1 && face.vertexColors[0].b===1 &&
            face.vertexColors[1].r===1 && face.vertexColors[1].g===1 && face.vertexColors[1].b===1 &&
            face.vertexColors[2].r===1 && face.vertexColors[2].g===1 && face.vertexColors[2].b===1
        ){
            return;
        }
        
        v1 = insider.vertices[face.a];  
        v2 = insider.vertices[face.b]; 
        v3 = insider.vertices[face.c]; 

        center.x = (v1.x+v2.x+v3.x)/3;
        center.y = (v1.y+v2.y+v3.y)/3;
        center.z = (v1.z+v2.z+v3.z)/3;

        direction.x = center.x + face.normal.x;
        direction.y = center.y + face.normal.y;
        direction.z = center.z + face.normal.z;

        direction.normalize();

        ray.set(center, direction);
        
        res = ray.intersectObject(mesh, false);

        res.forEach(first => {

            mesh.geometry['attributes'].indices.array[first.face.a*3] = indices[face.a*3];
            mesh.geometry['attributes'].indices.array[first.face.a*3+1] = indices[face.a*3+1];
            mesh.geometry['attributes'].indices.array[first.face.a*3+2] = indices[face.a*3+2];
    
            mesh.geometry['attributes'].indices.array[first.face.b*3] = indices[face.b*3];
            mesh.geometry['attributes'].indices.array[first.face.b*3+1] = indices[face.b*3+1];
            mesh.geometry['attributes'].indices.array[first.face.b*3+2] = indices[face.b*3+2];
    
            mesh.geometry['attributes'].indices.array[first.face.c*3] = indices[face.c*3];
            mesh.geometry['attributes'].indices.array[first.face.c*3+1] = indices[face.c*3+1];
            mesh.geometry['attributes'].indices.array[first.face.c*3+2] = indices[face.c*3+2];
            
            mesh.geometry['attributes'].color.array[first.face.a*3] = face.vertexColors[0].r;
            mesh.geometry['attributes'].color.array[first.face.a*3+1] = face.vertexColors[0].g;
            mesh.geometry['attributes'].color.array[first.face.a*3+2] = face.vertexColors[0].b;
    
            mesh.geometry['attributes'].color.array[first.face.b*3] = face.vertexColors[1].r;
            mesh.geometry['attributes'].color.array[first.face.b*3+1] = face.vertexColors[1].g;
            mesh.geometry['attributes'].color.array[first.face.b*3+2] = face.vertexColors[1].b;
    
            mesh.geometry['attributes'].color.array[first.face.c*3] = face.vertexColors[2].r;
            mesh.geometry['attributes'].color.array[first.face.c*3+1] = face.vertexColors[2].g;
            mesh.geometry['attributes'].color.array[first.face.c*3+2] = face.vertexColors[2].b;
            
        })

    });
    
    mesh.geometry['attributes'].color.needsUpdate = true;  

    return mesh;

}