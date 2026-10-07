import {UNIT_STRIDE} from '../../../packages/shared/configs/units';
export interface UnitBounds{left:number;right:number;top:number;bottom:number;}
/** Index the interpolation envelope, so units entering or leaving the viewport are never skipped. */
export class RenderUnitIndex {
 private cells=new Map<string,number[]>();private marks=new Uint32Array(0);private stamp=0;readonly size=192;visited=0;
 rebuild(data:Float32Array,previous:ReadonlyMap<number,{x:number;y:number}>){for(const b of this.cells.values())b.length=0;if(this.marks.length<data.length/UNIT_STRIDE)this.marks=new Uint32Array(data.length/UNIT_STRIDE);const s=this.size;for(let k=0;k<data.length;k+=UNIT_STRIDE){const old=previous.get(data[k]),x=data[k+1],y=data[k+2],px=old?.x??x,py=old?.y??y;for(let cy=Math.floor(Math.min(y,py)/s);cy<=Math.floor(Math.max(y,py)/s);cy++)for(let cx=Math.floor(Math.min(x,px)/s);cx<=Math.floor(Math.max(x,px)/s);cx++){const key=cx+','+cy;let b=this.cells.get(key);if(!b){b=[];this.cells.set(key,b);}b.push(k);}}}
 *query(bounds:UnitBounds){this.stamp=(this.stamp+1)>>>0;if(!this.stamp){this.marks.fill(0);this.stamp=1;}this.visited=0;const s=this.size;for(let cy=Math.floor(bounds.top/s);cy<=Math.floor(bounds.bottom/s);cy++)for(let cx=Math.floor(bounds.left/s);cx<=Math.floor(bounds.right/s);cx++)for(const k of this.cells.get(cx+','+cy)??[]){const row=k/UNIT_STRIDE;if(this.marks[row]===this.stamp)continue;this.marks[row]=this.stamp;this.visited++;yield k;}}
}
