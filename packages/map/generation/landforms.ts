import type {HexLayout,Landform,TerritoryCell} from '../types';
import {fractalNoise,noise,randomSequence} from './random';

function components(cells:TerritoryCell[]){
 const seen=new Uint8Array(cells.length),groups:number[][]=[];
 for(const c of cells){if(c.terrain!=='land'||seen[c.id])continue;const queue=[c.id];seen[c.id]=1;
  for(let h=0;h<queue.length;h++)for(const n of cells[queue[h]].neighbors)if(!seen[n]&&cells[n].terrain==='land'){seen[n]=1;queue.push(n);}
  groups.push(queue);
 }
 return groups.sort((a,b)=>b.length-a.length);
}
function threshold(cells:TerritoryCell[],field:Float64Array,level:number){for(const c of cells)c.terrain=field[c.id]>level?'land':'water';}

/** A warped elevation field defines the land, rather than placing oval islands in slots. */
export function generateLandforms(cells:TerritoryCell[],layout:HexLayout,landform:Landform,seed:number){
 const random=randomSequence(seed^0x5ac231),single=landform!=='continents',field=new Float64Array(cells.length);
 const angle=random()*Math.PI*2,cos=Math.cos(angle),sin=Math.sin(angle),sx=2.4+random()*1.7,sy=2.3+random()*1.8;
 const ox=random()*80,oy=random()*80,warp=.12+random()*.12,edgeWidth=.055+random()*.055;
 for(const c of cells){
  const x=(c.id%layout.columns)/(layout.columns-1),y=c.r/(layout.rows-1);
  const wx=x+(fractalNoise(x*3.5+ox,y*3.5+oy,seed^17291)-.5)*warp;
  const wy=y+(fractalNoise(x*3.5+oy,y*3.5+ox,seed^99371)-.5)*warp;
  const u=(wx-.5)*cos-(wy-.5)*sin,v=(wx-.5)*sin+(wy-.5)*cos;
  const broad=fractalNoise(u*sx+ox,v*sy+oy,seed),middle=noise(u*7.5+oy,v*7.5+ox,seed^7127),detail=fractalNoise(wx*17+ox,wy*17+oy,seed^9323);
  const edge=Math.min(wx,1-wx,wy,1-wy),localMargin=edgeWidth*(.7+noise(x*4+oy,y*4+ox,seed^7331)*.8),falloff=Math.max(0,1-edge/localMargin);
  field[c.id]=broad*.70+middle*.21+detail*.09-falloff*.65;
  if(c.neighbors.length<6)field[c.id]=-1;
 }
 const sorted=Array.from(field).sort((a,b)=>a-b),minimum=Math.max(200,Math.floor(cells.length*.025));
 let groups:number[][]=[];
 if(single){
  // Lower sea level only as needed to connect a useful, irregular supercontinent.
  for(const share of [.58,.64,.70,.76]){
   threshold(cells,field,sorted[Math.floor(sorted.length*(1-share))]);groups=components(cells);
   if((groups[0]?.length??0)>cells.length*.38)break;
  }
  groups=groups.slice(0,1);
 }else{
  // Seek natural separated continents; count, placement and sizes follow the seed.
  for(const share of [.52,.47,.42,.37,.32]){
   threshold(cells,field,sorted[Math.floor(sorted.length*(1-share))]);groups=components(cells);
   if(groups.filter(g=>g.length>=minimum).length>=2)break;
  }
  if(groups.filter(g=>g.length>=minimum).length<2){
   threshold(cells,field,sorted[Math.floor(sorted.length*.48)]);groups=components(cells);
   const mass=groups[0]??[],point=(id:number)=>({x:(id%layout.columns)/(layout.columns-1),y:cells[id].r/(layout.rows-1)});
   if(mass.length){
    const center=mass.reduce((p,id)=>{const c=point(id);return {x:p.x+c.x/mass.length,y:p.y+c.y/mass.length};},{x:0,y:0});
    const farthest=(p:{x:number;y:number})=>mass.reduce((best,id)=>{const a=point(id),b=point(best);return (a.x-p.x)**2+(a.y-p.y)**2>(b.x-p.x)**2+(b.y-p.y)**2?id:best;},mass[0]);
    const a=point(farthest(center)),b=point(farthest(a)),length=Math.hypot(a.x-b.x,a.y-b.y),dx=(b.x-a.x)/length,dy=(b.y-a.y)/length;
    const offset=(random()-.5)*length*.18;
    // A sinuous strait follows a warped contour, without fixed horizontal/vertical lanes.
    for(const id of mass){const p=point(id),bend=(fractalNoise(p.x*4+ox,p.y*4+oy,seed^8171)-.5)*.18;
     if(Math.abs((p.x-center.x)*dx+(p.y-center.y)*dy+bend-offset)<.014)cells[id].terrain='water';
    }
    groups=components(cells);
   }
  }
  // Keep small natural islands, but discard specks too small to read at map scale.
  groups=groups.filter(g=>g.length>=Math.max(12,cells.length*.0006));
 }
 const retained=new Uint8Array(cells.length);
 groups.forEach((group,index)=>{for(const id of group){retained[id]=1;cells[id].continentId=index;}});
 for(const c of cells){
  if(!retained[c.id]){c.terrain='water';c.continentId=-1;}
  else c.terrain='land';
  c.elevation=c.terrain==='land'?.54+Math.max(0,field[c.id]-.3)*.65+fractalNoise(c.q/23,c.r/23,seed^5193)*.12:.25;
 }
}
