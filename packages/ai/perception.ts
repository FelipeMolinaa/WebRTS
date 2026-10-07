import {cellAtWorld,worldToHex,axialIndex} from '../map/hex/coordinates';
import {AI_CONFIG as C} from '../shared/configs/ai';
import type {TerritoryMatch} from '../simulation/territory/match';
import type {Army} from '../simulation/units/army';
import type {BuildingType} from '../shared/configs/buildings';
export interface Sighting {id:number;owner:number;x:number;y:number;strength:number;time:number;confidence:number;type?:BuildingType;cellId?:number;}
/** Scouting discovers cells permanently; enemy positions are refreshed only in current vision. */
export class Perception {
 discovered=new Set<number>();visible=new Set<number>();units=new Map<number,Sighting>();buildings=new Map<number,Sighting>();knownOwners=new Map<number,number|null>();observedGrowth=new Map<number,number>();private strengthHistory=new Map<number,number>();private next=0;revision=0;
 private sourceCoordinates=new Set<string>();private sourcePool:{x:number;y:number}[]=[];private sourceGroups=new Map<number,{x:number;y:number}[]>();private footprints=new Map<number,number[]>();visionGroups=0;visionChecks=0;
 constructor(readonly owner:number,private match:TerritoryMatch,private army:Army){}
 update(time:number){if(time<this.next)return;this.next=time+C.intelligenceInterval;this.revision++;this.visible.clear();const cells=this.match.map.cells;
 for(const id of this.match.owned.get(this.owner)??[]){this.visible.add(id);for(const n of cells[id].neighbors)this.visible.add(n);}
 for(const group of this.sourceGroups.values())group.length=0;this.sourceCoordinates.clear();let pooled=0;const source=(x:number,y:number)=>{const key=x+','+y;if(this.sourceCoordinates.has(key))return;this.sourceCoordinates.add(key);const cell=cellAtWorld(this.match.map,x,y);if(!cell)return;let group=this.sourceGroups.get(cell.id);if(!group){group=[];this.sourceGroups.set(cell.id,group);}let point=this.sourcePool[pooled];if(!point){point={x,y};this.sourcePool.push(point);}point.x=x;point.y=y;pooled++;group.push(point);};
 for(const b of this.match.state.buildings)if(b.ownerId===this.owner){const c=cells[b.anchorId];source(c.x,c.y);}for(let i=0;i<this.army.size;i++)if(this.army.ids[i]&&!this.army.embarked[i]&&this.army.owner[i]===this.owner)source(this.army.x[i],this.army.y[i]);
 const radius=C.visionRadius,hex=this.match.map.layout.radius,bounds=Math.ceil(radius/(hex*1.4))+2;this.visionGroups=0;this.visionChecks=0;
 for(const [cellId,group]of this.sourceGroups){if(!group.length)continue;this.visionGroups++;const center=cells[cellId];let footprint=this.footprints.get(cellId);if(!footprint){footprint=[];const {q,r}=center;for(let dr=-bounds;dr<=bounds;dr++)for(let dq=-bounds;dq<=bounds;dq++){const id=axialIndex(q+dq,r+dr,this.match.map.layout),c=cells[id];if(c&&Math.hypot(c.x-center.x,c.y-center.y)<=radius+hex*1.01)footprint.push(id);}if(this.footprints.size>=256)this.footprints.delete(this.footprints.keys().next().value!);this.footprints.set(cellId,footprint);}
 for(const id of footprint){if(this.visible.has(id))continue;const c=cells[id];for(const point of group){this.visionChecks++;if((c.x-point.x)**2+(c.y-point.y)**2<=radius*radius){this.visible.add(id);break;}}}}
 for(const id of this.visible){this.discovered.add(id);this.knownOwners.set(id,cells[id].ownerId);}
 const seenUnits=new Set<number>(),seenBuildings=new Set<number>();
 for(let i=0;i<this.army.size;i++){if(!this.army.ids[i]||this.army.embarked[i]||this.army.owner[i]===this.owner)continue;const x=this.army.x[i],y=this.army.y[i];const cell=cellAtWorld(this.match.map,x,y);if(!cell||!this.visible.has(cell.id))continue;const id=this.army.ids[i];seenUnits.add(id);this.units.set(id,{id,owner:this.army.owner[i],x,y,strength:(this.army.kind[i]===1?5:this.army.kind[i]===2?6:this.army.kind[i]>=3?0:1)*this.army.hp[i]/this.army.definition(i).health,time,confidence:1});}
 for(const b of this.match.state.buildings){if(!this.visible.has(b.anchorId))continue;seenBuildings.add(b.id);if(b.ownerId===this.owner){this.buildings.delete(b.id);continue;}const c=cells[b.anchorId];this.buildings.set(b.id,{id:b.id,owner:b.ownerId,x:c.x,y:c.y,strength:0,time,confidence:1,type:b.type,cellId:b.anchorId});}
 for(const player of this.match.state.players){const current=this.strength(player.id),old=this.strengthHistory.get(player.id)??current;this.observedGrowth.set(player.id,Math.max(0,current-old)+(this.observedGrowth.get(player.id)??0)*.9);this.strengthHistory.set(player.id,current);}
 for(const [id,s]of this.units){s.confidence=Math.pow(.5,(time-s.time)/C.memoryHalfLife);if(s.confidence<.08)this.units.delete(id);}
 for(const [id,s]of this.buildings){s.confidence=Math.pow(.5,(time-s.time)/C.memoryHalfLife);if(this.visible.has(s.cellId!)&&!seenBuildings.has(id)||s.confidence<.08)this.buildings.delete(id);}
 }
 strength(id:number,precision=1){let total=0;for(const s of this.units.values())if(s.owner===id)total+=s.strength*s.confidence;return total/precision;}
 currentEnemies(id:number){return [...this.units.values()].filter(s=>s.owner===id&&s.confidence>.98);}
 border(id:number){let n=0;for(const cell of this.match.owned.get(this.owner)??[])for(const neighbor of this.match.map.cells[cell].neighbors)if(this.knownOwners.get(neighbor)===id)n++;return n;}
 knownTerritory(id:number){return [...this.knownOwners.values()].filter(owner=>owner===id).length;}
}
