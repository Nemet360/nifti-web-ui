import { app, BrowserWindow, Menu } from 'electron';
import { initListeners } from './listeners';
const fs = require("fs"); //("fs-extra");
const path = require('path');
const url = require('url');

app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

const locked = app.requestSingleInstanceLock();

Menu.setApplicationMenu(null);



export const onError = error => {
   
  let e = "";

  try{

    e = JSON.stringify( error, Object.getOwnPropertyNames(error) );

  }catch(e){}

  const p = path.join(process.env.HOME, "error.txt");

  fs.writeFileSync(p, e);

}



const loadTemplate = (window, url) => {

    return new Promise((resolve,reject) => { 

      window.loadURL(url);

      window.webContents.once('did-finish-load', resolve);  

      window.webContents.once('did-fail-load', (event, errorCode, errorDescription) => reject(errorDescription));     

    })

};   



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



const getConfig = () => {

  return new Promise(resolve => resolve({}))

};



const onWindowLoaded = config => {

  const data = {};

  win.webContents.send("loaded", data);

  win.webContents.openDevTools();

};



const createWindow = config => {

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

  win.webContents.on(
    "crashed", 
    (event,killed) => { 

      if(killed){ return; }

      //app.quit();

    }
  );

  win.setMenu(null);

  const templatePath = `file://${__dirname}/app.html`;

  return loadTemplate(win, templatePath).then(() => onWindowLoaded(config));

};



const onReady = config => {

  initListeners();
  
  createWindow(config);

};



app.on(
  'ready', 
  () => {

    if( ! locked ){ 

      app.quit();

    }else{

      getConfig().then(conf => onReady(conf));

    }

  }
);    



app.on('window-all-closed', () => app.exit());



(process as any).on('unhandledRejection', error => onError( error ));



(process as any).on('uncaughtException', error => onError( error ));