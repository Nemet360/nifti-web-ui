import { makeSlice } from "./makeSlice";
import { imageToTypedData } from "./imageToTypedData";
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

        resolve => {
        
            let blob = makeSlice(file, 0, file.size);

            let reader = new FileReader();

            reader.onloadend = function (evt) {

                if (evt.target['readyState'] === FileReader.DONE) {

                    const result = readNIFTI(evt.target['result']);

                    resolve(result);

                }

            };

            reader.readAsArrayBuffer(blob);

        }

    )

)