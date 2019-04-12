//yarn add -D https://github.com/WildHorse19/vtk-js
import './assets/fonts/index.css'; 
import './assets/styles.css'; 
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Store, dims, data } from './types';
import { reducer, defaultProps } from './reducer';
import { isEmpty, isNil, aperture, flatten, compose, sort, toPairs } from 'ramda';
import { Provider, connect } from "react-redux";
import { createStore } from "redux"; 
import { Component } from "react"; 
import { ipcRenderer, remote } from 'electron';
import { Subscription } from 'rxjs';
import { fromEvent } from 'rxjs/observable/fromEvent'; 
import Button from '@material-ui/core/Button';
import Settings from '@material-ui/icons/Settings';
import * as THREE from "three";
import { Vector3, WebGLRenderer, PerspectiveCamera, Scene, Light, Mesh, MeshPhysicalMaterial, DoubleSide, BufferGeometry } from 'three';
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
import { imageToTypedData } from './utils/imageToTypedData';
import { reshapePerfusion } from './utils/reshapePerfusion';
import { mergeVertices } from './utils/mergeVertices';
const { vtkImageMarchingCubes } = cubes;
const Spinner = require('react-spinkit');
const pool = require('typedarray-pool');
window['THREE'] = THREE;
require('three/examples/js/math/Lut');
require("three/examples/js/controls/OrbitControls");
require("./STLLoader");
require("./STLExporter");
require("./OBJExporter");



const smoothStep = (cells, positions, outAccum, trace, weight) => {

  let i
  let numVerts = positions.length
  let numCells = cells.length

  for (i = 0; i < numVerts; ++i) {
    let ov = outAccum[i]
    ov[0] = ov[1] = ov[2] = 0
    trace[i] = 0
  }
  
  for (i = 0; i < numCells; ++i) {
    
    let cell = cells[i]
    let ia = cell[0]
    let ib = cell[1]
    let ic = cell[2]

    let a = positions[ia]
    let b = positions[ib]
    let c = positions[ic]

    let abx = a[0] - b[0]
    let aby = a[1] - b[1]
    let abz = a[2] - b[2]

    let bcx = b[0] - c[0]
    let bcy = b[1] - c[1]
    let bcz = b[2] - c[2]

    let cax = c[0] - a[0]
    let cay = c[1] - a[1]
    let caz = c[2] - a[2]

    let area = 0.5 * Math.sqrt(Math.pow(aby * caz - abz * cay, 2) + Math.pow(abz * cax - abx * caz, 2) + Math.pow(abx * cay - aby * cax, 2))
    
    if (area < 1e-8) { continue }

    let w = -0.5 / area
    let wa = w * (abx * cax + aby * cay + abz * caz);
    let wb = w * (bcx * abx + bcy * aby + bcz * abz);
    let wc = w * (cax * bcx + cay * bcy + caz * bcz);

    trace[ia] += wb + wc;
    trace[ib] += wc + wa;
    trace[ic] += wa + wb;

    let oa = outAccum[ia];
    let ob = outAccum[ib];
    let oc = outAccum[ic];

    for (let i = 0; i < 3; ++i) { ob[i] += c[i] * wa }

    for (let i = 0; i < 3; ++i) { oc[i] += b[i] * wa }

    for (let i = 0; i < 3; ++i) { oc[i] += a[i] * wb }

    for (let i = 0; i < 3; ++i) { oa[i] += c[i] * wb }

    for (let i = 0; i < 3; ++i) { oa[i] += b[i] * wc }

    for (let i = 0; i < 3; ++i) { ob[i] += a[i] * wc }

  }



  for (i = 0; i < numVerts; ++i) {

    let o = outAccum[i];
    let p = positions[i];
    let tr = trace[i];

    for (let j = 0; j < 3; ++j) {
      let x = p[j];
      o[j] = x + weight * (o[j] / tr - x);
    }

  }

}



const dup = (array) => {

    let result = new Array(array.length)
  
    for (let i = 0; i < array.length; ++i) {
      result[i] = array[i].slice()
    }
  
    return result
  
}



