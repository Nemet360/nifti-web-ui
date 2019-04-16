
let gaussian5 = (
    x1, x2, x3, x4, x5,
    x6, x7, x8, x9, x10,
    x11, x12, X, x13, x14,
    x15, x16, x17, x18, x19,
    x20, x21, x22, x23, x24
) => {

    return (

        0.000252*x1 + 0.00352*x2 + 0.008344*x3 + 0.00352*x4 + 0.000252*x5 +
        0.00352*x6 + 0.049081*x7 + 0.11634*x8 + 0.049081*x9 + 0.00352*x10 +
        0.008344*x11 + 0.11634*x12 + 0.275768*X + 0.11634*x13 +	0.008344*x14 +
        0.00352*x15 + 0.049081*x16 + 0.11634*x17 + 0.049081*x18 + 0.00352*x19 +
        0.000252*x20 + 0.00352*x21 + 0.008344*x22 + 0.00352*x23 + 0.000252*x24

    )

}



let gaussian3 = (
    y1, y2, y3,
    y4, X, y5,
    y6, y7, y8
) => {

    return (

        1/16*y1 + 1/8*y2 + 1/16*y3 + 

        1/8*y4 + 1/4*X + 1/8*y5 + 

        1/16*y6 + 1/8*y7 + 1/16*y8

    )

}



const applyGaussianBlur = (colors, dims, indices) => {

    let x = dims[1];

    let y = dims[2];

    let z = dims[3];

    let slice = x*y;

    let p = 0; 

    let p1 = 0; 
    let p2 = 0; 
    let p3 = 0; 
    let p4 = 0; 

    let p5 = 0; 
    let p6 = 0; 
    let p7 = 0; 
    let p8 = 0; 

    const get = (k, slice, j, x, i) => {

        p = k * slice + j * x + i; 

        p1 = k * slice + (j+1) * x + (i); 
        p2 = k * slice + (j-1) * x + (i); 
        p3 = k * slice + (j) * x + (i+1); 
        p4 = k * slice + (j) * x + (i-1); 

        p5 = k * slice + (j+1) * x + (i+1); 
        p6 = k * slice + (j+1) * x + (i-1); 
        p7 = k * slice + (j-1) * x + (i+1); 
        p8 = k * slice + (j-1) * x + (i-1); 

    };

    for (let k = 1; k < z - 1; k++) {
        
        for (let j = 1; j < y - 1; j++) {

            for (let i = 1; i < x - 1; i++) {
                    
                    /*
                    get(k-1, slice, j, x, i);
                    indices[p]
                    indices[p1]
                    indices[p2]
                    indices[p3]
                    indices[p4]
                    indices[p5]
                    indices[p6] 
                    indices[p7]
                    indices[p8]
                    get(k, slice, j, x, i);
                    indices[p]
                    indices[p1]
                    indices[p2]
                    indices[p3]
                    indices[p4]
                    indices[p5]
                    indices[p6] 
                    indices[p7]
                    indices[p8]
                    

                    for(let s = 0; s < positionIndices.length; s++){
                        const idx = positionIndices[s];

                        for(let c=0; c<12; c++){
                            colors[idx+c*3] = 0;
                            colors[idx+c*3+1] = 0;
                            colors[idx+c*3+2] = 0;
                        }
                    }
                    */

            }
  
        }
  
    }

    return colors;

}
