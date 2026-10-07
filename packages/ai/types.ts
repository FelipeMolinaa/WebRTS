import type {BotPersonality} from '../shared/configs/bots';
export interface BotView {playerId:number;personality:BotPersonality;action:string;goal:string;army:number;utility:number;decisions:number;lastDecision:number;}
