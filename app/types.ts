export type Dispatch = (action:action) => void



export type data = { niftiHeader:any, niftiImage:any };



export type dims = { x:number, y:number, z:number };



export interface action{ type:keyof Store, load:any }



export interface Store{
    showMenu:boolean,
    showSettings:false,
    error:string,
    slice:number,
    width:number,
    height:number,
    min:number,
    max:number,
    reduction:number,
    loading:boolean,
    shouldThreshold:boolean,
    thresh:number,
    smooth:number,
    dispatch?:Dispatch,
    multiple?:any
}