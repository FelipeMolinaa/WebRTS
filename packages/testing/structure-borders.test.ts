import {fundCountry} from './economy-fixture';
import {describe,it,expect} from 'vitest';
import {structureEdges} from '../../apps/client/renderer/buildings';
import {generateMap} from '../map/generation/generate';
import {DEFAULT_MAP_CONFIG} from '../map/types';
import {Simulation} from '../simulation/engine';
import {evaluatePlacement} from '../simulation/economy/placement';

describe('Contornos entre estruturas',()=>{
 const map=generateMap({...DEFAULT_MAP_CONFIG,size:'small'}),cell=map.cells.find(c=>c.neighbors.length===6)!,neighbor=cell.neighbors[0];
 it('remove a linha comum entre duas estruturas próprias e restaura ao demolir a vizinha',()=>{const occupied=new Int16Array(map.cells.length);occupied[cell.id]=occupied[neighbor]=1;expect([...structureEdges(map,[cell.id],1,occupied)]).toHaveLength(5);expect([...structureEdges(map,[neighbor],1,occupied)]).toHaveLength(5);occupied[neighbor]=0;expect([...structureEdges(map,[cell.id],1,occupied)]).toHaveLength(6);});
 it('preserva a divisão entre países e nunca desenha linhas internas de um footprint',()=>{const occupied=new Int16Array(map.cells.length);occupied[cell.id]=1;occupied[neighbor]=2;expect([...structureEdges(map,[cell.id],1,occupied)]).toHaveLength(6);occupied[neighbor]=1;expect([...structureEdges(map,[cell.id,neighbor],1,occupied)]).toHaveLength(10);});
});
describe('Orientação fixa da construção',()=>{
 it('rejeita ordens giradas sem debitar recursos e permite a orientação padrão',()=>{const s=new Simulation(false);s.command({type:'GENERATE_MAP',config:DEFAULT_MAP_CONFIG,requestId:0});s.command({type:'PREPARE_MATCH',playerCount:4,botDifficulty:'off'});s.command({type:'START_MATCH',spawnId:0,name:'Human'});const m=s.match!,e=m.economy!,country=fundCountry(e),anchor=s.map!.cells.find(c=>evaluatePlacement(s.map!,e.occupied,country,1,'refinery',c.id,0).valid)!,before=structuredClone(country),count=e.buildings.length;for(let rotation=1;rotation<6;rotation++)expect(()=>s.command({type:'BUILD_STRUCTURE',playerId:1,buildingType:'refinery',anchorId:anchor.id,rotation})).toThrow(/orientação padrão/);expect(country).toEqual(before);expect(e.buildings).toHaveLength(count);s.command({type:'BUILD_STRUCTURE',playerId:1,buildingType:'refinery',anchorId:anchor.id,rotation:0});expect(e.buildings.at(-1)!.rotation).toBe(0);});
});
