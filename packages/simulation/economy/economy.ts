import {BUILDING_HP} from '../../shared/configs/combat';
import type {ProceduralMap} from '../../map/types';
import {BUILDINGS,CONSTRUCTION,RESOURCE_KEYS,type BuildingType,type ResourceStock} from '../../shared/configs/buildings';
import {ECONOMY_CONFIG as C} from '../../shared/configs/economy';
import type {InitialCity} from '../territory/types';
import type {Building,CountryEconomy} from './types';
import {bridgePlacementAllowed,evaluatePlacement} from './placement';
import {builderRecovery,cityDemand,constructionCost} from './rules';
const emptyRates=():ResourceStock=>({money:0,food:0,mineral:0,fuel:0});
interface Production {rates:ResourceStock;industry:ResourceStock;industrialFood:number;cities:Building[];converters:Building[];conversionInputs:ResourceStock;conversionOutputs:ResourceStock;}
export class EconomySystem {
 readonly buildings:Building[]=[];
 readonly countries:CountryEconomy[]=[];
 readonly occupied:Int32Array;
 private nextId=1;
 constructionRevision=0;
 private production=new Map<number,Production>();
 constructor(private map:ProceduralMap,cities:InitialCity[],private allied:(a:number,b:number)=>boolean=(a,b)=>a===b){
  this.occupied=new Int32Array(map.cells.length);
  for(const city of cities){
   if(!this.countries.some(c=>c.playerId===city.ownerId))this.countries.push({playerId:city.ownerId,stock:{...C.initialStock},population:0,capacity:0,builders:C.initialPopulation*C.maxBuildersFraction,maxBuilders:0,builderRecovery:0,freeBuildsUsed:{farm:false,mine:false},foodConsumption:0,foodProduction:0,foodSatisfaction:1,rates:emptyRates(),populationRate:0});
   const b=this.createBuilding(city.ownerId,'city',city.anchorId,0,[...city.cellIds],1,true,{});
   b.city!.population=C.initialPopulation;
  }
  this.recalculate();
 }
 private createBuilding(ownerId:number,type:BuildingType,anchorId:number,rotation:number,cellIds:number[],bonus:number,initial:boolean,materialsSpent:Partial<ResourceStock>){
  const def=BUILDINGS[type];
  const b:Building={id:this.nextId++,ownerId,type,anchorId,rotation,cellIds,buildersSpent:initial?0:def.builders,materialsSpent:{...materialsSpent},bonus,initial,hp:BUILDING_HP[type],maxHp:BUILDING_HP[type]};
  if(def.consumption)b.operatingRate=0;
  if(type==='city')b.city={population:0,capacity:def.housing,excess:0,growthRate:0,foodConsumption:0};
  if(!initial)b.construction={elapsed:0,duration:CONSTRUCTION[type].seconds,builders:def.builders,ownerId};
  if(type==='bridge'&&initial){this.map.cells[anchorId].bridgeOwnerId=ownerId;this.map.navigationRevision=(this.map.navigationRevision??0)+1;}
  this.buildings.push(b);for(const id of cellIds)this.occupied[id]=b.id;return b;
 }
 build(playerId:number,type:BuildingType,anchorId:number,rotation:number){
  if(type==='silo'&&this.buildings.some(b=>b.ownerId===playerId&&b.type==='silo'))throw new Error('Cada país pode construir somente um silo.');
  const country=this.countries.find(c=>c.playerId===playerId);
  const placement=evaluatePlacement(this.map,this.occupied,country,playerId,type,anchorId,rotation,this.allied);
  if(!placement.valid)throw new Error(placement.reason);
  const def=BUILDINGS[type],cost=placement.cost??constructionCost(country,type);
  for(const key of RESOURCE_KEYS)country!.stock[key]-=cost[key]??0;
  country!.builders=Math.max(0,country!.builders-def.builders);
  if(type==='farm'||type==='mine')country!.freeBuildsUsed[type]=true;

  const building=this.createBuilding(playerId,type,anchorId,rotation,placement.cellIds,placement.bonus,false,cost);

  if(building.construction&&placement.duration)building.construction.duration=placement.duration;
  this.recalculate();return building;
 }
 demolish(playerId:number,buildingId:number){
  const b=this.buildings.find(b=>b.id===buildingId);
  if(!b)throw new Error('Estrutura não encontrada.');
  if(b.ownerId!==playerId)throw new Error('Só é possível demolir estruturas do seu país.');
  if(!b.construction)throw new Error('Só é possível cancelar estruturas em construção.');
  const country=this.countries.find(c=>c.playerId===playerId)!;
  for(const key of RESOURCE_KEYS)country.stock[key]+=b.materialsSpent[key]??0;
  this.destroy(buildingId);
 }
 destroy(buildingId:number){
  const i=this.buildings.findIndex(b=>b.id===buildingId);if(i<0)return;
  const b=this.buildings[i];if(b.construction){const c=this.countries.find(c=>c.playerId===b.construction!.ownerId);if(c)c.builders+=b.construction.builders;}if(b.type==='bridge'&&!b.construction){this.map.cells[b.anchorId].bridgeOwnerId=null;this.map.navigationRevision=(this.map.navigationRevision??0)+1;}this.buildings.splice(i,1);for(const id of b.cellIds)this.occupied[id]=0;
  // Survivors relocate into remaining cities; overcrowding itself never kills inhabitants.
  if(b.city)this.changePopulation(b.ownerId,b.city.population);
  this.recalculate();
 }
 /** Recruitment and training refunds update actual cities, then country aggregates. */
 changePopulation(playerId:number,amount:number){
  const cities=this.buildings.filter(b=>b.ownerId===playerId&&b.city&&!b.construction).map(b=>b.city!);
  if(amount>0){const target=cities.sort((a,b)=>a.population/a.capacity-b.population/b.capacity)[0];if(target)target.population+=amount;}
  else {let remaining=-amount;for(const city of cities.sort((a,b)=>b.population-a.population)){const taken=Math.min(city.population,remaining);city.population-=taken;remaining-=taken;if(remaining<=0)break;}}
 }
 private conversionRatio(c:CountryEconomy,p:Production,dt:number,forecast=false,baseFood=0,satisfaction=1){
  let ratio=1;
  for(const key of RESOURCE_KEYS){const demand=p.conversionInputs[key]*dt;if(demand<=0)continue;
   const production=key==='food'?p.rates.food-baseFood:p.rates[key]+p.industry[key]*satisfaction;
   const available=Math.max(0,c.stock[key]+(forecast?production*dt:0));
   ratio=Math.min(ratio,available/demand);
  }
  return Math.max(0,Math.min(1,ratio));
 }
 private refreshCountry(c:CountryEconomy,p:Production){
  c.population=0;c.capacity=0;c.populationRate=0;c.foodConsumption=p.industrialFood;c.foodProduction=p.rates.food;
  for(const b of p.cities){const city=b.city!;cityDemand(city,BUILDINGS.city.growth);c.population+=city.population;c.capacity+=city.capacity;c.populationRate+=city.growthRate;c.foodConsumption+=city.foodConsumption;}
  c.maxBuilders=c.population*C.maxBuildersFraction;c.busyBuilders=this.buildings.reduce((n,b)=>n+(b.construction?.ownerId===c.playerId?b.construction.builders:0),0);c.builders=Math.min(Math.max(0,c.maxBuilders-c.busyBuilders),Math.max(0,c.builders));
  c.foodSatisfaction=c.stock.food>0||c.foodConsumption===0?1:Math.min(1,c.foodProduction/c.foodConsumption);
  c.builderRecovery=builderRecovery(c.population,c.foodSatisfaction);
  for(const key of RESOURCE_KEYS)c.rates[key]=p.rates[key]+p.industry[key]*c.foodSatisfaction;
  c.rates.food-=c.foodConsumption;c.populationRate*=c.foodSatisfaction;
  const ratio=this.conversionRatio(c,p,1/C.tickRate,true,c.foodConsumption,c.foodSatisfaction);
  for(const key of RESOURCE_KEYS)c.rates[key]+=(p.conversionOutputs[key]-p.conversionInputs[key])*ratio;
  c.foodConsumption+=p.conversionInputs.food*ratio;
  for(const b of p.converters)b.operatingRate=ratio;
 }
 /** Only structure changes rebuild production; ticks reuse the per-country cache. */
 recalculate(){
  this.production.clear();for(const c of this.countries)this.production.set(c.playerId,{rates:emptyRates(),industry:emptyRates(),industrialFood:0,cities:[],converters:[],conversionInputs:emptyRates(),conversionOutputs:emptyRates()});
  for(const b of this.buildings){if(b.construction)continue;const p=this.production.get(b.ownerId)!,def=BUILDINGS[b.type];if(b.city)p.cities.push(b);
   if(def.consumption){p.converters.push(b);for(const key of RESOURCE_KEYS){p.conversionInputs[key]+=def.consumption[key]??0;p.conversionOutputs[key]+=(def.production[key]??0)*b.bonus;}continue;}
   p.industrialFood+=def.foodConsumption;
   for(const key of RESOURCE_KEYS)(def.foodConsumption>0?p.industry:p.rates)[key]+=(def.production[key]??0)*b.bonus;}
  for(const c of this.countries){const p=this.production.get(c.playerId)!;if(p.cities.length&&p.rates.mineral+p.industry.mineral===0)p.rates.mineral=C.emergencyMineralPerSecond;this.refreshCountry(c,p);}
 }
 /** Advances work without producing resources; completion settles workers exactly once. */
 stepConstruction(dt:number){
  if(!Number.isFinite(dt)||dt<=0)return;
  let changed=false;
  for(const b of [...this.buildings]){const work=b.construction;if(!work)continue;work.elapsed=Math.min(work.duration,work.elapsed+dt);if(work.elapsed<work.duration)continue;
   if(b.type==='bridge'&&!bridgePlacementAllowed(this.map,b.anchorId,b.ownerId,this.allied)){this.destroy(b.id);this.constructionRevision++;changed=true;continue;}
   const country=this.countries.find(c=>c.playerId===work.ownerId)!;b.buildersSpent=work.builders*CONSTRUCTION[b.type].loss;country.builders+=work.builders-b.buildersSpent;
   delete b.construction;
   if(b.city){const settlers=Math.min(C.newCitySettlers,this.countries.find(c=>c.playerId===b.ownerId)!.population);this.changePopulation(b.ownerId,-settlers);b.city.population=settlers;}
   if(b.type==='bridge'){this.map.cells[b.anchorId].bridgeOwnerId=b.ownerId;this.map.navigationRevision=(this.map.navigationRevision??0)+1;}
   this.constructionRevision++;changed=true;
  }
  if(changed)this.recalculate();
 }
 step(dt:number){
  if(!Number.isFinite(dt)||dt<=0)return;
  this.stepConstruction(dt);
  for(const c of this.countries){
   const p=this.production.get(c.playerId)!;
   this.refreshCountry(c,p);
   const baseFood=p.industrialFood+p.cities.reduce((sum,b)=>sum+b.city!.foodConsumption,0);
   const foodAvailable=c.stock.food+c.foodProduction*dt,demand=baseFood*dt;
   const satisfaction=demand>0?Math.min(1,foodAvailable/demand):1;
   for(const key of RESOURCE_KEYS)if(key!=='food')c.stock[key]=Math.max(0,c.stock[key]+(p.rates[key]+p.industry[key]*satisfaction)*dt);
   c.stock.food=Math.max(0,foodAvailable-demand);
   let growth=0;
   for(const b of p.cities){const city=b.city!,people=Math.max(0,Math.min(city.growthRate*satisfaction*dt,city.capacity*C.overcrowding.extremeLimit-city.population));city.population+=people;growth+=people;}
   // Inhabitants and existing industry eat first. Conversion uses only the remainder;
   // all input resources limit the same fraction, so no output is created for free.
   const conversion=this.conversionRatio(c,p,dt);
   for(const key of RESOURCE_KEYS)c.stock[key]=Math.max(0,c.stock[key]+(p.conversionOutputs[key]-p.conversionInputs[key])*conversion*dt);
   // Move surplus inhabitants into available housing; total population is conserved.
   let relocation=C.relocationPerSecond*dt;for(const source of p.cities){if(!source.city||source.city.population<=source.city.capacity)continue;for(const target of p.cities){if(target===source||!target.city)continue;const moved=Math.min(relocation,Math.max(0,target.city.capacity-target.city.population),source.city.population-source.city.capacity);source.city.population-=moved;target.city.population+=moved;relocation-=moved;if(relocation<=0)break;}}
   const recovery=builderRecovery(c.population,satisfaction);
   c.builders+=recovery*dt;
   this.refreshCountry(c,p);
   c.populationRate=growth/dt;c.foodSatisfaction=satisfaction;c.builderRecovery=recovery;
   for(const b of p.cities)b.city!.growthRate*=satisfaction;
  }
 }
}
