import { imageToTypedData } from "./imageToTypedData";
import { dims } from "../types";
import { resizeNIFTIImage } from "./resizeNIFTIImage";



export const reshapePerfusion = (perfusion, model_dim:dims) => {

    const perfusion_dim = {
        x:perfusion.niftiHeader.dims[1],
        y:perfusion.niftiHeader.dims[2],
        z:perfusion.niftiHeader.dims[3]
    };

    if(
        model_dim.x === perfusion_dim.x &&
        model_dim.y === perfusion_dim.y &&
        model_dim.z === perfusion_dim.z
    ){

        return perfusion;

    }else{

        const { niftiImage, niftiHeader } = perfusion;
        const target_dim = { ...model_dim };
        const typedData = imageToTypedData(niftiImage, niftiHeader);
        
        perfusion.niftiImage = resizeNIFTIImage(perfusion_dim, target_dim, typedData);

        perfusion.niftiHeader.dims[1] = target_dim.x;
        perfusion.niftiHeader.dims[2] = target_dim.y;
        perfusion.niftiHeader.dims[3] = target_dim.z;
        
        return perfusion;

    }

}