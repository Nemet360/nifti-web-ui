import { isNil } from "ramda";



export const histogram = data => {

    let values = [];

    for(let i=0; i<data.length; i++){

        const value = data[i];

        if( ! values[i] ){ values[i] = 0; }

        values[value]++;

    }

    for(let i=0; i<values.length; i++){
        
        const next = values[i];

        if(isNaN(next) || isNil(next)){ values[i] = 0 }

    }

    return values;  

}