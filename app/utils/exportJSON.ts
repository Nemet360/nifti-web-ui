import { Scene } from "three";
import { getBrains } from "./getBrains";
import { remote } from 'electron';
const fs = remote.require('fs');



export const exportJSON = (scene:Scene, p:string) : void => {

    const object = getBrains(scene) as any;

    let json = object.geometry.toJSON();

    json = JSON.stringify(json);

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

}