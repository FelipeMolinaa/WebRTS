// Run with node scripts/profile.mjs. Node measurements exclude browser rendering.
import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const directory=mkdtempSync(join(tmpdir(),'webrts-profile-'));
try{
 const entry=JSON.stringify(resolve('packages/simulation/engine.ts'));
 await build({stdin:{contents:`import {Simulation} from ${entry};export {Simulation};`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:join(directory,'simulation.mjs')});
 const {Simulation}=await import(pathToFileURL(join(directory,'simulation.mjs')).href);
 for(const count of [1000,5000]){const s=new Simulation(false);s.command({type:'GENERATE_MAP',config:{seed:'WEBRTS-01',size:'small',landform:'continents'},requestId:0});s.command({type:'PREPARE_MATCH',playerCount:2});s.command({type:'START_MATCH',spawnId:s.match.state.spawns[0].id,name:'Perfil'});const center=s.match.map.cells[s.match.state.cities[0].anchorId];for(let n=0;n<count;n++)s.army.spawn(n%2+1,'infantry',center);s.match.diplomacy.testWar(1,2);for(let n=0;n<20;n++)s.combat.step(.01);const values=[];for(let n=0;n<300;n++){const start=performance.now();s.combat.step(.001);values.push(performance.now()-start);}values.sort((a,b)=>a-b);console.log(JSON.stringify({units:count,combatMedianMs:values[150],combatP95Ms:values[285]}));}
}finally{rmSync(directory,{recursive:true,force:true});}
