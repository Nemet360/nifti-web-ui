import { makeSlice } from "./makeSlice";
import { readNIFTI } from "./readNIFTI";



export const readNIFTIFile = file => (

    new Promise(

        resolve => {
        
            let start = 0;

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