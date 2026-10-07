// Node subsystem measurements exclude rendering, command-time routing and whole-match costs.
// Run: node scripts/priority1-profile.mjs [baseline-checkout]
import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const current=process.cwd(),directory=mkdtempSync(join(tmpdir(),'webrts-priority1-'));
const versions=process.argv[2]?[['before',resolve(process.argv[2])],['after',current]]:[['after',current]];
try{
for(const [label,root] of versions){
const out=join(directory,label+'.mjs');await build({entryPoints:[root+'/packages/simulation/engine.ts'],bundle:true,platform:'node',format:'esm',outfile:out});const {Simulation}=await import(pathToFileURL(out).href);
for(const size of ['small','medium','large'])for(const count of [500,1000,2000,5000])for(const scenario of ['idle','combat','moving','exploring']){
const s=new Simulation(false);s.command({type:'GENERATE_MAP',config:{seed:'RTS-001',size,landform:'continents'},requestId:0});for(const c of s.map.cells)c.terrain='land';s.command({type:'PREPARE_MATCH',playerCount:2,botDifficulty:'off'});s.command({type:'START_MATCH',spawnId:0,name:'Profile'});
const a=s.army;
if(scenario==='combat')s.match.diplomacy.testWar(1,2);
for(let n=0;n<count;n++)a.spawn(scenario==='combat'?1+n%2:1,'tank',{x:1000+(n%100)*35,y:500+Math.floor(n/100)*50});
if(scenario==='moving'){// Precomputed individual paths isolate movement from command-time routing.
for(let i=0;i<a.size;i++)a.paths.set(i,{points:[{x:a.x[i]+500,y:a.y[i]}],index:0,speed:50,retreat:false});
}
if(scenario==='exploring')a.setMode(1,Array.from(a.ids.slice(0,count)),'discovery');
const values=[];for(let n=0;n<60;n++){const t=performance.now();if(scenario==='combat')s.combat.step(.005);else a.step(.05);if(n>=10)values.push(performance.now()-t);}values.sort((a,b)=>a-b);console.log(JSON.stringify({label,size,count,scenario,medianMs:+values[25].toFixed(3),p95Ms:+values[47].toFixed(3),live:a.count}));
}
}
}finally{rmSync(directory,{recursive:true,force:true});}
