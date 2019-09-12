import { equalize } from "../../app/utils/equalize";
import * as THREE from "three";
import { isNil } from 'ramda';
import { Lut } from 'three/examples/jsm/math/Lut';



export const transformPerfusionColors = colors => {

    const rgb = [];

    const { equalized, min, max } = equalize(colors);

    const lut = new Lut("rainbow", 512);

    lut.setMin(min);

    lut.setMax(max);

    for(let i = 0; i < equalized.length; i++){

        const color = lut.getColor( equalized[i] );

        if(isNil(color)){

           console.log('reason', equalized[i]);

           rgb.push(0.5, 0.5, 0.5);

        }else{

           rgb.push(color.r, color.g, color.b);

        }

    }

    return rgb;

}
