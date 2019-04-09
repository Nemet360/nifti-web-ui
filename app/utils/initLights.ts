import { AmbientLight, DirectionalLight } from 'three';



export const initLights = () => {

    const light = new AmbientLight(0xffffff, 0.5);

    light.position.set(0,0,0);

    const lights : any[] = [
        [-50, 0, 0], 
        [ 50, 0, 0]
    ]
    .map(
        tuple => {
            const light = new DirectionalLight(0xffffff, 0.5);
            light.position.set( tuple[0], tuple[1], tuple[2] ).normalize();  
            return light;
        }
    );   

    lights.push(light);

    return lights;

}