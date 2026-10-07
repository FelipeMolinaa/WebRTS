import {Graphics} from 'pixi.js';
import type {BuildingType} from '../../../packages/shared/configs/buildings';
/** Fixed lighting direction, restrained surroundings, and footprints that stay readable. */
export function drawStructureSurroundings(g:Graphics,type:BuildingType,width:number,height:number){
 const w=width*.5,h=height*.5;
 if(type==='bridge'||type==='port')return;
 g.ellipse(width*.025,height*.055,w*.82,h*.68).fill({color:0x182b24,alpha:.2});
 if(type==='city'||type==='factory'||type==='barracks'){
  g.rect(-w*.75,-h*.045,w*1.5,h*.09).fill({color:0xb8b5a0,alpha:.32});g.rect(-w*.06,-h*.67,w*.12,h*1.34).fill({color:0xb8b5a0,alpha:.22});
 }else if(type==='mine'||type==='refinery')g.ellipse(0,0,w*.8,h*.7).fill({color:0xb2a17a,alpha:.18});
 else if(type==='farm')g.ellipse(0,0,w*.8,h*.7).fill({color:0x9e855a,alpha:.16});
}
