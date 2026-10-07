import type {TrainingQueue} from '../../shared/configs/training';
import type {BotDifficulty} from '../../shared/configs/bots';
import type {BotView} from '../../ai/types';
import type {VictoryState} from '../../shared/configs/victory';
import type {DiplomacyState,Encirclement} from '../diplomacy/types';
import type {Building,CountryEconomy} from '../economy/types';
export interface SpawnCandidate {id:number;anchorId:number;cellIds:number[];cityCells:number[];food:number;mineral:number;fuel:number;quality:number;}
export interface Player {id:number;name:string;countryId?:string;color:number;human:boolean;spawnId:number;territory:number;defeated:boolean;defeatedAt:number|null;}
export interface InitialCity {id:number;ownerId:number;anchorId:number;cellIds:number[];}
export interface Expedition {playerId:number;x:number;y:number;targetX:number;targetY:number;moving:boolean;status:'idle'|'moving'|'blocked';}
export interface MatchState {operations?:{aircraft:Array<{id:number;autoReturn:boolean;returning:boolean}>;boats:Array<{id:number;portId:number;passengers:number;capacity:number;destination:number|null;status:string;profit?:number}>;missiles:Array<{id:number;ownerId:number;anchorId:number;radius:number;remaining:number}>};phase:'preparation'|'playing'|'finished';preparation?:{active:boolean;remaining:number;selectedAnchor:number|null;reservations:Array<{playerId:number;spawn:SpawnCandidate}>};bots:BotView[];botDifficulty:BotDifficulty;victory:VictoryState;revision:number;playerCount:number;spawns:SpawnCandidate[];players:Player[];cities:InitialCity[];expedition:Expedition|null;landTotal:number;captured:number;buildings:Building[];training:TrainingQueue[];economies:CountryEconomy[];buildingRevision:number;combatOpponents:number[];diplomacy:DiplomacyState;borderRevision:number;siegeRevision:number;encirclements:Encirclement[];skirmish:{x:number;y:number;playerId:number}|null;}
export interface OwnershipChange {cellId:number;ownerId:number|null;}
