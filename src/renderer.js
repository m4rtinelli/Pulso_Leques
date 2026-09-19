import {createRenderer as create3D} from './scene.js';
import {createFanRenderer} from './fan.js';
export function createRenderer(config,options){return config.mode==='fan'?createFanRenderer(config,options):create3D(config,options);}
