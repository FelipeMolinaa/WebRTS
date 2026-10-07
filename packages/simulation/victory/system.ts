import {VICTORY} from '../../shared/configs/victory';
import type {MatchState} from '../territory/types';
export class VictorySystem {
 constructor(private state:MatchState){}
 step(dt:number){const s=this.state,v=s.victory;if(s.phase!=='playing'||v.winnerId!==null)return;v.time+=dt;const active=s.players.filter(p=>!p.defeated);if(active.length<=1){v.winnerId=active[0]?.id??null;v.leaderId=v.winnerId;v.percent=active[0]&&s.landTotal>0?active[0].territory/s.landTotal*100:0;v.finishedAt=v.time;v.reason='cities';s.phase='finished';if(s.expedition)s.expedition.moving=false;s.revision++;return;}const leader=active.reduce((a,b)=>b.territory>a.territory?b:a,active[0]),fraction=leader&&s.landTotal>0?leader.territory/s.landTotal:0;v.percent=fraction*100;if(fraction+1e-10<VICTORY.territoryFraction){v.leaderId=null;v.heldSeconds=0;return;}if(v.leaderId!==leader.id){v.leaderId=leader.id;v.heldSeconds=0;}v.heldSeconds+=dt;if(v.heldSeconds+1e-7>=v.requiredSeconds){v.heldSeconds=v.requiredSeconds;v.winnerId=leader.id;v.finishedAt=v.time;v.reason='territory';s.phase='finished';if(s.expedition)s.expedition.moving=false;s.revision++;}}
}
