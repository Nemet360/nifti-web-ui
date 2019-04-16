import './assets/fonts/index.css'; 
import './assets/styles.css'; 
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Store, niftiData } from './types';
import { reducer, defaultProps } from './reducer';
import { isEmpty, isNil, compose, sort, drop, toPairs, map, divide, uniqBy, aperture, range } from 'ramda';
import { Provider, connect } from "react-redux";
import { createStore } from "redux"; 
import { Component } from "react"; 
import { ipcRenderer, remote } from 'electron';
import { Subscription } from 'rxjs';
import { fromEvent } from 'rxjs/observable/fromEvent'; 
import Button from '@material-ui/core/Button';
import Settings from '@material-ui/icons/Settings';
import * as THREE from "three";
import { Vector3, WebGLRenderer, PerspectiveCamera, Scene, Light, Mesh, MeshPhysicalMaterial, DoubleSide, BufferGeometry, Geometry, Raycaster, Color } from 'three';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography'; 
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Slider from '@material-ui/lab/Slider';
import Popover from '@material-ui/core/Popover';
import IconButton from '@material-ui/core/IconButton';
import Checkbox from '@material-ui/core/Checkbox';
import { readNIFTIFile } from './utils/readNIFTIFile';
import { getObjectCenter } from './utils/getObjectCenter';
import { removeObject } from './utils/removeObject';
import { attachDispatchToProps } from './utils/attachDispatchToProps';
import { exportStl } from './utils/exportStl';
import { exportJSON } from './utils/exportJSON';
import { exportObj } from './utils/exportObj';
import { initLights } from './utils/initLights';
import { imageToTypedData } from './utils/imageToTypedData';
import Paper from '@material-ui/core/Paper';
import { reshapePerfusion } from './utils/reshapePerfusion';
import { imageToVolume } from './utils/imageToVolume';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { projectMask } from './utils/projectMask';
import { meshFromGeometry } from './utils/meshFromGeometry';
import { histogram } from './utils/histogram';
import { getBoundaries } from './utils/getBoundaries';
import { equalize } from './utils/equalize';
import { mergeVertices } from './utils/mergeVertices';
import { showNormals } from './utils/showNormals';
const Spinner = require('react-spinkit');
const colormap = require('colormap');
THREE.BufferGeometry.prototype['computeBoundsTree'] = computeBoundsTree;
THREE.BufferGeometry.prototype['disposeBoundsTree'] = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

window['THREE'] = THREE;

require('three/examples/js/math/Lut');
require("three/examples/js/controls/OrbitControls");
require("./exporters/STLLoader");
require("./exporters/STLExporter");
require("./exporters/OBJExporter");



interface AppState{
    model:any,
    perfusion:any,
    x:number,
    y:number,
    z:number
}



@connect(store => store, attachDispatchToProps)
export class App extends Component<Store,AppState>{
    resize:Subscription
    mouse:Subscription
    menu:HTMLElement
    input_model:HTMLInputElement
    input_perfusion:HTMLInputElement
    container:HTMLElement
    boundingBox:any
    scene:Scene
    raycaster:Raycaster
    camera:PerspectiveCamera
    renderer:WebGLRenderer
    controls:any
    localPlane:THREE.Plane



    constructor(props){ 

        super(props);

        this.state = {
            model:undefined,
            perfusion:undefined,
            x:0,
            y:0,
            z:0
        };

    } 



    onMouseMove = event => {

        const object = this.scene.children.find(mesh => mesh.userData.brain) as Mesh;

        if(isNil(object)){ return; }

        const mouse = new THREE.Vector2();

        mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        
        mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
        
        this.raycaster.setFromCamera( mouse, this.camera );

        const intersects = this.raycaster.intersectObject(object, false);

        if(intersects[0]){

            this.setState({
                x:object.geometry['attributes'].indices.array[intersects[0].face.a*3],
                y:object.geometry['attributes'].indices.array[intersects[0].face.a*3+1],
                z:object.geometry['attributes'].indices.array[intersects[0].face.a*3+2]
            });

        }else{

            this.setState({x:0,y:0,z:0});

        }

    }



