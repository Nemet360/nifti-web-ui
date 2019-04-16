import { Color } from "three";

export const mergeVertices = (position:number[], normal:number[], color:Color) => {

    const hash = {};
    const out_position = [];
    const out_color = [];
    const out_normal = [];
    const out_index = [];

    let x = 0;
    let y = 0;
    let z = 0;

    let n1 = 0;
    let n2 = 0;
    let n3 = 0;

    let index = undefined;



    for(let i=0; i<position.length; i+=3){

        x = position[i];
        y = position[i+1];
        z = position[i+2];

        n1 = normal[i];
        n2 = normal[i+1];
        n3 = normal[i+2];

        index = hash[`${x}-${y}-${z}`];

        if(index){

            out_index.push(index/3);

        }else{

            index = out_position.length;



            hash[`${x}-${y}-${z}`] = index;

            out_position.push(x,y,z);

            out_color.push(color.r,color.g,color.b);

            out_normal.push(n1,n2,n3);

            out_index.push(index/3);

        }

    }

    return {
        out_index,
        out_position,
        out_color,
        out_normal
    }

}