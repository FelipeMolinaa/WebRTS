import {BRIDGE_RULES,bridgeSupport,isWalkable} from '../map/bridges';
import type {ProceduralMap} from '../map/types';
import {BUILDINGS,CONSTRUCTION,RESOURCE_KEYS,type ResourceStock} from '../shared/configs/buildings';
import {constructionCost} from '../simulation/economy/rules';
export interface CrossingPlan {cells:number[];destination:number;cost:Partial<ResourceStock>;builders:number;seconds:number;}
export function crossingBudget(map:ProceduralMap,path:number[],destination:number,owner:number,allied:(a:number,b:number)=>boolean):CrossingPlan|null{
 const saved=path.map(id=>map.cells[id].bridgeOwnerId),cost:Partial<ResourceStock>={};let count=0,seconds=0;
 try{
  for(const id of path){if(map.cells[id].bridgeOwnerId!=null)continue;const support=bridgeSupport(map,id,owner,allied);if(!support.valid)return null;
   const materials=constructionCost(undefined,'bridge',support.costMultiplier);for(const key of RESOURCE_KEYS)cost[key]=(cost[key]??0)+(materials[key]??0);
   seconds+=CONSTRUCTION.bridge.seconds*support.timeMultiplier;count++;map.cells[id].bridgeOwnerId=owner;
  }
  return {cells:path,destination,cost,seconds,builders:count?BUILDINGS.bridge.builders*(1+CONSTRUCTION.bridge.loss*(count-1)):0};
 }finally{path.forEach((id,i)=>map.cells[id].bridgeOwnerId=saved[i]);}
}
/** Bounded local search: avoid bridges where a short dry-land detour already exists. */
export function planCrossing(map:ProceduralMap,owned:ReadonlySet<number>,occupied:Int32Array,owner:number,allied:(a:number,b:number)=>boolean,known:ReadonlyMap<number,number|null>,cursor=0):CrossingPlan|null{
 const cells=map.cells,shores=[...owned].filter(id=>cells[id].neighbors.some(n=>cells[n].terrain==='water'));
 if(!shores.length)return null;let best:CrossingPlan|null=null,bestScore=-Infinity;
 const friendly=(id:number)=>{const o=known.has(id)?known.get(id):cells[id].ownerId;return o==null||o===owner||allied(owner,o);};
 for(let s=0;s<Math.min(8,shores.length);s++){
  const shore=shores[(s+cursor)%shores.length];
  const nearby=new Set([shore]),dry=[{id:shore,depth:0}];
  for(let h=0;h<dry.length&&h<450;h++){const node=dry[h];if(node.depth>=BRIDGE_RULES.maxSegments*2)continue;for(const n of cells[node.id].neighbors)if(!nearby.has(n)&&isWalkable(cells[n])&&friendly(n)){nearby.add(n);dry.push({id:n,depth:node.depth+1});}}
  const queue=cells[shore].neighbors.filter(n=>cells[n].terrain==='water'&&(!occupied[n]||cells[n].bridgeOwnerId!=null)).map(id=>({id,path:[id]})),seen=new Set(queue.map(n=>n.id));
  for(let h=0;h<queue.length&&h<100;h++){
   const node=queue[h];
   for(const n of cells[node.id].neighbors){const c=cells[n];
    if(c.terrain==='land'){
     if(c.ownerId===owner||!friendly(n)||nearby.has(n))continue;
     const plan=crossingBudget(map,node.path,n,owner,allied);if(!plan||!plan.builders)continue;
     const score=80-node.path.length*12+(c.resource?18:0)+(c.ownerId===null?15:0)-(plan.cost.money??0)/200;
     if(score>bestScore){bestScore=score;best=plan;}
    }else if(node.path.length<BRIDGE_RULES.maxSegments&&!seen.has(n)&&(!occupied[n]||c.bridgeOwnerId!=null)){
     if(c.bridgeOwnerId!=null&&c.bridgeOwnerId!==owner&&!allied(owner,c.bridgeOwnerId))continue;
     seen.add(n);queue.push({id:n,path:[...node.path,n]});
    }
   }
  }
 }
 return best;
}
