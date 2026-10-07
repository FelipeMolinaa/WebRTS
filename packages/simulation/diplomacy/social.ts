import {DIPLOMACY_CONFIG as C} from '../../shared/configs/social';
import type {MatchState} from '../territory/types';
export interface SocialMemory {time:number;other:number;kind:string;weight:number;severe:boolean;}
export interface NationalSocial {morale:number;reputation:number;relations:Record<number,number>;threats:Record<number,number>;history:SocialMemory[];lastWar:number;recoveryUntil:number;recentExpansion:number;militaryGrowth:number;}
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
/** Authoritative hidden social state. Never placed in normal MatchState snapshots. */
export class SocialSystem {
 readonly countries=new Map<number,NationalSocial>();private elapsed=0;
 constructor(private match:MatchState){for(const p of match.players)this.countries.set(p.id,{morale:C.initialMorale,reputation:C.initialReputation,relations:Object.fromEntries(match.players.filter(q=>q.id!==p.id).map(q=>[q.id,C.initialRelation])),threats:{},history:[],lastWar:-Infinity,recoveryUntil:0,recentExpansion:0,militaryGrowth:0});}
 get(id:number){return this.countries.get(id)!;}
 remember(id:number,other:number,kind:string,weight:number,severe=false){const s=this.get(id);s.history.push({time:this.match.diplomacy.time,other,kind,weight,severe});if(s.history.length>C.memory.limit)s.history.shift();if(other&&s.relations[other]!==undefined)s.relations[other]=clamp(s.relations[other]+weight);}
 hostilityMemory(id:number,other:number){return this.get(id).history.filter(h=>h.other===other).reduce((v,h)=>v-h.weight*Math.pow(.5,(this.match.diplomacy.time-h.time)/(h.severe?C.memory.severeHalfLife:C.memory.ordinaryHalfLife)),0);}
 war(attacker:number,defender:number){const a=this.get(attacker),d=this.get(defender),low=C.lowReputation;
 const factor=d.reputation>=low.fullPenalty?1:d.reputation>=low.smallPenalty?low.smallPenaltyFactor+(1-low.smallPenaltyFactor)*(d.reputation-low.smallPenalty)/(low.fullPenalty-low.smallPenalty):low.minimumFactor+(low.smallPenaltyFactor-low.minimumFactor)*Math.max(0,d.reputation)/low.smallPenalty;
 a.reputation=clamp(a.reputation-(C.reputation.war+(this.match.diplomacy.time-a.lastWar<C.reputation.repeatWindow?C.reputation.repeatWar:0))*factor);a.lastWar=this.match.diplomacy.time;d.reputation=clamp(d.reputation+C.reputation.defensiveWar);
 this.remember(defender,attacker,'war',C.relation.war,true);this.remember(attacker,defender,'war',C.relation.war,true);
 }
 alliance(a:number,b:number){this.remember(a,b,'alliance',C.relation.alliance);this.remember(b,a,'alliance',C.relation.alliance);}
 betrayal(a:number,b:number){const s=this.get(a);s.reputation=clamp(s.reputation-C.reputation.breakAlliance);this.remember(b,a,'betrayal',C.relation.betrayal,true);}
 help(actor:number,ally:number,defensive:boolean){if(defensive)this.get(actor).reputation=clamp(this.get(actor).reputation+C.reputation.defendAlly);this.remember(ally,actor,'defense',C.relation.help);}
 loss(id:number,weight=1){this.get(id).morale=clamp(this.get(id).morale-C.morale.loss*weight);}
 capture(actor:number,owner:number|null,city=false){const s=this.get(actor);s.recentExpansion++;if(owner===null)return;s.reputation=clamp(s.reputation-C.reputation.aggressiveCapture);if(city){s.morale=clamp(s.morale+C.morale.conquest);this.get(owner).morale=clamp(this.get(owner).morale-C.morale.cityLoss);this.remember(owner,actor,'city_capture',-8,true);}}
 destruction(actor:number,owner:number,city:boolean){this.get(actor).reputation=clamp(this.get(actor).reputation-(city?C.reputation.cityDestruction:C.reputation.economicDestruction));this.remember(owner,actor,city?'city_destruction':'economic_destruction',city?-20:-8,true);}
 peace(ids:number[],recoverySeconds:number){for(const id of ids){this.get(id).recoveryUntil=this.match.diplomacy.time+recoverySeconds;this.remember(id,0,'peace',0);}}
 militarization(id:number,people:number,population:number,militaryPeople:number){const s=this.get(id);s.militaryGrowth+=people;const wars=this.match.diplomacy.wars.filter(w=>w.endedAt===null&&(w.attackerId===id||w.defenderId===id||w.attackerAllies.includes(id)||w.defenderAllies.includes(id)));if(wars.some(w=>w.defenderId===id||w.defenderAllies.includes(id)))return;
 const threat=Math.max(0,...Object.values(s.threats));if(threat>=C.military.threatExemption||s.militaryGrowth<C.military.safeGrowthPerMinute||militaryPeople/Math.max(1,population)<C.military.safePopulationRatio)return;
 s.reputation=clamp(s.reputation-C.reputation.militarization*(wars.length?.25:1)*Math.max(0,1-threat/C.military.threatExemption));
 }
 step(dt:number){this.elapsed+=dt;if(this.elapsed<C.socialInterval)return;const time=this.elapsed;this.elapsed=0;for(const p of this.match.players){if(p.defeated)continue;const s=this.get(p.id),e=this.match.economies.find(e=>e.playerId===p.id)!,wars=this.match.diplomacy.wars.filter(w=>w.endedAt===null&&(w.attackerId===p.id||w.defenderId===p.id||w.attackerAllies.includes(p.id)||w.defenderAllies.includes(p.id))),peace=!wars.length;
 if(peace)s.reputation=clamp(s.reputation+C.reputation.peaceRecoveryPerMinute*time/60*(.25+.75*s.reputation/100));
 const shortage=e.foodSatisfaction<.95||e.stock.food===0&&e.rates.food<0;s.morale=clamp(s.morale+(shortage?-C.morale.shortagePerMinute:wars.some(w=>this.match.diplomacy.time-w.startedAt>C.morale.warFatigueAfter)?-C.morale.prolongedWarPerMinute:C.morale.recoveryPerMinute)*time/60);
 for(const r of this.match.diplomacy.relations.filter(r=>r.a===p.id||r.b===p.id)){const other=r.a===p.id?r.b:r.a;if(r.state==='ALLIED'){s.reputation=clamp(s.reputation+C.reputation.loyaltyPerMinute*time/60);s.relations[other]=clamp(s.relations[other]+C.relation.peacePerMinute*time/60);}else if(r.state==='NEUTRAL')s.relations[other]+=(C.initialRelation-s.relations[other])*.001*time;}
 s.recentExpansion*=Math.pow(.5,time/120);s.militaryGrowth*=Math.pow(.5,time/60);
 }}
}
