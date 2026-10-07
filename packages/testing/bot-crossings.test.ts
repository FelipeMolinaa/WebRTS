import {it,expect} from 'vitest';
import {Simulation} from '../simulation/engine';
import {BotSystem} from '../ai/system';
import {DEFAULT_MAP_CONFIG,type ProceduralMap,type TerritoryCell} from '../map/types';
import {HEX_DIRECTIONS,axialIndex,hexToWorld} from '../map/hex/coordinates';
import {identifyLandmasses} from '../map/territory/regions';
import {spawnAt} from '../simulation/territory/spawns';
import {evaluatePlacement} from '../simulation/economy/placement';
import {completeConstruction,fundCountry} from './economy-fixture';
function setup(wide=false){
 const layout={columns:35,rows:24,radius:24,originX:40,originY:40};
 const cells:TerritoryCell[]=Array.from({length:35*24},(_,id)=>{const r=Math.floor(id/35),col=id%35,q=col-Math.floor(r/2);return {id,q,r,...hexToWorld(q,r,layout),terrain:col>=10&&col<(wide?25:15)?'water':'land',waterKind:col>=10&&col<(wide?25:15)?'river':undefined,resource:null,ownerId:null,richness:0,elevation:1,regionId:0,landmassId:-1,variation:0,neighbors:HEX_DIRECTIONS.map(([dq,dr])=>axialIndex(q+dq,r+dr,layout)).filter(n=>n>=0)};});
 const map:ProceduralMap={version:1,config:DEFAULT_MAP_CONFIG,layout,cells,regions:[],landmasses:identifyLandmasses(cells),stats:{land:720,water:120,food:0,mineral:0,fuel:0}},sim=new Simulation(false);sim.map=map;
 sim.command({type:'PREPARE_MATCH',playerCount:2,botDifficulty:'normal'});sim.match!.state.spawns=[{...spawnAt(map,(wide?5:12)*35+29)!,id:0},{...spawnAt(map,12*35+5)!,id:1}];sim.command({type:'START_MATCH',spawnId:0,name:'Teste'});
 const match=sim.match!,e=match.economy!,country=fundCountry(e,2),a=sim.army!;
 for(const c of cells)if(c.terrain==='land'&&c.id%35<10)match.captureAtPosition(2,c.x,c.y);
 country.stock={money:1000000,food:1000000,mineral:1000000,fuel:1000000};country.builders=country.maxBuilders;
 for(const type of ['farm','mine','barracks']as const){const anchor=cells.find(c=>evaluatePlacement(map,e.occupied,country,2,type,c.id,0).valid)!;completeConstruction(e,e.build(2,type,anchor.id,0));}
 const center=cells[match.state.cities[1].anchorId];for(let n=0;n<5;n++)a.spawn(2,'infantry',center);
 sim.bots=new BotSystem(match,a,c=>sim.command(c,'bot'));return {sim,match,e,country,a,cells};
}
it('bots fund a complete multi-segment crossing, finish it sequentially and explore the far shore',()=>{
 const {sim,e,country,cells}=setup(),before=country.stock.money;
 for(let n=0;n<5000;n++)sim.step(.05);
 const bridges=e.buildings.filter(b=>b.ownerId===2&&b.type==='bridge');expect(bridges.length).toBeGreaterThanOrEqual(5);expect(bridges.some(b=>b.materialsSpent.money===800)).toBe(true);expect(bridges.filter(b=>!b.construction).length).toBeGreaterThanOrEqual(5);
 expect(cells.some(c=>c.id%35>=15&&c.ownerId===2)).toBe(true);expect(country.stock.money).toBeLessThan(before+100000);expect(sim.bots!.debug()[0].lastFailure).toBeUndefined();
},20000);

it('bots use naval expeditions to expand across water beyond the bridge limit',()=>{
 const {sim,match,e,country,cells}=setup(true);
 const anchor=cells.find(c=>evaluatePlacement(sim.map!,e.occupied,country,2,'port',c.id,0).valid)!;
 completeConstruction(e,e.build(2,'port',anchor.id,0));let embarked=false;
 for(let n=0;n<12000;n++){sim.step(.05);if(match.state.operations?.boats.some(b=>b.passengers>0))embarked=true;}
 expect(embarked).toBe(true);expect(cells.some(c=>c.id%35>=25&&c.ownerId===2)).toBe(true);expect(e.buildings.filter(b=>b.ownerId===2&&b.type==='bridge')).toHaveLength(0);
},20000);
