import {fundCountry} from './economy-fixture';
import {describe,it,expect} from 'vitest';
import {Simulation} from '../simulation/engine';
import {DEFAULT_MAP_CONFIG} from '../map/types';
import {UNIT_STATE} from '../shared/configs/units';
import type {BotDifficulty} from '../shared/configs/bots';

function setup(difficulty:BotDifficulty='off'){
 const sim=new Simulation();sim.command({type:'GENERATE_MAP',config:{...DEFAULT_MAP_CONFIG,size:'small'},requestId:0});for(const c of sim.map!.cells)c.terrain='land';sim.command({type:'PREPARE_MATCH',playerCount:4,botDifficulty:difficulty});sim.command({type:'START_MATCH',spawnId:0,name:'Human'});return sim;
}
describe('Perseguição de alvo explícito',()=>{
 it('segue um alvo em movimento, prioriza o alvo clicado e ataca somente dentro do alcance',()=>{
  const s=setup(),a=s.army!,center=s.map!.cells[s.match!.state.cities[0].anchorId],own=a.spawn(1,'infantry',center),enemy=a.spawn(2,'tank',{x:center.x+300,y:center.y}),near=a.spawn(2,'tank',{x:center.x+60,y:center.y}),i=a.index(own),j=a.index(enemy),k=a.index(near);
  a.cooldown[j]=1e6;a.cooldown[k]=1e6;s.match!.diplomacy!.testWar(1,2);s.command({type:'ATTACK_UNIT',playerId:1,unitIds:[own],targetId:enemy});
  for(let n=0;n<20;n++)s.step();expect(a.x[i]).toBeGreaterThan(center.x+40);expect(a.hp[j]).toBe(500);expect(a.hp[k]).toBe(500);
  a.x[j]+=120;for(let n=0;n<180;n++)s.step();expect(a.hp[j]).toBeLessThan(500);expect(a.hp[k]).toBe(500);expect(a.target[i]).toBe(enemy-1);expect(a.pursuitTarget(i)).toBe(j);
 });
 it('retoma a perseguição quando o alvo sai do alcance e encerra ao morrer ou terminar a guerra',()=>{
  const s=setup(),a=s.army!,center=s.map!.cells[s.match!.state.cities[0].anchorId],own=a.spawn(1,'tank',center),enemy=a.spawn(2,'tank',{x:center.x+100,y:center.y}),i=a.index(own),j=a.index(enemy);s.match!.diplomacy!.testWar(1,2);a.attack(1,[own],enemy);s.step();expect(a.state[i]).toBe(UNIT_STATE.attack);a.x[j]+=220;for(let n=0;n<20;n++)s.step();expect(a.state[i]).toBe(UNIT_STATE.moving);expect(a.x[i]).toBeGreaterThan(center.x);
  a.remove(j);s.step();expect(a.pursuitTarget(i)).toBe(-1);expect(a.state[i]).toBe(UNIT_STATE.idle);
  const next=a.spawn(2,'tank',{x:center.x+300,y:center.y});a.attack(1,[own],next);const r=s.match!.diplomacy!.relation(1,2)!;r.state='NEUTRAL';for(const w of s.match!.diplomacy!.state.wars)w.endedAt=0;s.match!.diplomacy!.state.revision++;s.step();expect(a.pursuitTarget(i)).toBe(-1);expect(a.state[i]).toBe(UNIT_STATE.idle);
 });
 it('rejeita alvos neutros e tropas de outros jogadores sem perder a ordem anterior; parar e mover cancelam perseguição',()=>{
  const s=setup(),a=s.army!,center=s.map!.cells[s.match!.state.cities[0].anchorId],own=a.spawn(1,'tank',center),enemy=a.spawn(2,'tank',{x:center.x+300,y:center.y}),i=a.index(own);a.move(1,[own],{x:center.x+80,y:center.y});const before=a.snapshot();expect(()=>a.attack(1,[own],enemy)).toThrow(/guerra/);expect(a.snapshot()).toEqual(before);s.match!.diplomacy!.testWar(1,2);expect(()=>a.attack(1,[enemy],own)).toThrow();a.attack(1,[own],enemy);a.stop(1,[own]);expect(a.pursuitTarget(i)).toBe(-1);a.attack(1,[own],enemy);a.move(1,[own],center);expect(a.pursuitTarget(i)).toBe(-1);
 });
 it('limita o recálculo de rotas por tick sem abandonar as demais tropas da seleção',()=>{const s=setup(),a=s.army!,center=s.map!.cells[s.match!.state.cities[0].anchorId],ids=Array.from({length:30},()=>a.spawn(1,'infantry',center)),enemy=a.spawn(2,'tank',{x:center.x+400,y:center.y});s.match!.diplomacy!.testWar(1,2);a.attack(1,ids,enemy);a.x[a.index(enemy)]+=30;const start=a.navigation.searches;for(let n=0;n<10;n++){const before=a.navigation.searches;a.step(n===0?.5:.05);expect(a.navigation.searches-before).toBeLessThanOrEqual(8);}expect(a.navigation.searches-start).toBeGreaterThan(0);expect(a.navigation.searches-start).toBeLessThan(30);for(const id of ids){const i=a.index(id);expect(a.pursuitTarget(i)).toBe(a.index(enemy));expect(a['paths'].get(i)?.points.at(-1)?.x).toBe(a.x[a.index(enemy)]);}});
});
function constrained(s:Simulation){const m=s.match!,a=s.army!,c=m.economy!.countries[1];for(const cell of s.map!.cells)if(cell.ownerId===null)m.captureCellInWar(1,cell.id);const funded=fundCountry(m.economy!,2,4000);funded.stock.money=100000;for(const id of m.owned.get(2)!)if(!m.economy!.occupied[id])m.build(2,'defense',id,0);const home=s.map!.cells[m.state.cities.find(c=>c.ownerId===2)!.anchorId];for(let n=0;n<18;n++)a.spawn(2,'infantry',home);}
describe('Bots com guerra motivada por necessidade',()=>{
 for(const difficulty of ['easy','normal','hard']as const)it('mantém paz com espaço neutro acessível: '+difficulty,()=>{const s=setup(difficulty);for(let n=0;n<360*20;n++)s.step();expect(s.match!.state.diplomacy.wars).toHaveLength(0);expect(s.match!.state.diplomacy.relations.some(r=>r.state==='TENSION')).toBe(false);});
 it('prepara guerra quando está sem espaço e respeita o timer antes da declaração',()=>{const s=setup('hard');constrained(s);s.bots!.step(181);const d=s.match!.diplomacy!,r=d.state.relations.find(r=>r.preparedBy===2)!;expect(r).toBeDefined();expect(r.state).toBe('TENSION');d.step(40);s.bots!.step(40);expect(d.state.wars).toHaveLength(0);d.step(12);s.bots!.step(12);expect(d.state.wars.some(w=>w.attackerId===2)).toBe(true);});
 it('evita guerra ofensiva sem comida ou reservas, mesmo quando não há expansão neutra',()=>{const s=setup('hard');constrained(s);s.match!.economy!.countries[1].stock.food=0;s.bots!.step(181);expect(s.match!.diplomacy!.state.relations.some(r=>r.preparedBy===2)).toBe(false);expect(s.match!.state.diplomacy.wars).toHaveLength(0);});
 it('cancela uma preparação se perder capacidade de sustentar a guerra',()=>{const s=setup('hard');constrained(s);s.bots!.step(181);const m=s.match!,d=m.diplomacy!,r=d.state.relations.find(r=>r.preparedBy===2)!;expect(r).toBeDefined();const border=[...m.owned.get(2)!].flatMap(id=>s.map!.cells[id].neighbors).find(id=>s.map!.cells[id].ownerId===1&&!m.economy!.occupied[id])!;s.map!.cells[border].ownerId=null;m.owned.get(1)!.delete(border);m.state.players[0].territory--;m.state.captured--;m.state.borderRevision++;m.economy!.countries[1].stock.food=0;d.step(15);s.bots!.step(15);expect(r.state).toBe('NEUTRAL');expect(d.state.wars).toHaveLength(0);});
});
