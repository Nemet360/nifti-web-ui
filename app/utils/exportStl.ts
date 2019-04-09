import { Scene } from 'three';
import { remote } from 'electron';
import { getBrains } from './getBrains';
const fs = remote.require('fs');



export const exportStl = (scene:Scene, p:string) : void => {

    const wstream = fs.createWriteStream(p);

    const object = getBrains(scene);

    const exporter = new THREE['STLExporter']();

    exporter.parse(object, wstream.write);

    wstream.end();

}