import type {FieldRenderer} from '../renderer/field';
import type {MapControls} from './map-controls';
import type {Minimap} from './minimap';
import type {MapLens,VisualMode} from '../renderer/visual-lod';
import {icon} from './icons';
interface VisualPreferences {mode:VisualMode;resources:boolean;regions:boolean;water:boolean;lens:MapLens;}
export class VisualControls {
 private preferences:VisualPreferences={mode:'auto',resources:true,regions:false,water:!matchMedia('(prefers-reduced-motion: reduce)').matches,lens:'countries'};
 private settings:HTMLButtonElement;
 constructor(private field:FieldRenderer,private map:MapControls,private minimap:Minimap){
  try{const stored=JSON.parse(localStorage.getItem('webrts.visual.v1')??'null');if(stored){if(['auto','strategic'].includes(stored.mode))this.preferences.mode=stored.mode;if(['countries','diplomacy','threats'].includes(stored.lens))this.preferences.lens=stored.lens;for(const key of ['resources','regions','water']as const)if(typeof stored[key]==='boolean')this.preferences[key]=stored[key];}}catch{/* Storage is optional. */}
  const settings=document.createElement('button');settings.id='map-visual-button';settings.type='button';settings.title='Configurações do mapa e camadas (V alterna visão estratégica)';settings.setAttribute('aria-label','Configurações do mapa e camadas');settings.setAttribute('aria-haspopup','dialog');settings.setAttribute('aria-controls','map-visual-dialog');settings.innerHTML=icon('settings');
  const canvas=document.getElementById('minimap')!,surface=document.createElement('div');surface.className='minimap-map-surface';canvas.before(surface);surface.append(canvas,settings);this.settings=settings;
  const dialog=document.createElement('dialog');dialog.id='map-visual-dialog';dialog.setAttribute('aria-labelledby','map-visual-title');dialog.innerHTML=`<div class="dialog-title"><h2 id="map-visual-title">Visual do mapa</h2><button aria-label="Fechar">×</button></div>
   <label class="visual-field">Representação<select id="visual-mode"><option value="auto">Automática pelo zoom</option><option value="strategic">Sempre estratégica</option></select></label>
   <p class="visual-note">Aproxime para ver texturas e sprites. Afaste para ver cores e símbolos. V alterna a visão estratégica.</p>
   <label class="visual-field">Camada do mapa<select id="visual-lens"><option value="countries">Países</option><option value="diplomacy">Diplomacia</option><option value="threats">Alcance das torres</option></select></label>
   <div id="lens-legend" class="lens-legend" hidden><span><i style="background:#75b9cd"></i>Você</span><span><i style="background:#8ebd79"></i>Aliado</span><span><i style="background:#dd7668"></i>Guerra</span><span><i style="background:#dfb66a"></i>Preparação</span><span><i style="background:#969789"></i>Outros</span></div>
   <label class="visual-check"><input id="visual-resources" type="checkbox"> Destacar jazidas de recursos</label><label class="visual-check"><input id="visual-regions" type="checkbox"> Limites geográficos das regiões</label><label class="visual-check"><input id="visual-water" type="checkbox"> Reflexos animados na água</label>`;
  document.getElementById('game')!.append(dialog);dialog.querySelector('button')!.onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});settings.onclick=()=>dialog.showModal();
  const mode=dialog.querySelector<HTMLSelectElement>('#visual-mode')!,lens=dialog.querySelector<HTMLSelectElement>('#visual-lens')!;
  mode.value=this.preferences.mode;lens.value=this.preferences.lens;mode.onchange=()=>{this.preferences.mode=mode.value as VisualMode;this.apply();};lens.onchange=()=>{this.preferences.lens=lens.value as MapLens;this.apply();};
  for(const key of ['resources','regions','water']as const){const input=dialog.querySelector<HTMLInputElement>('#visual-'+key)!;input.checked=this.preferences[key];input.onchange=()=>{this.preferences[key]=input.checked;this.apply(key==='resources');};}
  window.addEventListener('keydown',e=>{if(e.key.toLowerCase()!=='v'||e.repeat||e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]')||e.target instanceof HTMLElement&&['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;e.preventDefault();this.preferences.mode=this.preferences.mode==='auto'?'strategic':'auto';mode.value=this.preferences.mode;this.apply();});
  this.apply();
 }
 private apply(refreshMinimap=false){const p=this.preferences;this.field.terrain.visualMode=this.field.ownership.visualMode=p.mode;this.field.military.forceStrategic=p.mode==='strategic';this.field.terrain.showResources=p.resources;this.field.terrain.showRegions=p.regions;this.field.terrain.animateWater=p.water;this.field.terrain.setLayers();this.field.ownership.setLens(p.lens);document.getElementById('lens-legend')!.hidden=p.lens==='countries';if(refreshMinimap&&this.map.map)this.minimap.setMap(this.map.map,p.resources);try{localStorage.setItem('webrts.visual.v1',JSON.stringify(p));}catch{/* Private browsing can disable persistence. */}}
 update(){const label=this.field.terrain.lod+(this.preferences.lens==='diplomacy'?' · Diplomacia':this.preferences.lens==='threats'?' · Torres':''),title='Configurações do mapa · '+label+' (V alterna visão estratégica)';if(this.settings.title!==title)this.settings.title=title;}
}
