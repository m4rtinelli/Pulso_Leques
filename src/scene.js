import * as THREE from 'three';
import { cubicBezier } from './easing.js';
export const defaults={width:1080,height:1080,count:5,spread:360,rotation:0,tilt:25,size:83,stagger:0,duration:6,speed:1,growth:'cascade',motion:'flow',easing:[0.42,0,0.58,1],easingTarget:'both',background:'#f1eee7',colors:['#ffaaab','#f0ffbf','#ccfa36','#ff4347'],heights:Array(16).fill(100),glow:{enabled:false,intensity:55,radius:50,grain:35}};
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
// The supplied path, converted to local coordinates with its bottom edge at the hinge.
export function makeGeometry(){
 const s=new THREE.Shape();
 s.moveTo(967.315,0);s.lineTo(285.249,0);s.lineTo(285.948,1.3045);s.lineTo(16.2903,1106.96);
 s.bezierCurveTo(-70.1325,1461.32,198.221,1803,562.967,1803);s.lineTo(1245.03,1803);s.lineTo(1244.33,1801.7);s.lineTo(1513.99,695.995);s.bezierCurveTo(1600.41,341.685,1332.06,0,967.315,0);s.closePath();
 const g=new THREE.ShapeGeometry(s,48);g.translate(-904, -1803,0);g.scale(1/1803,-1/1803,1/1803);g.computeVertexNormals();return g;
}
export function transformsAt(c,time){
 // All leaves share a phase: timing must not compress the angular spacing.
 const elapsed=time/c.duration*c.speed+c.stagger/100;
 const phase=elapsed*Math.PI*2;
 return Array.from({length:c.count},(_,i)=>{
  const f=(i-(c.count-1)/2)/c.count;
  const wave=(1-Math.cos(phase))/2;
  const eased=cubicBezier(wave,c.easing);
  const opening=c.growth==='none'?1:c.growth==='breathe'?.65+.35*eased:c.growth==='together'?.25+.75*cubicBezier((1-Math.cos(phase))/2,c.easing):1;
  const cycle=((elapsed)%1+1)%1;
  const turn=c.easingTarget==='growth'?phase:Math.floor(elapsed)*Math.PI*2+cubicBezier(cycle,c.easing)*Math.PI*2;
  const orbit=c.motion==='flow'?turn:c.motion==='wave'?(.5-(c.easingTarget==='growth'?wave:eased))*Math.PI*1.6:c.motion==='pulse'?(.5-eased)*.7:0;
  return {rx:f*c.spread*Math.PI/180*opening+orbit,ry:c.rotation*Math.PI/180,rz:0,scale:c.size/83*c.heights[i]/100};
 });
}
export function createRenderer(c,{scale=1,transparent=false}={}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(1);renderer.setSize(c.width*scale,c.height*scale);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(),group=new THREE.Group();scene.add(group);
 const geometry=makeGeometry(),leaves=[];
 for(let i=0;i<16;i++){
  const front=new THREE.MeshBasicMaterial({color:'#ff4347',side:THREE.FrontSide});
  const back=new THREE.MeshBasicMaterial({color:'#8c183b',side:THREE.BackSide});
  const pivot=new THREE.Group();pivot.add(new THREE.Mesh(geometry,front),new THREE.Mesh(geometry,back));group.add(pivot);leaves.push({pivot,front,back});
 }
 function renderAt(time,settings=c){
  const aspect=settings.width/settings.height,extent=1.55;
  camera.left=-extent*Math.max(1,aspect);camera.right=-camera.left;camera.top=extent*Math.max(1,1/aspect);camera.bottom=-camera.top;
  const elevation=settings.tilt*Math.PI/180;
  camera.position.set(3,Math.sin(elevation)*6,Math.cos(elevation)*6);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
  renderer.setClearColor(settings.background,transparent?0:1);
  transformsAt(settings,time).forEach((t,i)=>{const l=leaves[i];l.pivot.rotation.set(t.rx,t.ry,t.rz,'YXZ');l.pivot.scale.setScalar(t.scale);l.front.color.set(settings.colors[i%settings.colors.length]);l.back.color.copy(l.front.color);});
  leaves.forEach((l,i)=>l.pivot.visible=i<settings.count);
  renderer.render(scene,camera);
 }
 function resize(w,h){renderer.setSize(w*scale,h*scale);}
 function dispose(){geometry.dispose();leaves.forEach(l=>{l.front.dispose();l.back.dispose();});renderer.dispose();renderer.forceContextLoss();}
 return {canvas:renderer.domElement,renderAt,resize,dispose,scene,camera,leaves};
}
