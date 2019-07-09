import { transform } from "./utils/transform";
import * as THREE from "three";

self['THREE'] = THREE;

require('three/examples/js/math/Lut');

const sendMessage = postMessage as any;



onmessage = (e) => {

    const { file, atlas } = e.data; 
    
    transform({ file, atlas })
    
    .then(

        result => {
            
            sendMessage(result);

        }

    );

}