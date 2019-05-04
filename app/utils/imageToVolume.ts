import { marchingCubes } from '../marchingCubes';
import { niftiData } from '../types';

 

export const imageToVolume = (perfusion:niftiData) => {

    const requestData = marchingCubes(); 

    return requestData({
        dims:{ 
            x:perfusion.niftiHeader.dims[1],
            y:perfusion.niftiHeader.dims[2], 
            z:perfusion.niftiHeader.dims[3] 
        }, 
        scalars:perfusion.niftiImage
    });

}