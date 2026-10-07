import {isWalkable} from '../../map/bridges';
import {ENGINE} from '../../shared/configs/engine';
import type {ProceduralMap,TerritoryCell} from '../../map/types';
import {hexCorners,cellAtWorld} from '../../map/hex/coordinates';
export interface Point{x:number;y:number}
export type CellPassable=(cell:TerritoryCell)=>boolean;
/** Hex-based route search with continuous, polygon-checked movement between waypoints. */
export class NavigationGrid {
 searches=0;cacheHits=0;expanded=0;private routeCache=new Map<string,Point[]>();private workspaces:SearchWorkspace[]=[];private connectivityRevision=-1;private components=new Int32Array(0);private checked=new Set<number>();
 readonly columns:number;readonly rows:number;
 constructor(private map:ProceduralMap){this.columns=map.layout.columns;this.rows=map.layout.rows;}
 land(p:Point){if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.y<0||p.x>=ENGINE.worldWidth||p.y>=ENGINE.worldHeight)return false;const c=cellAtWorld(this.map,p.x,p.y);return !!c&&isWalkable(c);}
 clear(a:Point,b:Point,allowed?:CellPassable){if(!this.land(a)||!this.land(b))return false;if(allowed&&(!allowed(cellAtWorld(this.map,a.x,a.y)!)||!allowed(cellAtWorld(this.map,b.x,b.y)!)))return false;const first=cellAtWorld(this.map,a.x,a.y)!,last=cellAtWorld(this.map,b.x,b.y)!;if(first.id===last.id)return true;const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/Math.min(4,this.map.layout.radius*.15))),checked=this.checked;checked.clear();for(let i=0;i<=n;i++){const p={x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n};if(p.x<0||p.y<0||p.x>=ENGINE.worldWidth||p.y>=ENGINE.worldHeight)return false;const cell=cellAtWorld(this.map,p.x,p.y);if(!cell||!isWalkable(cell))return false;if(allowed&&!allowed(cell))return false;for(const id of cell.neighbors){if(checked.has(id)||(isWalkable(this.map.cells[id])&&(!allowed||allowed(this.map.cells[id]))))continue;checked.add(id);if(this.crossesCell(a,b,id))return false;}}return true;}
 /** Clip against nearby forbidden polygons as well as sampling, so a thin coastal corner cannot be skipped. */
 private crossesCell(a:Point,b:Point,id:number){const polygon=hexCorners(this.map.cells[id],this.map.layout.radius*1.0001);let low=0,high=1;for(let i=0;i<6;i++){const j=(i+1)%6,x=polygon[i*2],y=polygon[i*2+1],ex=polygon[j*2]-x,ey=polygon[j*2+1]-y,cross=ex*(a.y-y)-ey*(a.x-x),slope=ex*(b.y-a.y)-ey*(b.x-a.x);if(Math.abs(slope)<1e-10){if(cross<0)return false;continue;}const t=-cross/slope;if(slope>0)low=Math.max(low,t);else high=Math.min(high,t);if(low>high)return false;}return low<=high;}
 center(i:number):Point{const c=this.map.cells[i];return {x:c.x,y:c.y};}
 private neighbors(i:number){return this.map.cells[i].neighbors.filter(n=>isWalkable(this.map.cells[n]));}
 node(p:Point,allowed?:CellPassable){const c=cellAtWorld(this.map,p.x,p.y);return c&&isWalkable(c)&&(!allowed||allowed(c))?c.id:-1;}
 /** One flood fill per topology revision, rather than a full A* per candidate island. */
 private syncConnectivity(){
  const revision=this.map.navigationRevision??0;if(this.connectivityRevision===revision)return;
  const components=new Int32Array(this.map.cells.length).fill(-1),queue=new Int32Array(this.map.cells.length);let component=0;
  for(const cell of this.map.cells){if(components[cell.id]>=0||!isWalkable(cell))continue;let head=0,tail=1;queue[0]=cell.id;components[cell.id]=component;
   while(head<tail)for(const id of this.map.cells[queue[head++]].neighbors)if(components[id]<0&&isWalkable(this.map.cells[id])){components[id]=component;queue[tail++]=id;}
   component++;
  }
  this.components=components;this.connectivityRevision=revision;
 }
 connected(a:Point,b:Point){const from=this.node(a),to=this.node(b);if(from<0||to<0)return false;this.syncConnectivity();return this.components[from]===this.components[to];}
 route(start:Point,target:Point,allowed?:CellPassable):Point[]{const task=this.routeSteps(start,target,allowed);let result=task.next();while(!result.done)result=task.next();return result.value;}
 /** Searches yield between bounded node batches; callers may drain synchronously for small orders. */
 *routeSteps(start:Point,target:Point,allowed?:CellPassable):Generator<void,Point[],unknown>{
 this.searches++;if(!this.land(target))throw new Error('Escolha um destino em terra.');
 if(this.clear(start,target,allowed))return [{x:target.x,y:target.y}];
 const a=this.node(start,allowed),b=this.node(target,allowed);if(a<0||b<0||!this.connected(start,target))throw new Error('Não há uma rota terrestre até esse destino.');
 const key=(this.map.navigationRevision??0)+':'+a+':'+b,cached=!allowed?this.routeCache.get(key):null;
 if(cached&&this.clear(start,cached[0])&&this.clear(cached.at(-2)??start,target)){this.cacheHits++;const points=cached.slice();points[points.length-1]={x:target.x,y:target.y};return points;}
 const w=this.workspaces.pop()??new SearchWorkspace(this.map.cells.length);const stamp=w.begin(),cost=w.cost,parent=w.parent,closed=w.closed,seen=w.seen,heap=w.heap,score=w.score;
 const touch=(id:number)=>{if(seen[id]!==stamp){seen[id]=stamp;cost[id]=Infinity;parent[id]=-1;}};touch(a);cost[a]=0;
 const push=(id:number,value:number)=>{let i=heap.length;heap.push(id);score.push(value);while(i>0){const p=(i-1)>>1;if(score[p]<=value)break;heap[i]=heap[p];score[i]=score[p];i=p;}heap[i]=id;score[i]=value;};
 const pop=()=>{const first=heap[0],last=heap.pop()!,value=score.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&score[c+1]<score[c])c++;if(score[c]>=value)break;heap[i]=heap[c];score[i]=score[c];i=c;}heap[i]=last;score[i]=value;}return first;};
 const goal=this.map.cells[b];push(a,0);let batch=0;
 try{
 while(heap.length){const i=pop();if(closed[i]===stamp)continue;if(i===b)break;closed[i]=stamp;this.expanded++;const p=this.map.cells[i];for(const j of p.neighbors){if(closed[j]===stamp)continue;const q=this.map.cells[j];if(!isWalkable(q)||allowed&&!allowed(q))continue;touch(j);const next=cost[i]+Math.hypot(q.x-p.x,q.y-p.y);if(next>=cost[j])continue;cost[j]=next;parent[j]=i;push(j,next+Math.hypot(q.x-goal.x,q.y-goal.y));}if(++batch%128===0)yield;}
 if(a!==b&&(seen[b]!==stamp||parent[b]<0))throw new Error('Não há uma rota terrestre até esse destino.');
 const raw:Point[]=[{x:target.x,y:target.y}];for(let i=b;i!==a;i=parent[i])raw.push(this.center(i));raw.push(this.center(a));raw.reverse();
 const smooth:Point[]=[];let from=start,index=0,checks=0;while(index<raw.length){let next=index;while(next+1<raw.length){if(!this.clear(from,raw[next+1],allowed))break;next++;if(++checks%8===0)yield;}smooth.push(raw[next]);from=raw[next];index=next+1;yield;}
 if(!allowed){if(this.routeCache.size>=256)this.routeCache.delete(this.routeCache.keys().next().value!);this.routeCache.set(key,smooth);}return smooth;
 }finally{heap.length=0;score.length=0;if(this.workspaces.length<2)this.workspaces.push(w);}
 }
}
/** Generation stamps touch only searched nodes; storage and numeric heap arrays are reused. */
class SearchWorkspace {
 readonly cost:Float64Array;readonly parent:Int32Array;readonly seen:Uint32Array;readonly closed:Uint32Array;heap:number[]=[];score:number[]=[];private stamp=0;
 constructor(size:number){this.cost=new Float64Array(size);this.parent=new Int32Array(size);this.seen=new Uint32Array(size);this.closed=new Uint32Array(size);}
 begin(){this.stamp=(this.stamp+1)>>>0;if(!this.stamp){this.seen.fill(0);this.closed.fill(0);this.stamp=1;}this.heap.length=0;this.score.length=0;return this.stamp;}
}
