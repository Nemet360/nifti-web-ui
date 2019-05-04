import * as THREE from "three";



export const stlToGeometry = data => {

    const loader = new THREE["STLLoader"]();

    return new Promise(resolve => {

        loader.loadText(data, geometry => {
    
            resolve(geometry)
        
        });

    })

}