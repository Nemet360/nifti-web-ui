import './assets/fonts/index.css';
import './assets/styles.css';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as THREE from "three";
import { identity } from 'ramda';
import { Component } from "react";
import { Subscription } from 'rxjs';
import { fromEvent } from 'rxjs/observable/fromEvent';
import { PerspectiveCamera, Vector3 } from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { Space } from './Space';
import { filter } from 'rxjs/operators';
import { generators } from './generators';
import { ipcRenderer } from 'electron';
import { isNotEmpty } from '../cli/utils/isNotEmpty';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Button from '@material-ui/core/Button';
const fs = require('fs');

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






interface AppProps{}



interface AppState{
    loading:boolean,
    models:any[],
    error:string,
    camera:PerspectiveCamera
}



const makeSlice = (file, start, length) => {

    return file.slice(start, start + length);

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

        window.loadFile = this.loadAjax.bind(this);

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


    buildMeshes = (collection) => {

        const meshes = collection.map((attributes: any) => {

            const dc = attributes.niftiHeader.datatypeCode.toString();

            const generator = generators[dc];

            if (!generator) {
                return null
            }

            return generator(attributes);

        });

        const models = meshes.filter(identity);


        const perfusions = models.filter(m => m.userData.dataType === '16');

        const remainder = models.filter(m => m.userData.dataType !== '16');

        const next = perfusions.map(m => {

            const group = new THREE.Group();

            group.add(m.clone());

            remainder.forEach(m => group.add(m.clone()));

            return group;

        });

        this.setState({ models : [...this.state.models, ...next], loading : false });
    }



    onViewChange = (camera:PerspectiveCamera) => {

        this.setState({ camera : camera.clone() })

    }

    loadAjax = async (filePath) => {
        this.setState({ error: "" });
        try {
            const data = fs.readFileSync(filePath);
            this.buildMeshes(JSON.parse(data));
        } catch(e) {
            this.setState({ error: "Invalid json file!"});
        }
    }


    onLoad = event => {

        this.setState({ error : "", loading : true });

        const file = event.target.files[0];
        const blob = makeSlice(file, 0, file.size); //new Blob([new Uint8Array(file)]);

        const reader = new FileReader();

        reader.onloadend = (evt) => {

            if (evt.target['readyState'] === FileReader.DONE) {

                const data = evt.target['result'];
                try {
                    this.buildMeshes(JSON.parse(data));
                } catch(e) {
                    this.setState({ error: "Invalid json file!"});
                }

            }

        };

        reader.readAsText(blob);

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
                        <input ref={e => { this.input = e; }} accept=".json" id="contained-button-file" multiple={false} type="file" style={{display:"none"}} onChange={this.onLoad} />
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
