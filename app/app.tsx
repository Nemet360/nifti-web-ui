import './assets/fonts/index.css'; 
import './assets/styles.css'; 
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Store } from './types';
import { reducer, defaultProps } from './reducer';
import { path, isEmpty, isNil } from 'ramda';
import { Provider, connect } from "react-redux";
import { createStore } from "redux"; 
import { Component } from "react"; 
import { ipcRenderer, remote } from 'electron';
import { Subscription, Observable } from 'rxjs';
import { fromEvent } from 'rxjs/observable/fromEvent'; 
import Button from '@material-ui/core/Button';
import Settings from '@material-ui/icons/Settings';
import * as THREE from "three";
import { Vector3, WebGLRenderer, PerspectiveCamera, Scene, Light, Box3, Mesh, MeshPhysicalMaterial, DoubleSide } from 'three';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Slider from '@material-ui/lab/Slider';
import Popover from '@material-ui/core/Popover';
import IconButton from '@material-ui/core/IconButton';
import Checkbox from '@material-ui/core/Checkbox';
import { of } from 'rxjs/observable/of';
import { mergeMap, tap } from 'rxjs/operators';
//yarn add -D https://github.com/WildHorse19/vtk-js
import cubes from 'vtk.js/Sources/Filters/General/ImageMarchingCubes';
const { vtkImageMarchingCubes } = cubes;
const fs = remote.require('fs');
const uniq = require("uniqid");
const nifti = require("nifti-reader-js");
const Spinner = require('react-spinkit');

window['THREE'] = THREE;

require("three/examples/js/controls/OrbitControls");
require("./STLLoader");
require("./STLExporter");
require("./OBJExporter");
require("./ColladaExporter");



const makeSlice = (file, start, length) => {
    
    return file.slice(start, start + length);

}



const readNIFTI = (data) => {

    let niftiHeader, niftiImage;

    if (nifti.isCompressed(data)) {
        data = nifti.decompress(data);
    }

    if (nifti.isNIFTI(data)) {
        niftiHeader = nifti.readHeader(data);
        niftiImage = nifti.readImage(niftiHeader, data);
    }

    let typedData;

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

    return { niftiHeader, niftiImage, typedData };

}



const readNIFTIFile = file => (

    new Promise(

        resolve => {
        
            let start = 0;

            let blob = makeSlice(file, 0, file.size);

            let reader = new FileReader();

            reader.onloadend = function (evt) {

                if (evt.target['readyState'] === FileReader.DONE) {

                    const result = readNIFTI(evt.target['result']);

                    resolve(result);

                }

            };

            reader.readAsArrayBuffer(blob);

        }

    )

)



const getObjectCenter = ( object : Mesh ) : Vector3 => {

    const boundingBox = new Box3().setFromObject(object);

    const centerX = (boundingBox.max.x + boundingBox.min.x)/2;

    const centerY = (boundingBox.max.y + boundingBox.min.y)/2;

    const centerZ = (boundingBox.max.z + boundingBox.min.z)/2;

    return new Vector3(centerX,centerY,centerZ);

} 



const replaceSceneObject = (scene:Scene, object, withWhat:Mesh) : void => {

    if(object && object.geometry){
       object.geometry.dispose();
    }

    if(object){
       scene.remove(object);
    }

    object = undefined;

    scene.add(withWhat); 

}




const attachDispatchToProps = (dispatch,props) => ({...props,dispatch}); 



interface AppState{}



@connect(store => store, attachDispatchToProps)
export class App extends Component<Store,AppState>{
    anchor:HTMLElement
    reader:Subscription
    resize:Subscription 
    data:Subscription 

    menu:HTMLElement
    input:HTMLInputElement
    container:HTMLElement
    boundingBox:any
    scene:Scene
    camera:PerspectiveCamera
    renderer:WebGLRenderer
    controls:any
    localPlane:any


