//yarn add -D https://github.com/WildHorse19/vtk-js
import './assets/fonts/index.css'; 
import './assets/styles.css'; 
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Store } from './types';
import { reducer, defaultProps } from './reducer';
import { isEmpty, isNil } from 'ramda';
import { Provider, connect } from "react-redux";
import { createStore } from "redux"; 
import { Component } from "react"; 
import { ipcRenderer, remote } from 'electron';
import { Subscription } from 'rxjs';
import { fromEvent } from 'rxjs/observable/fromEvent'; 
import Button from '@material-ui/core/Button';
import Settings from '@material-ui/icons/Settings';
import * as THREE from "three";
import { Vector3, WebGLRenderer, PerspectiveCamera, Scene, Light, Mesh, MeshPhysicalMaterial, DoubleSide } from 'three';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Slider from '@material-ui/lab/Slider';
import Popover from '@material-ui/core/Popover';
import IconButton from '@material-ui/core/IconButton';
import Checkbox from '@material-ui/core/Checkbox';
import cubes from 'vtk.js/Sources/Filters/General/ImageMarchingCubes';
import { readNIFTIFile } from './utils/readNIFTIFile';
import { getObjectCenter } from './utils/getObjectCenter';
import { replaceSceneObject } from './utils/replaceSceneObject';
import { attachDispatchToProps } from './utils/attachDispatchToProps';
import { getBrains } from './utils/getBrains';
import { exportStl } from './utils/exportStl';
import { exportJSON } from './utils/exportJSON';
import { exportObj } from './utils/exportObj';
import { initLights } from './utils/initLights';
const { vtkImageMarchingCubes } = cubes;
const Spinner = require('react-spinkit');
const resizeImageData = require('resize-image-data');
const nifti = require("nifti-reader-js");

window['THREE'] = THREE;

require("three/examples/js/controls/OrbitControls");
require("./STLLoader");
require("./STLExporter");
require("./OBJExporter");



function drawCanvasA(canvas, slice, niftiHeader, niftiImage) {
           
    var x_max = niftiHeader.dims[1]; 
    var y_max = niftiHeader.dims[2]; 
    var z_max = niftiHeader.dims[3];

    var x = 0;
    var y = 0; 
    var z = Number(slice);

    canvas.width = x_max;
    canvas.height = y_max;

    var ctx = canvas.getContext("2d");
    var canvasImageData = ctx.createImageData(canvas.width, canvas.height);

    let typedData = new Uint8Array(niftiImage) as any;

     if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT8) {
         typedData = new Uint8Array(niftiImage);
     } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT16) {
         typedData = new Int16Array(niftiImage);
     } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT32) {
         typedData = new Int32Array(niftiImage);
     } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_FLOAT32) {
         typedData = new Float32Array(niftiImage);
     } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_FLOAT64) {
         typedData = new Float64Array(niftiImage);
     } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT8) {
         typedData = new Int8Array(niftiImage);
     } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT16) {
         typedData = new Uint16Array(niftiImage);
     } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT32) {
         typedData = new Uint32Array(niftiImage);
     } else {
         return undefined;
     }

     for (y = 0; y < y_max; y++) {

         for (x = 0; x < x_max; x++) {

            var offset = (z * x_max * y_max) + (y * x_max) + x;
            
            var v = typedData[offset];

            var image_location = (y * x_max + x) * 4;

            canvasImageData.data[image_location] = v;
            canvasImageData.data[image_location + 1] = v;
            canvasImageData.data[image_location + 2] = v;
            canvasImageData.data[image_location + 3] = 0xFF;

         }

    }

    ctx.putImageData(canvasImageData, 0, 0);

 }



type data = { niftiHeader:any, niftiImage:any, typedData:any };



type dims = { x:number, y:number, z:number };



