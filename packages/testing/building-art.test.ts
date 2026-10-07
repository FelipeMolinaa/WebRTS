import {describe,it,expect} from 'vitest';
import {Texture} from 'pixi.js';
import {OwnershipRenderer} from '../../apps/client/renderer/ownership';
import {Simulation} from '../simulation/engine';
import {DEFAULT_MAP_CONFIG} from '../map/types';
import {bridgeBanks} from '../map/bridges';
import {axialIndex,HEX_DIRECTIONS} from '../map/hex/coordinates';
import {BUILDING_TYPES} from '../shared/configs/buildings';
import {buildingArtKey} from '../../apps/client/renderer/building-assets';

function setup(){
 const sim=new Simulation(false);
 sim.command({type:'GENERATE_MAP',config:{...DEFAULT_MAP_CONFIG,size:'small'},requestId:0});
 sim.command({type:'PREPARE_MATCH',playerCount:2,botDifficulty:'off'});
 sim.command({type:'START_MATCH',spawnId:0,name:'Teste'});
 const r=new OwnershipRenderer();r.setMap(sim.map!);
 for(const type of BUILDING_TYPES)r['textures'].set(type,Texture.WHITE);
 r['textures'].set('silo-loaded',Texture.EMPTY);
 return {r,state:sim.match!.state,map:sim.map!};
}

describe('Sprites de estruturas',()=>{
 it('troca o silo ao concluir e lançar o míssil sem depender de uma revisão de construção',()=>{
  const {r,state,map}=setup(),b=state.buildings[0];
  b.type='silo';b.cellIds=[b.anchorId];state.buildings=[b];r.updateState(state,[]);
  const art=r['buildingArt'].get(b.id)!;const revision=state.buildingRevision;
  expect(art.sprite.texture).toBe(Texture.WHITE);
  b.missile={type:'tactical',elapsed:89,duration:90};r.updateState(state,[]);
  expect(art.sprite.texture).toBe(Texture.WHITE);
  b.missile.elapsed=90;r.updateState(state,[]);
  expect(art.sprite.texture).toBe(Texture.EMPTY);
  expect(r['buildingArt'].get(b.id)).toBe(art);
  delete b.missile;r.updateState(state,[]);
  expect(art.sprite.texture).toBe(Texture.WHITE);
  expect(state.buildingRevision).toBe(revision);
  expect(art.sprite.width).toBeCloseTo(Math.sqrt(3)*map.layout.radius);
  expect(art.sprite.height).toBeCloseTo(2*map.layout.radius);
  r.root.destroy({children:true});
 });
 it('mantém o silo fechado durante a construção mesmo com míssil pronto',()=>{
  expect(buildingArtKey({type:'silo',missile:{type:'tactical',elapsed:90,duration:90},construction:{elapsed:10,duration:90,builders:55,ownerId:1}})).toBe('silo');
 });
 it('alinha a ponte visual às duas margens e mantém a máscara do hexágono',()=>{
  const {r,state,map}=setup(),cell=map.cells[state.buildings[0].anchorId];
  cell.terrain='water';cell.waterKind='river';for(const id of cell.neighbors)map.cells[id].terrain='water';
  for(const d of [1,4]){const [q,z]=HEX_DIRECTIONS[d];map.cells[axialIndex(cell.q+q,cell.r+z,map.layout)].terrain='land';}
  const b=state.buildings[0];b.type='bridge';b.anchorId=cell.id;b.cellIds=[cell.id];b.rotation=0;state.buildings=[b];r.updateState(state,[]);
  const banks=bridgeBanks(map,cell.id)!,a=map.cells[banks[0]],z=map.cells[banks[1]],art=r['buildingArt'].get(b.id)!;
  expect(art.sprite.rotation).toBeCloseTo(Math.atan2(z.y-a.y,z.x-a.x));
  expect(art.sprite.mask).toBeTruthy();
  expect(art.bounds.left).toBeCloseTo(cell.x-Math.sqrt(3)*map.layout.radius/2);
  expect(art.bounds.bottom).toBeCloseTo(cell.y+map.layout.radius);
  r.root.destroy({children:true});
 });
});