    constructor(props){ 
        super(props);
        this.state = {};
    } 



    componentDidMount(){


        this.resize = fromEvent(window, "resize").subscribe(this.onResize);

        this.reader = fromEvent(ipcRenderer, "read:nifti", (event,filename) => filename).subscribe(this.onData);

        
        this.data = fromEvent(ipcRenderer, "read:file", (event,data) => data).subscribe(acc => {

            console.log(acc.length);
    
            this.props.dispatch({ type:"loading", load:false });
    
            if(isEmpty(acc)){ 
                this.showError("File empty");
                return; 
            }
    
            let loader = new THREE["STLLoader"]();
    
            try{
    
                loader.loadText(acc, this.onMeshLoaded);
                
            }catch(e){
    
                this.showError("File empty");
    
            }

        });
        
        this.boundingBox = this.container.getBoundingClientRect();

        this.props.dispatch({
            type:"multiple",
            load:[
                {type:"width", load:this.boundingBox.width},
                {type:"height", load:this.boundingBox.height}
            ]
        })
        
        this.init();  

    }



    componentWillUnmount(){

        this.reader.unsubscribe();

        this.data.unsubscribe();

        this.resize.unsubscribe();

    }



    onResize = e => {

        this.boundingBox = this.container.getBoundingClientRect();

        const { width, height } = this.boundingBox;

        this.camera.aspect = width / height;
    
        this.camera.updateProjectionMatrix(); 
                
        this.renderer.setSize( width , height );  
        
        this.props.dispatch({
            type:"multiple",
            load:[
                {type:"width", load:width},
                {type:"height", load:height}
            ]
        });

    }



    getBrains = () => {

        const object = this.scene.children.find(mesh => mesh.userData.brain);

        return object;

    }



    onSlice = (e,v) => {

        this.localPlane.constant = v;

        this.props.dispatch({type:"slice", load:v});

    }



    onMeshLoaded = geometry => {

        const colors = [];

        for(let i=0; i < geometry.attributes.position.count; i++){

            colors.push( 
                33, //Math.round( Math.random() * 255 ), 
                156, //Math.round( Math.random() * 255 ), 
                55 //Math.round( Math.random() * 255 )
            );

        }

        const typed_colors = new Uint8Array(colors);
       
        geometry.addAttribute( 'color', new THREE.BufferAttribute( typed_colors, 3, true) );



        //const tempGeo = new THREE.Geometry().fromBufferGeometry(geometry);

        //tempGeo.mergeVertices();
        //tempGeo.computeVertexNormals();
        //tempGeo.computeFaceNormals();
        
        //geometry = new THREE.BufferGeometry().fromGeometry(tempGeo);


        const localPlane = new THREE.Plane( new THREE.Vector3(0, -1, 0), 0.8 );

        this.localPlane = localPlane;

        const material = new MeshPhysicalMaterial({
            clippingPlanes: [ localPlane ],
            vertexColors: THREE.VertexColors, //color: "#ec8080",
            //metalness: 0.5,
            //roughness: 0.5,
            //clearCoat: 0.5,
            //clearCoatRoughness: 0.5,
            //reflectivity: 0.5,
            side: DoubleSide,
            transparent: false, 
            opacity: 1,
            clipShadows: true,
            //depthTest: true
        });

        //geometry.computeVertexNormals();

        const mesh = new THREE.Mesh(geometry, material);

        mesh.castShadow = true;

        mesh.receiveShadow = true;

        mesh.userData.brain = true;

        mesh.frustumCulled = false;

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

        //const bbox = new THREE['BoundingBoxHelper']( mesh );

        //bbox.update();

        //this.scene.add( bbox );

        const center = getObjectCenter(mesh);

        this.camera.position.x = wd*2;
        this.camera.position.y = hg*2;
        this.camera.position.z = 0;

        this.controls.target.set(center.x, center.y, center.z);

        this.camera.lookAt(this.controls.target);

        //console.log(mesh.localToWorld( mesh.position ));

        const object = this.getBrains();

        replaceSceneObject(this.scene, object, mesh); 
       
        this.renderer.render(this.scene, this.camera);

    }



