import { marchingCubes } from "./marchingCubes";
import { readNIFTIFile } from "./readNIFTIFile";
import { transformPerfusionColors } from "./transformPerfusionColors";
import { initializeColors } from "./initializeColors";
import { mergeVertices } from "./mergeVertices";
import { isNotNil } from "./isNotNil";



export const transform = async ({file, atlas}) => {

    if( ! file ){ return Promise.resolve(null) }

    let mask : any = null;

    let maskDims : any = null;

    const requestData = marchingCubes();

    const model : any = await readNIFTIFile(file);

    const { niftiHeader, niftiImage } = model;

    if(
        isNotNil(atlas) && niftiHeader.datatypeCode===16
    ){

        mask = await readNIFTIFile(atlas);

        maskDims = { x : mask.niftiHeader.dims[1], y : mask.niftiHeader.dims[2], z : mask.niftiHeader.dims[3] };

        mask = mask.niftiImage;

    }

    const dims = { x : niftiHeader.dims[1], y : niftiHeader.dims[2], z : niftiHeader.dims[3] };

    const result = requestData({
        dims,
        maskDims,
        scalars:niftiImage,
        mask,
        datatypeCode:niftiHeader.datatypeCode
    });

    const { colors, points, normals, types } = result;

    const rgb = colors ? transformPerfusionColors(colors) : initializeColors(points.length, niftiHeader.datatypeCode);

    const data = mergeVertices( points, normals, rgb, types );

    return {
        index : data.out_index,
        position : data.out_position,
        color : data.out_color,
        normal : data.out_normal,
        type : data.out_type,
        niftiHeader
    }

}
