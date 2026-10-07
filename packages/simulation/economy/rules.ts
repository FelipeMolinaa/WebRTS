import {BUILDINGS,RESOURCE_KEYS,RESOURCE_NAMES,type BuildingType,type ResourceStock} from '../../shared/configs/buildings';
import {ECONOMY_CONFIG as C} from '../../shared/configs/economy';
import type {CityEconomy,CountryEconomy} from './types';
export function constructionCost(country:CountryEconomy|undefined,type:BuildingType,multiplier=1):Partial<ResourceStock> {
 if(country&&(type==='farm'||type==='mine')&&!country.freeBuildsUsed[type])return {};
 return Object.fromEntries(Object.entries(BUILDINGS[type].cost).map(([key,value])=>[key,Math.ceil(value*multiplier)]));
}
/** The same effective costs feed placement, debit, bots and UI. Zero rows never exist. */
export function constructionCostRows(country:CountryEconomy|undefined,type:BuildingType,override?:Partial<ResourceStock>){
 const cost=override??constructionCost(country,type);
 return [...RESOURCE_KEYS.filter(k=>(cost[k]??0)>0).map(k=>({label:RESOURCE_NAMES[k],amount:cost[k]!,insufficient:!!country&&country.stock[k]+1e-8<cost[k]!})),
 {label:'Construtores',amount:BUILDINGS[type].builders,insufficient:!!country&&country.builders+1e-8<BUILDINGS[type].builders}];
}
export function builderRecovery(population:number,satisfaction=1){
 const base=C.recoveryBase+C.recoveryPopulationBonus*Math.sqrt(Math.max(0,population));
 return base*(C.recoveryMinimumMultiplier+(1-C.recoveryMinimumMultiplier)*Math.max(0,Math.min(1,satisfaction)));
}
export function cityDemand(city:CityEconomy,baseGrowth:number){
 const p=Math.max(0,city.population),cap=city.capacity,o=C.overcrowding;
 const normal=Math.min(p,cap),first=Math.min(Math.max(0,p-cap),cap*(o.firstLimit-1));
 const second=Math.min(Math.max(0,p-cap*o.firstLimit),cap*(o.extremeLimit-o.firstLimit));
 const extreme=Math.max(0,p-cap*o.extremeLimit);
 city.excess=Math.max(0,p-cap);
 city.foodConsumption=C.foodPerPerson*(normal+first*o.firstFoodMultiplier+second*o.secondFoodMultiplier+extreme*o.extremeFoodMultiplier);
 // Only the share attributable to surplus inhabitants receives a growth penalty.
 city.growthRate=p>=cap*o.extremeLimit||cap<=0?0:baseGrowth*(p>0?(normal+first*o.firstGrowthMultiplier+second*o.secondGrowthMultiplier)/p:1);
}
