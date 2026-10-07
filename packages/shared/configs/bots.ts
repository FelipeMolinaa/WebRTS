export type BotDifficulty='off'|'easy'|'normal'|'hard';
export type BotPersonality='aggressive'|'economic'|'diplomatic';
export const BOT_WEIGHTS:Record<BotPersonality,{economy:number;military:number;diplomacy:number}>={aggressive:{economy:.9,military:1.2,diplomacy:.7},economic:{economy:1.2,military:.9,diplomacy:1},diplomatic:{economy:1,military:.9,diplomacy:1.3}};
export const BOT_PERSONALITY_NAMES:Record<BotPersonality,string>={aggressive:'Agressivo',economic:'Econômico',diplomatic:'Diplomático'};
