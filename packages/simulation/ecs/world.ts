import { ENGINE } from '../../shared/configs/engine';
export class World {
 count=0; randomState=ENGINE.seed;
 readonly x=new Float32Array(ENGINE.maxEntities); readonly y=new Float32Array(ENGINE.maxEntities);
 readonly vx=new Float32Array(ENGINE.maxEntities); readonly vy=new Float32Array(ENGINE.maxEntities);
 readonly speed=new Float32Array(ENGINE.maxEntities); readonly health=new Float32Array(ENGINE.maxEntities);
 readonly owner=new Uint8Array(ENGINE.maxEntities); readonly state=new Uint8Array(ENGINE.maxEntities);
 random(){ let t=this.randomState+=0x6d2b79f5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296; }
 add(amount:number){const end=Math.min(ENGINE.maxEntities,this.count+Math.max(0,Math.floor(amount)));
 for(let i=this.count;i<end;i++){const team=i%12;this.owner[i]=team;const cx=700+(team%4)*1530,cy=600+Math.floor(team/4)*1370;this.x[i]=Math.max(10,Math.min(ENGINE.worldWidth-10,cx+(this.random()-.5)*1600));this.y[i]=Math.max(10,Math.min(ENGINE.worldHeight-10,cy+(this.random()-.5)*1400));const a=this.random()*Math.PI*2;this.speed[i]=ENGINE.speedMin+this.random()*(ENGINE.speedMax-ENGINE.speedMin);this.vx[i]=Math.cos(a)*this.speed[i];this.vy[i]=Math.sin(a)*this.speed[i];this.health[i]=100;this.state[i]=0;}
 this.count=end; }
 reset(){this.count=0;this.randomState=ENGINE.seed;this.add(ENGINE.initialEntities);}
}
