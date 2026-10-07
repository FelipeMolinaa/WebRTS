import {ECONOMY_CONFIG as C} from '../../shared/configs/economy';
import type {ProceduralMap} from '../../map/types';
import type {Building,CountryEconomy} from './types';
export interface PopulationSource {cityId:number;population:number;}
export function recruitmentAvailable(buildings:Building[],country:CountryEconomy){
 const local=buildings.filter(b=>b.ownerId===country.playerId&&b.city).reduce((n,b)=>n+Math.max(0,Math.floor(b.city!.population)-C.minimumCityCivilianPopulation),0);
 return Math.max(0,Math.min(local,Math.floor(country.population)-C.minimumCivilianPopulation));
}
/** Pure allocation plan shared by authoritative recruitment and the displayed preview. */
export function recruitmentSources(map:ProceduralMap,buildings:Building[],country:CountryEconomy,anchorId:number,amount:number):PopulationSource[]{
 if(!Number.isInteger(amount)||amount<=0||recruitmentAvailable(buildings,country)<amount)throw new Error('População livre insuficiente: preserve '+C.minimumCivilianPopulation+' civis no país e '+C.minimumCityCivilianPopulation+' por cidade.');
 const origin=map.cells[anchorId],cities=buildings.filter(b=>b.ownerId===country.playerId&&b.city).sort((a,b)=>{
  const p=map.cells[a.anchorId],q=map.cells[b.anchorId];return (p.x-origin.x)**2+(p.y-origin.y)**2-((q.x-origin.x)**2+(q.y-origin.y)**2)||a.id-b.id;
 });
 let remaining=amount;const sources:PopulationSource[]=[];
 for(const b of cities){const population=Math.min(remaining,Math.max(0,Math.floor(b.city!.population)-C.minimumCityCivilianPopulation));if(population){sources.push({cityId:b.id,population});remaining-=population;}if(!remaining)break;}
 return sources;
}
