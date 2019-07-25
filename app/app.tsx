import './assets/fonts/index.css'; 
import './assets/styles.css'; 
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as THREE from "three";
import { isEmpty, identity, reject, all } from 'ramda';
import { Component } from "react"; 
import { Subscription } from 'rxjs';
import { fromEvent } from 'rxjs/observable/fromEvent';
import { PerspectiveCamera, Vector3 } from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { workerSend } from './utils/workerSend';
import { transform } from './utils/transform';
import { Space } from './Space';
import { filter } from 'rxjs/operators';
import { generators } from './generators';
import { ipcRenderer } from 'electron';
import { isNotEmpty } from './utils/isNotEmpty';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Button from '@material-ui/core/Button';
import { readNIFTIFile } from './utils/readNIFTIFile';

THREE.BufferGeometry.prototype['computeBoundsTree'] = computeBoundsTree;
THREE.BufferGeometry.prototype['disposeBoundsTree'] = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

window['THREE'] = THREE;

require('three/examples/js/math/Lut');



/*
1. user pick a 'load menu' 
2. dialog opens - user select 4 nifty files
3. a viewport is being added with the current selection
4. when doing the same cycle again - another viewport is being added etc etc
*/



const atlas = v => v.name==="wBRODMANN_SubCort_WM.nii";
            


interface AppProps{}



interface AppState{
    loading:boolean,
    models:any[],
    error:string,
    camera:PerspectiveCamera
}



export class App extends Component<AppProps,AppState>{
    container:HTMLElement
    subscriptions:Subscription[]
    workers:Worker[]
    input:any


    constructor(props){ 

        super(props);

        this.subscriptions = [];

        this.workers = [];

        this.state = { 
            loading : false,
            models : [],
            error : "",
            camera : new PerspectiveCamera(50, 1, 1, 2000) 
        };

    } 

    

    componentDidMount(){

        this.subscriptions.push(

            fromEvent(window, "keydown", event => event).pipe( filter(e => String.fromCharCode( e.which )==='A' ) ).subscribe( this.axial ),

            fromEvent(window, "keydown", event => event).pipe( filter(e => String.fromCharCode( e.which )==='C' ) ).subscribe( this.coronal ),

            fromEvent(window, "keydown", event => event).pipe( filter(e => String.fromCharCode( e.which )==='S' ) ).subscribe( this.sagittal )

        );

    }



    sagittal = () => {

        const c = this.state.camera; 

        c.position.x = 200;
        c.position.y = 0;
        c.position.z = 0;

        c.lookAt(new Vector3(0,0,0));

        this.onViewChange(c);

    }



    axial = () => {

        const c = this.state.camera; 
        
        c.position.x = 0;
        c.position.y = 0;
        c.position.z = 200;

        c.lookAt(new Vector3(0,0,0));

        this.onViewChange(c);

    }



    coronal = () => {

        const c = this.state.camera;
        
        c.position.x = 0;
        c.position.y = 200;
        c.position.z = 20;

        c.lookAt(new Vector3(0,0,0));

        this.onViewChange(c);

    }



    componentWillUnmount(){

        this.workers.forEach(worker => worker.terminate());

        this.subscriptions.forEach(subscription => subscription.unsubscribe());

        this.workers = [];

        this.subscriptions = [];

    }



    generateMeshes = (data, atlas) => {

        if(isEmpty(data)){ return }

        const first = data[0];

        const remainder = data.slice(1, data.length);

        const workers = this.workers.map(workerSend).map(( f, i ) => f({ file: remainder[i], atlas }));

        

        return Promise.all([ 

            transform({file:first, atlas}), 

            ...workers

        ])

        .then(collection => {

            const meshes = collection.map( (attributes:any) => {

                const dc = attributes.niftiHeader.datatypeCode.toString();

                const generator = generators[dc];
          
                if( ! generator ){ return null }

                return generator(attributes);

            } );
           
            return meshes.filter(identity);

        })

        .then((models:any[]) => {

            const perfusions = models.filter(m => m.userData.dataType === '16');

            const remainder = models.filter(m => m.userData.dataType !== '16');

            const next = perfusions.map(m => {
    
                const group = new THREE.Group();

                group.add( m.clone() );
                
                remainder.forEach( m => group.add( m.clone() ) );

                return group;

            });

            this.setState({ models : [...this.state.models, ...next], loading : false });

        })

    }



