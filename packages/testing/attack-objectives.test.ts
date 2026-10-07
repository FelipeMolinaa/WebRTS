import {describe,it,expect} from 'vitest';
import {Simulation} from '../simulation/engine';
import {DEFAULT_MAP_CONFIG} from '../map/types';
import {footprintCells} from '../simulation/economy/placement';
import {hexDistance} from '../map/hex/coordinates';
import {UNIT_MODES} from '../shared/configs/units';
import {ATTACK_MODE_CONFIG} from '../shared/configs/combat';
import type {BuildingType} from '../shared/configs/buildings';
import {fundCountry,completeConstruction} from './economy-fixture';
function setup(type:BuildingType='farm'){
 const sim=new Simulation(false);sim.command({type:'GENERATE_MAP',config:DEFAULT_MAP_CONFIG,requestId:0});for(const c of sim.map!.cells)c.terrain='land';sim.command({type:'PREPARE_MATCH',playerCount:3,botDifficulty:'off'});sim.command({type:'START_MATCH',spawnId:0,name:'Teste'});
 const match=sim.match!,army=sim.army!,map=sim.map!;fundCountry(match.economy!,2,500);
 const point=map.cells.find(c=>c.x>700&&c.x<4500&&c.y>700&&c.y<3000&&match.state.buildings.every(b=>Math.hypot(c.x-map.cells[b.anchorId].x,c.y-map.cells[b.anchorId].y)>700)&&footprintCells(map,type,c.id,0).every(id=>id>=0&&map.cells[id].ownerId===null))!;
 for(const id of footprintCells(map,type,point.id,0))match.captureCellInWar(2,id);
 const building=completeConstruction(match.economy!,match.economy!.build(2,type,point.id,0));match.state.buildingRevision++;
 const start=map.cells.find(c=>c.ownerId===null&&Math.hypot(c.x-point.x,c.y-point.y)>240&&Math.hypot(c.x-point.x,c.y-point.y)<270)!;
 match.captureCellInWar(2,start.neighbors[0]);match.diplomacy!.testWar(1,2);
 return {sim,match,army,map,point,start,building};
}
function target(s:ReturnType<typeof setup>,id:number){return s.army.groups.get(s.army.groupId[s.army.index(id)])?.target;}
describe('Attack mode structure objectives',()=>{
 it('chooses a reachable structure before a nearer empty enemy hex and preserves it through capture',()=>{
  const s=setup(),id=s.army.spawn(1,'tank',s.start);s.army.setMode(1,[id],'attack');s.army.step(.05);expect(target(s,id)).toEqual({x:s.point.x,y:s.point.y});
  for(let n=0;n<20*20;n++)s.sim.step();expect(s.building.ownerId).toBe(1);expect(s.building.hp).toBe(s.building.maxHp);expect(s.army.modes[s.army.index(id)]).toBe(UNIT_MODES.attack);
  s.army.step(1);const next=target(s,id);expect(next).toBeDefined();const cell=s.map.cells.find(c=>c.x===next!.x&&c.y===next!.y)!;expect(hexDistance(s.point,cell)).toBeLessThanOrEqual(ATTACK_MODE_CONFIG.secureRadius);
 });
 it('destroys a military objective then secures its surroundings',()=>{
  const s=setup('barracks'),id=s.army.spawn(1,'tank',s.start);s.army.setMode(1,[id],'attack');for(let n=0;n<26*20;n++)s.sim.step();expect(s.match.state.buildings.some(b=>b.id===s.building.id)).toBe(false);expect(s.army.modes[s.army.index(id)]).toBe(UNIT_MODES.attack);expect(s.match.state.players[1].defeated).toBe(false);
  const next=target(s,id);expect(next).toBeDefined();const cell=s.map.cells.find(c=>c.x===next!.x&&c.y===next!.y)!;expect(hexDistance(s.point,cell)).toBeLessThanOrEqual(ATTACK_MODE_CONFIG.secureRadius);
 });
 it('skips disconnected structures and advances on accessible territory',()=>{
  const s=setup();for(const c of s.map.cells)if(hexDistance(c,s.point)<=3&&!s.building.cellIds.includes(c.id))c.terrain='water';s.map.navigationRevision=(s.map.navigationRevision??0)+1;
  // Isolate all enemy structures; empty enemy land is still a valid fallback.
  for(const b of s.match.state.buildings.filter(b=>b.ownerId===2))for(const c of s.map.cells)if(hexDistance(c,s.map.cells[b.anchorId])<=4&&!b.cellIds.includes(c.id))c.terrain='water';s.map.navigationRevision++;
  const id=s.army.spawn(1,'tank',s.start);s.army.setMode(1,[id],'attack');s.army.step(.05);expect(target(s,id)).toBeDefined();expect(target(s,id)).not.toEqual({x:s.point.x,y:s.point.y});
 });
 it('manual movement cancels an automatic destruction order',()=>{
  const s=setup('barracks'),id=s.army.spawn(1,'tank',s.start);s.army.setMode(1,[id],'attack');s.army.step(.05);expect(s.army.buildingOrders.get(s.army.index(id))).toBe(s.building.id);s.army.move(1,[id],s.start);expect(s.army.buildingOrders.size).toBe(0);expect(s.army.modes[s.army.index(id)]).toBe(0);
 });
 it('keeps three troops occupying a city until it is captured intact',()=>{
  const s=setup('city'),ids=Array.from({length:3},()=>s.army.spawn(1,'tank',s.start));s.army.setMode(1,ids,'attack');for(let n=0;n<31*20;n++)s.sim.step();expect(s.building.ownerId).toBe(1);expect(s.building.hp).toBe(s.building.maxHp);expect(ids.every(id=>s.army.modes[s.army.index(id)]===UNIT_MODES.attack)).toBe(true);
 });
});