    componentDidMount(){

        this.raycaster = new THREE.Raycaster();

        this.resize = fromEvent(window, "resize").subscribe(this.onResize);

        this.mouse = fromEvent(window, "mousemove").subscribe(this.onMouseMove);

        this.boundingBox = this.container.getBoundingClientRect();

        this.props.dispatch({
            type:"multiple",
            load:[
                { type:"width", load:this.boundingBox.width },
                { type:"height", load:this.boundingBox.height }
            ]
        });
        
        this.init();  

    }



    componentWillUnmount(){

        this.resize.unsubscribe();

    }



    openSaveDialog = (extension:string) : void => {

        const object = this.scene.children.find(mesh => mesh.userData.brain) as Mesh;

        this.props.dispatch({ type:"showMenu", load:false });

        if(isNil(object)){ 
            this.props.dispatch({
                type:"multiple", 
                load:[
                    {type:"error", load:"Scene is empty. Nothing to export."},
                    {type:"loading", load:false}
                ]
            });
            return; 
        }

        remote.dialog.showSaveDialog(
            { 
                title:'Save', 
                filters:[{ name: `.${extension}`, extensions: [extension] }] 
            }, 
            result => {

                if(isNil(result)){ return; }

                this.props.dispatch({type:"loading", load:true});

                if(extension==="stl"){

                    exportStl(this.scene, result);

                }else if(extension==="json"){

                    exportJSON(this.scene, result);

                }else if(extension==="obj"){

                    exportObj(this.scene, result);

                }

                this.props.dispatch({type:"loading", load:false});

            }
        );

    }



    init = () => { 

        const { width, height } = this.container.getBoundingClientRect();

        this.scene = new Scene();

        this.camera = new PerspectiveCamera(50, width/height, 1, 2000); 
        this.camera.position.set(50,50,50);
        this.camera.lookAt(new Vector3(0,0,0)); 

        this.renderer = new WebGLRenderer({antialias:true, alpha:true}); 
        this.renderer.setSize(width, height, true);  
        this.renderer.setClearColor(0xeeeeee); 
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.gammaInput = true;
        this.renderer.gammaOutput = true;
        this.renderer.toneMapping = THREE.Uncharted2ToneMapping;
        this.renderer.toneMappingExposure = 0.75;
        this.renderer.shadowMap.enabled = true;
        this.renderer.localClippingEnabled = true;

        this.container.appendChild(this.renderer.domElement);
    
        this.controls = new THREE['OrbitControls'](this.camera, this.container);
        
        this.controls.enablePan = false;

        const lights = initLights();

        lights.forEach((light:Light) => this.scene.add(light));

        this.animate();

    }    



    animate = () => {  
        
        this.boundingBox = this.container.getBoundingClientRect();
        
        this.props.dispatch({
            type:"multiple",
            load:[
                {type:"width", load:this.boundingBox.width},
                {type:"height", load:this.boundingBox.height}
            ]
        });

        this.renderer.render(this.scene, this.camera);

        requestAnimationFrame(this.animate);

    }  



    onResize = e => {

        this.boundingBox = this.container.getBoundingClientRect();

        const { width, height } = this.boundingBox;

        this.camera.aspect = width / height;
    
        this.camera.updateProjectionMatrix(); 
                
        this.renderer.setSize(width, height);  
        
        this.props.dispatch({
            type:"multiple",
            load:[
                {type:"width", load:width},
                {type:"height", load:height}
            ]
        });

    }



    onSlice = (e,v) => {

        this.localPlane.constant = v;

        this.props.dispatch({type:"slice", load:v});

    }



