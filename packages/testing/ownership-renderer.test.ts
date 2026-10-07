import {describe,it,expect} from 'vitest';
import {Graphics} from 'pixi.js';
import {drawOwnershipChunk} from '../../apps/client/renderer/ownership';
import {generateMap} from '../map/generation/generate';
import {DEFAULT_MAP_CONFIG} from '../map/types';

describe('Cores do território por trecho do mapa',()=>{
 const map=generateMap({...DEFAULT_MAP_CONFIG,size:'small'});
 const colors=new Map([[1,0x00ff00],[2,0xff80aa],[3,0x0000ff]]);
 it('não repinta um trecho interior com as cores dos países ausentes nem contorna cada hexágono',()=>{
  for(const c of map.cells)c.ownerId=1;
  const ids=map.cells.filter(c=>c.neighbors.length===6).slice(100,116).map(c=>c.id),g=new Graphics();
  drawOwnershipChunk(g,map,ids,colors);
  expect(g.context.instructions.map(i=>[i.action,typeof i.data.style==='number'?i.data.style:i.data.style.color])).toEqual([['fill',0x00ff00]]);
  g.destroy();
 });
 it('desenha apenas países presentes e limpa a cor anterior ao atualizar um trecho',()=>{
  for(const c of map.cells)c.ownerId=null;
  const cell=map.cells.find(c=>c.neighbors.length===6)!;cell.ownerId=1;
  const g=new Graphics();drawOwnershipChunk(g,map,[cell.id],colors);
  expect(g.context.instructions.map(i=>[i.action,typeof i.data.style==='number'?i.data.style:i.data.style.color])).toEqual([['fill',0x00ff00],['stroke',0x00ff00]]);
  cell.ownerId=2;drawOwnershipChunk(g,map,[cell.id],colors);
  expect(g.context.instructions.map(i=>[i.action,typeof i.data.style==='number'?i.data.style:i.data.style.color])).toEqual([['fill',0xff80aa],['stroke',0xff80aa]]);
  cell.ownerId=null;drawOwnershipChunk(g,map,[cell.id],colors);
  expect(g.context.instructions).toHaveLength(0);g.destroy();
 });
});

import {OwnershipRenderer} from '../../apps/client/renderer/ownership';
import {Simulation} from '../simulation/engine';
describe('Estruturas sem sprite e hover',()=>{
 it('preenche o footprint com a cor do dono, contorna somente estruturas e limpa após demolição',()=>{
  const sim=new Simulation(false);sim.command({type:'GENERATE_MAP',config:{...DEFAULT_MAP_CONFIG,size:'small'},requestId:0});sim.command({type:'PREPARE_MATCH',playerCount:2,botDifficulty:'off'});sim.command({type:'START_MATCH',spawnId:0,name:'Teste'});
  const state=sim.match!.state,map=sim.map!,b=state.buildings[0];b.type='factory';const r=new OwnershipRenderer();r.setMap(map);r.updateState(state,[]);
  const fills=r['cities'].context.instructions.filter(i=>i.action==='fill'&&typeof i.data.style!=='number'&&i.data.style.color===state.players[0].color&&i.data.style.alpha===.8);expect(fills).toHaveLength(1);
  const empty=map.cells.find(c=>!state.buildings.some(b=>b.cellIds.includes(c.id)))!;r.highlight(empty.id);expect(r['hovered'].context.instructions).toHaveLength(0);
  r.highlight(b.cellIds[0]);expect(r['hovered'].context.instructions.map(i=>i.action)).toEqual(['stroke']);const stroke=r['hovered'].context.instructions[0];r.highlight(b.cellIds[1]);expect(r['hovered'].context.instructions[0]).toBe(stroke);
  state.buildings=state.buildings.filter(other=>other!==b);state.buildingRevision++;r.updateState(state,[]);expect(r['hovered'].context.instructions).toHaveLength(0);expect(r.buildingAt(b.cellIds[0])).toBeUndefined();r.root.destroy({children:true});
 });
});
