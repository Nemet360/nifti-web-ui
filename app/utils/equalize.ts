import { histogram } from "./histogram";



export const equalize = values => {

    const result = [];

    const factor = 1000;

    const toInt = value => {
        
        return Math.round( value < 0 ? 0 : value*factor );

    }

    const rounded = values.map( toInt );

    const h = histogram(rounded);
    
    const histogramSum = [];

    let total = rounded.length;

    let types = h.length;

    let sum = 0;

    let min = 0;

    let max = 0;

    for (let i = 0; i < types; i++) { 

        sum += h[i]; 

        histogramSum[i] = Math.round( (sum * types) / total ); 

    } 

    for(let i=0; i < total; i++){

        result[i] = histogramSum[ rounded[i] ];

        if(result[i]>max){ max = result[i] }
        
        if(result[i]<min){ min = result[i] }

    }



    return { equalized:result, min, max };

}