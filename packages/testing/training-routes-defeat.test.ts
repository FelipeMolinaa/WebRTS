import {completeConstruction} from './economy-fixture';
import {TRAINING} from '../shared/configs/training';
import {UNITS} from '../shared/configs/units';
import {fundCountry} from './economy-fixture';
import {describe,it,expect} from 'vitest';
import {Simulation} from '../simulation/engine';
import {footprintCells,evaluatePlacement} from '../simulation/economy/placement';
import {DEFAULT_MAP_CONFIG} from '../map/types';

function setup(players=4){
 const sim=new Simulation(false);sim.command({type:'GENERATE_MAP',config:DEFAULT_MAP_CONFIG,requestId:0});sim.command({type:'PREPARE_MATCH',playerCount:players,botDifficulty:'off'});sim.command({type:'START_MATCH',spawnId:0,name:'Meu país'});
 const match=sim.match!,army=sim.army!,country=fundCountry(match.economy!,1,300),anchor=sim.map!.cells.find(c=>evaluatePlacement(sim.map!,match.economy!.occupied,country,1,'barracks',c.id,0).valid)!;
 match.build(1,'barracks',anchor.id,0);completeConstruction(match.economy!, match.state.buildings.at(-1)!);const barracks=match.state.buildings.at(-1)!;return {sim,match,army,country,barracks};
}
describe('Quartel: treinamento sequencial',()=>{
 it('reserva o custo sem produzir imediatamente, limita quatro lotes e rejeita excessos atomicamente',()=>{
  const {army,match,country,barracks}=setup();fundCountry(match.economy!,1,300);country.stock={money:10000,food:10000,mineral:10000,fuel:10000};
  army.recruit(1,barracks.id,'infantry',10);army.recruit(1,barracks.id,'tank',1);army.recruit(1,barracks.id,'infantry',10);army.recruit(1,barracks.id,'infantry',1);
  expect(army.count).toBe(0);expect(army.queuedCount).toBe(22);expect(match.state.training[0].batches).toHaveLength(4);
  const before=structuredClone(country),queue=structuredClone(match.state.training);
  expect(()=>army.recruit(1,barracks.id,'infantry',1)).toThrow(/4 espaços/);expect(()=>army.recruit(1,barracks.id,'infantry',11)).toThrow(/10 infantarias/);expect(()=>army.recruit(1,barracks.id,'tank',2)).toThrow(/1 tanque/);
  expect(country).toEqual(before);expect(match.state.training).toEqual(queue);
 });
 it('produz uma infantaria no tempo configurado e tanque sequencialmente, respeitando a pausa e a ordem dos lotes',()=>{
  const {sim,army,barracks}=setup();army.recruit(1,barracks.id,'infantry',2);army.recruit(1,barracks.id,'tank',1);
  sim.command({type:'SET_PAUSED',enabled:true});for(let i=0;i<800;i++)sim.step();expect(army.count).toBe(0);expect(sim.match!.state.training[0].batches[0].elapsed).toBe(0);
  sim.command({type:'SET_PAUSED',enabled:false});for(let i=0;i<TRAINING.seconds.infantry*20-1;i++)sim.step();expect(army.count).toBe(0);sim.step();expect(army.count).toBe(1);
  for(let i=0;i<TRAINING.seconds.infantry*20;i++)sim.step();expect(army.count).toBe(2);for(let i=0;i<TRAINING.seconds.tank*20-1;i++)sim.step();expect(army.count).toBe(2);sim.step();expect(army.count).toBe(3);expect(army.kind[2]).toBe(1);expect(sim.match!.state.training).toHaveLength(0);
 });
 it('devolve somente os recursos e a população ainda em treinamento se o quartel for destruído',()=>{
  const {army,match,country,barracks}=setup(),before={...country.stock},population=country.population;
  army.recruit(1,barracks.id,'infantry',10);army.stepTraining(TRAINING.seconds.infantry*2);expect(army.count).toBe(2);match.damageBuilding(barracks.id,barracks.hp);army.stepTraining(.05);
  expect(match.state.training).toHaveLength(0);expect(country.stock.money).toBe(before.money-UNITS.infantry.cost.money!*2);expect(country.stock.mineral).toBe(before.mineral-UNITS.infantry.cost.mineral!*2);expect(country.population).toBe(population-2);
 });
});
describe('Rotas militares por pontos',()=>{
 for(const cohesion of [false,true])it('visita os pontos na ordem e mantém a rota até completar, coesão '+cohesion,()=>{
  const {sim,army,match}=setup(),center=sim.map!.cells[match.state.cities[0].anchorId],id=army.spawn(1,'infantry',center);
  const points=sim.map!.cells.filter(c=>c.ownerId===1&&Math.hypot(c.x-center.x,c.y-center.y)>70&&army.navigation.connected(center,c)).slice(0,3);
  army.move(1,[id],points[0],'column',cohesion,true);army.move(1,[id],points[1],'column',cohesion,true);army.move(1,[id],points[2],'column',cohesion,true);
  expect(army.routeViews()[0].points).toEqual(points.map(p=>({x:p.x,y:p.y})));let visited=0;
  for(let i=0;i<1800&&visited<3;i++){sim.step();if(Math.hypot(army.x[0]-points[visited].x,army.y[0]-points[visited].y)<.5)visited++;}
  expect(visited).toBe(3);for(let i=0;i<3;i++)sim.step();expect(army.groups.size).toBe(0);
 });
 it('rejeita um ponto na água sem alterar a rota e uma ordem de parada limpa os pontos',()=>{
  const {sim,army,match}=setup(),center=sim.map!.cells[match.state.cities[0].anchorId],id=army.spawn(1,'infantry',center),target=sim.map!.cells.find(c=>c.ownerId===1&&c.id!==center.id)!;
  army.move(1,[id],target,'column',true,true);army.move(1,[id],center,'column',true,true);const before=structuredClone(army.routeViews());expect(()=>army.move(1,[id],sim.map!.cells.find(c=>c.terrain==='water')!,'column',true,true)).toThrow();expect(army.routeViews()).toEqual(before);army.stop(1,[id]);expect(army.routeViews()).toHaveLength(0);
 });
});
describe('Derrota por perda de cidades',()=>{
 it('mantém o país enquanto houver outra cidade, e elimina tropas, terras e alianças ao perder a última',()=>{
  const {sim,match,army}=setup(),country=match.economy!.countries[0],anchor=sim.map!.cells.find(c=>{const ids=footprintCells(sim.map!,'city',c.id,0);return ids.every(id=>id>=0&&sim.map!.cells[id].terrain==='land'&&(sim.map!.cells[id].ownerId===null||sim.map!.cells[id].ownerId===1)&&match.economy!.occupied[id]===0);})!;for(const id of footprintCells(sim.map!,'city',anchor.id,0)){const c=sim.map!.cells[id];match.captureAtPosition(1,c.x,c.y);}
  fundCountry(match.economy!,1,300);match.build(1,'city',anchor.id,0);completeConstruction(match.economy!, match.state.buildings.at(-1)!);const second=match.state.buildings.at(-1)!,first=match.state.buildings.find(b=>b.ownerId===1&&b.initial)!;
  match.diplomacy!.act(1,'request_alliance',2);match.diplomacy!.step(2);expect(match.diplomacy!.allied(1,2)).toBe(true);
  army.spawn(1,'infantry',sim.map!.cells[first.anchorId]);match.damageBuilding(first.id,first.hp);expect(match.state.players[0].defeated).toBe(false);
  match.damageBuilding(second.id,second.hp);expect(match.state.players[0].defeated).toBe(true);expect(match.state.players[0].territory).toBe(0);expect(match.diplomacy!.allied(1,2)).toBe(false);expect(army.count).toBe(0);expect(match.state.buildings.some(b=>b.ownerId===1)).toBe(false);expect(sim.map!.cells.some(c=>c.ownerId===1)).toBe(false);expect(match.state.captured).toBe(match.state.players.reduce((n,p)=>n+p.territory,0));expect(()=>sim.command({type:'RECRUIT_UNITS',playerId:1,buildingId:0,unitType:'infantry',count:1})).toThrow(/derrotado/);
 });
 it('encerra hostilidades de uma coalizão e rejeita propostas e comandos de países derrotados',()=>{
  const {sim,match}=setup(),d=match.diplomacy!;d.act(1,'request_alliance',2);d.step(2);d.act(2,'prepare_war',3);d.step(15);d.act(2,'declare_war',3);d.act(2,'call_ally',1,1);d.step(2);expect(d.hostile(1,3)).toBe(true);
  const city=match.state.buildings.find(b=>b.ownerId===2&&b.type==='city')!;match.damageBuilding(city.id,city.hp);
  expect(d.hostile(1,3)).toBe(false);expect(d.hostile(2,3)).toBe(false);expect(d.allied(1,2)).toBe(false);expect(match.state.combatOpponents).not.toContain(2);expect(()=>d.act(1,'request_alliance',2)).toThrow();expect(()=>sim.command({type:'DIPLOMACY_ACTION',playerId:2,action:'prepare_war',targetId:3},'bot')).toThrow(/derrotado/);
 });
 it('declara vencedor o último país com cidades sem exigir 80% de domínio',()=>{
  const {sim,match}=setup(2),city=match.state.buildings.find(b=>b.ownerId===1&&b.type==='city')!;match.damageBuilding(city.id,city.hp);sim.step();expect(match.state.phase).toBe('finished');expect(match.state.victory.winnerId).toBe(2);expect(match.state.victory.reason).toBe('cities');expect(match.state.victory.percent).toBeLessThan(80);
 });
});