    onVisualizeModel = () => {

        if(isNil(this.state.model) || isNil(this.state.perfusion)){ return; }

        this.props.dispatch({ type:"multiple", load:[ {type:"error", load:""}, {type:"loading", load:true} ] });



        return Promise.all([ 
            
            readNIFTIFile(this.state.model), 
            
            readNIFTIFile(this.state.perfusion) 
        
        ])
        .then(( [model, perfusion] : [niftiData, niftiData] ) => {

            const model_dim = { x:model.niftiHeader.dims[1],  y:model.niftiHeader.dims[2], z:model.niftiHeader.dims[3] };

            model.niftiImage = imageToTypedData(model.niftiImage, model.niftiHeader);

            perfusion.niftiImage = imageToTypedData(perfusion.niftiImage, perfusion.niftiHeader);

            const perfusionEqualized = reshapePerfusion(perfusion, model_dim);

            this.onNIFTILoaded(model, perfusionEqualized);

            this.props.dispatch({ type:"loading", load:false });

            this.setState({ model:undefined, perfusion:undefined });
        
        });

    }



    generateColorationGeometry = (perfusionPoints, perfusionNormals, perfusionColors) => {

        const { perfusionColorsEqualized, min, max } = equalize(perfusionColors);

        const rgb = [];

        const lut = new THREE['Lut']("cooltowarm", 512);

        lut.setMin(min-1);

        lut.setMax(max+1);

        for(let i=0; i<perfusionColorsEqualized.length; i++){

            let color = lut.getColor( perfusionColorsEqualized[i] );

            rgb.push(color.r,color.g,color.b);

        }

        let coloration = new THREE.BufferGeometry();

        coloration.addAttribute('normal', new THREE.BufferAttribute( new Float32Array(perfusionNormals), 3 ));

        coloration.addAttribute('position', new THREE.BufferAttribute( new Float32Array(perfusionPoints), 3 ));

        coloration.addAttribute('color', new THREE.BufferAttribute( new Float32Array(rgb), 3 ));

        coloration.computeBoundingBox();

        return { coloration, color:lut.getColor( (min+max)/2 ) };

    }



    onNIFTILoaded = (data:niftiData, perfusion:niftiData) => {

        this.localPlane = new THREE.Plane( new THREE.Vector3(0, -1, 0), 0.8 );

        const { 
            perfusionNormals, 
            perfusionPoints, 
            perfusionColors, 
            indices,
            p,
            n
        } = imageToVolume(data, perfusion);
  
        const { coloration, color } = this.generateColorationGeometry(perfusionPoints, perfusionNormals, perfusionColors);

        const geometry = new THREE.BufferGeometry();

        const { out_index, out_position, out_color, out_normal } = mergeVertices( p, n, color );



        geometry.setIndex( new THREE.BufferAttribute( new Uint32Array(out_index), 1 ) );

        geometry.addAttribute('position', new THREE.BufferAttribute( new Float32Array(out_position), 3) );

        geometry.addAttribute('color', new THREE.BufferAttribute( new Float32Array(out_color), 3) );

        geometry.addAttribute('normal', new THREE.BufferAttribute( new Float32Array(out_normal), 3) );
        
        geometry.addAttribute('indices', new THREE.BufferAttribute( new Float32Array(out_position.length), 3) )

        geometry.computeBoundingBox();

        geometry['computeBoundsTree']();
        


        const mesh = compose( projectMask(coloration, indices), meshFromGeometry(this.localPlane) )(geometry);

        const center = getObjectCenter(mesh);

        const wd = mesh.geometry.boundingBox.max.x - mesh.geometry.boundingBox.min.x;

        const hg = mesh.geometry.boundingBox.max.y - mesh.geometry.boundingBox.min.y;

        const max_y = mesh.geometry.boundingBox.max.y;

        this.localPlane.constant = max_y;

        this.camera.position.x = wd*2;

        this.camera.position.y = hg*2;

        this.camera.position.z = 0;

        this.controls.target.set(center.x, center.y, center.z);

        this.camera.lookAt(this.controls.target);

        this.props.dispatch({
            type:"multiple",
            load:[
                {type:"slice", load:max_y},
                {type:"max", load:max_y},
                {type:"min", load:0}
            ]
        });

        const object = this.scene.children.find(mesh => mesh.userData.brain) as Mesh;

        removeObject(this.scene, object);

        this.scene.add(mesh);

    }



