import type {ResourceStock} from './buildings';
export const NAVAL={capacity:50,arrivalRadius:55,quietSeconds:5,maxWaitSeconds:20,landingSeconds:6,friendlyLandingSeconds:2,commercialTurnaround:8,profitPerWorldUnit:.12,minProfit:40,maxProfit:650};
export const AIR={baseRadius:180,drainPerSecond:.45,restorePerSecond:8,attritionPerSecond:4,returnThreshold:15};
export type MissileType='tactical'|'strategic';
export const MISSILES:Record<MissileType,{name:string;radius:number;seconds:number;flightSeconds:number;damage:number;cost:Partial<ResourceStock>}>= {
 tactical:{name:'MT-3 · Míssil Tático',radius:3,seconds:90,flightSeconds:10,damage:1100,cost:{money:3500,mineral:900,fuel:600}},
 strategic:{name:'ME-8 · Míssil Estratégico',radius:8,seconds:180,flightSeconds:15,damage:2400,cost:{money:15000,mineral:4500,fuel:3000}}
};
