export const VICTORY={territoryFraction:.55,holdSeconds:90,minHoldSeconds:1,maxHoldSeconds:300};
export interface VictoryState {time:number;leaderId:number|null;percent:number;heldSeconds:number;requiredSeconds:number;winnerId:number|null;finishedAt:number|null;reason:'territory'|'cities'|null;}
export function createVictory(requiredSeconds=VICTORY.holdSeconds):VictoryState{return {time:0,leaderId:null,percent:0,heldSeconds:0,requiredSeconds,winnerId:null,finishedAt:null,reason:null};}
