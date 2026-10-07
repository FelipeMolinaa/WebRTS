import type {HexLayout,RiverCourse,TerritoryCell} from '../types';
import {hexDistance} from '../hex/coordinates';
import {hashPoint,randomSequence} from './random';

function waterDistance(cells:TerritoryCell[]){
 const distance=new Int32Array(cells.length).fill(-1),queue:number[]=[];
 for(const c of cells)if(c.terrain==='water'){distance[c.id]=0;queue.push(c.id);}
 for(let h=0;h<queue.length;h++)for(const n of cells[queue[h]].neighbors)if(distance[n]<0){distance[n]=distance[queue[h]]+1;queue.push(n);}
 return distance;
}
function classifyWater(cells:TerritoryCell[]){
 const seen=new Uint8Array(cells.length);let lakeCount=0;
 for(const c of cells){if(c.terrain!=='water'||seen[c.id])continue;const queue=[c.id];seen[c.id]=1;let sea=false;
  for(let h=0;h<queue.length;h++){const cell=cells[queue[h]];if(cell.neighbors.length<6)sea=true;for(const n of cell.neighbors)if(cells[n].terrain==='water'&&!seen[n]){seen[n]=1;queue.push(n);}}
  for(const id of queue)if(cells[id].waterKind!=='river')cells[id].waterKind=sea?'sea':'lake';if(!sea)lakeCount++;
 }
 return lakeCount;
}
/** Strictly decreasing drainage distances guarantee a terminal lake/sea and no loops. */
export function generateHydrology(cells:TerritoryCell[],layout:HexLayout,seed:number){
 const random=randomSequence(seed^0x914bd),rivers:RiverCourse[]=[];
 classifyWater(cells);
 // Major rivers are routed before inland lakes, keeping a few continent-scale courses.
 const seaDistance=waterDistance(cells),majorSources=cells.filter(c=>c.terrain==='land'&&seaDistance[c.id]>=12).sort((a,b)=>seaDistance[b.id]-seaDistance[a.id]);
 const selected:number[]=[];
 for(const source of majorSources){
  if(selected.length>=Math.max(2,Math.round(cells.length/15000)))break;
  if(selected.some(id=>hexDistance(source,cells[id])<Math.min(layout.rows,layout.columns)/4))continue;
  let current=source;const path:number[]=[];
  while(current.terrain==='land'){
   path.push(current.id);const next=current.neighbors.filter(n=>seaDistance[n]<seaDistance[current.id]).sort((a,b)=>cells[a].elevation-cells[b].elevation+hashPoint(a,source.id,seed)*.18-hashPoint(b,source.id,seed)*.18)[0];
   if(next===undefined)break;current=cells[next];
  }
  if(current.waterKind!=='sea'&&current.waterKind!=='lake'||path.length<12)continue;
  selected.push(source.id);const widths=path.map((_,i)=>i<path.length*.5?1:i<path.length*.8?2:3);
  for(let i=0;i<path.length;i++){const c=cells[path[i]],next=cells[path[i+1]??current.id];c.terrain='water';c.waterKind='river';widen(c,next,path[i-1],widths[i],cells);}
  rivers.push({cells:path,widths,destinationId:current.id});
 }
 // Some seeds connect opposite coasts through a shared inland headwater.
 // The two arms each drain toward the sea; the connected waterway can cross a continent.
 if(rivers.length&&random()<.45){
  const first=rivers[0],source=cells[first.cells[0]],outlet=cells[first.destinationId],dx=outlet.x-source.x,dy=outlet.y-source.y;
  const far=cells.filter(c=>c.continentId===source.continentId&&c.terrain==='land'&&c.neighbors.some(n=>cells[n].waterKind==='sea'))
   .sort((a,b)=>((a.x-source.x)*dx+(a.y-source.y)*dy)-((b.x-source.x)*dx+(b.y-source.y)*dy))[0];
  if(far&&((far.x-source.x)*dx+(far.y-source.y)*dy)<0){
   const destinationId=far.neighbors.find(n=>cells[n].waterKind==='sea')!,parent=new Int32Array(cells.length).fill(-1),queue=[far.id];parent[far.id]=destinationId;
   for(let h=0;h<queue.length&&parent[source.id]<0;h++)for(const n of cells[queue[h]].neighbors)if(parent[n]<0&&cells[n].continentId===source.continentId&&(cells[n].terrain==='land'||cells[n].waterKind==='river')){parent[n]=queue[h];queue.push(n);}
   if(parent[source.id]>=0){
    const path:number[]=[];let id=source.id;while(id!==destinationId&&id>=0&&path.length<cells.length){path.push(id);id=parent[id];}
    if(id===destinationId&&path.length>=12){const widths=path.map((_,i)=>i<path.length*.5?1:i<path.length*.8?2:3);for(let i=0;i<path.length;i++){const c=cells[path[i]];c.terrain='water';c.waterKind='river';widen(c,cells[path[i+1]??destinationId],path[i-1],widths[i],cells);}rivers.push({cells:path,widths,destinationId});}
   }
  }
 }
 const coast=waterDistance(cells);
 const candidates=cells.filter(c=>coast[c.id]>=8),lakes:number[]=[];
 const target=Math.max(10,Math.round(cells.length/1500));
 for(let tries=0;tries<target*40&&lakes.length<target&&candidates.length;tries++){
  const center=candidates[Math.floor(random()*candidates.length)];if(lakes.some(id=>hexDistance(center,cells[id])<9))continue;
  const radius=random()<.65?1:random()<.8?2:3;lakes.push(center.id);
  const queue=[center.id],seen=new Set(queue);
  for(let h=0;h<queue.length;h++){
   const c=cells[queue[h]],d=hexDistance(c,center);if(d>radius||coast[c.id]<=2)continue;
   if(d<radius||hashPoint(c.q,c.r,seed^center.id)>.28){c.terrain='water';c.waterKind='lake';}
   if(d<radius)for(const n of c.neighbors)if(!seen.has(n)){seen.add(n);queue.push(n);}
  }
 }
 const lakeCount=classifyWater(cells),distance=waterDistance(cells),parent=new Int32Array(cells.length).fill(-1);
 for(const c of cells)if(c.terrain==='land'){
  let score=Infinity;
  for(const n of c.neighbors)if(distance[n]<distance[c.id]){
   const value=cells[n].elevation+hashPoint(n,c.id,seed)*.22;
   if(value<score){score=value;parent[c.id]=n;}
  }
 }
 const sources=cells.filter(c=>distance[c.id]>=8),usedSources:number[]=[...selected];
 const desired=Math.max(16,Math.round(cells.length/1100));
 for(let tries=0;tries<desired*35&&rivers.length<desired&&sources.length;tries++){
  // Prefer deeper sources for some long rivers, then fill smaller catchments.
  const samples=Array.from({length:rivers.length<desired*.25?8:1},()=>sources[Math.floor(random()*sources.length)]);
  const source=samples.sort((a,b)=>distance[b.id]-distance[a.id])[0];
  if(usedSources.some(id=>hexDistance(source,cells[id])<6))continue;
  const path:number[]=[];let id=source.id;
  while(id>=0&&cells[id].waterKind!=='sea'&&cells[id].waterKind!=='lake'){
   path.push(id);id=parent[id];
  }
  if(id<0||path.length<8)continue;
  usedSources.push(source.id);
  const destinationId=id,widths:number[]=[];
  const maximum=random()<.55?2:3;
  for(let i=0;i<path.length;i++){
   const c=cells[path[i]],next=cells[path[i+1]??destinationId],width=i<path.length*.4?1:i<path.length*.75?2:maximum;
   widths.push(width);c.terrain='water';c.waterKind='river';
   widen(c,next,path[i-1],width,cells);
  }
  rivers.push({cells:path,widths,destinationId});
 }
 return {rivers,lakeCount};
}

function widen(c:TerritoryCell,next:TerritoryCell,previous:number|undefined,width:number,cells:TerritoryCell[]){
 if(width===1)return;
 const dx=next.x-c.x,dy=next.y-c.y;
 const sides=c.neighbors.filter(n=>n!==next.id&&n!==previous).sort((a,b)=>{
  const dot=(n:number)=>Math.abs((cells[n].x-c.x)*dx+(cells[n].y-c.y)*dy);return dot(a)-dot(b)||a-b;
 });
 const first=sides[0];if(first===undefined)return;const flank=cells[first];
 if(flank.terrain==='land'){flank.terrain='water';flank.waterKind='river';}
 if(width===3){const opposite=sides.find(n=>cells[n].q-c.q===c.q-flank.q&&cells[n].r-c.r===c.r-flank.r);if(opposite!==undefined&&cells[opposite].terrain==='land'){cells[opposite].terrain='water';cells[opposite].waterKind='river';}}
}
