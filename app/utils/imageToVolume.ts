import { marchingCubes } from '../marchingCubes';
import { niftiData } from '../types';

 

export const imageToVolume = (data:niftiData, perfusion:niftiData) => {

    const requestData = marchingCubes(); 

    return requestData({
        dims:{ 
            x:data.niftiHeader.dims[1],
            y:data.niftiHeader.dims[2], 
            z:data.niftiHeader.dims[3] 
        }, 
        scalars:data.niftiImage,
        perfusionImage:perfusion.niftiImage
    });

}