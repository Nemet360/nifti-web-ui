import { Vector3, WebGLRenderer, PerspectiveCamera, Scene, Light, Box3, Mesh, MeshPhysicalMaterial, DoubleSide } from 'three';



export const replaceSceneObject = (scene:Scene, object, withWhat:Mesh) : void => {

    if(object && object.geometry){
       object.geometry.dispose();
    }

    if(object){
       scene.remove(object);
    }

    object = undefined;

    scene.add(withWhat); 

}