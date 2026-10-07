import {axialIndex,HEX_DIRECTIONS} from './hex/coordinates';
import type {ProceduralMap,TerritoryCell} from './types';
export const BRIDGE_RULES={maxSegments:6,materialStep:.5,timeStep:.25};
export function isWalkable(cell:TerritoryCell){return cell.terrain==='land'||cell.bridgeOwnerId!=null;}
/** Retained for one-cell crossings and emergency troop relocation. */
export function bridgeBanks(map:ProceduralMap,anchorId:number):[number,number]|null{
 const c=map.cells[anchorId];if(!c||c.terrain!=='water')return null;
 for(let d=0;d<3;d++){const a=HEX_DIRECTIONS[d],b=HEX_DIRECTIONS[d+3],x=axialIndex(c.q+a[0],c.r+a[1],map.layout),y=axialIndex(c.q+b[0],c.r+b[1],map.layout);if(x>=0&&y>=0&&map.cells[x].terrain==='land'&&map.cells[y].terrain==='land')return [x,y];}
 return null;
}
export interface BridgeSupport {valid:boolean;reason:string;distance:number;costMultiplier:number;timeMultiplier:number;}
/** Only completed friendly bridges can extend a chain rooted on conquered land. */
export function bridgeSupport(map:ProceduralMap,anchorId:number,playerId:number,allied:(a:number,b:number)=>boolean=(a,b)=>a===b):BridgeSupport{
 const fail=(reason:string):BridgeSupport=>({valid:false,reason,distance:0,costMultiplier:1,timeMultiplier:1});
 const c=map.cells[anchorId];if(!c||c.terrain!=='water')return fail('A ponte precisa ficar sobre água.');
 const friendly=(owner:number|null|undefined)=>owner!=null&&(owner===playerId||allied(playerId,owner));
 const banks=c.neighbors.map(id=>map.cells[id]).filter(n=>n.terrain==='land');
 if(banks.some(n=>n.ownerId!==null&&!friendly(n.ownerId)))return fail('A margem descoberta precisa pertencer ao seu país ou a países aliados.');
 const queue=[{id:anchorId,distance:0}],seen=new Set([anchorId]);let distance=-1;
 for(let h=0;h<queue.length;h++){
  const node=queue[h],cell=map.cells[node.id];
  if(cell.neighbors.some(n=>map.cells[n].terrain==='land'&&map.cells[n].ownerId===playerId)){distance=node.distance;break;}
  if(node.distance>=BRIDGE_RULES.maxSegments-1)continue;
  for(const n of cell.neighbors)if(!seen.has(n)&&map.cells[n].terrain==='water'&&friendly(map.cells[n].bridgeOwnerId)){seen.add(n);queue.push({id:n,distance:node.distance+1});}
 }
 if(distance<0)return fail('Inicie em uma margem conquistada ou prolongue uma ponte concluída ligada a ela (até '+BRIDGE_RULES.maxSegments+' segmentos).');
 const unsupported=banks.length?0:distance;
 return {valid:true,reason:'Posição válida.',distance,costMultiplier:1+unsupported*BRIDGE_RULES.materialStep,timeMultiplier:1+unsupported*BRIDGE_RULES.timeStep};
}
