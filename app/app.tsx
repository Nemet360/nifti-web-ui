import './assets/fonts/index.css'; 
import './assets/styles.css'; 
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Store, niftiData } from './types';
import { reducer, defaultProps } from './reducer';
import { isEmpty, isNil, compose, sort, drop, toPairs, map, divide } from 'ramda';
import { Provider, connect } from "react-redux";
import { createStore } from "redux"; 
import { Component } from "react"; 
import { ipcRenderer, remote } from 'electron';
import { Subscription } from 'rxjs';
import { fromEvent } from 'rxjs/observable/fromEvent'; 
import Button from '@material-ui/core/Button';
import Settings from '@material-ui/icons/Settings';
import * as THREE from "three";
import { Vector3, WebGLRenderer, PerspectiveCamera, Scene, Light, Mesh, MeshPhysicalMaterial, DoubleSide, BufferGeometry, Geometry, Raycaster } from 'three';
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
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { projectMask } from './utils/projectMask';
import { meshFromGeometry } from './utils/meshFromGeometry';
import { histogram } from './utils/histogram';
import { getBoundaries } from './utils/getBoundaries';
import { equalize } from './utils/equalize';



THREE.BufferGeometry.prototype['computeBoundsTree'] = computeBoundsTree;
THREE.BufferGeometry.prototype['disposeBoundsTree'] = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;



let gaussian5 = (
    x1, x2, x3, x4, x5,
    x6, x7, x8, x9, x10,
    x11, x12, X, x13, x14,
    x15, x16, x17, x18, x19,
    x20, x21, x22, x23, x24
) => {

    return (

        0.000252*x1 + 0.00352*x2 + 0.008344*x3 + 0.00352*x4 + 0.000252*x5 +
        0.00352*x6 + 0.049081*x7 + 0.11634*x8 + 0.049081*x9 + 0.00352*x10 +
        0.008344*x11 + 0.11634*x12 + 0.275768*X + 0.11634*x13 +	0.008344*x14 +
        0.00352*x15 + 0.049081*x16 + 0.11634*x17 + 0.049081*x18 + 0.00352*x19 +
        0.000252*x20 + 0.00352*x21 + 0.008344*x22 + 0.00352*x23 + 0.000252*x24

    )

};



let gaussian3 = (
    y1, y2, y3,
    y4, X, y5,
    y6, y7, y8
) => {

    return (

        1/16*y1 + 1/8*y2 + 1/16*y3 + 

        1/8*y4 + 1/4*X + 1/8*y5 + 

        1/16*y6 + 1/8*y7 + 1/16*y8

    )

};



const Spinner = require('react-spinkit');



window['THREE'] = THREE;



require('three/examples/js/math/Lut');
require("three/examples/js/controls/OrbitControls");
require("./exporters/STLLoader");
require("./exporters/STLExporter");
require("./exporters/OBJExporter");
require("./SubdivisionModifier");



interface AppState{
    model:any,
    perfusion:any
}



@connect(store => store, attachDispatchToProps)
export class App extends Component<Store,AppState>{
    anchor:HTMLElement
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
    localPlane:any



    constructor(props){ 

        super(props);

        this.state = {
            model:undefined,
            perfusion:undefined
        };

    } 



