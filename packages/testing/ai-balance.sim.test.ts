import {it,expect} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Simulation} from '../simulation/engine';
import {BotSystem} from '../ai/system';
import {DEFAULT_MAP_CONFIG} from '../map/types';
const enabled=!!process.env.WEBRTS_BALANCE;
it.skipIf(!enabled)('runs seeded full bot matches with real costs, combat, capture and victory',async()=>{
 const count=Number(process.env.WEBRTS_BALANCE_COUNT??20),dt=Number(process.env.WEBRTS_BALANCE_DT??.05),results:unknown[]=[],rows:any[]=[];
 const start=Number(process.env.WEBRTS_BALANCE_START??0);for(let seed=start;seed<start+count;seed++){
  const s=new Simulation();s.command({type:'GENERATE_MAP',config:{...DEFAULT_MAP_CONFIG,seed:'utility-v2-'+seed,size:(process.env.WEBRTS_BALANCE_SIZE??'medium')as 'medium'},requestId:0});s.command({type:'PREPARE_MATCH',playerCount:4,botDifficulty:'normal'});s.command({type:'START_MATCH',spawnId:0,name:'Bot 1'});
  s.bots=new BotSystem(s.match!,s.army!,c=>s.command(c,'playerId'in c&&c.playerId===1?'human':'bot'),true);
  for(let time=0;time<2100&&s.match!.state.phase==='playing';time+=dt){s.step(dt);if(Math.round(time/dt)%1000===0)await new Promise(resolve=>setTimeout(resolve,0));}
  const data=s.telemetry!.data,state=s.match!.state;const row={seed,duration:data.finished?data.duration:null,firstWar:data.first.war,firstFactory:data.first.factory,relevantArmy:data.first.relevantArmy,cityCaptures:data.cityCaptures,wars:data.wars.length,remaining:state.players.filter(p=>!p.defeated).length,survivors:Object.fromEntries([600,900,1200].map(time=>[time,data.samples.filter(s=>s.time<=time).at(-1)?.remaining??null])),final:state.players.map(p=>({id:p.id,territory:p.territory,defeated:p.defeated,buildings:state.buildings.filter(b=>b.ownerId===p.id).map(b=>b.type),economy:state.economies[p.id-1],bot:s.bots!.debug().find(b=>b.playerId===p.id)}))};rows.push(row);results.push(data);console.info('BALANCE',JSON.stringify({...row,final:undefined}));
  for(const e of state.economies){expect(e.builders).toBeGreaterThanOrEqual(0);for(const v of Object.values(e.stock))expect(v).toBeGreaterThanOrEqual(0);}
 }
 const done=rows.filter(r=>r.duration!==null),duration=done.map(r=>r.duration).sort((a,b)=>a-b),average=(values:number[])=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null,summary={count,finished:done.length,dt,average:average(duration),median:duration.length?duration[Math.floor(duration.length/2)]:null,shortest:duration[0]??null,longest:duration.at(-1)??null,inTarget:duration.filter(t=>t>=900&&t<=1500).length,under10:duration.filter(t=>t<600).length,over30:duration.filter(t=>t>1800).length+rows.length-done.length,firstWar:average(rows.map(r=>r.firstWar).filter(v=>v!==null)),firstFactory:average(rows.map(r=>r.firstFactory).filter(v=>v!==null)),relevantArmy:average(rows.map(r=>r.relevantArmy).filter(v=>v!==null)),survivors:Object.fromEntries([600,900,1200].map(t=>[t,average(rows.map(r=>r.survivors[t]))]))};
 mkdirSync('reports',{recursive:true});writeFileSync(process.env.WEBRTS_BALANCE_REPORT??'reports/ai-balance.json',JSON.stringify({summary,rows,telemetry:results},null,2));console.info('SUMMARY',JSON.stringify(summary));
},1200000);
