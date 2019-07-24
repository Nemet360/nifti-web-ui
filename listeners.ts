import { ipcMain } from 'electron';
import { identity } from 'ramda';
const fs = require("fs-extra");



const listeners = [
    {
        name:"save:mesh",
        callback:(event, data:string, filename:string) => {

            fs.writeFile(filename, data, identity);

        }  
    }
];



export let initListeners = () : void => listeners.forEach(({name,callback}) => ipcMain.on(name, callback));  



export let suspendListeners = () : void => listeners.forEach(({name,callback}) => ipcMain.removeAllListeners(name));