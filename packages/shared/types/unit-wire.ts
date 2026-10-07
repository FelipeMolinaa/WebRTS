import {UNIT_STRIDE,UNITS,UNIT_KIND,UNIT_STATE} from '../configs/units';
/** Fast fields: ID, position, angle, destination, health, state, target, shots, supply. */
export const UNIT_WIRE_FIELDS=[0,1,2,3,7,8,9,11,12,14,15] as const;
export const UNIT_WIRE_STRIDE=UNIT_WIRE_FIELDS.length;
/** Slow deltas: ID, type, country, group, mode. IDs disappear through the next live snapshot. */
export class UnitWireEncoder {
 private metadata=new Map<number,number[]>();private seen=new Set<number>();
 encode(full:Float32Array,output:Float32Array){const delta:number[]=[];this.seen.clear();let row=0;for(let k=0;k<full.length;k+=UNIT_STRIDE){const id=full[k];this.seen.add(id);const old=this.metadata.get(id);if(!old||old[0]!==full[k+4]||old[1]!==full[k+5]||old[2]!==full[k+13]||old[3]!==full[k+16]){const meta=[full[k+4],full[k+5],full[k+13],full[k+16]];this.metadata.set(id,meta);delta.push(id,...meta);}for(let n=0;n<UNIT_WIRE_STRIDE;n++)output[row*UNIT_WIRE_STRIDE+n]=full[k+UNIT_WIRE_FIELDS[n]];row++;}for(const id of this.metadata.keys())if(!this.seen.has(id))this.metadata.delete(id);return delta;}
}
export class UnitWireDecoder {
 private metadata=new Map<number,number[]>();private full=new Float32Array(0);private seen=new Set<number>();
 reset(){this.metadata.clear();this.full=new Float32Array(0);}
 decode(compact:Float32Array,delta:ArrayLike<number>){if(compact.length%UNIT_WIRE_STRIDE||delta.length%5)throw new Error('Invalid troop snapshot.');for(let k=0;k<delta.length;k+=5)this.metadata.set(delta[k],[delta[k+1],delta[k+2],delta[k+3],delta[k+4]]);const count=compact.length/UNIT_WIRE_STRIDE;if(this.full.length!==count*UNIT_STRIDE)this.full=new Float32Array(count*UNIT_STRIDE);this.seen.clear();for(let row=0;row<count;row++){const k=row*UNIT_STRIDE,id=compact[row*UNIT_WIRE_STRIDE],meta=this.metadata.get(id);if(!meta)throw new Error('Missing troop metadata.');this.seen.add(id);for(let n=0;n<UNIT_WIRE_STRIDE;n++)this.full[k+UNIT_WIRE_FIELDS[n]]=compact[row*UNIT_WIRE_STRIDE+n];this.full[k+4]=meta[0];this.full[k+5]=meta[1];this.full[k+13]=meta[2];this.full[k+16]=meta[3];this.full[k+10]=UNITS[UNIT_KIND[meta[0]]].health;this.full[k+6]=Number(this.full[k+11]===UNIT_STATE.moving||this.full[k+11]===UNIT_STATE.retreat);}for(const id of this.metadata.keys())if(!this.seen.has(id))this.metadata.delete(id);return this.full;}
}
