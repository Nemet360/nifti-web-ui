import { Scene } from "three";



export const getBrains = (scene:Scene) => {

    const object = scene.children.find(mesh => mesh.userData.brain);

    return object;

}