    render() {  

        const filesMissing = isNil(this.state.model) || isNil(this.state.perfusion);



        return <div style={{height:'100%', width:'100%', display:"flex", flexDirection:"column"}}> 

            <AppBar position="static">

                <Toolbar variant="dense" style={{background:'cornflowerblue', display:"flex", justifyContent:"space-between"}}>

                    <div style={{display:"flex", alignItems:"center"}}>
                        <Spinner 
                            style={{paddingRight:"20px", visibility:this.props.loading ? "visible" : "hidden"}} 
                            name="cube-grid" 
                            color="aliceblue" 
                        />

                        <Typography style={{userSelect:"none", cursor:"default"}} variant="h6" color="inherit">
                            NIFTI Viewer
                        </Typography>
                    </div>

                    <div style={{display:"flex"}}>

                        <div style={{padding:"10px"}}>
                            <input
                                accept=".nii,.nii.gz"
                                ref={e => { this.input_model = e; }}
                                disabled={this.props.loading}
                                style={{display:'none'}}
                                onChange={event => {

                                    const files = event.target.files;
                            
                                    const file = files[0];
                            
                                    this.setState({model:file});
                            
                                }}
                                id="nii-upload-model"
                                multiple={false}
                                type="file"
                            />
                            <label htmlFor="nii-upload-model">
                                <Button  
                                    size="small" 
                                    variant="contained" 
                                    component="span"
                                    disabled={this.props.loading}
                                    onClick={e => { this.input_model.value = null; }}
                                    style={{textTransform:'none', whiteSpace:'nowrap'}}
                                >
                                    <div>Import model</div>
                                </Button>
                            </label>  
                        </div>

                        <div style={{padding:"10px"}}>
                            <input
                                accept=".nii,.nii.gz"
                                ref={e => { this.input_perfusion = e; }}
                                disabled={this.props.loading}
                                style={{display:'none'}}
                                onChange={event => {

                                    const files = event.target.files;
                            
                                    const file = files[0];
                            
                                    this.setState({perfusion:file});
                            
                                }}
                                id="nii-upload-perfusion"
                                multiple={false}
                                type="file"
                            />
                            <label htmlFor="nii-upload-perfusion">
                                <Button  
                                    size="small" 
                                    variant="contained" 
                                    component="span"
                                    disabled={this.props.loading}
                                    onClick={e => { this.input_perfusion.value = null; }}
                                    style={{textTransform:'none', whiteSpace:'nowrap'}}
                                >
                                    <div>Import perfusion map</div>
                                </Button>
                            </label>  
                        </div>

                    </div>

                    <div style={{display:"flex"}}>

                        <div style={{padding:"10px"}}>

                            <Button 
                                onClick={this.onVisualizeModel} 
                                style={{textTransform:'none', whiteSpace:'nowrap'}} 
                                size="small" 
                                component="span"
                                disabled={this.props.loading || filesMissing}
                                variant="contained" 
                            >
                                <div>Visualize Model</div>
                            </Button>

                        </div>

                        <div style={{padding:"10px"}}>

                            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                                <Button 
                                    onClick={event => {

                                        this.menu = event.target as any;
                                
                                        this.props.dispatch({ type:"showMenu", load:true });
                                
                                    }} 
                                    style={{textTransform:'none', whiteSpace:'nowrap'}} 
                                    size="small" 
                                    component="span"
                                    disabled={this.props.loading}
                                    variant="contained" 
                                >
                                    <div>Export</div>
                                </Button>
                                <Menu
                                    id="export-element-menu"
                                    anchorEl={this.menu}
                                    open={this.props.showMenu}
                                    onClose={event => this.props.dispatch({ type:"showMenu", load:false })}
                                >
                                    <MenuItem onClick={e => this.openSaveDialog("obj")} style={{fontWeight:300}}>OBJ</MenuItem>
                                    <MenuItem onClick={e => this.openSaveDialog("json")} style={{fontWeight:300}}>JSON</MenuItem>
                                    <MenuItem onClick={e => this.openSaveDialog("stl")} style={{fontWeight:300}}>STL</MenuItem>
                                </Menu>
                            </div>

                        </div>

                    </div>

                    <div style={{
                        width: "150px",
                        minWidth: "150px",
                        display: "flex",
                        alignItems: "center",
                        marginLeft: "20px",
                        justifyContent: "center"
                    }}>   
                        <div style={{
                            height:"100%",
                            width:"100%",
                            display:"flex",
                            alignItems:"center",
                            justifyContent:"center",
                            background:"gainsboro",
                            paddingLeft:"20px",
                            paddingRight:"20px",
                            paddingBottom:"15px",
                            paddingTop:"15px",
                            boxShadow:"rgba(0,0,0,0.5) 0 0 10px",
                            borderRadius:"20px"
                        }}>
                            <Slider
                                min={this.props.min}
                                max={this.props.max}
                                step={1}
                                value={this.props.slice}
                                onChange={this.onSlice}
                            />
                        </div>  
                    </div> 
 
                    {
                        isEmpty(this.props.error) ? null : 
                        <div style={{
                            color:"red",
                            fontSize:"12px",
                            fontWeight: 700,
                            top: "70px",
                            position: "absolute" 
                        }}>
                            {this.props.error}
                        </div>
                    }

                </Toolbar>

            </AppBar>

            <div style={{
                width:"100%", 
                height:"100%", 
                position:"relative",
                overflow:"hidden",
                zIndex:0
            }}>   
                <div 
                    ref={thisNode => { this.container = thisNode; }}
                    style={{
                        width:"inherit", 
                        height:"inherit", 
                        position:"absolute", 
                        top:0,
                        left:0
                    }}   
                />
            </div>
            <div style={{position:"absolute", bottom:"0px", padding:"10px", fontSize:"12px"}}>
                For Tzahi Nemet, April 2019
            </div>

            {  

                this.state.x===0 && this.state.y===0 && this.state.z===0 ? null :

                <div style={{
                    flexDirection: "column",
                    display: "flex",
                    width: "100px",
                    height: "65px",
                    position: "absolute",
                    top: "70px",
                    right: "25px"
                }}> 
                
                    <Paper  
                        elevation={1} 
                        style={{
                            height:"100%",
                            width:"100%",
                            display:"flex",
                            flexDirection:"column",
                            justifyContent:"space-between",
                            padding:"5px"
                        }}
                    >
                        <div>
                            <div style={{display:"flex"}}>
                                <div style={{paddingRight:"30px"}}>X</div>
                                <div style={{fontWeight:"bold"}}>
                                    {this.state.x}
                                </div>
                            </div>
                            <div style={{display:"flex"}}>
                                <div style={{paddingRight:"30px"}}>Y</div>
                                <div style={{fontWeight:"bold"}}>
                                    {this.state.y}
                                </div>
                            </div>
                            <div style={{display:"flex"}}>
                                <div style={{paddingRight:"30px"}}>Z</div>
                                <div style={{fontWeight:"bold"}}>
                                    {this.state.z}
                                </div>
                            </div>
                        </div>

                    </Paper>

                </div>

            }

        </div> 

    }

} 



ipcRenderer.once("loaded", (event,data) => {

    const app = document.createElement('div'); 

    app.style.width = '100%';
    app.style.height = '100%';
    app.id = 'application';

    document.body.appendChild(app);  

    ReactDOM.render( 
        <Provider store={ createStore( reducer, defaultProps as any ) }><App {...{} as any} /></Provider>,
        document.getElementById('application')
    );

});
