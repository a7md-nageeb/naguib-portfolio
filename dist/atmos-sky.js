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
const time=gl.getUniformLocation(program,'uTime'),aspect=gl.getUniformLocation(program,'aspect');gl.uniform1f(gl.getUniformLocation(program,'uGradientMixer'),.01);const yCompression=gl.getUniformLocation(program,'uYCompression');
const game=canvas.parentElement.querySelector('.rps');
const flipDuration=900;
let flipStarted=game?.classList.contains('is-idle')===false ? performance.now()-flipDuration : null;
let visible=false,frame=0,elapsed=0,last=0;
let width=0,height=0,ready=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const touchScreen=matchMedia('(pointer: coarse)');
function resize(){
  const rect=canvas.getBoundingClientRect();
  width=rect.width;
  height=rect.height;
  const dpr=Math.min(devicePixelRatio||1,touchScreen.matches?1:1.5);
  const w=Math.round(width*dpr),h=Math.round(height*dpr);
  if(w&&h){
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
    gl.viewport(0,0,w,h);
  }
}
function draw(now){
  if(!width||!height)return;
  gl.uniform1f(aspect,width/height);
  gl.uniform1f(time,elapsed);
  const progress=flipStarted===null ? 0 : reduced.matches ? 1 : Math.min(1,Math.max(0,(now-flipStarted)/flipDuration));
  const eased=progress*progress*(3-2*progress);
  gl.uniform1f(yCompression,.04*(1-2*eased));
  gl.drawArrays(gl.TRIANGLES,0,6);
  if(!ready){
    canvas.classList.add('ready');
    ready=true;
  }
}
function tick(now){
  frame=0;
  if(!visible||document.hidden)return;
  const delta=last?now-last:0;
  if(!last||!touchScreen.matches||delta>=32){
    elapsed+=delta/1000;
    last=now;
    draw(now);
  }
  if(!reduced.matches)frame=requestAnimationFrame(tick);
}
function resume(){
  cancelAnimationFrame(frame);
  last=0;
  if(visible&&!document.hidden)frame=requestAnimationFrame(tick);
}
function refreshSize(){resize();resume()}
new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;resume()}).observe(canvas);
new ResizeObserver(refreshSize).observe(canvas);
if(game)new MutationObserver(()=>{
  const idle=game.classList.contains('is-idle');
  if(idle&&flipStarted!==null){flipStarted=null;resume()}
  if(!idle&&flipStarted===null){flipStarted=performance.now();resume()}
}).observe(game,{attributes:true,attributeFilter:['class']});
window.addEventListener('resize',refreshSize);
document.addEventListener('visibilitychange',resume);
reduced.addEventListener('change',resume);
touchScreen.addEventListener('change',refreshSize);
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(frame);canvas.classList.remove('ready')});resize();
}catch(error){console.warn('Sky preview unavailable; using gradient fallback.',error)}
})();
