import {describe,it,expect} from 'vitest';
import {Simulation} from '../simulation/engine';
import {DEFAULT_MAP_CONFIG} from '../map/types';
import {axialIndex,hexDistance,cellAtWorld} from '../map/hex/coordinates';
import {discoveryFrontier} from '../simulation/units/discovery';

function setup(){const sim=new Simulation(false);sim.command({type:'GENERATE_MAP',config:{...DEFAULT_MAP_CONFIG,size:'small'},requestId:0});for(const c of sim.map!.cells)c.terrain='land';sim.command({type:'PREPARE_MATCH',playerCount:2,botDifficulty:'off'});sim.command({type:'START_MATCH',spawnId:0,name:'Teste'});const map=sim.map!,match=sim.match!,army=sim.army!,city=match.state.buildings.find(b=>b.ownerId===1&&b.type==='city')!;const center=map.cells[Math.floor(map.layout.rows/2)*map.layout.columns+Math.floor(map.layout.columns/2)];city.anchorId=center.id;city.cellIds=[center.id];for(const c of map.cells)c.ownerId=hexDistance(c,center)<=2?1:null;match.owned.set(1,new Set(map.cells.filter(c=>c.ownerId===1).map(c=>c.id)));match.state.players[0].territory=match.owned.get(1)!.size;return {sim,map,match,army,city,center};}
const band=(s:ReturnType<typeof setup>,c:{x:number;y:number})=>Math.floor(Math.hypot(c.x-s.center.x,c.y-s.center.y)/(s.map.layout.radius*Math.sqrt(3))+1e-6);
describe('Descoberta ao redor das cidades',()=>{
 it('prioriza a fronteira junto à cidade, mesmo quando a próxima célula na linha reta fica mais perto da tropa',()=>{const s=setup(),start=s.map.cells[axialIndex(s.center.q+2,s.center.r,s.map.layout)],neutral=s.map.cells.filter(c=>c.ownerId===null),ranked=discoveryFrontier(s.map,neutral,s.center,start,id=>id===1);const straight=s.map.cells[axialIndex(s.center.q+3,s.center.r,s.map.layout)];expect(band(s,ranked[0])).toBeLessThan(band(s,straight));expect(ranked.every(c=>c.neighbors.some(n=>s.map.cells[n].ownerId===1)||c.neighbors.includes(start.id))).toBe(true);});
 it('completa cada anel disponível antes de avançar para outro, evitando caminhos longos e estreitos',()=>{const s=setup(),start=s.map.cells[axialIndex(s.center.q+2,s.center.r,s.map.layout)],id=s.army.spawn(1,'infantry',start);s.army.setMode(1,[id],'discovery');let previousRing=-1,orders=0,lastTarget=-1;for(let n=0;n<3000;n++){s.army.step(.05);const group=[...s.army.groups.values()][0];if(!group)continue;const target=cellAtWorld(s.map,group.target.x,group.target.y)!;if(target.id===lastTarget)continue;lastTarget=target.id;const ring=band(s,target);expect(ring).toBeGreaterThanOrEqual(previousRing);previousRing=ring;orders++;if(orders>=45)break;}expect(orders).toBeGreaterThanOrEqual(45);});
 it('escolhe a cidade própria mais próxima e mantém esse centro durante a exploração',()=>{const s=setup(),second=s.map.cells[axialIndex(s.center.q+12,s.center.r,s.map.layout)],other={...s.city,id:100,anchorId:second.id,cellIds:[second.id]};s.match.state.buildings.push(other);for(const c of s.map.cells)if(hexDistance(c,second)<=2)c.ownerId=1;s.match.owned.set(1,new Set(s.map.cells.filter(c=>c.ownerId===1).map(c=>c.id)));s.match.state.players[0].territory=s.match.owned.get(1)!.size;const id=s.army.spawn(1,'infantry',second);s.army.setMode(1,[id],'discovery');s.army.step(.05);const group=[...s.army.groups.values()][0]!;expect(group).toBeDefined();expect(Math.hypot(group.target.x-second.x,group.target.y-second.y)).toBeLessThan(s.map.layout.radius*6);});
});

