import { ipcMain } from 'electron';
import { identity } from 'ramda';
import { win } from './main';
const path = require("path");
const fs = require("fs-extra");
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



const executeScript = (filename, options) => {

    const scriptPath = "./script.py";

    return new Promise((resolve, reject) => {  

        const p = path.resolve(filename);

        const py = child_process.spawn(`python`, [scriptPath, p, JSON.stringify(options)]);

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

    })
    
}



const listeners = [
    {
        name:"read:nifti",
        callback:(event,filename:string, options) => {
            
            executeScript(filename, options)
            .then((result:string) => {
                    
                win.webContents.send("read:nifti", result);

            }) 
            .catch(error => {

                win.webContents.send("read:nifti", error);
                
            })
           
        }  
    },
    {
        name:"save:mesh",
        callback:(event, data:string, filename:string) => {

            fs.writeFile(filename, data, identity);

        }  
    },
    {
        name:"read:nifti:compiled",
        callback:(event,filename:string,id:string, options) => {
            
            executeScriptCompiled(filename, options)
            .then((result:string) => {
                    
                win.webContents.send("read:nifti:compiled", result);

            }) 
            .catch(error => {

                win.webContents.send("read:nifti:compiled", error);
                
            })
           
        }  
    }
];



export let initListeners = () : void => listeners.forEach(({name,callback}) => ipcMain.on(name, callback));  



export let suspendListeners = () : void => listeners.forEach(({name,callback}) => ipcMain.removeAllListeners(name));