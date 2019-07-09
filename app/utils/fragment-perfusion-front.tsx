import * as React from 'react';



export const fragment_perfusion_front = (

    <script id="fragment-perfusion-front" type="x-shader/x-fragment">
    {`
        precision mediump float;
        precision mediump int;

        uniform float time;
        uniform vec3 light;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec4 vColor;

        vec4 getColor(vec4 c, vec3 n){
            float d = dot(normalize(light),vNormal);
            vec4 color = d * c; 
            return color;
        }

        void main()	{
            vec4 color = getColor(vColor, vNormal);
            color[3] = 1.0;

            gl_FragColor = color;
            
        }
    `}
    </script>
    
);