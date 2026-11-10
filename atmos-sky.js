// Fixed opening sky, adapted from ATMOS by Leeroy. No scene models or camera motion.
// Noise implementation credited to Stefan Gustavson in the shader.
(async()=>{
const canvas=document.querySelector('.atmos-sky');if(!canvas)return;
const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});if(!gl)return;
try{
const response=await fetch('atmos-sky.frag');if(!response.ok)return;const fragment=await response.text();
function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader}
const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,`attribute vec2 position;varying vec3 vPos;varying vec2 vUv;uniform float aspect;void main(){vUv=position*.5+.5;vPos=vec3(position.x*20.*aspect,position.y*20.,0.);gl_Position=vec4(position,0.,1.);}`));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
const time=gl.getUniformLocation(program,'uTime'),aspect=gl.getUniformLocation(program,'aspect');gl.uniform1f(gl.getUniformLocation(program,'uGradientMixer'),.01);gl.uniform1f(gl.getUniformLocation(program,'uYCompression'),.04);
let visible=true,frame=0,elapsed=0,last=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function draw(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(!w||!h)return;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}gl.uniform1f(aspect,rect.width/rect.height);gl.uniform1f(time,elapsed);gl.drawArrays(gl.TRIANGLES,0,6);canvas.classList.add('ready')}
function tick(now){frame=0;if(!visible||document.hidden)return;if(last)elapsed+=(now-last)/1000;last=now;draw();if(!reduced.matches)frame=requestAnimationFrame(tick)}
function resume(){cancelAnimationFrame(frame);last=0;if(visible&&!document.hidden)frame=requestAnimationFrame(tick)}
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;resume()}).observe(canvas);new ResizeObserver(()=>{draw();resume()}).observe(canvas);document.addEventListener('visibilitychange',resume);reduced.addEventListener('change',resume);canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(frame);canvas.classList.remove('ready')});draw();resume();
}catch(error){console.warn('Sky preview unavailable; using gradient fallback.',error)}
})();
