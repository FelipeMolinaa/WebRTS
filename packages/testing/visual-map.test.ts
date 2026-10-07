import {afterEach,describe,expect,it,vi} from 'vitest';
import {Texture,TextureSource} from 'pixi.js';
import {TerrainRenderer} from '../../apps/client/renderer/terrain';
import {visualLod} from '../../apps/client/renderer/visual-lod';
import {groupUnitMarkers} from '../../apps/client/renderer/unit-groups';
import {groundStyle,landscapeColor,tileVariant} from '../../apps/client/renderer/terrain-art';
import type {Camera} from '../../apps/client/input/camera';
import {generateMap} from '../map/generation/generate';
import {DEFAULT_MAP_CONFIG} from '../map/types';
import {UNIT_STRIDE} from '../shared/configs/units';
import {OwnershipRenderer} from '../../apps/client/renderer/ownership';
import {Simulation} from '../simulation/engine';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function canvasEnvironment(){
 const context=new Proxy({createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:()=>{}},{get:(target,key)=>key in target?target[key as keyof typeof target]:()=>{}});
 vi.stubGlobal('document',{createElement:()=>({width:1,height:1,getContext:()=>context})});
 vi.spyOn(Texture,'from').mockImplementation((canvas:unknown)=>new Texture({source:new TextureSource({width:(canvas as {width:number}).width,height:(canvas as {height:number}).height})}));
}
const cameraAt=(x:number,y:number,zoom:number,width=360,height=240)=>({x,y,zoom,width,height,bounds:()=>({left:x-width/zoom/2,right:x+width/zoom/2,top:y-height/zoom/2,bottom:y+height/zoom/2})})as Camera;

describe('Mapa com níveis de detalhe',()=>{
 it('usa tamanho na tela, mantém transições contínuas e permite visão estratégica em qualquer zoom',()=>{
  expect(visualLod(20,.3)).toEqual(visualLod(10,.6));
  const radii=[3,6,10,17,24,35];const values=radii.map(r=>visualLod(r,1));
  expect(values.map(v=>v.texture)).toEqual([...values.map(v=>v.texture)].sort((a,b)=>a-b));
  expect(visualLod(20,8,'strategic')).toMatchObject({ground:0,texture:0,building:0,icons:1});
  const a=visualLod(20,.5),b=visualLod(20,.501);expect(Math.abs(a.building-b.building)).toBeLessThan(.01);expect(a.building+a.icons).toBe(1);
 });
 it('mantém arte e variações ao recarregar a mesma seed e não altera navegação ou recursos',()=>{
  const map=generateMap(DEFAULT_MAP_CONFIG),copy=structuredClone(map);
  for(const id of [0,500,9000,19000]){const c=map.cells[id];expect(groundStyle(c,map)).toBe(groundStyle(copy.cells[id],copy));expect(landscapeColor(c,map)).toBe(landscapeColor(copy.cells[id],copy));expect(tileVariant(c)).toBeGreaterThanOrEqual(0);expect(tileVariant(c)).toBeLessThan(6);}
  expect(map).toEqual(copy);
 });
 it('não constrói detalhes longe, limita o cache e continua carregando novos locais após percorrer o mapa',()=>{
  canvasEnvironment();const renderer=new TerrainRenderer(),map=generateMap(DEFAULT_MAP_CONFIG);renderer.setMap(map);renderer.update(cameraAt(3000,2000,.06));expect(renderer['chunks'].filter(c=>c.base||c.detail)).toHaveLength(0);
  for(let y=500;y<3600;y+=500)for(let x=500;x<5600;x+=500){for(let frame=0;frame<3;frame++)renderer.update(cameraAt(x,y,4));expect(renderer['chunks'].filter(c=>c.base).length).toBeLessThanOrEqual(48);expect(renderer['chunks'].filter(c=>c.detail).length).toBeLessThanOrEqual(24);}
  const last=renderer['chunks'].filter(c=>c.root.visible);expect(last.some(c=>c.detail)).toBe(true);
  renderer.showResources=false;renderer.setLayers();expect(renderer['resourceOverview']!.visible).toBe(false);expect(renderer['chunks'].filter(c=>c.resources).every(c=>!c.resources!.visible)).toBe(true);
  renderer.visualMode='strategic';renderer.update(cameraAt(5000,3500,4));expect(renderer['chunks'].every(c=>!c.root.visible)).toBe(true);expect(renderer['waves'].visible).toBe(false);renderer.root.destroy({children:true});
 },15000);
});

describe('Representações estratégicas',()=>{
 it('agrupa somente unidades do mesmo dono e tipo e preserva unidades selecionadas',()=>{
  const data=new Float32Array(UNIT_STRIDE*5);for(let i=0;i<5;i++){const k=i*UNIT_STRIDE;data[k]=i+1;data[k+1]=100+i*2;data[k+2]=100;data[k+5]=i===3?2:1;data[k+4]=i===4?1:0;}
  const before=data.slice(),markers=groupUnitMarkers(data,[0,17,34,51,68],new Set([3]),.1);expect(markers).toHaveLength(3);expect(markers.find(m=>m.owner===1&&m.kind===0)?.count).toBe(2);expect(markers.reduce((n,m)=>n+m.count,0)).toBe(4);expect(data).toEqual(before);
 });
 it('substitui sprites por footprints e ícones, conserva hover e repinta uma estrutura capturada',()=>{
  const sim=new Simulation(false);sim.command({type:'GENERATE_MAP',config:DEFAULT_MAP_CONFIG,requestId:0});sim.command({type:'PREPARE_MATCH',playerCount:2,botDifficulty:'off'});sim.command({type:'START_MATCH',spawnId:0,name:'Teste'});
  const state=sim.match!.state,map=sim.map!,building=state.buildings[0],r=new OwnershipRenderer();r['textures'].set('city',Texture.EMPTY);r.setMap(map);r.updateState(state,[]);
  const anchor=map.cells[building.anchorId];r.update(cameraAt(anchor.x,anchor.y,.1));const art=r['buildingArt'].get(building.id)!;expect(art.sprite.visible).toBe(false);expect(art.strategic.visible).toBe(true);expect(art.symbol.visible).toBe(true);
  r.update(cameraAt(anchor.x,anchor.y,4));expect(art.sprite.visible).toBe(true);expect(art.symbol.visible).toBe(false);
  r.highlight(building.cellIds[0]);expect(r['hovered'].context.instructions).toHaveLength(1);
  building.ownerId=2;state.buildingRevision++;r.updateState(state,[]);const fill=art.strategic.context.instructions.find(i=>i.action==='fill')!;expect(typeof fill.data.style!=='number'&&fill.data.style.color).toBe(state.players[1].color);
  r.visualMode='strategic';r.update(cameraAt(anchor.x,anchor.y,4));expect(art.sprite.visible).toBe(false);expect(art.symbol.visible).toBe(true);r.root.destroy({children:true});
 });
});
