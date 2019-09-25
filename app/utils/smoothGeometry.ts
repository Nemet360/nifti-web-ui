import { clone, compose, divide, drop, flatten, isEmpty, isNil, map, path, prop, range, sort, splitEvery, toPairs, uniqBy } from "ramda";
import { taubinSmooth } from "../laplacian";

export const smoothGeometry = (geometry, params= { passBand: 0.2, iters: 20 }) => {

    const a = splitEvery(3, geometry.index.array);

    const b = splitEvery(3, geometry.attributes.position.array);

    const c = taubinSmooth( a, b, params );

    return flatten( c );

};
