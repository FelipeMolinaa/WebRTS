import {completeConstruction} from './economy-fixture';
import {describe,it,expect} from 'vitest';
import {Simulation} from '../simulation/engine';
import {DEFAULT_MAP_CONFIG,type TerritoryCell} from '../map/types';
import {axialIndex,cellAtWorld} from '../map/hex/coordinates';
import {UNIT_MODES,UNIT_STATE} from '../shared/configs/units';
import {evaluatePlacement} from '../simulation/economy/placement';
import {fundCountry} from './economy-fixture';

function setup(){
 const sim=new Simulation(false);sim.command({type:'GENERATE_MAP',config:{...DEFAULT_MAP_CONFIG,size:'small'},requestId:0});
 const map=sim.map!;for(const c of map.cells)c.terrain='land';
 sim.command({type:'PREPARE_MATCH',playerCount:2,botDifficulty:'off'});sim.command({type:'START_MATCH',spawnId:0,name:'Teste'});
 const match=sim.match!,army=sim.army!,d=match.diplomacy!;
 // Controlled ownership fixture, preserving the simulation's country indices.
 for(const c of map.cells)c.ownerId=1;
 function ownership(){for(const p of match.state.players){const ids=map.cells.filter(c=>c.ownerId===p.id).map(c=>c.id);match.owned.set(p.id,new Set(ids));p.territory=ids.length;match.dirtyCountries.add(p.id);}match.state.captured=map.cells.filter(c=>c.ownerId!==null).length;match.state.borderRevision++;}
 ownership();const middle=map.cells[Math.floor(map.layout.rows/2)*map.layout.columns+Math.floor(map.layout.columns/2)],east=(c:TerritoryCell,n=1)=>map.cells[axialIndex(c.q+n,c.r,map.layout)];
 const allowed=(c:TerritoryCell)=>c.ownerId===null||c.ownerId===1||d.allied(1,c.ownerId);
 return {sim,map,match,army,d,middle,east,ownership,allowed};
}
function barracks(s:ReturnType<typeof setup>){const country=fundCountry(s.match.economy!),anchor=s.map.cells.find(c=>evaluatePlacement(s.map,s.match.economy!.occupied,country,1,'barracks',c.id,0).valid)!;s.match.build(1,'barracks',anchor.id,0);completeConstruction(s.match.economy!, s.match.state.buildings.at(-1)!);return s.match.state.buildings.at(-1)!;}
function stepSafely(s:ReturnType<typeof setup>,ids:number[],ticks:number){for(let n=0;n<ticks;n++){s.army.step(.05);for(const id of ids){const i=s.army.index(id),cell=cellAtWorld(s.map,s.army.x[i],s.army.y[i])!;expect(s.allowed(cell)).toBe(true);}}}

describe('Rotas do modo descoberta',()=>{
 it('contorna território não aliado em vez de atravessar a rota terrestre mais curta',()=>{
  const s=setup(),from=s.middle,obstacle=s.east(from),target=s.east(from,2);obstacle.ownerId=2;
  expect(s.army.navigation.clear(from,target)).toBe(true);
  expect(s.army.navigation.clear(from,target,s.allowed)).toBe(false);
  const route=s.army.navigation.route(from,target,s.allowed);expect(route.length).toBeGreaterThan(1);
  let p=from;for(const q of route){expect(s.army.navigation.clear(p,q,s.allowed)).toBe(true);p={...from,...q};}
  expect(s.army.navigation.route(from,target)).toHaveLength(1);
 });
 it('mantém toda a formação em regiões próprias, aliadas ou livres durante a descoberta',()=>{
  const s=setup(),from=s.middle,obstacle=s.east(from),target=s.east(from,2);obstacle.ownerId=2;target.ownerId=null;s.ownership();
  const ids=Array.from({length:6},(_,n)=>s.army.spawn(1,n===0?'tank':'infantry',from));s.army.setMode(1,ids,'discovery');
  stepSafely(s,ids,500);expect(target.ownerId).toBe(1);expect(obstacle.ownerId).toBe(2);
  for(const id of ids)expect(s.army.modes[s.army.index(id)]).toBe(UNIT_MODES.discovery);
 });
 it('permite passagem por um aliado e recalcula a rota quando a aliança termina',()=>{
  const s=setup(),from=s.middle,obstacle=s.east(from),target=s.east(from,3);obstacle.ownerId=2;target.ownerId=null;s.ownership();
  s.d.act(1,'request_alliance',2);s.d.step(2);expect(s.d.allied(1,2)).toBe(true);
  expect(s.army.navigation.route(from,target,s.allowed)).toHaveLength(1);
  const id=s.army.spawn(1,'infantry',from);s.army.setMode(1,[id],'discovery');s.army.step(.05);s.d.act(1,'break_alliance',2);
  stepSafely(s,[id],400);expect(target.ownerId).toBe(1);expect(obstacle.ownerId).toBe(2);
 });
 it('interrompe o caminho antes de um destino que passou a pertencer a outro país',()=>{
  const s=setup(),target=s.east(s.middle,2);target.ownerId=null;s.ownership();
  const id=s.army.spawn(1,'infantry',s.middle);s.army.setMode(1,[id],'discovery');s.army.step(.05);target.ownerId=2;s.ownership();
  stepSafely(s,[id],100);expect(target.ownerId).toBe(2);expect(s.army.groups.size).toBe(0);
 });
 it('volta ao quartel sem cancelar descoberta e retoma quando surge uma área livre',()=>{
  const s=setup(),b=barracks(s),target=s.map.cells[b.anchorId],from=s.map.cells.find(c=>Math.hypot(c.x-target.x,c.y-target.y)>250&&Math.hypot(c.x-target.x,c.y-target.y)<300)!;
  const id=s.army.spawn(1,'infantry',from),i=s.army.index(id);s.army.setMode(1,[id],'discovery');s.army.step(.05);
  expect(s.army.state[i]).toBe(UNIT_STATE.retreat);stepSafely(s,[id],300);
  expect(Math.hypot(s.army.x[i]-target.x,s.army.y[i]-target.y)).toBeLessThan(.1);expect(s.army.state[i]).toBe(UNIT_STATE.recover);expect(s.army.modes[i]).toBe(UNIT_MODES.discovery);
  const searches=s.army.navigation.searches;stepSafely(s,[id],50);expect(s.army.navigation.searches).toBe(searches);
  const neutral=s.map.cells[target.neighbors[0]];neutral.ownerId=null;s.ownership();stepSafely(s,[id],100);expect(neutral.ownerId).toBe(1);
 });
 it('não cruza um país em guerra para explorar nem para voltar a um quartel inacessível',()=>{
  const s=setup();barracks(s);const from=s.middle;
  for(const id of from.neighbors)s.map.cells[id].ownerId=2;s.east(from,2).ownerId=null;s.ownership();s.d.testWar(1,2);
  const id=s.army.spawn(1,'infantry',from),i=s.army.index(id);s.army.setMode(1,[id],'discovery');stepSafely(s,[id],100);
  expect(s.army.x[i]).toBeCloseTo(from.x);expect(s.army.y[i]).toBeCloseTo(from.y);expect(s.army.state[i]).toBe(UNIT_STATE.idle);
  for(const n of from.neighbors)expect(s.map.cells[n].ownerId).toBe(2);
 });
});
