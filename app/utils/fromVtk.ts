import { ipcRenderer } from "electron";



export const fromVtk = (model, perfusion) => {

    const modelPath = model.path;
    
    const perfusionPath = perfusion.path;

    const options = { 
        smooth:500, 
        threshold:1, 
        shouldThreshold:true, 
        reductionFactor:0.5 
    };

    ipcRenderer.send("read:nifti:compiled", modelPath, perfusionPath, options);

    return new Promise( resolve => {

        ipcRenderer.once("read:nifti:compiled", (event,data) => resolve(data));

    } )

}
