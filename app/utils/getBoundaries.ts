
export const getBoundaries = data => {
        
    let max = 0;

    let min = 0;

    for(let i=0; i<data.length; i++){

        if(data[i]<min){ min = data[i]; }
        if(data[i]>max){ max = data[i]; }

    }

    return { min, max };
}