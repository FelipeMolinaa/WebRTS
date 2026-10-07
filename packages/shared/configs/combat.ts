import {UNITS} from './units';
import {TRAINING} from './training';
import type {BuildingType} from './buildings';
export const BUILDING_HP:Record<BuildingType,number>={city:1200,farm:300,mine:400,refinery:350,barracks:700,defense:600,factory:650,bridge:450,port:850,silo:1500};
export const COMBAT={spatialCell:160,candidates:64,repairRadius:50,repairHpPerSecond:8,defenseRange:200,defenseDamage:20,defenseCooldown:1,formationGap:30,maxGroupLag:90};

export const ATTACK_MODE_CONFIG={secureRadius:4};
export const CAPTURE_CONFIG={interval:1,radius:100,defenderRadius:145,citySeconds:18,economicSeconds:8,cityMinimumTroops:3};
export function isMilitaryStructure(type:BuildingType){return type==='defense'||type==='barracks'||type==='silo';}

export const MILITARY_CONFIG={units:UNITS,training:TRAINING,capture:CAPTURE_CONFIG,combat:COMBAT,surrenderStockFraction:.2};
