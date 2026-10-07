import {hashSeed,randomSequence} from '../../map/generation/random';
export interface CountryDefinition{id:string;name:string;flag:string;color:number;}
// A playable roster, not a geopolitical ranking. All countries use identical rules.
export const COUNTRIES:CountryDefinition[]=[
 {id:'br',name:'Brasil',flag:'🇧🇷',color:0x58c979},
 {id:'us',name:'Estados Unidos',flag:'🇺🇸',color:0x6b9fe8},
 {id:'cn',name:'China',flag:'🇨🇳',color:0xe75a5a},
 {id:'in',name:'Índia',flag:'🇮🇳',color:0xf2a45e},
 {id:'ru',name:'Rússia',flag:'🇷🇺',color:0x979ce6},
 {id:'de',name:'Alemanha',flag:'🇩🇪',color:0xe7bf59},
 {id:'gb',name:'Reino Unido',flag:'🇬🇧',color:0x8395c9},
 {id:'fr',name:'França',flag:'🇫🇷',color:0x6694ba},
 {id:'jp',name:'Japão',flag:'🇯🇵',color:0xf09caa},
 {id:'kr',name:'Coreia do Sul',flag:'🇰🇷',color:0x79d4df},
 {id:'it',name:'Itália',flag:'🇮🇹',color:0x94c67c},
 {id:'ca',name:'Canadá',flag:'🇨🇦',color:0xc66777},
 {id:'au',name:'Austrália',flag:'🇦🇺',color:0x59b9ce},
 {id:'mx',name:'México',flag:'🇲🇽',color:0x4ca99c},
 {id:'id',name:'Indonésia',flag:'🇮🇩',color:0xe89072},
 {id:'tr',name:'Turquia',flag:'🇹🇷',color:0xd780ad},
 {id:'sa',name:'Arábia Saudita',flag:'🇸🇦',color:0xa3c969},
 {id:'za',name:'África do Sul',flag:'🇿🇦',color:0xc4a075},
 {id:'ar',name:'Argentina',flag:'🇦🇷',color:0x9dc8f0},
 {id:'es',name:'Espanha',flag:'🇪🇸',color:0xd8964b},
];
export function countryById(id:string){return COUNTRIES.find(c=>c.id===id);}
export function countryLabel(player:{name:string;countryId?:string}){const country=player.countryId?countryById(player.countryId):undefined;return country?country.flag+' '+player.name:player.name;}
export function spriteCountryTint(color:number,strength=.45){let tint=0;for(const shift of [16,8,0])tint|=Math.round(255*(1-strength)+((color>>shift)&255)*strength)<<shift;return tint;}
export function assignCountries(playerCount:number,humanId:string,botIds:string[]|undefined,seed:string){const human=countryById(humanId);if(!human)throw new Error('Escolha um país válido.');if(botIds!==undefined&&(!Array.isArray(botIds)||botIds.length!==playerCount-1))throw new Error('Escolha um país para cada bot.');const choices=botIds??Array<string>(playerCount-1).fill('random'),used=new Set([humanId]);for(const id of choices){if(id==='random')continue;if(!countryById(id))throw new Error('País do bot inválido.');if(used.has(id))throw new Error('Cada participante deve ter um país diferente.');used.add(id);}const pool=COUNTRIES.filter(c=>!used.has(c.id)),random=randomSequence(hashSeed(seed+':countries:'+humanId));for(let n=pool.length-1;n>0;n--){const j=Math.floor(random()*(n+1));[pool[n],pool[j]]=[pool[j],pool[n]];}return [human,...choices.map(id=>id==='random'?pool.pop()!:countryById(id)!)];}