import {DiscoveryTraffic} from '../simulation/units/discovery';
import {UNIT_MODES} from '../shared/configs/units';
describe('Exploradores independentes',()=>{
 it.each([false,true])('separa destinos durante uma exploração longa, inclusive após ativação individual: %s',individual=>{
  const s=setup(),ids=Array.from({length:6},()=>s.army.spawn(1,'infantry',s.center)),gap=s.map.layout.radius*Math.sqrt(3)*2;
  if(individual){for(const id of ids){s.army.setMode(1,[id],'discovery');s.army.step(.05);}}else s.army.setMode(1,ids,'discovery');
  let maximumActive=0,changes=0;const previous=new Map<number,number>();
  for(let n=0;n<4000;n++){s.army.step(.05);const groups=[...s.army.groups.values()];maximumActive=Math.max(maximumActive,groups.length);for(let a=0;a<groups.length;a++){const group=groups[a];expect(group.ids).toHaveLength(1);const cell=cellAtWorld(s.map,group.target.x,group.target.y)!;if(previous.get(group.ids[0])!==cell.id){changes++;previous.set(group.ids[0],cell.id);}for(let b=a+1;b<groups.length;b++)expect(Math.hypot(group.target.x-groups[b].target.x,group.target.y-groups[b].target.y)).toBeGreaterThanOrEqual(gap-.02);}}
  expect(maximumActive).toBe(6);expect(changes).toBeGreaterThan(25);for(const id of ids)expect(s.army.modes[s.army.index(id)]).toBe(UNIT_MODES.discovery);
 });
 it('evita um explorador próximo mesmo quando o destino dele aponta para outra direção',()=>{const s=setup(),frontier=discoveryFrontier(s.map,s.map.cells.filter(c=>c.ownerId===null),s.center,s.center,id=>id===1),near=frontier[0],other=s.army.spawn(1,'infantry',s.center);s.army.setMode(1,[other],'discovery');s.army.step(.05);const group=s.army.groups.get(s.army.groupId[s.army.index(other)])!;const far=frontier.find(c=>Math.hypot(c.x-near.x,c.y-near.y)>s.map.layout.radius*Math.sqrt(3)*4)!;group.target={x:far.x,y:far.y};[...s.army['modeOrders'].values()][0].target=far.id;s.army.x[s.army.index(other)]=near.x;s.army.y[s.army.index(other)]=near.y;
  const id=s.army.spawn(1,'infantry',s.center);s.army.setMode(1,[id],'discovery');s.army.step(.05);const own=s.army.groups.get(s.army.groupId[s.army.index(id)])!;expect(own).toBeDefined();expect(Math.hypot(own.target.x-near.x,own.target.y-near.y)).toBeGreaterThanOrEqual(s.map.layout.radius*Math.sqrt(3)*2-.02);
 });
 it('aguarda quando só existe uma frente e libera a reserva ao mudar a ordem manualmente',()=>{
  const s=setup();for(const c of s.map.cells)c.ownerId=1;const target=s.map.cells[axialIndex(s.center.q+3,s.center.r,s.map.layout)];target.ownerId=null;
  const first=s.army.spawn(1,'infantry',s.center),second=s.army.spawn(1,'infantry',s.center);s.army.setMode(1,[first],'discovery');s.army.setMode(1,[second],'discovery');s.army.step(.05);
  expect(s.army.groupId[s.army.index(first)]).not.toBe(0);expect(s.army.groupId[s.army.index(second)]).toBe(0);expect(s.army.modes[s.army.index(second)]).toBe(UNIT_MODES.discovery);
  s.army.stop(1,[first]);for(let n=0;n<25;n++)s.army.step(.05);expect(s.army.groupId[s.army.index(second)]).not.toBe(0);expect(s.army.modes[s.army.index(first)]).toBe(0);
 });
 it('consulta a proximidade nos dois lados da borda dos buckets e mantém células distantes disponíveis',()=>{const s=setup(),gap=s.map.layout.radius*Math.sqrt(3)*2,traffic=new DiscoveryTraffic(s.map,[{x:gap-.001,y:gap-.001}]);expect(traffic.clear({x:gap+.001,y:gap+.001})).toBe(false);expect(traffic.clear({x:gap*3,y:gap*3})).toBe(true);});
});
