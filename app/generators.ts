import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as THREE from "three";
import { MeshPhysicalMaterial } from 'three';
import { attributesToGeometry } from './utils/attributesToGeometry';



export const generators = {

    "16" : attributes => {
        const geometry = attributesToGeometry(attributes);

        geometry.scale(0.95, 0.95, 0.95);

        geometry.center();

        const material1 = [

            new THREE['MeshPhysicalMaterial']( {
                side : THREE.FrontSide,
                vertexColors : THREE.VertexColors,
                transparent : false,
                depthWrite : true,
                metalness : 0.0,
                roughness : 0.0,
                clearCoat : 1.0,
                clearCoatRoughness : 1.0,
                reflectivity : 0.5,
                opacity : 1
            } ),

            new THREE['MeshPhysicalMaterial']( {
                side : THREE.FrontSide,
                vertexColors : THREE.VertexColors,
                transparent : true,
                depthWrite : false,
                metalness : 0.0,
                roughness : 0.0,
                clearCoat : 1.0,
                clearCoatRoughness : 1.0,
                reflectivity : 0.5,
                opacity : 0.1
            } )

        ];

        const material2 = [

            new THREE['MeshPhysicalMaterial']( {
                side : THREE.BackSide,
                vertexColors : THREE.VertexColors,
                transparent : false,
                depthWrite : false,
                metalness : 0.0,
                roughness : 0.0,
                clearCoat : 1.0,
                clearCoatRoughness : 1.0,
                reflectivity : 0.5,
                opacity : 1
            } ),

            new THREE['MeshPhysicalMaterial']( {
                side : THREE.BackSide,
                vertexColors : THREE.VertexColors,
                transparent : true,
                depthWrite : false,
                metalness : 0.0,
                roughness : 0.0,
                clearCoat : 1.0,
                clearCoatRoughness : 1.0,
                reflectivity : 0.5,
                opacity : 0.1
            } )

        ];

        const m1 = new THREE.Mesh(geometry, material1);

        const m2 = new THREE.Mesh(geometry, material2);

        m1.onBeforeRender = function( renderer ) { renderer.clearDepth(); };

        m2.onBeforeRender = function( renderer ) { renderer.clearDepth(); };

        m1.renderOrder = 1;

        m2.renderOrder = 1;

        m1.userData.perfusion = true;

        m2.userData.perfusion = true;

        const group = new THREE.Group();

        group.add(m1);

        group.add(m2);

        group.translateZ(7);

        group.translateX(0.5);

        group.userData.brain = true;

        group.userData.perfusion = true;

        group.userData.dataType = "16";

        return group;

    },

    "2" : attributes => {

        const geometry = attributesToGeometry(attributes);

        geometry.center();

        const material1 = new MeshPhysicalMaterial({
            side : THREE.FrontSide,
            vertexColors : THREE.VertexColors,
            metalness : 0.0,
            roughness : 0.0,
            clearCoat : 1.0,
            clearCoatRoughness : 1.0,
            reflectivity : 1.0,
            transparent : true,
            opacity : 1,
            clipShadows : true,
            depthWrite : false
        });


        const material2 = new MeshPhysicalMaterial({
            side : THREE.BackSide,
            vertexColors : THREE.VertexColors,
            metalness : 0.0,
            roughness : 0.0,
            clearCoat : 1.0,
            clearCoatRoughness : 1.0,
            reflectivity : 1.0,
            transparent : true,
            opacity : 1,
            clipShadows : true,
            depthWrite : false
        });


        const m1 = new THREE.Mesh(geometry, material1);

        const m2 = new THREE.Mesh(geometry, material2);

        m1.onBeforeRender = function( renderer ) { renderer.clearDepth(); };

        m2.onBeforeRender = function( renderer ) { renderer.clearDepth(); };

        m1.renderOrder = 3;

        m2.renderOrder = 3;

        m1.userData.transparent = true;

        m2.userData.transparent = true;

        m1.userData.dataType = "2";

        m2.userData.dataType = "2";

        const group = new THREE.Group();

        group.add(m1);

        group.add(m2);

        group.userData.brain = true;

        group.userData.dataType = "2";

        return group;

    },

    "4" : attributes => {

        const geometry = attributesToGeometry(attributes);

        geometry.scale( 0.65, 0.65, 0.65 );

        geometry.center();

        const material1 = new MeshPhysicalMaterial({
            side : THREE.FrontSide,
            vertexColors : THREE.VertexColors,
            metalness : 0.0,
            roughness : 0.5,
            clearCoat : 0.5,
            clearCoatRoughness : 0.5,
            reflectivity : 0.5,
            transparent : false,
            opacity : 1,
            clipShadows : true,
            depthWrite : true
        });

        const material2 = new MeshPhysicalMaterial({
            side : THREE.BackSide,
            vertexColors : THREE.VertexColors,
            metalness : 0.0,
            roughness : 0.5,
            clearCoat : 0.5,
            clearCoatRoughness : 0.5,
            reflectivity : 0.5,
            transparent : true,
            opacity : 1,
            clipShadows : true,
            depthWrite : false
        });

        const m1 = new THREE.Mesh(geometry, material1);

        const m2 = new THREE.Mesh(geometry, material2);

        m1.onBeforeRender = function( renderer ) { renderer.clearDepth(); };

        m2.onBeforeRender = function( renderer ) { renderer.clearDepth(); };

        m1.renderOrder = 5;

        m2.renderOrder = 4;

        m1.userData.transparent = true;

        m2.userData.transparent = true;

        m1.userData.dataType = "4";

        m2.userData.dataType = "4";

        m1.rotation.x = 2 * Math.PI;

        m1.rotation.y = 2 * Math.PI;

        m2.rotation.x = 2 * Math.PI;

        m2.rotation.y = 2 * Math.PI;

        const group = new THREE.Group();

        group.add(m1);

        group.add(m2);

        group.userData.brain = true;

        group.userData.dataType = "4";

        m1.userData.face = true;

        m2.userData.face = true;

        return group;

    }

}
