import { AmbientLight, DirectionalLight, Vector3 } from 'three';



export const lights = () => {

    const light = new AmbientLight(0xffffff, 0.7);

    light.position.set(0,0,0);

    const lights : any[] = [
        [50, 0, 0],
        [0, 0, 50],
        [-50, 0, 0],
        [0, 0, -50]
    ]
    .map(
        tuple => {

            const light = new DirectionalLight(0xffffff, 0.4);

            light.position.set( tuple[0], tuple[1], tuple[2] ).normalize();  

            light.lookAt(new Vector3(0,0,0));

            return light;
            
        }
    );   

    lights.push(light);

    return lights;

}