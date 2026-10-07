import {Container,Graphics} from 'pixi.js';
import type {ProceduralMap} from '../../../packages/map/types';
import {axialIndex,HEX_DIRECTIONS,hexCorners,hexEdge} from '../../../packages/map/hex/coordinates';
import type {BuildingType} from '../../../packages/shared/configs/buildings';
import type {PlacementResult} from '../../../packages/simulation/economy/types';
export function drawBuildingIcon(g:Graphics,type:BuildingType,x:number,y:number,s:number,color:number){g.rect(x-s,y-s,s*2,s*2).fill(0x212121).stroke({color,width:2});
 if(type==='bridge'){g.moveTo(x-s*.8,y-s*.4).lineTo(x+s*.8,y-s*.4).moveTo(x-s*.8,y+s*.4).lineTo(x+s*.8,y+s*.4);for(let i=-2;i<=2;i++)g.moveTo(x+i*s*.3,y-s*.4).lineTo(x+i*s*.3,y+s*.4);g.stroke({color,width:2});}
 else if(type==='city'){for(let i=0;i<3;i++)g.rect(x-s*.64+i*s*.48,y+s*.55-s*(.7+i*.35),s*.32,s*(.7+i*.35)).fill(color);}
 else if(type==='factory'){g.poly([x-s*.7,y+s*.65,x-s*.7,y-s*.15,x-s*.2,y+s*.1,x-s*.2,y-s*.2,x+s*.3,y+s*.1,x+s*.3,y-s*.65,x+s*.65,y-s*.65,x+s*.65,y+s*.65]).stroke({color,width:2});for(let i=0;i<3;i++)g.rect(x-s*.5+i*s*.4,y+s*.3,s*.2,s*.2).fill(color);}
 else if(type==='farm'){for(let i=-1;i<=1;i++)g.moveTo(x+i*s*.45,y-s*.65).lineTo(x+i*s*.45,y+s*.65);g.moveTo(x-s*.7,y-s*.15).lineTo(x+s*.7,y-s*.15).moveTo(x-s*.7,y+s*.3).lineTo(x+s*.7,y+s*.3).stroke({color,width:2});}
 else if(type==='mine'){g.moveTo(x-s*.6,y+s*.6).lineTo(x+s*.45,y-s*.45).moveTo(x-s*.65,y-s*.35).lineTo(x+s*.65,y-s*.5).lineTo(x+s*.65,y+s*.25).stroke({color,width:2.5});}
 else if(type==='refinery'){g.rect(x-s*.6,y-s*.25,s*.75,s*.9).rect(x+s*.15,y-s*.6,s*.4,s*1.25).stroke({color,width:2}).moveTo(x-s*.6,y-s*.45).lineTo(x-s*.2,y-s*.45).stroke({color,width:2});}
 else if(type==='barracks'){g.rect(x-s*.65,y-s*.35,s*1.3,s).stroke({color,width:2}).moveTo(x-s*.65,y-s*.35).lineTo(x,y-s*.7).lineTo(x+s*.65,y-s*.35).stroke({color,width:2}).rect(x-s*.18,y,s*.36,s*.65).fill(color);}
 else if(type==='port'){g.moveTo(x,y-s*.75).lineTo(x,y+s*.65).moveTo(x-s*.35,y-s*.35).lineTo(x+s*.35,y-s*.35).moveTo(x-s*.7,y+s*.05).quadraticCurveTo(x-s*.7,y+s*.7,x,y+s*.7).quadraticCurveTo(x+s*.7,y+s*.7,x+s*.7,y+s*.05).stroke({color,width:1.7});}
 else if(type==='silo'){g.poly([x-s*.45,y+s*.65,x-s*.45,y-s*.15,x,y-s*.75,x+s*.45,y-s*.15,x+s*.45,y+s*.65]).stroke({color,width:1.7});g.moveTo(x,y-s*.25).lineTo(x,y+s*.45).stroke({color,width:1.7});}
 else if(type==='defense'){g.poly([x-s*.65,y-s*.7,x-s*.25,y-s*.7,x-s*.25,y-s*.3,x+s*.25,y-s*.3,x+s*.25,y-s*.7,x+s*.65,y-s*.7,x+s*.5,y+s*.65,x-s*.5,y+s*.65]).stroke({color,width:1.7});}
 else {g.poly([x,y-s*.7,x+s*.65,y-s*.35,x+s*.5,y+s*.35,x,y+s*.7,x-s*.5,y+s*.35,x-s*.65,y-s*.35]).stroke({color,width:2});}}
export class PlacementRenderer {readonly root=new Container();private preview=new Graphics();constructor(){this.root.addChild(this.preview);}draw(map:ProceduralMap|null,result:PlacementResult|null){this.preview.clear();if(!map||!result)return;const color=result.valid?0x9fc68a:0xd6867a;for(const id of result.cellIds){const cell=map.cells[id];if(cell)this.preview.poly(hexCorners(cell,map.layout.radius*.96));}this.preview.fill({color,alpha:.3}).stroke({color,width:2});}}

/** Keep only exposed building edges; adjacent structures of the same country share no outline. */
export function* structureEdges(map:ProceduralMap,cellIds:readonly number[],ownerId:number,occupiedOwners:Int16Array){for(const id of cellIds){const cell=map.cells[id];for(let d=0;d<6;d++){const [dq,dr]=HEX_DIRECTIONS[d],neighbor=axialIndex(cell.q+dq,cell.r+dr,map.layout);if(neighbor<0||occupiedOwners[neighbor]!==ownerId)yield hexEdge(cell,map.layout.radius,d);}}}
