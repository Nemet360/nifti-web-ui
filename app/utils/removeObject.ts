import { Scene, Mesh } from 'three';
import { isNotNil } from '../../cli/utils/isNotNil';



export const removeObject = (scene:Scene, object:Mesh) : void => {

   if(isNotNil(object)){
      object.geometry.dispose();
      scene.remove(object);
      object = undefined;
   }

}
