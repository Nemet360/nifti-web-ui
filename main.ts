import { app, BrowserWindow, Menu } from 'electron';
import { initListeners } from './listeners';
const fs = require("fs-extra");
const path = require('path');
const locked = app.requestSingleInstanceLock();

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';


app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');



Menu.setApplicationMenu(null);



const onError = error => {
   
  let e = "";

  try{

    e = JSON.stringify( error, Object.getOwnPropertyNames(error) );

  }catch(e){}

  const p = path.join(process.env.HOME, "nifti_error.txt");

  fs.writeFileSync(p, e);

}



const loadTemplate = (window, url) => {

    return new Promise((resolve,reject) => { 

      window.loadURL(url);

      window.webContents.once('did-finish-load', resolve);  

      window.webContents.once('did-fail-load', (event, errorCode, errorDescription) => reject(errorDescription));     

    })

}  



export let win = null;



app.on(
    'second-instance', 
    (event, argv, cwd) => {

        if(win){
           win.show();
           win.restore();  
           win.focus();
        } 

    }
);



const onWindowLoaded = () => {

  win.webContents.send("loaded");

  win.webContents.openDevTools();

}



const createWindow = () => {

  const options = {
    width : 1800, 
    height : 900,
    frame : true,
    show : true, 
    backgroundColor : '#eeeeee', 
    title : "NIFTI Viewer",
    icon : path.resolve(__dirname,'icon.ico'), 
    resizable : true
  };

  win = new BrowserWindow(options);

  win.on('closed', () => { win = null; });

  win.setMenu(null);

  const templatePath = `file://${__dirname}/app.html`;

  return loadTemplate(win, templatePath).then(() => onWindowLoaded());

}



const onReady = () => {

  initListeners();
  
  createWindow();

}



app.on(
  'ready', 
  () => {

    if( ! locked ){ 

      app.quit();

    }else{

      onReady();

    }

  }
);    



app.on('window-all-closed', () => app.exit());



(process as any).on('unhandledRejection', error => onError( error ));



(process as any).on('uncaughtException', error => onError( error ));