import {describe,it,expect} from 'vitest';
import {generateMap} from '../map/generation/generate';
import {generateLandforms} from '../map/generation/landforms';
import {DEFAULT_MAP_CONFIG,newMapSeed,type ProceduralMap,type TerritoryCell} from '../map/types';
import {findSpawns} from '../simulation/territory/spawns';
import {hexToWorld,axialIndex,HEX_DIRECTIONS} from '../map/hex/coordinates';
import {bridgeSupport,BRIDGE_RULES} from '../map/bridges';
import {BUILDINGS,CONSTRUCTION} from '../shared/configs/buildings';
import {EconomySystem} from '../simulation/economy/economy';
import {evaluatePlacement} from '../simulation/economy/placement';
import {crossingBudget,planCrossing} from '../ai/crossings';
import {NavigationGrid} from '../simulation/navigation/grid';

function crossing(){
 const layout={columns:15,rows:15,radius:24,originX:40,originY:40};
 const cells:TerritoryCell[]=Array.from({length:225},(_,id)=>{const r=Math.floor(id/15),col=id%15,q=col-Math.floor(r/2);return {id,q,r,...hexToWorld(q,r,layout),terrain:col>=4&&col<=8?'water':'land',waterKind:col>=4&&col<=8?'river':undefined,resource:null,ownerId:col<4?1:null,richness:0,elevation:1,regionId:0,landmassId:col<4?0:1,variation:0,neighbors:HEX_DIRECTIONS.map(([dq,dr])=>axialIndex(q+dq,r+dr,layout)).filter(n=>n>=0)};});
 const map:ProceduralMap={version:1,config:DEFAULT_MAP_CONFIG,layout,cells,regions:[],landmasses:[],stats:{land:150,water:75,food:0,mineral:0,fuel:0}},shore=7*15+3,path=[4,5,6,7,8].map(n=>7*15+n),target=7*15+9;
 const economy=new EconomySystem(map,[{id:1,ownerId:1,anchorId:shore,cellIds:[shore]}]),country=economy.countries[0];country.stock={money:100000,mineral:100000,food:100000,fuel:100000};country.builders=1000;
 return {map,economy,country,shore,path,target};
}

describe('Procedural geography and hydrology',()=>{
 it('creates fresh seeds and preserves explicit replay determinism',()=>{expect(new Set(Array.from({length:30},()=>newMapSeed())).size).toBe(30);const config={...DEFAULT_MAP_CONFIG,seed:'repeat-map',landform:'pangea' as const};expect(generateMap(config)).toEqual(generateMap(config));});
 it.each(['continents','pangea']as const)('keeps %s masks consistent over varied seeds, with safe spawns and terminal rivers',landform=>{
  for(const size of ['small','medium','large']as const)for(let seed=0;seed<3;seed++){
   const config={...DEFAULT_MAP_CONFIG,seed:'geography-'+seed,size,landform},map=generateMap(config);
   expect(map.rivers!.length).toBeGreaterThanOrEqual(10);expect(map.lakeCount).toBeGreaterThanOrEqual(5);expect(findSpawns(map,8)).toHaveLength(8);
   for(const river of map.rivers!){expect(['sea','lake']).toContain(map.cells[river.destinationId].waterKind);expect(river.cells.length).toBeGreaterThanOrEqual(8);expect(new Set(river.cells).size).toBe(river.cells.length);expect(river.widths.every(n=>n>=1&&n<=3)).toBe(true);expect(map.cells[river.cells.at(-1)!].neighbors).toContain(river.destinationId);for(let n=1;n<river.cells.length;n++)expect(map.cells[river.cells[n-1]].neighbors).toContain(river.cells[n]);}
   expect(map.rivers!.some(r=>r.widths.includes(3))).toBe(true);
   const mask=map.cells.map(c=>({...c}));generateLandforms(mask,map.layout,landform,seed);
   const seen=new Set<number>();let components=0;
   for(const c of mask)if(c.terrain==='land'&&!seen.has(c.id)){components++;const queue=[c.id];seen.add(c.id);for(let h=0;h<queue.length;h++)for(const n of mask[queue[h]].neighbors)if(mask[n].terrain==='land'&&!seen.has(n)){seen.add(n);queue.push(n);}}
   if(landform==='pangea')expect(components).toBe(1);else expect(components).toBeGreaterThanOrEqual(2);
  }
 },20000);
});

