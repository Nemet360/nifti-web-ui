import { imageToTypedData } from "./imageToTypedData";
import * as fs from 'fs';
const nifti = require("nifti-reader-js");



const readNIFTI = (data) => {

    let niftiHeader, niftiImage;

    if (nifti.isCompressed(data)) {
        data = nifti.decompress(data);
    }

    if (nifti.isNIFTI(data)) {
        niftiHeader = nifti.readHeader(data);
        niftiImage = nifti.readImage(niftiHeader, data);
    }

    return { niftiHeader, niftiImage };

}





export const readNIFTIFile = file => (

    new Promise(

      (resolve, reject) => {
          fs.readFile(file, (err, data) => {
            if(err) reject(err);
            const model = readNIFTI(new Uint8Array(data).buffer);

            model.niftiImage = imageToTypedData(model.niftiImage, model.niftiHeader);

            resolve(model);

          })


        }

    )

)
