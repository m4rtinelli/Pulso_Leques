import {cubicBezier} from './easing.js';
export const SYMBOL='M967.315 0H285.249L285.948 1.3045L16.2903 1106.96C-70.1325 1461.32 198.221 1803 562.967 1803H1245.03L1244.33 1801.7L1513.99 695.995C1600.41 341.685 1332.06 0 967.315 0Z';
// Left/right extent of SYMBOL's own points and bezier controls, for the volume gradient.
const BOUNDS_X0=-70.1325,BOUNDS_X1=1600.41;
function shadeColor(hex,factor){
 const n=parseInt(hex.slice(1),16),clamp=v=>Math.max(0,Math.min(255,Math.round(v*factor)));
 return `rgb(${clamp((n>>16)&255)},${clamp((n>>8)&255)},${clamp(n&255)})`;
}
function volumeStops(color,intensity){
 const k=intensity/100;
 return [[0,shadeColor(color,1-0.5*k)],[0.5,shadeColor(color,1+0.35*k)],[1,shadeColor(color,1-0.5*k)]];
}
export function fanScene(c,time){
 time=((time%c.duration)+c.duration)%c.duration;
 const leaves=[],base=Math.min(c.width,c.height)*.000225*c.size/83;
 for(let i=0;i<c.count;i++){
  const f=c.count===1?0:i/(c.count-1)-.5;
  const cycle=time/c.duration*c.speed-(c.growth==='cascade'?i/Math.max(1,c.count-1)*c.stagger/100:0);
  const p=(1-Math.cos(cycle*Math.PI*2))/2;
  const eased=c.easingTarget==='internal'?p:cubicBezier(p,c.easing);
  const opening=c.growth==='none'?1:c.growth==='breathe'?.65+.35*eased:eased;
  const phase=time/c.duration*c.speed*Math.PI*2;
  const internal=c.easingTarget==='growth'?(1-Math.cos(phase))/2:cubicBezier((1-Math.cos(phase))/2,c.easing);
  const flutter=c.motion==='wave'?Math.sin(phase+i*.42)*(.3+internal*.7)*c.tilt*.45:c.motion==='pulse'?(internal-.5)*c.tilt:0;
  const angle=(f*c.spread*opening+c.rotation+(c.motion==='flow'?360*time/c.duration*c.speed:0))*Math.PI/180;
  const squash=Math.cos((c.tilt+flutter)*Math.PI/180),scale=base*c.heights[i]/100;
  const a=Math.cos(angle)*scale,b=Math.sin(angle)*scale,d=Math.cos(angle)*scale*squash,cc=-Math.sin(angle)*scale*squash;
  leaves.push({color:c.colors[i%c.colors.length],matrix:[a,b,cc,d,c.width/2-a*765.5-cc*1700,c.height*.62-b*765.5-d*1700]});
 }return {width:c.width,height:c.height,background:c.background,leaves};
}
export function fanSVG(c,time,transparent=false){
 const s=fanScene(c,time),volume=c.volume?.enabled;
 const defs=volume?`<defs>${s.leaves.map((l,i)=>`<linearGradient id="vol-${i}" x1="${BOUNDS_X0}" y1="0" x2="${BOUNDS_X1}" y2="0" gradientUnits="userSpaceOnUse">${volumeStops(l.color,c.volume.intensity).map(([o,stop])=>`<stop offset="${o}" stop-color="${stop}"/>`).join('')}</linearGradient>`).join('')}</defs>`:'';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${s.width}" height="${s.height}" viewBox="0 0 ${s.width} ${s.height}">${transparent?'':`<rect width="100%" height="100%" fill="${s.background}"/>`}${defs}${s.leaves.map((l,i)=>`<path id="folha-${i+1}" fill="${volume?`url(#vol-${i})`:l.color}" transform="matrix(${l.matrix.join(' ')})" d="${SYMBOL}"/>`).join('')}</svg>`;
}
export function createFanRenderer(c,{scale=1,transparent=false}={}){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),path=new Path2D(SYMBOL);
 function resize(w,h){canvas.width=w*scale;canvas.height=h*scale;}
 resize(c.width,c.height);
 function renderAt(time,settings=c){const s=fanScene(settings,time);ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,s.width,s.height);if(!transparent){ctx.fillStyle=s.background;ctx.fillRect(0,0,s.width,s.height);}for(const l of s.leaves){ctx.save();ctx.transform(...l.matrix);
  if(settings.volume?.enabled){const grad=ctx.createLinearGradient(BOUNDS_X0,0,BOUNDS_X1,0);for(const[o,stop]of volumeStops(l.color,settings.volume.intensity))grad.addColorStop(o,stop);ctx.fillStyle=grad;}
  else ctx.fillStyle=l.color;
  ctx.fill(path);ctx.restore();}}
 return {canvas,resize,renderAt,dispose(){canvas.width=1;canvas.height=1;}};
}

