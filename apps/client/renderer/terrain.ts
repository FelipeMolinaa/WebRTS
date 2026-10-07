import {Container,Graphics,Sprite,Texture} from 'pixi.js';
import type {ProceduralMap,TerritoryCell} from '../../../packages/map/types';
import {terrainColor} from '../../../packages/map/palette';
import {axialIndex,HEX_DIRECTIONS,hexCorners,hexEdge,cellAtWorld} from '../../../packages/map/hex/coordinates';
import {ENGINE} from '../../../packages/shared/configs/engine';
import type {Camera} from '../input/camera';
import {TerrainArt,decorationSample,groundStyle,landscapeColor,tileVariant} from './terrain-art';
import {inView,visualLod,type VisualMode} from './visual-lod';
interface Chunk {cells:TerritoryCell[];root:Container;base:Container|null;detail:Container|null;decor:Graphics|null;regions:Graphics|null;resources:Graphics|null;rich:Container|null;used:number;left:number;top:number;right:number;bottom:number;}
export class TerrainRenderer {
 readonly root=new Container();private chunks:Chunk[]=[];private selection=new Graphics();private waves=new Graphics();private overview:Sprite|null=null;private resourceOverview:Sprite|null=null;private map:ProceduralMap|null=null;private art=new TerrainArt();private frame=0;private waveFrame=-1;private nearColors=new Uint32Array(0);
 showResources=true;showRegions=false;animateWater=true;visualMode:VisualMode='auto';visibleCells=0;lod='Estratégico';
 setMap(map:ProceduralMap){
  this.overview?.texture.destroy(true);this.resourceOverview?.texture.destroy(true);this.overview=this.resourceOverview=null;
  for(const child of this.root.removeChildren())child.destroy({children:true});this.chunks=[];this.map=map;this.waveFrame=-1;
  const {columns,rows,radius}=map.layout;
  for(let row=0;row<rows;row+=16)for(let col=0;col<columns;col+=16){const cells:TerritoryCell[]=[];
   for(let r=row;r<Math.min(rows,row+16);r++)for(let c=col;c<Math.min(columns,col+16);c++)cells.push(map.cells[r*columns+c]);
   const root=new Container();this.root.addChild(root);this.chunks.push({cells,root,base:null,detail:null,decor:null,regions:null,resources:null,rich:null,used:0,left:Math.min(...cells.map(c=>c.x))-radius,top:Math.min(...cells.map(c=>c.y))-radius,right:Math.max(...cells.map(c=>c.x))+radius,bottom:Math.max(...cells.map(c=>c.y))+radius});
  }
  // Two small map textures provide immediate rendering and a cheap far view.
  const cellColors=this.nearColors=Uint32Array.from(map.cells,cell=>landscapeColor(cell,map));
  const canvases=[document.createElement('canvas'),document.createElement('canvas')],images=canvases.map(canvas=>{canvas.width=1200;canvas.height=800;return canvas.getContext('2d')!.createImageData(1200,800);});
  for(let y=0;y<800;y++)for(let x=0;x<1200;x++){
   const cell=cellAtWorld(map,(x+.5)/1200*ENGINE.worldWidth,(y+.5)/800*ENGINE.worldHeight),i=(y*1200+x)*4;
   const colors=[cell?cellColors[cell.id]:0x182b31,cell?cell.resource?terrainColor(cell):cellColors[cell.id]:0x182b31];
   for(let k=0;k<2;k++){const color=colors[k],data=images[k].data;data[i]=color>>16;data[i+1]=(color>>8)&255;data[i+2]=color&255;data[i+3]=255;}
  }
  const sprites=canvases.map((canvas,i)=>{canvas.getContext('2d')!.putImageData(images[i],0,0);const texture=Texture.from(canvas);texture.source.scaleMode='linear';const sprite=new Sprite(texture);sprite.width=ENGINE.worldWidth;sprite.height=ENGINE.worldHeight;this.root.addChildAt(sprite,i);return sprite;});
  [this.overview,this.resourceOverview]=sprites;this.selection=new Graphics();this.waves=new Graphics();this.root.addChild(this.waves,this.selection);this.setLayers();
 }
 private buildBase(c:Chunk){
  const map=this.map!,r=map.layout.radius,base=new Container(),ground=new Graphics(),resources=new Graphics(),regions=new Graphics();
  const groups=new Map<number,TerritoryCell[]>();for(const cell of c.cells){const color=this.nearColors[cell.id];if(!groups.has(color))groups.set(color,[]);groups.get(color)!.push(cell);}
  for(const [color,cells]of groups){ground.beginPath();for(const cell of cells)ground.poly(hexCorners(cell,r+.025));ground.fill(color);}
  for(const type of ['food','mineral','fuel']as const){const cells=c.cells.filter(cell=>cell.resource===type);if(!cells.length)continue;resources.beginPath();for(const cell of cells)resources.poly(hexCorners(cell,r));resources.fill({color:terrainColor(cells[0]),alpha:.55});}
  for(const cell of c.cells)if(cell.terrain==='land')for(let dir=0;dir<6;dir++){const [dq,dr]=HEX_DIRECTIONS[dir],n=axialIndex(cell.q+dq,cell.r+dr,map.layout);if(n>=0&&cell.id<n&&map.cells[n].terrain==='land'&&cell.regionId!==map.cells[n].regionId){const e=hexEdge(cell,r,dir);regions.moveTo(e[0],e[1]).lineTo(e[2],e[3]);}}
  regions.stroke({color:0xc5d9c5,alpha:.55,width:1.3});resources.visible=this.showResources;base.addChild(ground,resources);base.cacheAsTexture({resolution:1,antialias:false});c.root.addChildAt(base,0);c.root.addChild(regions);c.base=base;c.resources=resources;c.regions=regions;
 }
 private buildDetail(c:Chunk){
  const map=this.map!,r=map.layout.radius,detail=new Container(),rich=new Container(),transitions=new Graphics(),decor=new Graphics();
  const tile=(cell:TerritoryCell,style:ReturnType<typeof groundStyle>,target:Container)=>{const sprite=new Sprite(this.art.get(style,tileVariant(cell)));sprite.anchor.set(.5);sprite.position.set(cell.x,cell.y);sprite.width=Math.sqrt(3)*r;sprite.height=r*2;target.addChild(sprite);};
  for(const cell of c.cells){const style=groundStyle(cell,map);tile(cell,cell.resource?'meadow':style,detail);if(cell.resource)tile(cell,style,rich);
   for(let dir=0;dir<6;dir++){
    const [dq,dr]=HEX_DIRECTIONS[dir],id=axialIndex(cell.q+dq,cell.r+dr,map.layout);if(id<0)continue;const neighbor=map.cells[id],e=hexEdge(cell,r,dir),mx=(e[0]+e[2])/2,my=(e[1]+e[3])/2;
    if(cell.terrain==='land'&&neighbor.terrain==='water'){
     // Land-side sand and water-side foam; the logical coastline stays fixed.
     const ix=(cell.x-mx)*.14,iy=(cell.y-my)*.14;
     transitions.poly([e[0],e[1],e[2],e[3],e[2]+ix,e[3]+iy,e[0]+ix,e[1]+iy]).fill({color:neighbor.waterKind==='river'?0x98a078:0xc0b889,alpha:.7});
     const ox=(neighbor.x-mx)*.09,oy=(neighbor.y-my)*.09;
     transitions.poly([e[0],e[1],e[2],e[3],e[2]+ox,e[3]+oy,e[0]+ox,e[1]+oy]).fill({color:0x85b8a7,alpha:.4});
     transitions.moveTo(e[0]+ox*.3,e[1]+oy*.3).quadraticCurveTo(mx+ox*.65,my+oy*.65,e[2]+ox*.3,e[3]+oy*.3).stroke({color:0xd6e4c5,width:r*.035,alpha:.55});
    }else if(cell.terrain===neighbor.terrain&&cell.id<id){
     const color=this.nearColors[neighbor.id];for(const [width,alpha]of [[r*.18,.07],[r*.09,.1]]as const)transitions.moveTo(e[0],e[1]).quadraticCurveTo(mx+(cell.x-mx)*.035,my+(cell.y-my)*.035,e[2],e[3]).stroke({color,width,alpha});
    }
   }
   if(cell.terrain==='land'&&!cell.resource){const sample=decorationSample(cell,map);if(sample.visible){const x=sample.x,y=sample.y,s=r*.15;decor.ellipse(x+s*.2,y+s*.5,s,s*.45).fill({color:0x263f2a,alpha:.22});decor.ellipse(x,y,s,s*.65).fill({color:0x608445,alpha:.9});decor.ellipse(x-s*.25,y-s*.2,s*.65,s*.4).fill({color:0x96ad63,alpha:.65});}}
  }
  detail.addChild(transitions);detail.cacheAsTexture({resolution:1,antialias:true});rich.cacheAsTexture({resolution:1,antialias:true});decor.cacheAsTexture({resolution:1,antialias:true});c.root.addChild(detail,rich,decor);c.detail=detail;c.rich=rich;c.decor=decor;
 }
 private releaseChunk(c:Chunk,kind:'base'|'detail'){if(kind==='base'){c.base?.destroy({children:true});c.regions?.destroy();c.base=null;c.resources=c.regions=null;}else {c.detail?.destroy({children:true});c.rich?.destroy({children:true});c.decor?.destroy();c.detail=c.rich=null;c.decor=null;}}
 setLayers(){if(this.resourceOverview)this.resourceOverview.visible=this.showResources;
  for(const c of this.chunks){if(c.resources&&c.resources.visible!==this.showResources){c.resources.visible=this.showResources;c.base?.updateCacheTexture();}if(c.rich)c.rich.visible=this.showResources;if(c.regions)c.regions.visible=this.showRegions;}
 }
 select(cell:TerritoryCell|null){this.selection.clear();if(cell&&this.map)this.selection.poly(hexCorners(cell,this.map.layout.radius*.97)).fill({color:0xffffff,alpha:.13}).stroke({color:0xf4edc9,width:2.5});}
 update(camera:Camera){
  if(!this.map)return;const view=camera.bounds(),lod=visualLod(this.map.layout.radius,camera.zoom,this.visualMode);this.lod={strategic:'Estratégico',tactical:'Tático',detailed:'Detalhado'}[lod.level];this.frame++;this.visibleCells=0;
  if(this.overview)this.overview.visible=true;if(this.resourceOverview)this.resourceOverview.visible=this.showResources;
  const visible=this.chunks.filter(c=>inView(c,view,this.map!.layout.radius*.2));
  const visibleSet=new Set(visible);for(const c of this.chunks)if(!visibleSet.has(c))c.root.visible=false;
  visible.sort((a,b)=>Math.hypot((a.left+a.right)/2-camera.x,(a.top+a.bottom)/2-camera.y)-Math.hypot((b.left+b.right)/2-camera.x,(b.top+b.bottom)/2-camera.y));
  // Reserve space for newly visible chunks before building; otherwise a full cache
  // would prevent any new terrain from appearing after the first long pan.
  for(const [kind,limit,reserve]of [['base',48,3],['detail',24,2]]as const){if(!(kind==='base'?lod.ground:lod.texture)||!visible.some(c=>!c[kind]))continue;const cached=this.chunks.filter(c=>c[kind]);const stale=cached.filter(c=>!visibleSet.has(c)).sort((a,b)=>a.used-b.used);for(const c of stale.slice(0,Math.max(0,cached.length-limit+reserve)))this.releaseChunk(c,kind);}
  let baseBudget=3,detailBudget=2,baseCount=this.chunks.filter(c=>c.base).length,detailCount=this.chunks.filter(c=>c.detail).length;for(const c of visible){c.root.visible=lod.ground>0;c.used=this.frame;this.visibleCells+=c.cells.length;
   if(lod.ground>0&&!c.base&&baseBudget-->0&&baseCount<48){this.buildBase(c);baseCount++;}
   if(lod.texture>0&&c.base&&!c.detail&&detailBudget-->0&&detailCount<24){this.buildDetail(c);detailCount++;}
   if(c.base)c.base.alpha=lod.ground;
   if(c.detail){c.detail.visible=lod.texture>0;c.detail.alpha=lod.texture;}
   if(c.rich){c.rich.visible=this.showResources&&lod.texture>0;c.rich.alpha=lod.texture;}
   if(c.decor){c.decor.visible=lod.decoration>0;c.decor.alpha=lod.decoration;}
   if(c.regions)c.regions.visible=this.showRegions&&lod.ground>0;
  }
  // Bound cached GPU textures while panning through large maps.
  for(const [kind,limit]of [['base',48],['detail',24]]as const){const cached=this.chunks.filter(c=>c[kind]).sort((a,b)=>a.used-b.used);for(const c of cached.slice(0,Math.max(0,cached.length-limit))){if(c.used===this.frame)continue;this.releaseChunk(c,kind);}}
  this.waves.visible=this.animateWater&&lod.decoration>0;
  const waveFrame=Math.floor(performance.now()/140);if(this.waves.visible&&waveFrame!==this.waveFrame){this.waveFrame=waveFrame;this.waves.clear();let count=0;const r=this.map.layout.radius;
   for(const c of visible)for(const cell of c.cells){if(cell.terrain!=='water'||cell.variation<.78||count>=32)continue;count++;const phase=(waveFrame*.11+cell.variation*8)%(Math.PI*2),x=cell.x,y=cell.y+Math.sin(phase)*r*.12;this.waves.moveTo(x-r*.23,y).quadraticCurveTo(x,y-r*.055,x+r*.23,y).stroke({color:0xb2d9ca,width:r*.027,alpha:(.12+Math.sin(phase)*.06)*lod.decoration});}
  }
 }
}
