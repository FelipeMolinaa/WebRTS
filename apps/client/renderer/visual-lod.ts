export type VisualMode='auto'|'strategic';
export type MapLens='countries'|'diplomacy'|'threats';
export interface VisualLod {level:'strategic'|'tactical'|'detailed';ground:number;texture:number;decoration:number;building:number;icons:number;}
const ramp=(value:number,start:number,end:number)=>Math.max(0,Math.min(1,(value-start)/(end-start)));
/** Use screen-space hex radius so all map sizes retain the same legibility. */
export function visualLod(radius:number,zoom:number,mode:VisualMode='auto'):VisualLod {
 const pixels=radius*zoom;
 if(mode==='strategic')return {level:'strategic',ground:0,texture:0,decoration:0,building:0,icons:1};
 const ground=ramp(pixels,4,7),texture=ramp(pixels,8,18),decoration=ramp(pixels,19,29),building=ramp(pixels,7,14);
 return {level:pixels<8?'strategic':pixels<24?'tactical':'detailed',ground,texture,decoration,building,icons:1-building};
}
export function inView(bounds:{left:number;right:number;top:number;bottom:number},view:{left:number;right:number;top:number;bottom:number},padding=0){return bounds.right+padding>=view.left&&bounds.left-padding<=view.right&&bounds.bottom+padding>=view.top&&bounds.top-padding<=view.bottom;}
