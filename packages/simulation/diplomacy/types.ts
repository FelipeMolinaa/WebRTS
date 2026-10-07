export type RelationState='NEUTRAL'|'ALLIED'|'TENSION'|'WAR'|'TRUCE';
export interface Relation{a:number;b:number;state:RelationState;preparedBy:number|null;readyAt:number;truceUntil:number;}
export interface War{id:number;attackerId:number;defenderId:number;attackerAllies:number[];defenderAllies:number[];startedAt:number;endedAt:number|null;exercise:boolean;}
export interface DiplomaticOffer{id:number;kind:'alliance'|'truce'|'support';from:number;to:number;warId:number|null;replyAt:number;status:'pending'|'accepted'|'rejected';}
export interface DiplomaticEvent{id:number;time:number;message:string;}
export interface DiplomacyState{time:number;relations:Relation[];wars:War[];offers:DiplomaticOffer[];events:DiplomaticEvent[];revision:number;}
export interface Encirclement{id:string;ownerId:number;claimantId:number;cellIds:number[];state:'ENCIRCLED';remaining:number;blocked:'troops'|'structures'|null;}
