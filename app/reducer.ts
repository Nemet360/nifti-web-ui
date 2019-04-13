import { cond, compose } from 'ramda';
import { action, Store } from './types';
import { typeEquals } from './utils/typeEquals';



const merger = (store:Store, action:action) : Store => ({...store, [action.type]:action.load});



const getActionsList : (action:any) => any[] = cond([ 
	
	[typeEquals("multiple"), action => action.load],
	
	[() => true, action => [action]] 

]);    



const logger = (before:Store, action:action) => (after:Store) => {

	//console.log(JSON.stringify(action));

	return after;
	
}



export const defaultProps : Store = {  
	showMenu:false,
	showSettings:false,
	error:"",
	slice:0,
	width:0,
	height:0,
	min:0,
	reduction:0.5,
	max:0,
	loading:false,
	shouldThreshold:true,
	thresh:1,
	smooth:500
};



export const reducer = (state:Store, action:action) => {

	const actions = getActionsList(action);

	const f = (action:action) : action => action;
	
    const applyActionsToState = (state:Store) : Store => actions.map( f ).reduce( ( state, action ) => merger( state, action ), state );
    
    

    return compose( logger(state, action), applyActionsToState )(state);
	
}