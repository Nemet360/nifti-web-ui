import { ipcRenderer, remote } from 'electron';
import * as THREE from "three";
import { Vector3, WebGLRenderer, PerspectiveCamera, Scene, Light, Mesh, MeshPhysicalMaterial, DoubleSide } from 'three';
import { getBrains } from './getBrains';
const fs = remote.require('fs');



export const exportObj = (scene:Scene, p:string) : void => {

    const wstream = fs.createWriteStream(p);

    const object = getBrains(scene);

    const exporter = new THREE['OBJExporter']();

    exporter.parse(object, wstream.write);

    wstream.end();

}