import assert from 'node:assert/strict';
import {defaults,transformsAt,makeGeometry} from '../src/scene.js';
import {Vector3,Euler} from 'three';
const g=makeGeometry();g.computeBoundingBox();assert.ok(Math.abs(g.boundingBox.min.y)<1e-6);assert.ok(Math.abs(g.boundingBox.max.y-1)<1e-6);
for(const count of [1,5,16])for(const motion of ['flow','wave','pulse','still']){const c={...defaults,count,motion};const a=transformsAt(c,0),b=transformsAt(c,c.duration);assert.equal(a.length,count);a.forEach((t,i)=>{assert.ok(Object.values(t).every(Number.isFinite));const p=new Vector3(0,1,0).applyEuler(new Euler(t.rx,t.ry,t.rz,'YXZ'));const q=new Vector3(0,1,0).applyEuler(new Euler(b[i].rx,b[i].ry,b[i].rz,'YXZ'));assert.ok(p.distanceTo(q)<1e-8);const anchor=new Vector3(0,0,0).applyEuler(new Euler(t.rx,t.ry,t.rz));assert.equal(anchor.length(),0);});}
assert.notDeepEqual(transformsAt(defaults,0),transformsAt(defaults,1));g.dispose();console.log('3D geometry, lower hinge, finite transforms and seamless rotation passed');

const {fanScene,fanSVG,SYMBOL}=await import('../src/fan.js');const c={...defaults,mode:'fan',count:7,motion:'wave',spread:160};const a=fanScene(c,0),b=fanScene(c,6);a.leaves.forEach((l,i)=>l.matrix.forEach((v,j)=>assert.ok(Math.abs(v-b.leaves[i].matrix[j])<1e-8)));assert.equal(fanSVG(c,3).split('d="'+SYMBOL+'"').length-1,7);console.log('Fan loop and editable SVG passed');

// Equal neighboring gaps, including the closing gap, for every supported count.
for(let count=2;count<=16;count++)for(const time of [0,1.17,3,5.9])for(const motion of ['flow','wave','pulse','still'])for(const stagger of [0,18,40]){
 const c={...defaults,count,spread:360,motion,stagger,growth:'cascade'};
 const leaves=transformsAt(c,time);const step=2*Math.PI/count;
 for(let i=0;i<count;i++){const gap=i===count-1?leaves[0].rx+2*Math.PI-leaves[i].rx:leaves[i+1].rx-leaves[i].rx;assert.ok(Math.abs(gap-step)<1e-10);}
}
for(const count of [3,6,11]){const c={...defaults,count,spread:180,motion:'still'};const leaves=transformsAt(c,0);assert.ok(Math.abs(leaves[0].rx+leaves.at(-1).rx)<1e-10);}
console.log('Uniform circular spacing and centered partial arcs passed');
