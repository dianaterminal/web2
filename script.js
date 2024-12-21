import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls";
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

console.clear();

let scene = new THREE.Scene();
scene.background = new THREE.Color(1, 0, 1).multiplyScalar(0.2);
let camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 1, 1000);
camera.position.set(0, 0, 20);
let renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
window.addEventListener("resize", event => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
})

let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;

//scene.add(new THREE.GridHelper());

let gu = {
  time: {value: 0},
  iCount: {value: 100000},
  iGap: {value: 0},
  sCount: {value: 2}
}

let g = new THREE.BufferGeometry();
g.setDrawRange(0, 3);
let ig = new THREE.InstancedBufferGeometry().copy(g);
ig.instanceCount = gu.iCount.value;
let m = new THREE.ShaderMaterial(
  {
    side: THREE.DoubleSide,
	  glslVersion: THREE.GLSL3,
    uniforms: {
      time: gu.time,
      iCount: gu.iCount,
      iGap: gu.iGap,
      sCount: gu.sCount
    },
    vertexShader: `
      uniform float time;
      uniform float iCount;
      uniform float iGap;
      uniform float sCount;
      
      ${noise}
      
      #define PI 3.1415926535
      #define PI2 PI*2.
      
      struct spherical{
        float radius;
        float theta;
        float phi;
      };
      
      float random (vec3 v3) {
          return fract(sin(dot(v3, vec3(12.9898,78.233,34.258))) * 43758.5453123);
      }
      
      spherical setFromVec3(vec3 v3){
        return spherical(length(v3), atan( v3.x, v3.z ), acos( clamp( v3.y / length(v3), -1., 1. ) ));
      }
      
      mat2 rot(float a){
        float c = cos(a); float s = sin(a); return mat2(c, s, -s, c);
      }
      
      // By Morgan McGuire @morgan3d, http://graphicscodex.com
      // Reuse permitted under the BSD license.
      float square(float s) { return s * s; }
      vec3 square(vec3 s) { return s * s; }
      vec3 neonGradient(float t) {
        return clamp(vec3(t * 1.3 + 0.1, square(abs(0.43 - t) * 1.7), (1.0 - t) * 1.7), 0.0, 1.0);
      }

     
      vec3 instPos( float instID ){
        
        float rad = 5.;
        float phi = PI * (3. - sqrt(5.));
        
        float y = 1. - (instID / (iCount - 1.)) * 2.;
        float radius = sqrt(1. - y * y);

        float theta = mod(phi * instID, PI2);

        float x = cos(theta) * radius;
        float z = sin(theta) * radius;
        
        return vec3(x, y, z) * rad;
        
      }
      
      out vec3 vCol;
      
      void main(){
        float t = time * 0.1;
        
        
        vec3 pos = vec3(0., 0.25, 0.);
        float angle = float(gl_VertexID) * PI2 / 3.;
        pos.xy = rot(angle) * pos.xy; // make a triangle
        
        vec3 iPos =  instPos( float( gl_InstanceID ) );
        
        spherical iPosSpherical = setFromVec3(iPos);
        
        float shift = random(iPos) * 2. - 1.;
        float sinVal = abs(sin(PI2 * (shift + t)));
        pos *= (1. - sinVal) * 0.99 + 0.01;
        pos.xy *= rot(PI2 * (shift + t * shift));
        
        pos.yz *= rot(PI * 0.5 - iPosSpherical.phi);
        pos.xz *= rot(iPosSpherical.theta);
        
        //float gapVal = iGap * (floor(mod(float(gl_InstanceID), 2.)) == 0. ? -1. : 1.);
        
        float sAngle = PI2 / sCount * floor(mod(float(gl_InstanceID), sCount));
        vec3 gapShift = vec3(0., 0., 1.);
        gapShift.xz *= rot(sAngle) * iGap;
        
        float n = snoise(vec4(normalize(iPos) + gapShift * 0.1, t));
                
        pos += iPos + normalize(iPos) * (sinVal + (n) * 2.) ;
        pos += gapShift;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );
        
        vCol = neonGradient( 1. - sinVal );
      }
    `,
    fragmentShader: `
      precision mediump float;
      in vec3 vCol;
      out vec4 fCol;
      void main(){
        fCol = vec4(vCol, 1);
      }
    `
  }
);
let o = new THREE.Mesh(ig, m);
o.frustumCulled = false;
scene.add(o);

let gui = new GUI();
gui.add(gu.iCount, "value", 10, 1000000).step(1).name("instance count").onChange(val => {
  ig.instanceCount = val;
})
gui.add(gu.iGap, "value", 0, 20).name("gap");
gui.add(gu.sCount, "value", 2, 10).step(1).name("sphere count");

let clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  let t = clock.getElapsedTime();
  gu.time.value = t;
  controls.update();
  renderer.render(scene, camera);
});