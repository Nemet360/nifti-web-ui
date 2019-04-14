
export const histogram = data => {

    let values = [];

    for(let i=0; i<data.length; i++){

        const value = data[i];

        if( ! values[i] ){ values[i] = 0; }

        values[value]++;

    }

    return values;  

}