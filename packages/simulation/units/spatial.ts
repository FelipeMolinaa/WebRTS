import type {Army} from './army';
/** Shared live-unit buckets partitioned by country, avoiding scans of friendly armies. */
export class UnitSpatialIndex {
 private buckets=new Map<string,Map<number,number[]>>();readonly cellSize=128;queries=0;candidates=0;
 constructor(private army:Army){}
 rebuild(){for(const cell of this.buckets.values())for(const b of cell.values())b.length=0;for(let i=0;i<this.army.size;i++)if(this.army.ids[i]&&!this.army.embarked[i]){const key=Math.floor(this.army.x[i]/this.cellSize)+','+Math.floor(this.army.y[i]/this.cellSize);let cell=this.buckets.get(key);if(!cell){cell=new Map();this.buckets.set(key,cell);}let b=cell.get(this.army.owner[i]);if(!b){b=[];cell.set(this.army.owner[i],b);}b.push(i);}}
 *near(x:number,y:number,radius:number,acceptOwner?:(owner:number)=>boolean){this.queries++;const s=this.cellSize,r2=radius*radius;for(let cy=Math.floor((y-radius)/s);cy<=Math.floor((y+radius)/s);cy++)for(let cx=Math.floor((x-radius)/s);cx<=Math.floor((x+radius)/s);cx++)for(const [owner,indices]of this.buckets.get(cx+','+cy)??[]){if(acceptOwner&&!acceptOwner(owner))continue;for(const i of indices){this.candidates++;if(this.army.ids[i]&&(this.army.x[i]-x)**2+(this.army.y[i]-y)**2<=r2)yield i;}}}
}
