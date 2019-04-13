import { Scene } from 'three';
import { remote } from 'electron';
import * as THREE from "three";
const fs = remote.require('fs');



export const exportStl = (scene:Scene, p:string) : void => {

    const wstream = fs.createWriteStream(p);

    const object = scene.children.find(mesh => mesh.userData.brain);

    const exporter = new THREE['STLExporter']();

    exporter.parse(object, wstream.write);

    wstream.end();

}