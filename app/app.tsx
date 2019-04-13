import './assets/fonts/index.css'; 
import './assets/styles.css'; 
import '../node_modules/react-vis/dist/style.css';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Store, niftiData } from './types';
import { reducer, defaultProps } from './reducer';
import { isEmpty, isNil, compose, sort, drop, toPairs } from 'ramda';
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
import { readNIFTIFile } from './utils/readNIFTIFile';
import { getObjectCenter } from './utils/getObjectCenter';
import { removeObject } from './utils/removeObject';
import { attachDispatchToProps } from './utils/attachDispatchToProps';
import { exportStl } from './utils/exportStl';
import { exportJSON } from './utils/exportJSON';
import { exportObj } from './utils/exportObj';
import { initLights } from './utils/initLights';
import { imageToTypedData } from './utils/imageToTypedData';
import { reshapePerfusion } from './utils/reshapePerfusion';
import { imageToVolume } from './utils/imageToVolume';
import { isNotNil } from './utils/isNotNil';

const Spinner = require('react-spinkit');



window['THREE'] = THREE;



require('three/examples/js/math/Lut');
require("three/examples/js/controls/OrbitControls");
require("./exporters/STLLoader");
require("./exporters/STLExporter");
require("./exporters/OBJExporter");
require("./SubdivisionModifier");




/*
perform_histogram_equalization(
            image, 
            histogram,
            gray_levels,
            new_grays, 
            length,
            width
)

int   gray_levels, new_grays;
long  length, width;
short **image;
unsigned long histogram[];

{
    int i,
    j,
    k;
    unsigned long sum,
    sum_of_h[gray_levels];

    double constant;

    sum = 0;
    for(i=0; i<gray_levels; i++){
        sum         = sum + histogram[i];
        sum_of_h[i] = sum;
    }

    constant = (float)(new_grays)/(float)(length*width);

    for(i=0; i<length; i++){
        for(j=0; j<width; j++){
            k           = image[i][j];
            image[i][j] = sum_of_h[k] * constant;
        }
    }

}  
*/
















const f = x => 1/(1 + Math.exp(-x));



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

        if(isNil(this.model) || isNil(this.perfusion)){ return; }



        this.props.dispatch({ type:"multiple", load:[ {type:"error", load:""}, {type:"loading", load:true} ] });



        return Promise.all([ 
            
            readNIFTIFile(this.model), 
            
            readNIFTIFile(this.perfusion) 
        
        ])
        .then(( [model, perfusion] : [niftiData, niftiData] ) => {

            const model_dim = { x:model.niftiHeader.dims[1],  y:model.niftiHeader.dims[2], z:model.niftiHeader.dims[3] };

            model.niftiImage = imageToTypedData(model.niftiImage, model.niftiHeader);

            perfusion.niftiImage = imageToTypedData(perfusion.niftiImage, perfusion.niftiHeader);

            const perfusionEqualized = reshapePerfusion(perfusion, model_dim); //!

            this.onNIFTILoaded(model, perfusionEqualized);

            this.props.dispatch({ type:"loading", load:false });

            this.model = undefined;

            this.perfusion = undefined;
        
        });

    }



    meshFromGeometry = geometry => {
    
        const material = new MeshPhysicalMaterial({
            clippingPlanes: [ this.localPlane ],
            vertexColors: THREE.VertexColors,
            metalness: 0.1,
            roughness: 0.8,
            clearCoat: 0.2,
            clearCoatRoughness: 0.2,
            reflectivity: 0.0,
            side: DoubleSide,
            transparent: false, 
            opacity: 1,
            clipShadows: true,
            depthTest: true
        });

        const mesh = new THREE.Mesh(geometry, material);

        mesh.castShadow = true;

        mesh.receiveShadow = true;

        mesh.frustumCulled = false;

        mesh.userData.brain = true;

        return mesh;

    }



    getBoundaries = data => {
        
        let max = 0;
    
        let min = 0;
    
        for(let i=0; i<data.length; i++){
    
            if(data[i]<min){ min = data[i]; }
            if(data[i]>max){ max = data[i]; }
    
        }

        return { min, max };
    }



    histogram = data => {

        let hash = {};
    
        for(let i=0; i<data.length; i++){
    
            const value = data[i].toString();
    
            if(isNotNil(hash[value])){
               hash[value] += 1;
            }else{
               hash[value] = 1;
            }
    
        }

        return hash;  
    
    }



    colorize = (geometry:BufferGeometry, colors:number[]) => {

        const geometry2 = new THREE.Geometry().fromBufferGeometry(geometry);



        const lut = new THREE['Lut']('rainbow', 512);

        lut.setMin(0);

        lut.setMax(geometry2.faces.length+10);

        for ( var i = 0; i < geometry2.faces.length; i++ ){

            const face = geometry2.faces[i];

            //z * slice + y * dims[0] + x
            let c0 = i; //colors[i];
            let c1 = colors[i*3];
            let c2 = colors[i*3+1];
            let c3 = colors[i*3+2];

            //if(!c0){ continue }

            /*let a = lut.getColor(c1);
            let b = lut.getColor(c2);
            let c = lut.getColor(c3);*/
            let k = lut.getColor(c0);

            const color1 = new THREE.Color(k.r, k.g, k.b);
            const color2 = new THREE.Color(k.r, k.g, k.b); 
            const color3 = new THREE.Color(k.r, k.g, k.b);
/*
            const color1 = new THREE.Color(a.r, a.g, a.b);
            const color2 = new THREE.Color(b.r, b.g, b.b); 
            const color3 = new THREE.Color(c.r, c.g, c.b);
*/        
            face.vertexColors[0] = color1
            face.vertexColors[1] = color2;
            face.vertexColors[2] = color3;

        }

        return geometry2; //new THREE.BufferGeometry().fromGeometry(geometry2);

    }



    onNIFTILoaded = (data:niftiData, perfusion:niftiData) => {

        this.localPlane = new THREE.Plane( new THREE.Vector3(0, -1, 0), 0.8 );

        const result = imageToVolume(data, perfusion);

        const points : number[] = result.p;

        const normals : number[] = result.n;

        const { dims } = perfusion.niftiHeader;

        const { min, max } = this.getBoundaries([]);
        
        const { perfusionNormals, perfusionPoints } = result;




        //
        let coloration = new THREE.BufferGeometry();

        coloration.addAttribute('normal', new THREE.BufferAttribute( new Float32Array(perfusionNormals), 3));

        coloration.addAttribute('position', new THREE.BufferAttribute( new Float32Array(perfusionPoints), 3));
        
        coloration = this.colorize(coloration,[]) as any;

        coloration.computeBoundingBox();
        //

        let geometry = new THREE.BufferGeometry();

        geometry.addAttribute('normal', new THREE.BufferAttribute( new Float32Array(normals), 3));

        geometry.addAttribute('position', new THREE.BufferAttribute( new Float32Array(points), 3));

        geometry.computeBoundingBox();



        const mesh = this.meshFromGeometry(geometry);

        const mesh2 = this.meshFromGeometry(coloration);

        mesh.add(mesh2);

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
