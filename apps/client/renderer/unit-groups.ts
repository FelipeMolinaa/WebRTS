import {UNIT_STRIDE} from '../../../packages/shared/configs/units';
export interface UnitMarker {owner:number;kind:number;x:number;y:number;count:number;}
/** Display aggregation only. Selected units and simulation positions stay independent. */
export function groupUnitMarkers(data:Float32Array,indices:Iterable<number>,selected:ReadonlySet<number>,zoom:number):UnitMarker[]{
 const groups=new Map<string,UnitMarker>(),size=22/zoom;
 for(const k of indices){if(k<0||k+UNIT_STRIDE>data.length||selected.has(data[k]))continue;const owner=data[k+5],kind=data[k+4],key=owner+':'+kind+':'+Math.floor(data[k+1]/size)+':'+Math.floor(data[k+2]/size);let group=groups.get(key);if(!group){group={owner,kind,x:0,y:0,count:0};groups.set(key,group);}group.x+=data[k+1];group.y+=data[k+2];group.count++;}
 for(const group of groups.values()){group.x/=group.count;group.y/=group.count;}return [...groups.values()];
}
