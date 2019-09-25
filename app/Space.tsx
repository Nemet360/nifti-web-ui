import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import { isNil } from "ramda";
import * as React from "react";
import { Component } from "react";
import ResizeObserver from "resize-observer-polyfill";
import { Subscription } from "rxjs";
import { fromEvent } from "rxjs/observable/fromEvent";
import * as THREE from "three";
import { Box3, Light, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import { OrbitControls } from "./OrbitControls";
import { getObjectCenter } from "./utils/getObjectCenter";
import { lights } from "./utils/lights";
import { regions } from "./utils/regions";

const transparencyEquations = {
    2 : (x) => 1 - Math.pow( Math.E, - 8 * Math.pow(x, 5) ),
    4 : (x) => 1 - Math.pow( Math.E, - 3 * Math.pow(x, 4) ),
};

interface SpaceProps {
    index: number;
    group: any;
    onViewChange: (camera: any) => void;
    camera: PerspectiveCamera;
}

interface SpaceState {
    width: number;
    height: number;
    region: any;
}

export class Space extends Component<SpaceProps, SpaceState> {
    public container: HTMLElement;
    public boundingBox: any;
    public scene: Scene;
    public camera: PerspectiveCamera;
    public renderer: WebGLRenderer;
    public controls: any;
    public subscriptions: Subscription[];
    public ro: any;
    public ref: any;

    constructor(props) {

        super(props);

        this.subscriptions = [];

        this.state = { width : 0, height : 0, region : 30 };

    }

    public updateTransparency = () => {

        const position = this.getInitialCameraPosition();

        const end = new Vector3(0, 0, 0);

        const start = position.distanceTo(end);

        const current = this.camera.position.distanceTo(end);

        const x = current / start;

        this.props.group.traverse((mesh: any) => {

            const { dataType } = mesh.userData;

            if ( ! dataType ) { return; }

            const equation = transparencyEquations[dataType];

            if ( ! equation ) { return; }

            const opacity = equation(x);

            if (mesh.userData.transparent) {

                mesh.material.opacity = opacity;

                mesh.material.transparent = true;

            }

        });

    }

    public initRo = () => {

        this.ro = new ResizeObserver(this.onRO);

        this.ro.observe(this.ref);

    }

    public suspendRo = () => {

        this.ro.disconnect();

        this.ro = undefined;

    }

    public onRO = (entries) => this.onResize(null);

    public componentWillReceiveProps(next: SpaceProps) {

        if (next.camera !== this.props.camera) {

            this.camera.copy(next.camera);

            this.updateTransparency();

        }

    }

    public componentDidMount() {

        if (isNil(this.container)) { return; }

        this.initRo();

        this.subscriptions.push(

            fromEvent( window, "resize" ).subscribe(this.onResize),

        );

        this.boundingBox = this.container.getBoundingClientRect();

        const { width, height } = this.boundingBox;

        this.setState({ width, height }, this.init);

    }

    public componentWillUnmount() {

        this.suspendRo();

        this.subscriptions.forEach((subscription) => subscription.unsubscribe());

        this.subscriptions = [];

    }

    public getInitialCameraPosition = () => {

        const { max, min } = new Box3().setFromObject(this.props.group);

        const center = getObjectCenter(this.props.group.children[0] as any);

        this.controls.target.set(center.x, center.y, center.z);

        const wd = max.x - min.x;

        const hg = max.y - min.y;

        const x = wd * 3;

        const y = hg * 3;

        const z = 0;

        return new Vector3(x, y, z);

    }

    public onResize = (e) => {

        this.boundingBox = this.container.getBoundingClientRect();

        const { width, height } = this.boundingBox;

        this.camera.aspect = width / height;

        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);

        this.setState({ width, height });

        this.renderer.render(this.scene, this.camera);

    }

    public onChange = () => {

        const { onViewChange } = this.props;

        onViewChange(this.camera);

    }

    public init = () => {

        const { group } = this.props;

        this.scene = this.setupScene();

        this.camera = this.setupCamera(this.container);

        this.renderer = this.setupRenderer(this.container);

        this.container.appendChild(this.renderer.domElement);

        this.controls = this.setupControls(this.container, this.camera, this.onChange, this.onChange);

        const lights = this.setupLights();

        lights.forEach((light: Light) => this.scene.add(light));

        this.scene.add(group);

        const position = this.getInitialCameraPosition();

        this.camera.position.copy(position);

        this.camera.lookAt(this.controls.target);

        this.animate();

        this.props.onViewChange(this.camera);

    }

    public setupScene = () => {

        const scene = new Scene();

        return scene;

    }

    public setupCamera = (container) => {

        const { width, height } = container.getBoundingClientRect();

        const camera = new PerspectiveCamera(50, width / height, 10, 1000);

        return camera;

    }

    public setupRenderer = (container) => {

        const { width, height } = container.getBoundingClientRect();

        const renderer = new WebGLRenderer({ antialias : true, alpha : true });

        renderer.setSize(width, height, true);

        renderer.setClearColor(0xeeeeee);

        renderer.setPixelRatio(window.devicePixelRatio);

        renderer.autoClear = false; // @ ???

        renderer.gammaInput = true;

        renderer.gammaOutput = true;

        renderer.toneMapping = THREE.Uncharted2ToneMapping;

        renderer.toneMappingExposure = 0.75;

        renderer.shadowMap.enabled = true;

        renderer.localClippingEnabled = true;

        renderer.context.getExtension("EXT_frag_depth");

        return renderer;

    }

    public setupControls = (container, camera, onZoom, onRotate) => {

        const controls = new OrbitControls({
            object: camera,
            domElement: container,
            onZoom,
            onRotate,
        });

        controls.enablePan = false;

        return controls;

    }

    public setupLights = () => {

        const list = lights();

        return list;

    }

    public animate = () => {

        // this.renderer.clearDepth();

        this.renderer.render(this.scene, this.camera);

        requestAnimationFrame(this.animate);

    }

    public onChangeRegion = (event) => {

        const group = this.props.group.children.find((m) => m.userData.perfusion);

        if ( ! group ) { return; }

        group.children.map(
            (mesh) => {

                for (let i = 0; i < mesh.geometry.faces.length; i++) {

                    const selected = event.target.value === mesh.geometry.faces[i].type;

                    mesh.geometry.faces[i].materialIndex = selected ? 0 : 1;

                }

                mesh.geometry.dynamic = true;

                mesh.geometry.elementsNeedUpdate = true;

                mesh.geometry.colorsNeedUpdate = true;

            },
        );

        this.setState({region: event.target.value});

    }

    public render() {

        return isNil(this.props.group) ? null :

        <div
            ref={(e) => { this.ref = e; }}
            style={{
                width : "100%",
                height : "100%",
                position : "relative",
                overflow : "hidden",
            }}
        >
            <div style={{
                position: "absolute",
                zIndex: 22,
                padding: "50px",
                width: "200px",
            }}>
                <FormControl style={{width: "100%"}}>

                    <InputLabel htmlFor="region-input">Select region</InputLabel>

                    <Select
                        value={this.state.region}
                        onChange={this.onChangeRegion}
                        inputProps={{name: "region", id: "region-input"}}
                    >
                    {
                        regions.map((item, index: number) => <MenuItem style={{fontWeight: 500}} key={`item-${index}`} value={item.value}>{item.name}</MenuItem>)
                    }
                    </Select>

                </FormControl>
            </div>
            <div
                ref={(thisNode) => { this.container = thisNode; }}
                style={{
                    width : "inherit",
                    height : "inherit",
                    position : "absolute",
                    top : 0,
                    left : 0,
                }}
            />
        </div>;

    }

}
