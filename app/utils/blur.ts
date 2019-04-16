import { isEmpty, isNil, compose, sort, drop, toPairs, map, divide, uniqBy, aperture, range } from 'ramda';



const gauss = (size, sigma) => {

    return compose(

        map( x => 1 / ( sigma * Math.sqrt( 2 * Math.PI ) ) * Math.exp( -Math.pow( x, 2 ) / ( 2 * Math.pow( sigma, 2 ) ) ) ),

        size => range( -Math.round(size/2), Math.round(size/2) )

    )(size)

}



export const blur = mesh => {

    const distribution = gauss(6, 0.5);

    for(let i=6; i<mesh.geometry['attributes'].color.array.length-6; i+=3){
        let r = [];
        let g = [];
        let b = [];
        for(let j=i-6; j<=i+6; j+=3){
            let c1 = mesh.geometry['attributes'].color.array[j];
            let c2 = mesh.geometry['attributes'].color.array[j+1];
            let c3 = mesh.geometry['attributes'].color.array[j+2];
            r.push(c1);
            g.push(c2);
            b.push(c3);
        }
        mesh.geometry['attributes'].color.array[i] = r.reduce((a,v,idx) => a+v*distribution[idx+1], 0);
        mesh.geometry['attributes'].color.array[i+1] = g.reduce((a,v,idx) => a+v*distribution[idx+1], 0);
        mesh.geometry['attributes'].color.array[i+2] = b.reduce((a,v,idx) => a+v*distribution[idx+1], 0);
    }

    return mesh;

}