describe('Segment bridges and bot crossing budgets',()=>{
 it('requires completed support and uses additive 100%, 150%, 200% costs with exact debit and durations',()=>{
  const s=crossing(),nav=new NavigationGrid(s.map);expect(nav.connected(s.map.cells[s.shore],s.map.cells[s.target])).toBe(false);
  const expected=[1,1.5,2,2.5,1];
  for(let n=0;n<s.path.length;n++){
   const id=s.path[n],quote=evaluatePlacement(s.map,s.economy.occupied,s.country,1,'bridge',id,0);expect(quote.valid).toBe(true);expect(quote.costMultiplier).toBe(expected[n]);
   const before=s.country.stock.money,b=s.economy.build(1,'bridge',id,0);expect(before-s.country.stock.money).toBe(quote.cost!.money);expect(b.construction!.duration).toBe(quote.duration);
   if(n===0)expect(evaluatePlacement(s.map,s.economy.occupied,s.country,1,'bridge',s.path[1],0).valid).toBe(false);
   s.economy.stepConstruction(b.construction!.duration);expect(s.map.cells[id].bridgeOwnerId).toBe(1);
  }
  expect(nav.connected(s.map.cells[s.shore],s.map.cells[s.target])).toBe(true);s.economy.destroy(s.economy.buildings.find(b=>b.anchorId===s.path[2])!.id);expect(nav.connected(s.map.cells[s.shore],s.map.cells[s.target])).toBe(false);
 });
 it('quotes the true extended price even when funds are insufficient',()=>{const s=crossing(),first=s.economy.build(1,'bridge',s.path[0],0);s.economy.stepConstruction(first.construction!.duration);s.country.stock.money=500;const quote=evaluatePlacement(s.map,s.economy.occupied,s.country,1,'bridge',s.path[1],0);expect(quote.valid).toBe(false);expect(quote.cost!.money).toBe(600);expect(()=>s.economy.build(1,'bridge',s.path[1],0)).toThrow(/100/);});
 it('budgets the entire route without mutating navigation or charging fake bridges',()=>{const s=crossing(),before=s.map.cells.map(c=>c.bridgeOwnerId),budget=crossingBudget(s.map,s.path,s.target,1,(a,b)=>a===b)!;expect(budget.cost.money).toBe(3200);expect(budget.cost.mineral).toBe(960);expect(budget.builders).toBe(24);expect(budget.seconds).toBe(156);expect(s.map.cells.map(c=>c.bridgeOwnerId)).toEqual(before);
  const owned=new Set(s.map.cells.filter(c=>c.ownerId===1).map(c=>c.id)),plan=planCrossing(s.map,owned,s.economy.occupied,1,(a,b)=>a===b,new Map());expect(plan).not.toBeNull();expect(plan!.cells.length).toBe(5);
 });
 it('rejects isolated extensions, enemy arrivals, and more than six segments',()=>{const s=crossing();s.map.cells[s.path[1]].bridgeOwnerId=1;expect(bridgeSupport(s.map,s.path[2],1).valid).toBe(false);s.map.cells[s.path[0]].bridgeOwnerId=1;s.map.cells[s.target].ownerId=2;for(const id of s.path.slice(0,-1))s.map.cells[id].bridgeOwnerId=1;expect(bridgeSupport(s.map,s.path.at(-1)!,1).valid).toBe(false);expect(bridgeSupport(s.map,s.path.at(-1)!,1,()=>true).valid).toBe(true);
  for(const c of s.map.cells){c.terrain=c.id%15<2?'land':'water';c.ownerId=c.terrain==='land'?1:null;c.bridgeOwnerId=null;}
  for(let col=2;col<2+BRIDGE_RULES.maxSegments;col++)s.map.cells[7*15+col].bridgeOwnerId=1;expect(bridgeSupport(s.map,7*15+2+BRIDGE_RULES.maxSegments,1).valid).toBe(false);
 });
 it('refunds exactly the increased materials when an extension is cancelled',()=>{const s=crossing(),first=s.economy.build(1,'bridge',s.path[0],0);s.economy.stepConstruction(CONSTRUCTION.bridge.seconds);const before={...s.country.stock},second=s.economy.build(1,'bridge',s.path[1],0);expect(second.materialsSpent.money).toBe(BUILDINGS.bridge.cost.money!*1.5);s.economy.demolish(1,second.id);expect(s.country.stock).toEqual(before);expect(first.construction).toBeUndefined();});
});
