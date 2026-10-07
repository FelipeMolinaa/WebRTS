import {describe,it,expect} from 'vitest';
import {Simulation} from '../simulation/engine';
import {DEFAULT_MAP_CONFIG} from '../map/types';
import {NavigationGrid} from '../simulation/navigation/grid';
import {generateMap} from '../map/generation/generate';
import {footprintCells} from '../simulation/economy/placement';

describe('Movement stays responsive across disconnected terrain',()=>{
 it('does not run a path search for each connectivity check on unreachable islands',()=>{
  const map=generateMap(DEFAULT_MAP_CONFIG);
  for(const c of map.cells)c.terrain=c.x>2500&&c.x<2750?'water':'land';
  const nav=new NavigationGrid(map);
  for(let n=0;n<100;n++)expect(nav.connected({x:2000,y:1800},{x:3200,y:1800+n})).toBe(false);
  expect(nav.searches).toBe(0);
 });
 it('limits failed automatic destinations and still advances unrelated manual orders',()=>{
  const sim=new Simulation(false);sim.command({type:'GENERATE_MAP',config:DEFAULT_MAP_CONFIG,requestId:0});
  for(const c of sim.map!.cells)c.terrain='land';
  sim.command({type:'PREPARE_MATCH',playerCount:2,botDifficulty:'off'});sim.command({type:'START_MATCH',spawnId:0,name:'Teste'});
  const army=sim.army!,map=sim.map!,match=sim.match!;
  const enemy=map.cells.filter(c=>c.x>3000&&c.x<3500&&c.y>1000&&c.y<2000);
  // Put every enemy objective behind the synthetic water barrier, independently of generated spawns.
  for(const c of map.cells)if(c.ownerId===2)c.ownerId=null;
  const anchor=enemy.reduce((best,c)=>Math.hypot(c.x-3250,c.y-1500)<Math.hypot(best.x-3250,best.y-1500)?c:best,enemy[0]);
  for(const b of match.state.buildings.filter(b=>b.ownerId===2)){
   for(const id of b.cellIds)match.economy!.occupied[id]=0;
   b.anchorId=anchor.id;b.cellIds=footprintCells(map,b.type,anchor.id,0);
   for(const id of b.cellIds)match.economy!.occupied[id]=b.id;
   const city=match.state.cities.find(c=>c.id===b.id);if(city){city.anchorId=b.anchorId;city.cellIds=[...b.cellIds];}
  }
  for(const c of enemy)c.ownerId=2;match.owned.set(2,new Set(enemy.map(c=>c.id)));match.state.players[1].territory=enemy.length;
  const automatic=army.spawn(1,'infantry',{x:2000,y:1800}),manual=army.spawn(1,'infantry',{x:2000,y:1850});
  army.move(1,[manual],{x:2200,y:1850});army.setMode(1,[automatic],'attack');match.diplomacy!.testWar(1,2);
  for(const c of map.cells)if(c.x>2500&&c.x<2750)c.terrain='water';
  const searches=army.navigation.searches,x=army.x[army.index(manual)];
  army.step(.05);
  expect(army.navigation.searches-searches).toBe(0);
  expect(army.x[army.index(manual)]).toBeGreaterThan(x);
 });
});

describe('Automatic order scheduling and stalled routes',()=>{
 function setup(){const sim=new Simulation(false);sim.command({type:'GENERATE_MAP',config:{...DEFAULT_MAP_CONFIG,size:'small'},requestId:0});for(const c of sim.map!.cells)c.terrain='land';sim.command({type:'PREPARE_MATCH',playerCount:2,botDifficulty:'off'});sim.command({type:'START_MATCH',spawnId:0,name:'Teste'});const army=sim.army!,match=sim.match!,center=sim.map!.cells[match.state.cities[0].anchorId];return {sim,army,match,center};}
 it('services newer defense and attack orders even when early explorers need constant replanning',()=>{
  const {army,match,center}=setup(),ids=Array.from({length:4},()=>army.spawn(1,'infantry',center));army.setMode(1,ids,'discovery');const defense=army.spawn(1,'infantry',center),attack=army.spawn(1,'infantry',center);army.setMode(1,[defense],'defense');army.setMode(1,[attack],'attack');match.diplomacy!.testWar(1,2);
  const orders=(army as unknown as {modeOrders:Map<number,{ids:number[];elapsed:number;target:number}>}).modeOrders;
  for(let n=0;n<3;n++){for(const o of orders.values())if(o.ids.some(id=>ids.includes(id)))o.elapsed=1;army.step(.05);}
  expect([...orders.values()].find(o=>o.ids.includes(defense))!.target).toBeGreaterThanOrEqual(0);expect([...orders.values()].find(o=>o.ids.includes(attack))!.target).toBeGreaterThanOrEqual(0);
 });
 it('replans a valid automatic target when its active route makes no progress',()=>{
  const {army,center}=setup(),id=army.spawn(1,'infantry',center);army.setMode(1,[id],'defense');army.step(.05);
  const order=[...(army as unknown as {modeOrders:Map<number,{ids:number[];target:number}>}).modeOrders.values()][0];const initialTarget=order.target,index=army.index(id),position={x:army.x[index],y:army.y[index]},searches=army.navigation.searches,clear=army.navigation.clear.bind(army.navigation);army.navigation.clear=()=>false;
  for(let n=0;n<130;n++)army.step(.05);expect(army.x[index]).toBe(position.x);expect(army.y[index]).toBe(position.y);expect(army.navigation.searches).toBeGreaterThan(searches);expect(order.target).not.toBe(initialTarget);army.navigation.clear=clear;for(let n=0;n<80;n++)army.step(.05);expect(Math.hypot(army.x[index]-position.x,army.y[index]-position.y)).toBeGreaterThan(1);
 });
});
