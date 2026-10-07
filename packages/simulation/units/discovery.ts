import type {ProceduralMap,TerritoryCell} from '../../map/types';
import {cellAtWorld} from '../../map/hex/coordinates';
import type {Point} from '../navigation/grid';
/** Expand the city perimeter in concentric bands, finishing nearby rings before moving outward. */
export function discoveryFrontier(map:ProceduralMap,candidates:TerritoryCell[],center:Point,start:Point,friendly:(owner:number|null)=>boolean,reserved:ReadonlySet<number>=new Set()){
 const current=cellAtWorld(map,start.x,start.y),frontier=candidates.filter(c=>c.neighbors.some(n=>friendly(map.cells[n].ownerId))||c.neighbors.includes(current?.id??-1));
 const band=map.layout.radius*Math.sqrt(3),ring=(c:Point)=>Math.floor(Math.hypot(c.x-center.x,c.y-center.y)/band+1e-6),distance=(c:Point)=>(c.x-start.x)**2+(c.y-start.y)**2;
 return frontier.sort((a,b)=>ring(a)-ring(b)||Number(reserved.has(a.id))-Number(reserved.has(b.id))||distance(a)-distance(b)||a.id-b.id);
}

export const DISCOVERY_CONFIG={separationHexes:2};
/** Spatial buckets keep proximity checks local even with hundreds of independent scouts. */
export class DiscoveryTraffic {
 readonly separation:number;private buckets=new Map<string,Point[]>();
 constructor(map:ProceduralMap,points:readonly Point[]){this.separation=map.layout.radius*Math.sqrt(3)*DISCOVERY_CONFIG.separationHexes;for(const point of points){const key=this.key(Math.floor(point.x/this.separation),Math.floor(point.y/this.separation)),bucket=this.buckets.get(key)??[];bucket.push(point);this.buckets.set(key,bucket);}}
 private key(x:number,y:number){return x+','+y;}
 clear(target:Point){const x=Math.floor(target.x/this.separation),y=Math.floor(target.y/this.separation),minimum=(this.separation-.01)**2;for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const point of this.buckets.get(this.key(x+dx,y+dy))??[])if((point.x-target.x)**2+(point.y-target.y)**2<minimum)return false;return true;}
}

/** Mutable reservations shared across scouts during one scheduling pass. */
export class ScoutTraffic {
 private buckets=new Map<string,{key:number;owner:number;point:Point}[]>();private entries=new Map<number,string[]>();private separation:number;
 constructor(map:ProceduralMap){this.separation=map.layout.radius*Math.sqrt(3)*DISCOVERY_CONFIG.separationHexes;}
 add(key:number,owner:number,point:Point){const cell=Math.floor(point.x/this.separation)+','+Math.floor(point.y/this.separation);let bucket=this.buckets.get(cell);if(!bucket){bucket=[];this.buckets.set(cell,bucket);}bucket.push({key,owner,point});const entries=this.entries.get(key)??[];entries.push(cell);this.entries.set(key,entries);}
 remove(key:number){for(const cell of this.entries.get(key)??[]){const b=this.buckets.get(cell)!;for(let n=b.length-1;n>=0;n--)if(b[n].key===key)b.splice(n,1);}this.entries.delete(key);}
 clear(target:Point,key:number,owner:number,earlierOnly:boolean,friendly:(a:number,b:number)=>boolean){const x=Math.floor(target.x/this.separation),y=Math.floor(target.y/this.separation),minimum=(this.separation-.01)**2;for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const e of this.buckets.get((x+dx)+','+(y+dy))??[]){if(e.key===key||earlierOnly&&e.key>key||!friendly(owner,e.owner))continue;if((e.point.x-target.x)**2+(e.point.y-target.y)**2<minimum)return false;}return true;}
}