const taubinSmooth = (cells, positions) => {

    let passBand = 0.1;
    let iters = 1;

    let trace = pool.mallocDouble(positions.length);

    let pointA = dup(positions);
    let pointB = dup(positions);

    let A = -1;
    let B = passBand;
    let C = 2;

    let discr = Math.sqrt(B * B - 4 * A * C);
    let r0 = (-B + discr) / (2 * A * C);
    let r1 = (-B - discr) / (2 * A * C);

    let lambda = Math.max(r0, r1);
    let mu = Math.min(r0, r1);

    for (let i = 0; i < iters; ++i) {
        smoothStep(cells, pointA, pointB, trace, lambda);
        smoothStep(cells, pointB, pointA, trace, mu);
    }

    pool.free(trace);

    return pointA;

}



const triangulate = (vertices:Vector3[]) => {

    var holes = [];
    var triangles, mesh;
    var geometry = new THREE.Geometry();
    var material = new THREE.MeshBasicMaterial();

    geometry.vertices = vertices;

    triangles = THREE.ShapeUtils.triangulateShape ( vertices, holes );


    for( var i = 0; i < triangles.length; i++ ){

        geometry.faces.push( new THREE.Face3( triangles[i][0], triangles[i][1], triangles[i][2] ));

    }

    return geometry

}




















interface AppState{}





@connect(store => store, attachDispatchToProps)
export class App extends Component<Store,AppState>{
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



