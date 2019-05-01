import { Color } from "three";



export const mergeVertices = (position:number[], normal:number[], colors:number[], indices:number[]) => {

    const hash = {};
    const out_position = [];
    const out_color = [];
    const out_normal = [];
    const out_index = [];
    const out_indices = [];

    let x = 0;
    let y = 0;
    let z = 0;

    let n1 = 0;
    let n2 = 0;
    let n3 = 0;

    let idx1 = 0;
    let idx2 = 0;
    let idx3 = 0;

    let r = 0;
    let g = 0;
    let b = 0;
    
    let index = undefined;



    for(let i=0; i<position.length; i+=3){

        x = position[i];
        y = position[i+1];
        z = position[i+2];

        n1 = normal[i];
        n2 = normal[i+1];
        n3 = normal[i+2];

        idx1 = 0; //indices[i];
        idx2 = 0; //indices[i+1];
        idx3 = 0; //indices[i+2];

        r = colors[i];
        g = colors[i+1];
        b = colors[i+2];

        index = hash[`${x}-${y}-${z}`];

        if(index){

            out_index.push(index/3);

        }else{

            index = out_position.length;

            hash[`${x}-${y}-${z}`] = index;

            out_position.push(x,y,z);

            out_color.push(r,g,b);

            out_normal.push(n1,n2,n3);

            out_indices.push(idx1,idx2,idx3);

            out_index.push(index/3);

        }

    }

    return {
        out_index,
        out_indices,
        out_position,
        out_color,
        out_normal
    }

}