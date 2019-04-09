import { Store, action } from "../types";



export const typeEquals = (type:keyof Store) => (action:action) => action.type===type;
