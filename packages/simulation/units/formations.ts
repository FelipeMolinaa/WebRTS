import type {Formation} from '../../shared/configs/units';
import {COMBAT} from '../../shared/configs/combat';
import type {Point} from '../navigation/grid';
/** Stable slots in local axes: x lateral, y forward. Rotation stays independent of strategic hexes. */
export function formationSlots(count:number,formation:Formation,angle:number,gap=COMBAT.formationGap):Point[]{const rows=formation==='line'?1:formation==='column'?count:Math.ceil(count/Math.ceil(Math.sqrt(count))),columns=formation==='line'?count:formation==='column'?1:Math.ceil(Math.sqrt(count)),points:Point[]=[];
 for(let i=0;i<count;i++){const row=Math.floor(i/columns),col=i%columns,inRow=Math.min(columns,count-row*columns),lateral=(col-(inRow-1)/2)*gap,forward=((rows-1)/2-row)*gap;points.push({x:Math.cos(angle)*forward-Math.sin(angle)*lateral,y:Math.sin(angle)*forward+Math.cos(angle)*lateral});}return points;}
