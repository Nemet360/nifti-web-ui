import { Vector3, Box3, Mesh } from 'three';



export const getObjectCenter = ( object : Mesh ) : Vector3 => {

    const boundingBox = new Box3().setFromObject(object);

    const centerX = (boundingBox.max.x + boundingBox.min.x)/2;

    const centerY = (boundingBox.max.y + boundingBox.min.y)/2;

    const centerZ = (boundingBox.max.z + boundingBox.min.z)/2;

    return new Vector3(centerX,centerY,centerZ);

} 