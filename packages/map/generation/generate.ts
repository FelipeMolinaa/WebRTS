import {generateHydrology} from './hydrology';
import {generateLandforms} from './landforms';
import {ENGINE} from '../../shared/configs/engine';
import {axialIndex,HEX_DIRECTIONS,hexToWorld} from '../hex/coordinates';
import {identifyLandmasses,partitionRegions} from '../territory/regions';
import {validateMapConfig,type MapConfig,type ProceduralMap,type TerritoryCell,type ResourceType} from '../types';
import {hashPoint,hashSeed,randomSequence} from './random';
const sizes={small:[160,125],medium:[200,150],large:[250,200]} as const;
export function generateMap(input:MapConfig):ProceduralMap {const config=validateMapConfig(input),seed=hashSeed(config.seed),random=randomSequence(seed);const [columns,rows]=sizes[config.size];const radius=Math.min(ENGINE.worldWidth/(Math.sqrt(3)*(columns+.5)),ENGINE.worldHeight/(1.5*rows+.5));const width=Math.sqrt(3)*radius*(columns+.5),height=radius*(1.5*rows+.5);const layout={columns,rows,radius,originX:(ENGINE.worldWidth-width)/2+Math.sqrt(3)*radius/2,originY:(ENGINE.worldHeight-height)/2+radius};
 const cells:TerritoryCell[]=[];
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
  const q=col-Math.floor(row/2),r=row,id=row*columns+col,p=hexToWorld(q,r,layout);
  const neighbors=HEX_DIRECTIONS.map(([dq,dr])=>axialIndex(q+dq,r+dr,layout)).filter(n=>n>=0);
  cells.push({id,q,r,...p,terrain:'water',resource:null,ownerId:null,richness:0,neighbors,elevation:0,regionId:-1,landmassId:-1,variation:hashPoint(q,r,seed^7193)});
 }
 generateLandforms(cells,layout,config.landform,seed);
 const hydrology=generateHydrology(cells,layout,seed);
 const landmasses=identifyLandmasses(cells),regions=partitionRegions(cells,landmasses,random);
 const deposits:Array<{type:ResourceType;share:number}>=[{type:'fuel',share:.025},{type:'mineral',share:.105},{type:'food',share:.18}];
 const land=cells.filter(c=>c.terrain==='land');
 for(const deposit of deposits){
  const target=Math.floor(land.length*deposit.share);let assigned=0,attempts=0;
  while(assigned<target&&attempts++<target*30){
   const anchor=land[Math.floor(random()*land.length)];if(anchor.resource)continue;
   // Separate oil deposits so the majority remain individual hexagons.
   if(deposit.type==='fuel'&&anchor.neighbors.some(n=>cells[n].resource==='fuel'))continue;
   const roll=random(),limit=Math.min(target-assigned,deposit.type==='fuel'?(roll<.75?1:roll<.95?2+Math.floor(random()*2):4+Math.floor(random()*3)):deposit.type==='mineral'?3+Math.floor(random()*14):8+Math.floor(random()*35));
   const frontier=[anchor.id],seen=new Set(frontier);let grown=0;
   while(frontier.length&&grown<limit){
    const index=Math.floor(random()*frontier.length),id=frontier[index];frontier[index]=frontier[frontier.length-1];frontier.pop();const cell=cells[id];
    if(cell.terrain!=='land'||cell.resource)continue;
    if(deposit.type==='fuel'&&cell.neighbors.some(n=>cells[n].resource==='fuel'&&!seen.has(n)))continue;
    cell.resource=deposit.type;cell.richness=2;assigned++;grown++;
    for(const n of cell.neighbors)if(!seen.has(n)&&cells[n].terrain==='land'&&!cells[n].resource){seen.add(n);frontier.push(n);}
   }
  }
 }
 const stats={land:0,water:0,food:0,mineral:0,fuel:0};for(const c of cells){stats[c.terrain]++;if(c.resource)stats[c.resource]++;}
 return {version:1,config,layout,cells,regions,landmasses,stats,...hydrology};}
