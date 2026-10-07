import {it,expect} from 'vitest';
import {generateMap} from '../map/generation/generate';
import {generateLandforms} from '../map/generation/landforms';
import {hashSeed} from '../map/generation/random';
import {DEFAULT_MAP_CONFIG} from '../map/types';
import {findSpawns} from '../simulation/territory/spawns';

it('varies continental sizes and outlines across seeds while retaining eight usable starting areas',()=>{
 const compactness:number[]=[],counts=new Set<number>(),largestShares:number[]=[];
 for(let n=0;n<32;n++){
  const seed='natural-coasts-'+n,map=generateMap({...DEFAULT_MAP_CONFIG,seed}),mask=map.cells.map(c=>({...c}));
  expect(findSpawns(map,8)).toHaveLength(8);
  generateLandforms(mask,map.layout,'continents',hashSeed(seed));
  const masses=new Map<number,number[]>();for(const c of mask)if(c.terrain==='land'){const group=masses.get(c.continentId!)??[];group.push(c.id);masses.set(c.continentId!,group);}
  const groups=[...masses.values()].sort((a,b)=>b.length-a.length),major=groups.filter(g=>g.length>=map.cells.length*.025);
  expect(major.length).toBeGreaterThanOrEqual(2);counts.add(major.length);
  const main=groups[0],boundaryEdges=main.reduce((sum,id)=>sum+mask[id].neighbors.filter(n=>mask[n].terrain==='water').length,0);
  compactness.push(4*Math.PI*(3*Math.sqrt(3)/2)*main.length/(boundaryEdges*boundaryEdges));
  largestShares.push(main.length/groups.reduce((sum,g)=>sum+g.length,0));
 }
 // Concave coasts should not regress to compact oval masks or equal-size slots.
 expect(compactness.reduce((sum,n)=>sum+n,0)/compactness.length).toBeLessThan(.4);
 expect(counts.size).toBeGreaterThan(1);expect(Math.max(...largestShares)-Math.min(...largestShares)).toBeGreaterThan(.2);
},20000);