    onMouseMove = event => {

        const object = this.scene.children.find(mesh => mesh.userData.brain) as Mesh;

        if(isNil(object)){ return }

        const mouse = new THREE.Vector2();

        mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        
        mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
        
        this.raycaster.setFromCamera( mouse, this.camera );

        const intersects = this.raycaster.intersectObject(object, false);

        if(intersects[0])
            console.log(
                object.geometry['attributes'].indices.array[intersects[0].face.a*3],
                object.geometry['attributes'].indices.array[intersects[0].face.a*3+1],
                object.geometry['attributes'].indices.array[intersects[0].face.a*3+2]
            );


        //TODO

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



    applyGaussianBlur = (colors, dims, indices) => {

        let x = dims[1];

        let y = dims[2];

        let z = dims[3];

        let slice = x*y;

        const get = (k, slice, j, x, i) => {

            const p = k * slice + j * x + i; 

            const p1 = k * slice + (j+1) * x + (i); 
            const p2 = k * slice + (j-1) * x + (i); 
            const p3 = k * slice + (j) * x + (i+1); 
            const p4 = k * slice + (j) * x + (i-1); 

            const p5 = k * slice + (j+1) * x + (i+1); 
            const p6 = k * slice + (j+1) * x + (i-1); 
            const p7 = k * slice + (j-1) * x + (i+1); 
            const p8 = k * slice + (j-1) * x + (i-1); 

            return [ p, p1, p2, p3, p4, p5, p6, p7, p8 ];

        };

        for (let k = 1; k < z - 1; ++k) {
            
            for (let j = 1; j < y - 1; ++j) {
    
              for (let i = 1; i < x - 1; ++i) {
                    
                    const a = get(k-1, slice, j, x, i);

                    const b = get(k, slice, j, x, i);

                    const c = get(k+1, slice, j, x, i);

                    const positionIndices = [

                        ...a.map(value => indices[value]), //[0]

                        ...b.map(value => indices[value]), //[9]

                        ...c.map(value => indices[value]) //[18]

                    ];

                    for(let s = 1; s < positionIndices.length-1; s++){
                        const before = positionIndices[s-1];
                        const idx = positionIndices[s];
                        const after = positionIndices[s+1];

                        //3 colors
                        for(let c=1; c<8; c++){
                            //r
                            colors[idx+c*3] = gaussian3(
                                colors[before+(c-1)*3], colors[before+c*3], colors[before+(c+1)*3],
                                colors[idx+(c-1)*3], colors[idx+c*3], colors[idx+(c+1)*3],
                                colors[after+(c-1)*3], colors[after+c*3], colors[after+(c+1)*3]
                            ) 
                            //g    
                            colors[idx+c*3+1] = gaussian3(
                                colors[before+(c-1)*3+1], colors[before+c*3+1], colors[before+(c+1)*3+1],
                                colors[idx+(c-1)*3+1], colors[idx+c*3+1], colors[idx+(c+1)*3+1],
                                colors[after+(c-1)*3+1], colors[after+c*3+1], colors[after+(c+1)*3+1]
                            ) 
                            //b    
                            colors[idx+c*3+2] = gaussian3(
                                colors[before+(c-1)*3+2], colors[before+c*3+2], colors[before+(c+1)*3+2],
                                colors[idx+(c-1)*3+2], colors[idx+c*3+2], colors[idx+(c+1)*3+2],
                                colors[after+(c-1)*3+2], colors[after+c*3+2], colors[after+(c+1)*3+2]
                            )
                        }

                    }

              }
      
            }
      
        }

        return colors;

    }



    onNIFTILoaded = (data:niftiData, perfusion:niftiData) => {

        this.localPlane = new THREE.Plane( new THREE.Vector3(0, -1, 0), 0.8 );



        const result = imageToVolume(data, perfusion);

        const points : number[] = result.p;

        const normals : number[] = result.n;

        //const { dims } = perfusion.niftiHeader;

        let { 
            perfusionNormals, 
            perfusionPoints, 
            perfusionColors, 
            indices 
        } = result;

        const { perfusionColorsEqualized, min, max } = equalize(perfusionColors);



        let rgb = [];

        const lut = new THREE['Lut']("cooltowarm", 1024);

        lut.setMin(min);

        lut.setMax(max);

        for(let i=0; i<perfusionColorsEqualized.length; i++){

            let color = lut.getColor( perfusionColorsEqualized[i] );

            rgb.push(color.r,color.g,color.b);

        }



        let coloration = new THREE.BufferGeometry();

        coloration.addAttribute('normal', new THREE.BufferAttribute( new Float32Array(perfusionNormals), 3));

        coloration.addAttribute('position', new THREE.BufferAttribute( new Float32Array(perfusionPoints), 3));

        coloration.addAttribute('color', new THREE.BufferAttribute( new Float32Array(rgb), 3));

        coloration.computeBoundingBox();


        
        let geometry = new THREE.BufferGeometry();

        let colors = [];

        for(let i=0; i<points.length/3; i++){ colors.push(1,0.895,0.741); }



        geometry.addAttribute('normal', new THREE.BufferAttribute( new Float32Array(normals), 3));

        geometry.addAttribute('position', new THREE.BufferAttribute( new Float32Array(points), 3));

        geometry.addAttribute('color', new THREE.BufferAttribute( new Float32Array(colors), 3));

        geometry.addAttribute('indices', new THREE.BufferAttribute( new Float32Array(points.length), 3));


        geometry.computeBoundingBox();

        geometry['computeBoundsTree']();
        
        const mesh = compose(projectMask(coloration, indices), meshFromGeometry(this.localPlane))(geometry);

        //mesh.geometry.attributes.color.array = this.applyGaussianBlur(geometry.attributes.color.array , dims, indices);

        //mesh.geometry.attributes.color.needsUpdate = true;

        //const mesh2 = meshFromGeometry(this.localPlane)(coloration);

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

                    {/*
                    <div style={{visibility:"hidden", flex:1, display:"flex", justifyContent:"flex-end", zIndex:1000}} ref={e => { this.anchor=e; }}>
                        <IconButton onClick={e => this.props.dispatch({type:"showSettings", load:true})}>
                            <Settings style={{color:"white"}} />
                        </IconButton>
                    </div>
                    */}

                </Toolbar>

                <Popover
                    id={`popover`}
                    open={this.props.showSettings}
                    anchorEl={this.anchor}
                    onClose={e => this.props.dispatch({type:"showSettings", load:false})}
                    anchorOrigin={{vertical:'bottom', horizontal:'center'}}
                    transformOrigin={{vertical:'top', horizontal:'center'}}
                >
                    <div style={{width:"300px", height:"220px"}}></div> 
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
