const nifti = require("nifti-reader-js");



export const imageToTypedData = (niftiImage, niftiHeader) => {

    let typedData = new Uint8Array(niftiImage) as any;

    /*if(niftiHeader.datatypeCode===16){ 

        let temp : any = new ArrayBuffer(typedData.length);
        temp = new Uint8Array(temp);

        for(let i = 0; i < typedData.length; i+=4){
            temp[i] = typedData[i+3];
            temp[i+1] = typedData[i+2];
            temp[i+2] = typedData[i+1];
            temp[i+3] = typedData[i];
        }

        const result = new Float32Array(temp.buffer);

        console.log(result.length);



        return result; 
    }*/

    if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT8) {
        typedData = new Uint8Array(niftiImage);
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT16) {
        typedData = new Int16Array(niftiImage);
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT32) {
        typedData = new Int32Array(niftiImage);
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_FLOAT32) {
        typedData = new Float32Array(niftiImage);
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_FLOAT64) {
        typedData = new Float64Array(niftiImage);
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT8) {
        typedData = new Int8Array(niftiImage);
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT16) {
        typedData = new Uint16Array(niftiImage);
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT32) {
        typedData = new Uint32Array(niftiImage);
    }

    return typedData;

}