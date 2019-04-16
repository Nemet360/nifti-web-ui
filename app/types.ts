export type Dispatch = (action:action) => void



export type niftiData = { niftiHeader:any, niftiImage:any };



export interface action{ type:keyof Store, load:any }



export interface Store{
	showMenu:boolean,
	error:string,
	slice:number,
	width:number,
	height:number,
	min:number,
	max:number,
	loading:false,
    dispatch?:Dispatch,
    multiple?:any
}