    showError = (e) => {

        this.props.dispatch({
            type:"error", 
            load:"Unable to load model. Try different settings or contact support. "
        });

        this.props.dispatch({ type:"loading", load:false });

    }



    onData = (data:string) => {
        
        if(isEmpty(data)){ 
            this.showError(data);
            return; 
        }

        let loader = new THREE["STLLoader"]();

        try{

            loader.loadText(data, this.onMeshLoaded);
            
        }catch(e){

            this.showError(JSON.stringify(e));

        }

        this.props.dispatch({ type:"loading", load:false });

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

    

    initLights = () => {

        const light = new THREE.AmbientLight(0xffffff, 0.5);

        light.position.set(0,0,0);

        const lights : any[] = [
            [-50, 0, 0], 
            [ 50, 0, 0], 
            //[ 0, 50, 0], 
            //[ 0,-50, 0], 
            //[ 0, 0,-50], 
            //[ 0, 0, 50]
        ]
        .map(
            tuple => {
                const light = new THREE.DirectionalLight(0xffffff, 0.5);
                light.position.set( tuple[0], tuple[1], tuple[2] ).normalize();  
                return light;
            }
        );   

        lights.push(light);

        return lights;

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

        const lights = this.initLights();

        lights.forEach((light:Light) => this.scene.add(light));

        this.animate();

        //this.controls.addEventListener( 'change', () =>  this.renderer.render(this.scene, this.camera) ); 

        //this.renderer.render(this.scene, this.camera);

    }    

    

    transformData = data => {

    }



    read = event => {

        const files = event.target.files;

        readNIFTIFile(files[0])

        .then(

            (data:any) => {

                console.log(data);

                const model = {
                    computeNormals : true,
                    mergePoints : true,
                    contourValue : 50,
                    classHierarchy : []
                };

                const publicAPI : any = {};

                vtkImageMarchingCubes(publicAPI, model); 

                const result = publicAPI.requestData({ 
                    origin:[
                        0,
                        0, 
                        0
                    ], 
                    spacing:[
                        1,
                        1,
                        1
                    ],  
                    dims:[ 
                        data.niftiHeader.dims[1],
                        data.niftiHeader.dims[2], 
                        data.niftiHeader.dims[3] 
                    ], 
                    s:data.typedData
                });

                console.log("result", result);


                var geometry = new THREE.BufferGeometry();
                // create a simple square shape. We duplicate the top left and bottom right
                // vertices because each vertex needs to appear once per triangle.
               
                geometry.addAttribute( 'normal', new THREE.BufferAttribute( result.n, 3 ) );

                // itemSize = 3 because there are 3 values (components) per vertex
                geometry.addAttribute( 'position', new THREE.BufferAttribute( result.p , 3 ) ); //result.p



                const colors = [];

                for(let i=0; i < geometry.attributes.position.count; i++){
        
                    colors.push( 
                        133, //Math.round( Math.random() * 255 ), 
                        156, //Math.round( Math.random() * 255 ), 
                        55 //Math.round( Math.random() * 255 )
                    );
        
                }
        
                const typed_colors = new Uint8Array(colors);
               
                geometry.addAttribute( 'color', new THREE.BufferAttribute( typed_colors, 3, true) );
        
                var material = new MeshPhysicalMaterial({
                    vertexColors: THREE.VertexColors, //color: "#ec8080",
                    metalness: 0.5,
                    roughness: 0.5,
                    clearCoat: 0.5,
                    clearCoatRoughness: 0.5,
                    reflectivity: 0.5,
                    side: DoubleSide,
                    transparent: false, 
                    opacity: 1,
                    clipShadows: true
                    //depthTest: true
                });
                var mesh = new THREE.Mesh( geometry, material );

                this.scene.add(mesh);
                //console.log("marchingCube", publicAPI);

                //marchingCube.setContourValue(0.9);

                //marchingCube.setInputConnection();

            }

        )

            
        /*const id = uniq();

        const dataPath = path(['target','files','0','path'])(event);

        if(isNil(dataPath) || isEmpty(dataPath)){ return }
        
        this.props.dispatch({
            type:"multiple",
            load:[
                {type:"error", load:""},
                {type:"loading", load:true}
            ]
        });

        const options = {
            smooth:this.props.smooth, 
            threshold:this.props.thresh, 
            shouldThreshold:this.props.shouldThreshold,
            reductionFactor:this.props.reduction
        };


        ipcRenderer.send("read:nifti", dataPath, id, options);*/
    
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



    exportObj = p => {

        this.props.dispatch({type:"loading", load:true});

        const wstream = fs.createWriteStream(p);

        const object = this.getBrains();

        if(isNil(object)){ 
            this.emptySceneError();
            return; 
        }

        const exporter = new THREE['OBJExporter']();

        //const result = 
        exporter.parse(object, wstream.write);

        //console.log(result.length, "done");
        console.log(`${p} - done`);

        wstream.end();

        this.props.dispatch({type:"loading", load:false});

    }



    exportJSON = p => {

        this.props.dispatch({type:"loading", load:true});

        const object = this.getBrains() as Mesh;

        if(isNil(object)){ 
            this.emptySceneError();
            return; 
        }

        let json = object.geometry.toJSON();

        json = JSON.stringify(json);

        const wstream = fs.createWriteStream(p);

        let buf = '';
        let gap = 64000;

        for(let i = 0; i<json.length; i++){
            buf += json[i];
            if(buf.length>gap){
                wstream.write(buf);
                buf='';
            }
        }
         
        if(buf.length>0){
            wstream.write(buf);
            buf='';
        } 
        
        json = undefined;

        console.log(`${p} - done`);

        wstream.end();

        this.props.dispatch({type:"loading", load:false});

    }



    exportStl = p => {

        this.props.dispatch({type:"loading", load:true});

        const object = this.getBrains();

        if(isNil(object)){ 
            this.emptySceneError();
            return; 
        }

        const wstream = fs.createWriteStream(p);

        const exporter = new THREE['STLExporter']();

        exporter.parse(object, wstream.write);

        console.log(`${p} - done`);

        wstream.end();

        this.props.dispatch({type:"loading", load:false});

    }

 

    openSaveDialog = (extension:string) : void => {

        this.closeExportMenu(null);

        remote.dialog.showSaveDialog(
            { 
                title:'Save', 
                filters:[{ name: `.${extension}`, extensions: [extension] }] 
            }, 
            result => {

                if(isNil(result)){ return; }

                if(extension==="stl"){

                    this.exportStl(result);

                }else if(extension==="json"){

                    this.exportJSON(result);

                }else if(extension==="obj"){

                    this.exportObj(result);

                }

            }
        );

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

                    <div style={{padding:"10px"}}>
                        <input
                            accept=".nii,.nii.gz"
                            ref={e => { this.input=e; }}
                            disabled={this.props.loading}
                            style={{display:'none'}}
                            onChange={this.read}
                            id="nii-upload"
                            multiple={false}
                            type="file"
                        />
                        <label htmlFor="nii-upload">
                            <Button  
                                size="small" 
                                variant="contained" 
                                component="span"
                                disabled={this.props.loading}
                                onClick={e => { this.input.value=null; }}
                                style={{textTransform:'none', whiteSpace:'nowrap'}}
                            >
                                <div>Import</div>
                            </Button>
                        </label>  
                    </div>

                    <div style={{
                        display:"flex",
                        alignItems:"center",
                        justifyContent:"space-between"
                    }}>
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
                For Tzahi Nemet, March 2019
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