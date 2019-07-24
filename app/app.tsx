import './assets/fonts/index.css'; 
import './assets/styles.css'; 
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { isEmpty, path, identity, reject } from 'ramda';
import { Component } from "react"; 
import { Subscription } from 'rxjs';
import { fromEvent } from 'rxjs/observable/fromEvent'; 
import * as THREE from "three";
import { PerspectiveCamera, Vector3 } from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { workerSend } from './utils/workerSend';
import { transform } from './utils/transform';
import { Space } from './Space';
import { merge } from 'rxjs/observable/merge';
import { filter } from 'rxjs/operators';
import { generators } from './generators';
import { ipcRenderer } from 'electron';
THREE.BufferGeometry.prototype['computeBoundsTree'] = computeBoundsTree;
THREE.BufferGeometry.prototype['disposeBoundsTree'] = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

/*
1. user pick a 'load menu' 
2. dialog opens - user select 4 nifty files
3. a viewport is being added with the current selection

4. when doing the same cycle again - another viewport is being added etc etc

what do you think about that ?
*/

window['THREE'] = THREE;



require('three/examples/js/math/Lut');



interface AppProps{}



interface AppState{
    models:any[],
    camera:PerspectiveCamera
}



export class App extends Component<AppProps,AppState>{
    container:HTMLElement
    subscriptions:Subscription[]
    workers:Worker[]



    constructor(props){ 

        super(props);

        this.subscriptions = [];

        this.workers = [];

        this.state = { 
            models : [],
            camera : new PerspectiveCamera(50, 1, 1, 2000) 
        };

    } 

    

    componentDidMount(){

        this.subscriptions.push(

            fromEvent(document, 'drop').subscribe( this.drop ),

            merge(
                fromEvent(document, 'dragover'), 
                fromEvent(document, 'dragend'), 
                fromEvent(document, 'dragexit'),
                fromEvent(document, 'dragleave')
            )
            .subscribe((e:any) => { 

                e.preventDefault();

                e.stopPropagation();

            }),

            fromEvent(window, "keydown", event => event).pipe( filter(e => String.fromCharCode( e.which )==='A' ) ).subscribe( this.axial ),

            fromEvent(window, "keydown", event => event).pipe( filter(e => String.fromCharCode( e.which )==='C' ) ).subscribe( this.coronal ),

            fromEvent(window, "keydown", event => event).pipe( filter(e => String.fromCharCode( e.which )==='S' ) ).subscribe( this.sagittal )

        );

    }



    drop = (event:any) => {
                
        event.preventDefault(); 

        event.stopPropagation();

        const result = path(['dataTransfer','files'])(event);

        const list = [...result];

        const atlas = v => v.name==="wBRODMANN_SubCort_WM.nii";
        
        this.init({ data:reject(atlas)(list), atlas:list.find(atlas) });
        
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



    init = ({data,atlas}) => {

        const n = data.length - 1;

        this.workers = Array.apply(null, Array(n)).map(v => new Worker('worker.js'));

        this.generateMeshes(data, atlas);

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

            const meshes = collection.map( attributes => {

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

            this.setState({ 
                
                models : perfusions.map( m => {
    
                    const group = new THREE.Group();
    
                    group.add( m.clone() );
                    
                    remainder.forEach( m => group.add( m.clone() ) );

                    return group;
    
                } )

            });

        })

    }



    onViewChange = (camera:PerspectiveCamera) => {

        this.setState({ camera : camera.clone() })

    }



    render() {  

        const { models, camera } = this.state;

        return <div style={{width:"100%", height:"100%"}}>

            <div style={{
                padding:"10px",
                height:"calc(100% - 20px)", 
                width:"calc(100% - 20px)",
                display:'grid',
                alignItems:'center',
                justifyItems:'center',
                gridGap:"10px",
                gridTemplateColumns:`repeat(${models.length}, [col-start] 1fr)`
            }}> 
            {
                models.map( (group,index) => 

                    <div key={`group-${index}`} style={{width:"100%", height:"100%"}}>  

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