const resize = ( original_dims, target_dims, data ) => {

    const difference_xy = (target_dims.x * target_dims.y - original_dims.x * original_dims.y) * original_dims.z;

    const difference_z = (target_dims.z - original_dims.z) * target_dims.x * target_dims.y;

    const interval = original_dims.z/Math.abs(target_dims.z - original_dims.z);

    let newLength = data.byteLength + difference_xy;

    while(newLength%4!==0){ newLength++; } 

    const dataInterface = new Uint8Array(data);

    const dest = new ArrayBuffer(newLength); 
            
    const dest_interface = new Uint8Array(dest);

    const canvas = document.createElement('canvas');


    const x_max = original_dims.x; 
    const y_max = original_dims.y; 
    const z_max = original_dims.z;

    let x = 0;
    let y = 0; 
    let z = 0;
    let ctr = 0;

    for(z = 0; z < z_max; z++){

        //if( z % interval===0 && difference_z < 0 ){ 
            //console.log(`remove slice ${z}`);
            //continue; 
        //}

        canvas.width = x_max;
        canvas.height = y_max;
        const ctx = canvas.getContext("2d");
        const canvasImageData = ctx.createImageData(canvas.width, canvas.height);

        for (y = 0; y < y_max; y++) {

            for (x = 0; x < x_max; x++) {

                const offset = (z * x_max * y_max) + (y * x_max) + x;
                
                const v = dataInterface[offset];

                const image_location = (y * x_max + x) * 4;

                canvasImageData.data[image_location] = v;
                canvasImageData.data[image_location + 1] = v;
                canvasImageData.data[image_location + 2] = v;
                canvasImageData.data[image_location + 3] = 0xFF;

            }

        }

        const result = resizeImageData(canvasImageData, target_dims.x, target_dims.y, 'biliniear-interpolation');
        
        const buffer = new Uint8Array(result.data);

        for (y = 0; y < target_dims.y; y++) {

            for (x = 0; x < target_dims.x; x++) {

                const image_location = (y * target_dims.x + x) * 4;

                dest_interface[ctr++] = buffer[image_location];

            }

        }

        /*
        //if( z % interval===0 && difference_z > 0 ){ 

            //console.log(`duplicate slice ${z}`);

            //for(let i=0; i<buffer.length; i+=4){

                //dest[ctr++] = buffer[i];
    
            //}

        //}
        */

    }

    return dest;

}

interface AppState{}



@connect(store => store, attachDispatchToProps)
export class App extends Component<Store,any>{
    anchor:HTMLElement
    resize:Subscription
    menu:HTMLElement
    input_model:HTMLInputElement
    input_perfusion:HTMLInputElement
    container:HTMLElement
    boundingBox:any
    scene:Scene
    camera:PerspectiveCamera
    renderer:WebGLRenderer
    controls:any
    localPlane:any

    model:any 
    perfusion:any



    constructor(props){ 

        super(props);

        this.state = {};

    } 



