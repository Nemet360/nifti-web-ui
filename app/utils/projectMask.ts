import * as THREE from "three";



export const projectMask = (coloration:THREE.BufferGeometry, indices) => (mesh:THREE.Mesh) => {

    const insider = new THREE.Geometry().fromBufferGeometry( coloration );

    const ray = new THREE.Raycaster();

    const center = new THREE.Vector3(0,0,0);
        
    const direction = new THREE.Vector3(0,0,0);

    insider.faces.forEach((face,index) => {

        if(
            face.vertexColors[0].r===1 && face.vertexColors[0].g===1 && face.vertexColors[0].b===1 &&
            face.vertexColors[1].r===1 && face.vertexColors[1].g===1 && face.vertexColors[1].b===1 &&
            face.vertexColors[2].r===1 && face.vertexColors[2].g===1 && face.vertexColors[2].b===1
        ){
            return;
        }
        
        const v1 = insider.vertices[face.a];  
        const v2 = insider.vertices[face.b]; 
        const v3 = insider.vertices[face.c]; 

        center.x = (v1.x+v2.x+v3.x)/3;
        center.y = (v1.y+v2.y+v3.y)/3;
        center.z = (v1.z+v2.z+v3.z)/3;

        direction.x = center.x + face.normal.x;
        direction.y = center.y + face.normal.y;
        direction.z = center.z + face.normal.z;

        direction.normalize();

        ray.set(center, direction);
        
        const res = ray.intersectObject(mesh, false);

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

/*
    const color1 = new THREE.Color( 
        mesh.geometry['attributes'].color.array[first.face.a*3], 
        mesh.geometry['attributes'].color.array[first.face.a*3+1], 
        mesh.geometry['attributes'].color.array[first.face.a*3+2] 
    );

    const color2 = new THREE.Color( 
        mesh.geometry['attributes'].color.array[first.face.b*3], 
        mesh.geometry['attributes'].color.array[first.face.b*3+1], 
        mesh.geometry['attributes'].color.array[first.face.b*3+2] 
    );

    const color3 = new THREE.Color( 
        mesh.geometry['attributes'].color.array[first.face.c*3], 
        mesh.geometry['attributes'].color.array[first.face.c*3+1], 
        mesh.geometry['attributes'].color.array[first.face.c*3+2] 
    );

    const out1 = color1.lerp( new THREE.Color(face.vertexColors[0].r,face.vertexColors[0].g,face.vertexColors[0].b), 0.7 );
    const out2 = color2.lerp( new THREE.Color(face.vertexColors[1].r,face.vertexColors[1].g,face.vertexColors[1].b), 0.7 );
    const out3 = color3.lerp( new THREE.Color(face.vertexColors[2].r,face.vertexColors[2].g,face.vertexColors[2].b), 0.7 );

    mesh.geometry['attributes'].color.array[first.face.a*3] = out1.r;
    mesh.geometry['attributes'].color.array[first.face.a*3+1] = out1.g;
    mesh.geometry['attributes'].color.array[first.face.a*3+2] = out1.b;

    mesh.geometry['attributes'].color.array[first.face.b*3] = out2.r;
    mesh.geometry['attributes'].color.array[first.face.b*3+1] = out2.g;
    mesh.geometry['attributes'].color.array[first.face.b*3+2] = out2.b;

    mesh.geometry['attributes'].color.array[first.face.c*3] = out3.r;
    mesh.geometry['attributes'].color.array[first.face.c*3+1] = out3.g;
    mesh.geometry['attributes'].color.array[first.face.c*3+2] = out3.b;
*/