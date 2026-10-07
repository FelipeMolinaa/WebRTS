import {completeConstruction} from './economy-fixture';
import {describe,it,expect} from 'vitest';
import {generateMap} from '../map/generation/generate';
import {DEFAULT_MAP_CONFIG} from '../map/types';
import {bridgeBanks} from '../map/bridges';
import {NavigationGrid} from '../simulation/navigation/grid';
import {EconomySystem} from '../simulation/economy/economy';
import {Simulation} from '../simulation/engine';
import {spawnAt} from '../simulation/territory/spawns';
import {hexDistance} from '../map/hex/coordinates';

describe('Rivers, bridges and timed preparation',()=>{
 it('creates connected rivers and predominantly single-hex oil deposits',()=>{
  const map=generateMap(DEFAULT_MAP_CONFIG),rivers=map.cells.filter(c=>c.waterKind==='river');expect(rivers.length).toBeGreaterThan(10);
  for(const c of rivers)expect(c.neighbors.some(n=>map.cells[n].terrain==='water')).toBe(true);
  const oil=map.cells.filter(c=>c.resource==='fuel'),seen=new Set<number>();let single=0,total=0;
  for(const c of oil){if(seen.has(c.id))continue;const queue=[c.id];seen.add(c.id);for(let h=0;h<queue.length;h++)for(const n of map.cells[queue[h]].neighbors)if(map.cells[n].resource==='fuel'&&!seen.has(n)){seen.add(n);queue.push(n);}total++;if(queue.length===1)single++;}
  expect(single/total).toBeGreaterThan(.5);
 });
 it('opens and closes a single-hex crossing without rebuilding the navigation grid',()=>{
  const map=generateMap(DEFAULT_MAP_CONFIG);const river=map.cells.find(c=>bridgeBanks(map,c.id));expect(river).toBeDefined();
  const banks=bridgeBanks(map,river!.id)!;for(const c of map.cells){c.terrain='water';c.waterKind='sea';c.bridgeOwnerId=null;c.ownerId=null;}
  river!.waterKind='river';for(const id of banks){map.cells[id].terrain='land';map.cells[id].ownerId=1;}
  const nav=new NavigationGrid(map),a=map.cells[banks[0]],b=map.cells[banks[1]];expect(()=>nav.route(a,b)).toThrow();expect(nav.connected(a,b)).toBe(false);
  const economy=new EconomySystem(map,[{id:1,ownerId:1,anchorId:a.id,cellIds:[a.id]}]);const c=economy.countries[0];c.stock.money=10000;c.stock.mineral=10000;c.builders=66;
  const bridge=completeConstruction(economy,economy.build(1,'bridge',river!.id,0));expect(nav.route(a,b).length).toBeGreaterThan(0);expect(nav.clear(a,b)).toBe(true);expect(nav.connected(a,b)).toBe(true);
  economy.destroy(bridge.id);expect(nav.connected(a,b)).toBe(false);expect(nav.clear(a,b)).toBe(false);expect(()=>nav.route(a,b)).toThrow();
 });
 it('returns troops to their entrance bank when their bridge is demolished',()=>{
  const sim=new Simulation(false);sim.command({type:'GENERATE_MAP',config:DEFAULT_MAP_CONFIG,requestId:1});sim.command({type:'PREPARE_MATCH',playerCount:2,botDifficulty:'off'});sim.command({type:'START_MATCH',spawnId:0,name:'Teste'});
  const map=sim.map!,match=sim.match!,river=map.cells.find(c=>{const banks=bridgeBanks(map,c.id);return banks&&banks.every(id=>map.cells[id].ownerId===null)&&!match.economy!.occupied[c.id];})!,banks=bridgeBanks(map,river.id)!;
  match.captureAtPosition(1,map.cells[banks[0]].x,map.cells[banks[0]].y);const country=match.state.economies[0];country.stock.money=10000;country.stock.mineral=10000;country.builders=66;
  match.build(1,'bridge',river.id,0);completeConstruction(match.economy!,match.state.buildings.at(-1)!);const bridge=match.state.buildings.at(-1)!,army=sim.army!,id=army.spawn(1,'infantry',map.cells[banks[0]]);army.move(1,[id],river);for(let n=0;n<30;n++)army.step(.05);
  const i=army.index(id);expect(Math.hypot(army.x[i]-river.x,army.y[i]-river.y)).toBeLessThan(.1);match.damageBuilding(bridge.id,bridge.maxHp);army.step(.05);expect(army.navigation.land({x:army.x[i],y:army.y[i]})).toBe(true);expect(river.bridgeOwnerId).toBeNull();
 });
 it('reserves an arbitrary valid clicked location and prevents collisions or premature starts',()=>{
  const sim=new Simulation(false);sim.command({type:'GENERATE_MAP',config:DEFAULT_MAP_CONFIG,requestId:1});sim.command({type:'PREPARE_MATCH',playerCount:4,botDifficulty:'off'});
  sim.command({type:'BEGIN_PREPARATION',name:'Brasil',countryId:'br',botCountryIds:['random','random','random']});
  const anchor=sim.map!.cells.find(c=>spawnAt(sim.map!,c.id)&&!sim.match!.state.spawns.some(s=>s.anchorId===c.id))!;
  sim.command({type:'SELECT_TERRAIN',anchorId:anchor.id});expect(()=>sim.command({type:'SELECT_TERRAIN',anchorId:anchor.id})).toThrow();
  expect(()=>sim.command({type:'START_MATCH',spawnId:anchor.id,name:'Brasil'})).toThrow();expect(sim.match!.state.phase).toBe('preparation');
  for(let n=0;n<220&&sim.match!.state.phase==='preparation';n++)sim.step(.05);
  expect(sim.match!.state.phase).toBe('playing');expect(sim.match!.state.cities[0].anchorId).toBe(anchor.id);
  const spawns=sim.match!.state.spawns;for(const a of spawns)for(const b of spawns)if(a!==b)expect(hexDistance(sim.map!.cells[a.anchorId],sim.map!.cells[b.anchorId])).toBeGreaterThanOrEqual(10);
 });
 it('automatically chooses an unconfirmed human terrain at the deadline without ticking the economy',()=>{
  const sim=new Simulation(false);sim.command({type:'GENERATE_MAP',config:DEFAULT_MAP_CONFIG,requestId:1});sim.command({type:'PREPARE_MATCH',playerCount:8,botDifficulty:'off'});sim.command({type:'BEGIN_PREPARATION',name:'Brasil',countryId:'br',botCountryIds:Array(7).fill('random')});
  sim.step(29);expect(sim.match!.state.phase).toBe('preparation');expect(sim.match!.state.economies).toHaveLength(0);
  sim.step(1);expect(sim.match!.state.phase).toBe('playing');expect(sim.match!.state.players).toHaveLength(8);expect(sim.match!.state.players[0].territory).toBe(61);
 });
});
