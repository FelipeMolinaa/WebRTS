import {Rectangle,Texture} from 'pixi.js';
import type {ProceduralMap,TerritoryCell} from '../../../packages/map/types';
import {hashPoint,hashSeed,noise,randomSequence} from '../../../packages/map/generation/random';
export type GroundStyle='meadow'|'scrub'|'fertile'|'rock'|'oil'|'sea'|'river';
export const GROUND_STYLES:GroundStyle[]=['meadow','scrub','fertile','rock','oil','sea','river'];
export const TILE_VARIANTS=6;
const W=112,H=128;
export function groundStyle(cell:TerritoryCell,map:ProceduralMap):GroundStyle {
 if(cell.terrain==='water')return cell.waterKind==='river'?'river':'sea';
 if(cell.resource==='food')return 'fertile';
 if(cell.resource==='mineral')return 'rock';
 if(cell.resource==='fuel')return 'oil';
 return noise(cell.x/260,cell.y/260,hashSeed(map.config.seed)^2917)>.57?'scrub':'meadow';
}
/** Neighboring cells share broad color variation instead of independent random tints. */
export function landscapeColor(cell:TerritoryCell,map:ProceduralMap):number {
 const n=noise(cell.x/240,cell.y/240,hashSeed(map.config.seed)^1931);
 const mix=(a:number,b:number,t:number)=>{let value=0;for(const shift of [16,8,0])value|=Math.round(((a>>shift)&255)*(1-t)+((b>>shift)&255)*t)<<shift;return value;};
 if(cell.terrain==='water')return cell.waterKind==='river'?mix(0x346c70,0x447f7c,n):mix(0x224b60,0x326d7e,Math.max(0,Math.min(1,cell.elevation*1.25+n*.15)));
 return mix(0x506f47,0x749057,n);
}
export function tileVariant(cell:TerritoryCell){return Math.min(TILE_VARIANTS-1,Math.floor(cell.variation*TILE_VARIANTS));}

/** Shared transparent artwork, generated once. No images or objects per map cell. */
export class TerrainArt {
 private atlas:Texture|null=null;private tiles=new Map<string,Texture>();
 get(style:GroundStyle,variant:number){if(!this.atlas)this.create();return this.tiles.get(style+':'+variant)!;}
 destroy(){for(const tile of this.tiles.values())tile.destroy(false);this.tiles.clear();this.atlas?.destroy(true);this.atlas=null;}
 private create(){
  const canvas=document.createElement('canvas');canvas.width=W*TILE_VARIANTS;canvas.height=H*GROUND_STYLES.length;const ctx=canvas.getContext('2d')!;
  for(let row=0;row<GROUND_STYLES.length;row++)for(let variant=0;variant<TILE_VARIANTS;variant++){
   ctx.save();ctx.translate(variant*W,row*H);paintTile(ctx,GROUND_STYLES[row],variant);ctx.restore();
  }
  this.atlas=Texture.from(canvas);this.atlas.source.scaleMode='linear';
  for(let row=0;row<GROUND_STYLES.length;row++)for(let variant=0;variant<TILE_VARIANTS;variant++)this.tiles.set(GROUND_STYLES[row]+':'+variant,new Texture({source:this.atlas.source,frame:new Rectangle(variant*W,row*H,W,H)}));
 }
}
export function paintTile(ctx:CanvasRenderingContext2D,style:GroundStyle,variant:number){
 const rnd=randomSequence(7491+variant*331+GROUND_STYLES.indexOf(style)*1271),water=style==='sea'||style==='river';
 // Everything stays inside a shared pointy-top hex; edges remain transparent.
 ctx.beginPath();ctx.moveTo(56,2);ctx.lineTo(110,33);ctx.lineTo(110,95);ctx.lineTo(56,126);ctx.lineTo(2,95);ctx.lineTo(2,33);ctx.closePath();ctx.clip();
 const ellipse=(x:number,y:number,rx:number,ry:number,color:string)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
 if(water){
  for(let i=0;i<6;i++){const x=12+rnd()*88,y=12+rnd()*104;ellipse(x,y,14+rnd()*20,3+rnd()*7,'rgba(13,42,57,.08)');}
  ctx.lineCap='round';for(let i=0;i<11;i++){const x=10+rnd()*85,y=12+rnd()*104;ctx.strokeStyle=i%3?'rgba(158,218,215,.2)':'rgba(204,237,216,.28)';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+6,y-2,x+11+rnd()*8,y);ctx.stroke();}return;
 }
 for(let i=0;i<8;i++)ellipse(rnd()*W,rnd()*H,9+rnd()*18,5+rnd()*13,style==='scrub'?'rgba(166,145,92,.18)':'rgba(27,57,25,.1)');
 for(let i=0;i<60;i++){const x=rnd()*W,y=rnd()*H;ellipse(x,y,.5+rnd()*1.2,.5+rnd()*.7,i%2?'rgba(222,224,142,.16)':'rgba(28,55,30,.15)');}
 if(style==='rock'){
  for(let i=0;i<13;i++){const x=15+rnd()*80,y=17+rnd()*94,s=3+rnd()*8;ellipse(x+2,y+3,s,s*.55,'rgba(24,37,28,.24)');ctx.fillStyle=['#879787','#a1ad97','#718275'][i%3];ctx.beginPath();ctx.moveTo(x-s,y);ctx.lineTo(x-s*.3,y-s*.75);ctx.lineTo(x+s*.7,y-s*.4);ctx.lineTo(x+s,y+s*.3);ctx.lineTo(x-s*.2,y+s*.6);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(218,222,189,.6)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-s,y);ctx.lineTo(x-s*.3,y-s*.75);ctx.lineTo(x+s*.7,y-s*.4);ctx.stroke();}
 }else {
  for(let i=0;i<(style==='fertile'?22:style==='scrub'?9:16);i++){
   const x=9+rnd()*94,y=14+rnd()*102,s=2+rnd()*2;ctx.strokeStyle=style==='scrub'?'rgba(177,181,117,.7)':'rgba(171,194,103,.7)';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(x-s,y-s);ctx.lineTo(x,y+1);ctx.lineTo(x+s,y-s*1.3);ctx.moveTo(x,y+1);ctx.lineTo(x+.3,y-s*2);ctx.stroke();
  }
  for(let i=0;i<(style==='fertile'?4:2);i++){const x=18+rnd()*74,y=23+rnd()*84;ellipse(x+2,y+3,6,3,'rgba(27,44,26,.18)');ellipse(x,y,5,3,style==='scrub'?'rgba(146,154,90,.7)':'rgba(72,110,47,.75)');ellipse(x-1,y-1,3,2,'rgba(157,180,88,.6)');}
  if(style==='oil')for(let i=0;i<3;i++)ellipse(20+rnd()*72,25+rnd()*78,4+rnd()*8,2+rnd()*4,'rgba(48,51,40,.36)');
 }
}

export function decorationSample(cell:TerritoryCell,map:ProceduralMap){const seed=hashSeed(map.config.seed);return {x:cell.x+(hashPoint(cell.q,cell.r,seed^191)-.5)*map.layout.radius,y:cell.y+(hashPoint(cell.q,cell.r,seed^297)-.5)*map.layout.radius,visible:hashPoint(cell.q,cell.r,seed^71)>.76};}
