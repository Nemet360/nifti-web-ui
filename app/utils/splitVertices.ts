
export const splitVertices = (p,n) => {

    const position = [];
    const normals = [];
    const colors = [];

    let x1 = 0;
    let y1 = 0;
    let z1 = 0;

    let x2 = 0;
    let y2 = 0;
    let z2 = 0;

    let x3 = 0;
    let y3 = 0;
    let z3 = 0;

    let n11 = 0;
    let n12 = 0;
    let n13 = 0;

    let n21 = 0;
    let n22 = 0;
    let n23 = 0;

    let n31 = 0;
    let n32 = 0;
    let n33 = 0;

    for(let i=0; i<p.length; i+=9){

        x1 = p[i];
        y1 = p[i+1];
        z1 = p[i+2];

        x2 = p[i+3];
        y2 = p[i+4];
        z2 = p[i+5];

        x3 = p[i+6];
        y3 = p[i+7];
        z3 = p[i+8];

        n11 = n[i];
        n12 = n[i+1];
        n13 = n[i+2];

        n21 = n[i+3];
        n22 = n[i+4];
        n23 = n[i+5];

        n31 = n[i+6];
        n32 = n[i+7];
        n33 = n[i+8];


        position.push(
            x1,y1,z1, 
            x2,y2,z2,
            x3,y3,z3,
            x1,y1,z1,
            (x1+x3)/2, (y1+y3)/2, (z1+z3)/2,
            (x1+x3)/2, (y1+y3)/2, (z1+z3)/2
        );

        normals.push(
            n11, n12, n13,
            n21, n22, n23,
            n31, n32, n33,
            n11, n12, n13,
            n21, n22, n23,
            n31, n32, n33
        );

        colors.push(
            0.5, 0.5, 0.5,
            0.5, 0.5, 0.5,
            0.5, 0.5, 0.5,
            0.5, 0.5, 0.5,
            0.5, 0.5, 0.5,
            0.5, 0.5, 0.5,
            0.5, 0.5, 0.5,
            0.5, 0.5, 0.5,
            0.5, 0.5, 0.5
        );

    }

    return { position, normals, colors };
    
}
