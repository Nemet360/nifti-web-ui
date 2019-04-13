import { ipcRenderer, remote } from 'electron';
import * as THREE from "three";
import { Scene } from 'three';
const fs = remote.require('fs');



export const exportObj = (scene:Scene, p:string) : void => {

    const wstream = fs.createWriteStream(p);

    const object = scene.children.find(mesh => mesh.userData.brain);

    const exporter = new THREE['OBJExporter']();

    exporter.parse(object, wstream.write);

    wstream.end();

}