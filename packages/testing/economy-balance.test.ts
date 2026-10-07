import {describe,it,expect} from 'vitest';
import {Simulation} from '../simulation/engine';
import {DEFAULT_MAP_CONFIG} from '../map/types';
import {BUILDINGS,type BuildingType} from '../shared/configs/buildings';
import {ECONOMY_CONFIG as C} from '../shared/configs/economy';
import {evaluatePlacement} from '../simulation/economy/placement';
function setup(seed:string,difficulty:'off'|'easy'|'normal'|'hard'='off'){
 const s=new Simulation(false);s.command({type:'GENERATE_MAP',config:{...DEFAULT_MAP_CONFIG,size:'small',seed},requestId:0});
 s.command({type:'PREPARE_MATCH',playerCount:4,botDifficulty:difficulty});s.command({type:'START_MATCH',spawnId:0,name:'Human'});return s;
}
function anchor(s:Simulation,type:BuildingType){const e=s.match!.economy!,c=e.countries[0];return [...s.match!.owned.get(1)!].map(id=>s.map!.cells[id]).filter(cell=>evaluatePlacement(s.map!,e.occupied,c,1,type,cell.id,0).valid).sort((a,b)=>Number(b.resource===BUILDINGS[type].bonusResource)-Number(a.resource===BUILDINGS[type].bonusResource))[0];}
describe('Simulated early-game balance',()=>{
 it.each(['balance-1','balance-2','balance-3'])('slows the paid round, preserves growth and avoids an explosive chain: %s',seed=>{
  const s=setup(seed),e=s.match!.economy!,c=e.countries[0];
  const plan:BuildingType[]=['farm','mine','farm','barracks','refinery'];const timing:number[]=[];
  for(let second=0;second<=600;second+=.5){const type=plan[timing.length];if(type){const cell=anchor(s,type);if(cell){s.match!.build(1,type,cell.id,0);timing.push(second);}}
   e.step(.5);expect(c.builders).toBeGreaterThanOrEqual(0);expect(c.builders).toBeLessThanOrEqual(c.maxBuilders);expect(c.maxBuilders).toBeCloseTo(c.population*.33);for(const amount of Object.values(c.stock))expect(amount).toBeGreaterThanOrEqual(0);
  }
  expect(timing).toHaveLength(plan.length);expect(timing[0]).toBe(0);expect(timing[1]).toBeGreaterThanOrEqual(10);for(let i=1;i<timing.length;i++)expect(timing[i]).toBeGreaterThan(timing[i-1]);expect(timing[2]).toBeGreaterThanOrEqual(24);
  expect(c.population).toBeGreaterThan(200);expect(c.stock.food).toBeGreaterThan(0);
  console.info('Early game',seed,Object.fromEntries(plan.map((type,i)=>[type+(i===2?'2':''),timing[i]])));
 });
 it.each(['easy','normal','hard']as const)('adapts bots without economic cheats or repeated unnecessary buildings: %s',async difficulty=>{
  const s=setup('bot-balance',difficulty),state=s.match!.state,e=s.match!.economy!,timings=new Map<number,Record<string,number>>();
  for(let tick=0;tick<600*20;tick++){
   s.step();if(tick%1000===0)await new Promise(resolve=>setTimeout(resolve,0));for(const p of state.players.slice(1)){const c=e.countries.find(c=>c.playerId===p.id)!;expect(c.builders).toBeGreaterThanOrEqual(0);expect(c.builders).toBeLessThanOrEqual(c.maxBuilders+1e-8);expect(c.population).toBeGreaterThanOrEqual(C.minimumCivilianPopulation);for(const stock of Object.values(c.stock))expect(stock).toBeGreaterThanOrEqual(0);
    const marks=timings.get(p.id)??{};for(const b of e.buildings.filter(b=>b.ownerId===p.id&&!b.initial))if(marks[b.type]===undefined)marks[b.type]=tick/20;timings.set(p.id,marks);
   }
  }
  for(const p of state.players.slice(1)){const c=e.countries[p.id-1],marks=timings.get(p.id)!;expect(c.freeBuildsUsed).toEqual({farm:true,mine:true});expect(marks.farm).toBeLessThan(marks.mine);expect(marks.mine).toBeLessThan(marks.barracks);expect(marks.barracks).toBeGreaterThanOrEqual(120);expect(e.buildings.filter(b=>b.ownerId===p.id&&b.type==='barracks')).toHaveLength(1);expect(c.stock.food).toBeGreaterThan(0);}
  console.info('Bots',difficulty,[...timings]);
 },120000);
});
