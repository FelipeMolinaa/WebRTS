import { ENGINE } from '../../shared/configs/engine';
import type { World } from '../ecs/world';
export function movement(world:World,dt:number){for(let i=0;i<world.count;i++){world.x[i]+=world.vx[i]*dt;world.y[i]+=world.vy[i]*dt;if(world.x[i]<10||world.x[i]>ENGINE.worldWidth-10){world.x[i]=Math.max(10,Math.min(ENGINE.worldWidth-10,world.x[i]));world.vx[i]*=-1;}if(world.y[i]<10||world.y[i]>ENGINE.worldHeight-10){world.y[i]=Math.max(10,Math.min(ENGINE.worldHeight-10,world.y[i]));world.vy[i]*=-1;}}}
