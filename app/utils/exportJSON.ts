import { Scene, Mesh } from "three";
import * as THREE from "three";



export const exportJSON = (scene:Scene, p:string) : void => {

    const object = scene.children.find(mesh => mesh.userData.brain) as Mesh;

    let json = object.geometry.toJSON();

    json = JSON.stringify(json);

    /*
    const wstream = fs.createWriteStream(p);

    let buf = '';

    let gap = 64000;

    for(let i = 0; i<json.length; i++){

        buf += json[i];

        if(buf.length>gap){
            wstream.write(buf);
            buf='';
        }

    }
     
    if(buf.length>0){
        wstream.write(buf);
        buf='';
    } 
    
    json = undefined;

    wstream.end();
    */

}