    openSaveDialog = (extension:string) : void => {

        const object = getBrains(this.scene) as Mesh;

        this.closeExportMenu(null);

        if(isNil(object)){ 
            this.emptySceneError();
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



    componentDidMount(){

        this.resize = fromEvent(window, "resize").subscribe(this.onResize);

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
        this.renderer.shadowMapEnabled = true;
        this.renderer.localClippingEnabled = true;

        this.container.appendChild(this.renderer.domElement);
    
        this.controls = new THREE['OrbitControls'](this.camera, this.container);
        
        this.controls.enablePan = false;

        //this.controls.autoRotateSpeed = 8.0;

        const lights = initLights();

        lights.forEach((light:Light) => this.scene.add(light));

        this.animate();

        //this.controls.addEventListener( 'change', () =>  this.renderer.render(this.scene, this.camera) ); 

        //this.renderer.render(this.scene, this.camera);

    }    



    update = () => {

        this.boundingBox = this.container.getBoundingClientRect();
        
        this.props.dispatch({
            type:"multiple",
            load:[
                {type:"width", load:this.boundingBox.width},
                {type:"height", load:this.boundingBox.height}
            ]
        });

    }



    animate = () => {  
        
        this.update();

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



    showError = (e) => {

        this.props.dispatch({
            type:"error", 
            load:"Unable to load model. Try different settings or contact support. "
        });

        this.props.dispatch({type:"loading", load:false});

    }



    showExportMenu = event => {

        this.menu = event.target;

        this.props.dispatch({ type:"showMenu", load:true });

    }



    closeExportMenu = event => {

        this.props.dispatch({ type:"showMenu", load:false });

    }



    emptySceneError = () => {

        this.props.dispatch({
            type:"multiple", 
            load:[
                {type:"error", load:"Scene is empty. Nothing to export."},
                {type:"loading", load:false}
            ]
        });

    }



    onNIFTILoaded = (data:data, perfusion:data) => {

        const geometry = this.geometryFromNIFTI(data);

        const mesh = this.meshFromGeometry(geometry);

        mesh.geometry.computeBoundingBox();

        const wd = mesh.geometry.boundingBox.max.x - mesh.geometry.boundingBox.min.x;

        const hg = mesh.geometry.boundingBox.max.y - mesh.geometry.boundingBox.min.y;

        const max_y = mesh.geometry.boundingBox.max.y;

        this.localPlane.constant = max_y;

        this.props.dispatch({
            type:"multiple",
            load:[
                {type:"slice", load:max_y},
                {type:"max", load:max_y},
                {type:"min", load:0}
            ]
        });

        const bbox = new THREE['BoundingBoxHelper']( mesh );

        bbox.update();

        this.scene.add( bbox );

        const center = getObjectCenter(mesh);

        this.camera.position.x = wd*2;
        this.camera.position.y = hg*2;
        this.camera.position.z = 0;

        this.controls.target.set(center.x, center.y, center.z);

        this.camera.lookAt(this.controls.target);

        const object = getBrains(this.scene);

        replaceSceneObject(this.scene, object, mesh); 
       
        this.renderer.render(this.scene, this.camera);

    }



    geometryFromNIFTI = (data:{ niftiHeader:any, niftiImage:any, typedData:any }) => {

        const model = { computeNormals:true, mergePoints:true, contourValue:1, classHierarchy:[] };

        const publicAPI : any = {};

        vtkImageMarchingCubes(publicAPI, model); 

        const result = publicAPI.requestData({ 
            origin:[ 0, 0, 0 ], 
            spacing:[ 1, 1, 1 ],  
            dims:[ 
                data.niftiHeader.dims[1],
                data.niftiHeader.dims[2], 
                data.niftiHeader.dims[3] 
            ], 
            s:data.niftiImage
        });



        console.log("vtkImageMarchingCubes result", result);



        const geometry = new THREE.BufferGeometry();

        geometry.addAttribute('normal', new THREE.BufferAttribute( result.n, 3 ));

        geometry.addAttribute('position', new THREE.BufferAttribute( result.p , 3 ));

        const colors = this.computeColors(geometry);

        geometry.addAttribute('color', new THREE.BufferAttribute( colors, 3, true) );

        return geometry;

    }



    meshFromGeometry = geometry => {

        this.localPlane = new THREE.Plane( new THREE.Vector3(0, -1, 0), 0.8 );

        const material = new MeshPhysicalMaterial({
            clippingPlanes: [ this.localPlane ],
            //vertexColors: THREE.VertexColors,
            metalness: 0.5,
            roughness: 0.5,
            clearCoat: 0.5,
            clearCoatRoughness: 0.5,
            reflectivity: 0.5,
            side: DoubleSide,
            transparent: false, 
            opacity: 1,
            clipShadows: true,
            depthTest: true
        });

        const mesh = new THREE.Mesh(geometry, material);

        mesh.castShadow = true;

        mesh.receiveShadow = true;

        mesh.userData.brain = true;

        mesh.frustumCulled = false;

        return mesh;

    }



    //TODO
    computeColors = geometry => {

        const colors = [];

        for(let i=0; i < geometry.attributes.position.count; i++){

            colors.push( 
                Math.round( Math.random() * 255 ), 
                Math.round( Math.random() * 255 ), 
                Math.round( Math.random() * 255 )
            );

        }

        return new Uint8Array(colors);
        
    }



    equalizeData = (perfusion, model) => {

        const model_dim = {
            x:model.niftiHeader.dims[1],
            y:model.niftiHeader.dims[2],
            z:model.niftiHeader.dims[3]
        };

        const perfusion_dim = {
            x:perfusion.niftiHeader.dims[1],
            y:perfusion.niftiHeader.dims[2],
            z:perfusion.niftiHeader.dims[3]
        };



        if(
            model_dim.x === perfusion_dim.x &&
            model_dim.y === perfusion_dim.y &&
            model_dim.z === perfusion_dim.z
        ){

            return perfusion;

        }else{

            perfusion.niftiImage = resize(perfusion_dim, model_dim, perfusion.niftiImage);

            perfusion.niftiHeader.dims[1] = model_dim.x;
            perfusion.niftiHeader.dims[2] = model_dim.y;
            perfusion.niftiHeader.dims[3] = model_dim.z;

            return perfusion;

        }

    }



    renderModel = () => {

        const model = this.model;

        const perfusion = this.perfusion;

        if(isNil(model) || isNil(perfusion)){ return; }



        this.props.dispatch({
            type:"multiple",
            load:[
                {type:"error", load:""},
                {type:"loading", load:true}
            ]
        });



        Promise.all([
            readNIFTIFile(model),
            Promise.resolve(null) //readNIFTIFile(perfusion)
        ])
        .then(

            ([model, perfusion]:[data,data]) => {

                const perfusionEqualized = perfusion; //this.equalizeData(perfusion, model);

                //TEST
                ///////////////////////////////////////////////////////////////
                const model_dim = { x:model.niftiHeader.dims[1], y:model.niftiHeader.dims[2], z:model.niftiHeader.dims[3] };
                const target_dim = { x:500, y:100, z:100 };
    
                model.niftiImage = model.niftiImage;// resize(model_dim, target_dim, model.niftiImage);
    
                model.niftiHeader.dims[1] = target_dim.x;
                model.niftiHeader.dims[2] = target_dim.y;
                model.niftiHeader.dims[3] = target_dim.z;

                let typedData : any = new Int32Array(model.niftiImage );

                if (model.niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT8) {
                    typedData = new Uint8Array(model.niftiImage );
                } else if (model.niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT16) {
                    typedData = new Int16Array(model.niftiImage );
                } else if (model.niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT32) {
                    typedData = new Int32Array(model.niftiImage );
                } else if (model.niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_FLOAT32) {
                    typedData = new Float32Array(model.niftiImage );
                } else if (model.niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_FLOAT64) {
                    typedData = new Float64Array(model.niftiImage );
                } else if (model.niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT8) {
                    typedData = new Int8Array(model.niftiImage );
                } else if (model.niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT16) {
                    typedData = new Uint16Array(model.niftiImage );
                } else if (model.niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT32) {
                    typedData = new Uint32Array(model.niftiImage );
                }
                ////////////////////////////////////////////////////////////////
                model.niftiImage = typedData; 
                this['model_data'] = model;
    
                var slices = model.niftiHeader.dims[3];
    
                this.setState({
                    value:slices - 1, max:Math.round(slices / 2)
                })
             


                this.onNIFTILoaded( model, perfusionEqualized  );

                this.props.dispatch({ type:"loading", load:false });
        
            } 

        )

    }



    getModel = event => {

        const files = event.target.files;

        const file = files[0];

        this.model = file;

    }



    getPerfusion = event => {

        const files = event.target.files;

        const file = files[0];

        this.perfusion = file;

    }



    render() {  


        
        return <div style={{height:'100%', width:'100%', display:"flex", flexDirection:"column"}}> 

            <AppBar position="static">

                <Toolbar variant="dense">

                    <Spinner 
                        style={{paddingRight:"20px", visibility:this.props.loading ? "visible" : "hidden"}} 
                        name="cube-grid" 
                        color="steelblue" 
                    />

                    <Typography style={{minWidth:"170px", userSelect:"none", cursor:"default"}} variant="h6" color="inherit">
                        NIFTI Viewer
                    </Typography>

                    <div style={{display:"flex"}}>

                        <div style={{padding:"10px"}}>
                            <input
                                accept=".nii,.nii.gz"
                                ref={e => { this.input_model = e; }}
                                disabled={this.props.loading}
                                style={{display:'none'}}
                                onChange={this.getModel}
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
                                onChange={this.getPerfusion}
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
                                onClick={this.renderModel} 
                                style={{textTransform:'none', whiteSpace:'nowrap'}} 
                                size="small" 
                                component="span"
                                disabled={this.props.loading}
                                variant="contained" 
                            >
                                <div>Render model</div>
                            </Button>

                        </div>

                        <div style={{padding:"10px"}}>

                            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                                <Button 
                                    onClick={this.showExportMenu} 
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
                                    onClose={this.closeExportMenu}
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

                    <div style={{flex:1, display:"flex", justifyContent:"flex-end", zIndex:1000}} ref={e => { this.anchor=e; }}>
                        <IconButton onClick={e => this.props.dispatch({type:"showSettings", load:true})}>
                            <Settings style={{color:"white"}} />
                        </IconButton>
                    </div>

                </Toolbar>

                <Popover
                    id={`popover`}
                    open={this.props.showSettings}
                    anchorEl={this.anchor}
                    onClose={e => this.props.dispatch({type:"showSettings", load:false})}
                    anchorOrigin={{vertical:'bottom', horizontal:'center'}}
                    transformOrigin={{vertical:'top', horizontal:'center'}}
                >
                    <div style={{width:"300px", height:"220px"}}>

                        <div style={{display:"flex", flexDirection:"column", padding:"20px"}}>
                            <Typography style={{paddingBottom:"10px"}}>Smoothing iterations: {this.props.smooth}</Typography>
                            <Slider
                                min={1}
                                max={1000}
                                step={10}
                                value={this.props.smooth}
                                onChange={(e,v) => this.props.dispatch({type:"smooth", load:v})}
                            />
                        </div>

                        <div style={{display:"flex", alignItems:"center", padding:"20px"}}>
                            <Checkbox 
                                checked={ this.props.shouldThreshold } 
                                onChange={e => this.props.dispatch({type:"shouldThreshold", load:!this.props.shouldThreshold})}
                                style={{padding:"0px", color:"rgb(25, 118, 210)"}} 
                            />   
                            <Typography  style={{paddingLeft:"5px"}}>Threshold image</Typography>
                        </div>   

                        <div style={{display:"flex", flexDirection:"column", padding:"20px"}}>
                            <Typography style={{paddingBottom:"10px"}}>Image threshold: {this.props.thresh}</Typography>
                            <Slider
                                disabled={!this.props.shouldThreshold}
                                min={1}
                                max={250}
                                step={1}
                                value={this.props.thresh}
                                onChange={(e,v) => this.props.dispatch({type:"thresh", load:v})}
                            />
                        </div>

                    </div> 
                </Popover>

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
            <div style={{position:"absolute", top:0, left:0, zIndex:999999}}> 
                <canvas id="myCanvas" width="100" height="100"></canvas><br />
                <input 
                type="range" 
                min="1" 
                max="100" 
                value={this.state.slice}
                onChange={e => this.setState({ value:e.target.value }, () => {
                            var canvas = document.getElementById('myCanvas');
                            drawCanvasA(canvas, this.state.value, this['model_data'].niftiHeader, this['model_data'].niftiImage)
                        } 
                )} id="myRange"/>
            </div>
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