const resizeImageData = require('resize-image-data');



export const resizeNIFTIImage = ( original_dims, target_dims, niftiImage ) => {
    
    const difference_xy = (target_dims.x * target_dims.y - original_dims.x * original_dims.y) * original_dims.z;

    const difference_z = (target_dims.z - original_dims.z) * target_dims.x * target_dims.y;

    const interval = Math.ceil(original_dims.z/Math.abs(target_dims.z - original_dims.z));

    if(interval<=1 && difference_z < 0){
        throw new Error(`Incorrect resize configuration. Interval could not be less than 2`);
    }

    const newLength = niftiImage.length + difference_xy + difference_z;

    const dest = new ArrayBuffer(newLength); 
            
    const dest_interface = new Uint8Array(dest);

    const canvas = document.createElement('canvas');


    const x_max = original_dims.x; 
    const y_max = original_dims.y; 
    const z_max = original_dims.z;

    let x = 0;
    let y = 0; 
    let z = 0;
    let ctr = 0;

    for(z = 0; z < z_max; z++){

        const layerInQuestion = z % interval===0;


        if( layerInQuestion && difference_z < 0 ){ 
            continue; 
        }


        canvas.width = x_max;
        canvas.height = y_max;

        const ctx = canvas.getContext("2d");
        const canvasImageData = ctx.createImageData(canvas.width, canvas.height);

        for (y = 0; y < y_max; y++) {

            for (x = 0; x < x_max; x++) {

                const offset = (z * x_max * y_max) + (y * x_max) + x;
                
                const v = niftiImage[offset];

                const image_location = (y * x_max + x) * 4;

                canvasImageData.data[image_location] = v;
                canvasImageData.data[image_location + 1] = v;
                canvasImageData.data[image_location + 2] = v;
                canvasImageData.data[image_location + 3] = 0xFF;

            }

        }

        const result = resizeImageData(canvasImageData, target_dims.x, target_dims.y, 'biliniear-interpolation');
        
        const buffer = new Uint8Array(result.data);

        const shouldDuplicate = layerInQuestion && difference_z > 0;

        for(let i=0; i <= (shouldDuplicate ? 1 : 0); i++){

            for (y = 0; y < target_dims.y; y++) {

                for (x = 0; x < target_dims.x; x++) {

                    const image_location = (y * target_dims.x + x) * 4;

                    dest_interface[ctr++] = buffer[image_location];

                }

            }

        }

    }

    return dest_interface;

}