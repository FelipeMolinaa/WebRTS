import { ENGINE } from '../../shared/configs/engine';
import type { World } from '../ecs/world';
/** Synthetic target-acquisition load. Bounded candidates, no production combat rules. */
export class SyntheticCombat {
 private cols=Math.ceil(ENGINE.worldWidth/ENGINE.spatialCell)+2;
 private heads=new Int32Array(this.cols*(Math.ceil(ENGINE.worldHeight/ENGINE.spatialCell)+2));
 private next=new Int32Array(ENGINE.maxEntities);
 update(world:World,dt:number){this.heads.fill(-1);for(let i=0;i<world.count;i++){const key=Math.floor(world.x[i]/ENGINE.spatialCell)+Math.floor(world.y[i]/ENGINE.spatialCell)*this.cols;this.next[i]=this.heads[key];this.heads[key]=i;}
 let engaged=0;const rangeSq=ENGINE.targetRange**2;
 for(let i=0;i<world.count;i++){world.state[i]=0;const cx=Math.floor(world.x[i]/ENGINE.spatialCell),cy=Math.floor(world.y[i]/ENGINE.spatialCell);let budget=ENGINE.targetCandidateBudget,found=false;
 for(let oy=-1;oy<=1&&!found&&budget>0;oy++)for(let ox=-1;ox<=1&&!found&&budget>0;ox++){if(cx+ox<0||cy+oy<0)continue;let j=this.heads[cx+ox+(cy+oy)*this.cols];while(j>=0&&budget-->0){if(world.owner[j]!==world.owner[i]){const dx=world.x[j]-world.x[i],dy=world.y[j]-world.y[i];if(dx*dx+dy*dy<rangeSq){world.state[i]=1;world.health[i]-=dt*8;if(world.health[i]<=0)world.health[i]=100;engaged++;found=true;break;}}j=this.next[j];}}
 }return engaged;}
}
