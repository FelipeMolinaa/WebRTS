import type {UnitType} from './units';
export const TRAINING={slots:4,maxBatch:{infantry:10,tank:1,aircraft:1,transport:0,cargo:0},seconds:{infantry:9,tank:24,aircraft:40,transport:0,cargo:0}} as const;
export interface TrainingBatch {id:number;unitType:UnitType;total:number;remaining:number;elapsed:number;duration:number;populationSources?:{cityId:number;population:number}[];}
export interface TrainingQueue {buildingId:number;playerId:number;batches:TrainingBatch[];}
export interface ArmyRoute {groupId:number;unitIds:number[];points:{x:number;y:number}[];}
