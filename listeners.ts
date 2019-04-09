import { ipcMain } from 'electron';
import { win, onError } from './main';
import { identity, isNil } from 'ramda';
const path = require("path");
const fs = require("fs");//("fs-extra");
const child_process = require('child_process');



const executeScriptCompiled = (filename, options) => {

    return new Promise(  

        (resolve, reject) => {  
 
            const p = path.resolve(filename);

            const script = path.resolve( __dirname.replace('app.asar', 'app.asar.unpacked'), "script.exe" );

            const py = child_process.spawn(script, [p, JSON.stringify(options)]);
           
            let result = "";

            py.stdout.on(
                'data',
                data => {
                    
                    result += data.toString('utf8');

                }
            ); 

            py.stdout.on(    
                'end',
                reason => { 

                    //py.kill('SIGINT');
                    resolve(result);

                }
            ); 

            py.stderr.on(
                'data', 
                buf => {  

                    reject(buf.toString('utf8')); 

                }
            );

            py.stdin.write(filename);  

            py.stdin.end(); 
            
        }
    )
    
}



const executeScript = (script, filename, options?) => {

    return new Promise(  
    
        (resolve, reject) => {  

            const p = path.resolve(filename);

            const scriptPath = path.resolve( __dirname.replace('app.asar', 'app.asar.unpacked'), script );

            const args = isNil(options) ? [scriptPath, p] : [scriptPath, p, JSON.stringify(options)];

            const py = child_process.spawn(`C:\\Python27\\python.exe`, args);

            let result = "";

            py.stdout.on(
                'data',
                data => {

                    result += data.toString('utf8');

                }
            ); 

            py.stdout.on(   
                'end',
                reason => {
                    resolve(result);
                }
            ); 

            py.stderr.on(
                'data', 
                buf => {  

                    reject(buf.toString('utf8')); 

                }
            );

            py.stdin.write(filename);  

            py.stdin.end(); 

        }
    )
    
}



const listeners = [
    {
        name:"read:nifti",
        callback:(event,filename:string,id:string, options) => {
            
            executeScript("script.py", filename, options) 
            .then(
                (result:string) => {
                    
                    win.webContents.send("read:nifti", result);

                }
            ) 
            .catch(
                error => {

                    onError(error);

                    win.show();

                    win.webContents.send("read:nifti", "");

                }
            )
           
        }  
    },
    {
        name:"read",
        callback:(event,filename:string,id:string, options) => {


            console.log("ready", filename)


            executeScript("hex.py", filename) 
            .then(
                (result) => {

                    let b = result;

                    //let a = [...b];

                    win.webContents.send("read", b);

                }
            ) 
            .catch(
                error => {

                    console.log(error);
                    //onError(error);

                    win.show();

                    win.webContents.send("read", error);

                }
            )
           
        }  
    },
    {
        name:"save:mesh",
        callback:(event, data:string, filename:string) => {

            fs.writeFile(filename, data, identity);

        }  
    }
];



export let initListeners = () : void => listeners.forEach(({name,callback}) => ipcMain.on(name, callback));  



export let suspendListeners = () : void => listeners.forEach(({name,callback}) => ipcMain.removeAllListeners(name));