    openSaveDialog = (extension:string) : void => {

        const object = getBrains(this.scene) as Mesh;

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
        this.renderer.shadowMapEnabled = true;
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



    histogram = (data) => {

        let hash = {};

        let max = 0;

        let min = 0;

        for(let i=0; i<data.length; i++){

            if(data[i]<min){ min = data[i]; }
            if(data[i]>max){ max = data[i]; }

            const value = data[i].toFixed(2);

            if(hash[value]){
               hash[value] += 1;
            }else{
               hash[value] = 1;
            }

        }

        let list = compose( sort((p1,p2) => p2[1]-p1[1]), toPairs )(hash);

        return { list, min, max };

    }



    imageToVolume = (data:data, model) => {

        const publicAPI : any = {};

        vtkImageMarchingCubes(publicAPI, model); 

        return publicAPI.requestData({ 
            origin:[ 0, 0, 0 ], 
            spacing:[ 1, 1, 1 ],  
            dims:[ 
                data.niftiHeader.dims[1],
                data.niftiHeader.dims[2], 
                data.niftiHeader.dims[3] 
            ], 
            s:data.niftiImage
        });

    }



    perfusionToColors = (perfusion:data) => {

        const lutColors = [];

        const { list, min, max } = this.histogram(perfusion.niftiImage); 

        const lut = new THREE['Lut']('rainbow', 15);

        const dim = { 
            x : perfusion.niftiHeader.dims[1],  
            y : perfusion.niftiHeader.dims[2], 
            z : perfusion.niftiHeader.dims[3] 
        };
        
        lut.setMin(1);

        lut.setMax(max);

        let ctr = 0;



        for(let z = 0; z < dim.z; z++){

            for(let y = 0; y < dim.y; y++){

                for(let x = 0; x < dim.x; x++){

                    const offset = (z * dim.x * dim.y) + (y * dim.x) + x;
                
                    const entry = perfusion.niftiImage[offset];

                    const color = lut.getColor( entry );

                    lutColors[ 3 * ctr ] = entry===0 ? Math.round(Math.random() * 255) : color.r*255;
                    lutColors[ 3 * ctr + 1 ] = entry===0 ? Math.round(Math.random() * 255) : color.g*255; 
                    lutColors[ 3 * ctr + 2 ] = entry===0 ? Math.round(Math.random() * 255) : color.b*255;


                    ctr++;

                }

            }

        }

        return lutColors;

    }



    onNIFTILoaded = (data:data, perfusion:data) => {

        this.localPlane = new THREE.Plane( new THREE.Vector3(0, -1, 0), 0.8 );

        const model = { computeNormals:true, mergePoints:true, contourValue:1, classHierarchy:[], perfusion }; //colors

        const result = this.imageToVolume(data, model);

        const cells : number[] = result.t; //new Uint32Array(tBuffer)

        const points : number[] = result.p; //new Float32Array(pBuffer)

        const normals : number[] = result.n; //new Float32Array(nBuffer)

        const colors : number[] = result.c;
   
        //console.log(colors);



        let geometry = new THREE.BufferGeometry();

        geometry.addAttribute('normal', new THREE.BufferAttribute( new Float32Array(normals), 3));
            
        geometry.addAttribute('position', new THREE.BufferAttribute( new Float32Array(points), 3));

        geometry.computeBoundingBox();



        const mesh = this.meshFromGeometry(geometry);

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



        const object = getBrains(this.scene);



        replaceSceneObject(this.scene, object, mesh);

    }



    onVisualizeModel = () => {

        if(isNil(this.model) || isNil(this.perfusion)){ return; }

        this.props.dispatch({ type:"multiple", load:[ {type:"error", load:""}, {type:"loading", load:true} ]});

        return Promise.all([ 
            
            readNIFTIFile(this.model), 
            
            readNIFTIFile(this.perfusion) 
        
        ])
        .then(

            ([model, perfusion]:[data,data]) => {

                const model_dim = { x:model.niftiHeader.dims[1],  y:model.niftiHeader.dims[2], z:model.niftiHeader.dims[3] };

                perfusion.niftiImage = imageToTypedData(perfusion.niftiImage, perfusion.niftiHeader);

                model.niftiImage = imageToTypedData(model.niftiImage, model.niftiHeader);

                const perfusionEqualized = reshapePerfusion(perfusion, model_dim);

                this.onNIFTILoaded(model, perfusionEqualized);

                this.props.dispatch({ type:"loading", load:false });

                this.model = undefined;

                this.perfusion = undefined;
        
            } 

        );

    }



    meshFromGeometry = geometry => {
      

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
        
        //new THREE.MeshBasicMaterial( { vertexColors: THREE.VertexColors } );
        
        /*new THREE.MeshLambertMaterial({
            clippingPlanes: [ this.localPlane ],
            vertexColors: THREE.VertexColors,
            reflectivity: 0.5,
            side: DoubleSide,
            transparent: false, 
            opacity: 1,
            clipShadows: true,
            depthTest: true
        });*/
        
        
        /*new THREE.ShaderMaterial( {
            uniforms: {
                color1: {
                  value: new THREE.Color("red")
                },
                color2: {
                  value: new THREE.Color("purple")
                },
                bboxMin: {
                  value: geometry.boundingBox.min
                },
                bboxMax: {
                  value: geometry.boundingBox.max
                }
              },
            vertexShader: document.getElementById( 'vertexShader' ).textContent,
            fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
            side: THREE.DoubleSide,
            transparent: true
        } );*/
        
        
        /*
        new THREE.MeshPhongMaterial( {
            clippingPlanes: [ this.localPlane ],
            vertexColors: THREE.VertexColors,
            specular: 0x222222,
            shininess: 25,
            //bumpMap: mapHeight,
            //bumpScale: 12
        } );
        */

        
        /*new MeshPhysicalMaterial({
            clippingPlanes: [ this.localPlane ],
            vertexColors: THREE.VertexColors,
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
        });*/

        const mesh = new THREE.Mesh(geometry, material);

        mesh.castShadow = true;

        mesh.receiveShadow = true;

        mesh.frustumCulled = false;

        mesh.userData.brain = true;

        return mesh;

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
                                onChange={event => {

                                    const files = event.target.files;
                            
                                    const file = files[0];
                            
                                    this.model = file;
                            
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
                            
                                    this.perfusion = file;
                            
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
                                disabled={this.props.loading}
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
                                    onClose={event => {

                                        this.props.dispatch({ type:"showMenu", load:false });
                                
                                    }}
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
            <script id="vertexShader" type="x-shader/x-vertex">
            { 
            `
                uniform vec3 bboxMin;
                uniform vec3 bboxMax;
                
                varying vec2 vUv;
                
                void main() {
                    vUv.y = (position.y - bboxMin.y) / (bboxMax.y - bboxMin.y);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
                }
            `
            }
            </script>

            <script id="fragmentShader" type="x-shader/x-fragment">
            {`
                uniform vec3 color1;
                uniform vec3 color2;

                varying vec2 vUv;

                void main() {
                
                gl_FragColor = vec4(mix(color1, color2, vUv.y), 1.0);
            }
            `}
            </script>
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















/*

    subdivide = (geometry:BufferGeometry) => {

        const geometry2 = new THREE.Geometry().fromBufferGeometry(geometry);

        const modifier = new SubdivisionModifier(3); 

        modifier.modify( geometry2 );
        
        return new THREE.BufferGeometry().fromGeometry(geometry2);

    }

    this.localPlane = new THREE.Plane( new THREE.Vector3(0, -1, 0), 0.8 );

    const model = { computeNormals:true, mergePoints:true, contourValue:1, classHierarchy:[], perfusion }; //colors

    const result = this.imageToVolume(data, model);

    const cells : number[] = result.t; //new Uint32Array(tBuffer)

    const points : number[] = result.p; //new Float32Array(pBuffer)

    const normals : number[] = result.n; //new Float32Array(nBuffer)

    const colors : number[] = result.c;

    console.log(colors);
    
    // SMOOTH ATTEMPT 1
    const positions3 = aperture(3, points); //geometry.vertices.map(vertex => [vertex.x, vertex.y, vertex.z]);

    const cells3 = aperture(3, cells); //geometry.faces.map(face => [face.a, face.b, face.c]);

    const positionsTaubin = smooth(cells3, positions3, { passBand: 0.1, iters: 1});
    
    const positionsSmooth = [];

    for(let i=0; i<positionsTaubin.length; i++){

        const next = positionsTaubin[i];

        for(let j=0; j<3; j++) positionsSmooth.push(next[j]);

    }

    const positionsTyped = new Float32Array(positionsSmooth);
    

    // COLORATION
    const colors = this.perfusionToColors(perfusion);

    const colorAttribute = new THREE.Float32BufferAttribute( colors, 3 );

    colorAttribute.normalized = true;

    geometry.addAttribute('color', colorAttribute);
    
    for ( var i = 0; i < geometry2.vertices.length; i++ ) 
    {

        const color = new THREE.Color(`rgb( ${colors[i*3]}, ${colors[i*3+1]}, ${colors[i*3+2]} )`);

        //( colors[i*3], colors[i*3+1], colors[i*3+2] );
            
        //color.setRGB( colors[i*3], colors[i*3+1], colors[i*3+2] );

        geometry2.colors[i] = color;

    }

    
    for ( var i = 0; i < geometry2.faces.length; i++ ) 
    {

        const color1 = new THREE.Color(`rgb( ${colors[i*3]}, ${colors[i*3+1]}, ${colors[i*3+2]} )`);

        const color2 = new THREE.Color(`rgb( ${colors[(i+1)*3]}, ${colors[(i+1)*3+1]}, ${colors[(i+1)*3+2]} )`);

        const color3 = new THREE.Color(`rgb( ${colors[(i+2)*3]}, ${colors[(i+2)*3+1]}, ${colors[(i+2)*3+2]} )`);

        //( colors[i*3], colors[i*3+1], colors[i*3+2] );
            
        //color.setRGB( colors[i*3], colors[i*3+1], colors[i*3+2] );
        const face = geometry2.faces[i];

        face.vertexColors[0] = color1; // red
        face.vertexColors[1] = color2; // green
        face.vertexColors[2] = color3; // blue

        //geometry2.colors[i] = color;

    }
    


    let geometry : any = new THREE.BufferGeometry();

    geometry.addAttribute('normal', new THREE.BufferAttribute( new Float32Array(normals), 3));
        
    geometry.addAttribute('position', new THREE.BufferAttribute( new Float32Array(points) , 3) );


       
    let geometry2 = new THREE.Geometry().fromBufferGeometry(geometry);

    const positions3 = geometry2.vertices.map(vertex => [vertex.x, vertex.y, vertex.z]);

    const cells3 = geometry2.faces.map(face => [face.a, face.b, face.c]);

    const positionsTaubin = smooth(cells3, positions3, { passBand: 0.1, iters: 1});

    geometry2.vertices = positionsTaubin.map( tuple => new THREE.Vector3( tuple[0], tuple[1], tuple[2] ) );

    geometry2 = triangulate(geometry2.vertices); 

    geometry2.computeBoundingBox();



    let geometry3 : any = new THREE.BufferGeometry();

    const positionsSmooth = [];

    for(let i=0; i<positionsTaubin.length; i++){

        const next = positionsTaubin[i];

        for(let j=0; j<3; j++) positionsSmooth.push(next[j]);

    }

    geometry3.addAttribute('position', new THREE.BufferAttribute( new Float32Array(positionsSmooth) , 3) );
    geometry3.computeBoundingBox();


    const geometry4 = new THREE.Geometry().fromBufferGeometry(geometry3);

    geometry4.computeVertexNormals();
    geometry4.mergeVertices();
    geometry4.computeBoundingBox();


    // SUBDIVISIONS MODIFIER
    //const modifier = new SubdivisionModifier(2); 
    //modifier.modify( geometry2 );
    
    //geometry = new THREE.BufferGeometry().fromGeometry(geometry3);

    //geometry.computeBoundingBox();

*/