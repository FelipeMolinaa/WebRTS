import type {ProceduralMap} from '../../map/types';
import {axialIndex,hexDistance} from '../../map/hex/coordinates';
import {hashSeed,randomSequence} from '../../map/generation/random';
import {CITY_FOOTPRINT,TERRITORY_RULES} from '../../shared/configs/territory';
import type {SpawnCandidate} from './types';
export function cityFootprint(map:ProceduralMap,anchorId:number){const c=map.cells[anchorId];if(!c||c.terrain!=='land')return null;const ids=CITY_FOOTPRINT.map(([dq,dr])=>axialIndex(c.q+dq,c.r+dr,map.layout));return ids.every(id=>id>=0&&map.cells[id].terrain==='land')?ids:null;}
/** Only accept full four-ring disks; coasts must not stretch the starting territory. */
export function area(map:ProceduralMap,anchorId:number){const center=map.cells[anchorId],radius=TERRITORY_RULES.initialRadius,ids:number[]=[];for(let dq=-radius;dq<=radius;dq++)for(let dr=Math.max(-radius,-dq-radius);dr<=Math.min(radius,-dq+radius);dr++){const id=axialIndex(center.q+dq,center.r+dr,map.layout);if(id<0||map.cells[id].terrain!=='land')return null;ids.push(id);}return ids;}

export function findSpawns(map:ProceduralMap,playerCount:number):SpawnCandidate[]{if(!Number.isInteger(playerCount)||playerCount<TERRITORY_RULES.minPlayers||playerCount>TERRITORY_RULES.maxPlayers)throw new Error('Escolha entre 2 e 8 países.');
 const largest=map.landmasses.reduce((a,b)=>a.cells.length>b.cells.length?a:b);
 const sharedLand=map.config.landform!=='continents'&&largest.cells.length>=playerCount*TERRITORY_RULES.initialCells*2;
 const valid=map.cells.filter(c=>(!sharedLand||c.landmassId===largest.id)&&map.landmasses[c.landmassId]?.cells.length>=TERRITORY_RULES.initialCells&&cityFootprint(map,c.id));const random=randomSequence(hashSeed(map.config.seed)^462911);for(let i=valid.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[valid[i],valid[j]]=[valid[j],valid[i]];}
 const candidates:SpawnCandidate[]=[];for(const c of valid.slice(0,TERRITORY_RULES.candidateSample)){const cells=area(map,c.id),cityCells=cityFootprint(map,c.id)!;if(!cells||!cityCells.every(id=>cells.includes(id)))continue;let food=0,mineral=0,fuel=0;for(const id of cells){const resource=map.cells[id].resource;if(resource==='food')food++;if(resource==='mineral')mineral++;if(resource==='fuel')fuel++;}candidates.push({id:0,anchorId:c.id,cellIds:cells,cityCells,food,mineral,fuel,quality:food+mineral*1.5+fuel*2});}
 if(candidates.length<playerCount)throw new Error('Este mapa não tem áreas suficientes para essa quantidade de países. Tente outra seed ou menos países.');
 const qualities=candidates.map(c=>c.quality).sort((a,b)=>a-b),median=qualities[Math.floor(qualities.length/2)];const chosen:SpawnCandidate[]=[];const occupied=new Set<number>();
 for(let n=0;n<playerCount;n++){let best:SpawnCandidate|null=null,bestScore=-Infinity;for(const candidate of candidates){if(candidate.cellIds.some(id=>occupied.has(id)))continue;const distance=chosen.length?Math.min(...chosen.map(c=>hexDistance(map.cells[c.anchorId],map.cells[candidate.anchorId]))):Math.min(map.layout.columns,map.layout.rows)*.4;const score=distance-Math.abs(candidate.quality-median)*.35;if(score>bestScore){bestScore=score;best=candidate;}}if(!best)throw new Error('Não foi possível separar as áreas iniciais. Tente menos países ou outra seed.');chosen.push({...best,id:n});for(const id of best.cellIds)occupied.add(id);}
 return chosen;}

export function spawnAt(map:ProceduralMap,anchorId:number):SpawnCandidate|null{
 if(!Number.isInteger(anchorId)||!map.cells[anchorId])return null;
 const cellIds=area(map,anchorId),cityCells=cityFootprint(map,anchorId);if(!cellIds||!cityCells)return null;
 const nearby=new Set(cellIds);for(const id of cellIds)for(const n of map.cells[id].neighbors)nearby.add(n);
 let food=0,mineral=0,fuel=0;for(const id of nearby){const r=map.cells[id].resource;if(r==='food')food++;if(r==='mineral')mineral++;if(r==='fuel')fuel++;}
 return {id:anchorId,anchorId,cellIds,cityCells,food,mineral,fuel,quality:food+mineral*1.5+fuel*2};
}