    onViewChange = (camera:PerspectiveCamera) => {

        this.setState({ camera : camera.clone() })

    }



    valid = list => {
        
        const isNii = entry => entry.name.indexOf(".nii")!==-1;

        return Promise.resolve(false)

        .then(
            valid => {

                if( list.length!==4 || ! all(isNii)(list) ){ return false }

                return Promise.all( list.map(readNIFTIFile) )

                .then((result:any[]) => {
                    
                    /*i should evaluate headers too, but there is no guaranty they comply to specific format for different types*/

                    const two = result.find(entry => entry.niftiHeader.datatypeCode===2);
    
                    const four = result.find(entry => entry.niftiHeader.datatypeCode===4);
    
                    const sixteen = result.find(entry => entry.niftiHeader.datatypeCode===16);
    
                    return true;
    
                })

            }
        )

    }



    onLoad = event => {

        this.setState({ error : "", loading : true });

        const list = [...event.target.files];

        this.valid(list)

        .then(
            valid => {

                if(valid){  

                    const data = reject(atlas)(list);
        
                    const a = list.find(atlas);
        
                    const n = data.length - 1;
            
                    this.workers = Array.apply(null, Array(n)).map(v => new Worker('worker.js'));
            
                    this.generateMeshes(data, a);
                    
                }else{
        
                    this.setState({ error : "Selected files have incorrect format", loading : false });
        
                }

            }
        )

    }



    render() {  

        const { models, camera } = this.state;



        return <div style={{
            width:"100%", 
            height:"100%",
            flexDirection:"column",
            display:"flex"
        }}>

            <AppBar position="static" color="default">
                <Toolbar>
                    <div> 
                        <input ref={e => { this.input = e; }} accept=".nii" id="contained-button-file" multiple={true} type="file" style={{display:"none"}} onChange={this.onLoad} />
                        <label htmlFor="contained-button-file">
                            <Button onClick={e => { this.input.value=null; }} disabled={this.state.loading} variant="contained" component="span">Load</Button>
                        </label>
                    </div>
                    {
                        isNotEmpty(this.state.error) &&
                        <div style={{
                            userSelect: "none",
                            paddingLeft: "20px",
                            color: "red"
                        }}>
                        {
                            this.state.error
                        }    
                        </div>
                    }
                </Toolbar>
            </AppBar>

            <div style={{
                padding:"10px",
                flex:1,
                display:'grid',
                alignItems:'center',
                justifyItems:'center',
                gridGap:"10px",
                gridTemplateColumns:`repeat(${models.length > 1 ? 2 : 1}, [col-start] 1fr)`
            }}> 
            {
                models.map( (group,index) => 

                    <div key={`group-${group.uuid}`} style={{width:"100%", height:"100%"}}>  

                        <div style={{
                            height:"100%",
                            width:"100%",
                            display:"flex",
                            flexDirection:"column",
                            justifyContent:"space-between"
                        }}>
                            <Space 
                                index={index}
                                group={group} 
                                onViewChange={this.onViewChange} 
                                camera={camera}
                            />
                        </div>

                    </div>

                )
            }
            </div> 

        </div>

    }

} 



const init = () => {

    const app = document.createElement('div'); 

    app.style.width = '100%';

    app.style.height = '100%';

    app.id = 'application';

    document.body.appendChild(app);

    ReactDOM.render( <App />, app );

}



ipcRenderer.once(
    "loaded", 
    (event, external) => {

        init();

    }
);
