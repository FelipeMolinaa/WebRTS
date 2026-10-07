import {CITY_FOOTPRINT} from './territory';
import {ECONOMY_CONFIG} from './economy';
export type BuildingType='city'|'farm'|'mine'|'refinery'|'barracks'|'defense'|'factory'|'bridge'|'port'|'silo';
export type StockResource='money'|'food'|'mineral'|'fuel';
export type ResourceStock=Record<StockResource,number>;
export interface BuildingDefinition {name:string;footprint:ReadonlyArray<readonly[number,number]>;cost:Partial<ResourceStock>;builders:number;production:Partial<ResourceStock>;consumption?:Partial<ResourceStock>;foodConsumption:number;housing:number;growth:number;bonusResource:'food'|'mineral'|'fuel'|null;description:string;}
export const RESOURCE_NAMES:Record<StockResource,string>={money:'dinheiro',food:'comida',mineral:'minério',fuel:'combustível'};
export const RESOURCE_KEYS:StockResource[]=['money','food','mineral','fuel'];
export const ECONOMY_RULES=ECONOMY_CONFIG;
const balance=ECONOMY_CONFIG.buildings;
export const BUILDINGS:Record<BuildingType,BuildingDefinition>={
 port:{name:'Porto',footprint:[[0,0]],cost:{money:700,mineral:180,fuel:60},builders:25,production:{},foodConsumption:0,housing:0,growth:0,bonusResource:null,description:'Construa em terra junto ao mar ou rio. Embarca até 50 soldados, 10 tanques ou carga mista. Barcos podem ser controlados; comércio com outros países gera receita por viagem completa.'},
 silo:{name:'Silo de mísseis',footprint:[[0,0]],cost:{money:12000,mineral:3000,fuel:1800},builders:55,production:{},foodConsumption:0,housing:0,growth:0,bonusResource:null,description:'Produz e armazena um MT-3 tático ou ME-8 estratégico. Um silo por país; selecione novamente para lançar. Explosões atingem aliados e não conquistam território.'},
 city:{name:'Cidade',footprint:CITY_FOOTPRINT,...balance.city,production:{money:ECONOMY_CONFIG.production.cityMoney},foodConsumption:0,housing:ECONOMY_CONFIG.cityCapacity,growth:ECONOMY_CONFIG.cityGrowth,bonusResource:null,description:'Gera dinheiro e população. Cada cidade possui sua própria capacidade habitacional.'},
 factory:{name:'Fábrica',footprint:[[0,0],[1,0],[0,1],[1,1]],...balance.factory,production:{money:ECONOMY_CONFIG.factory.moneyProduction},consumption:ECONOMY_CONFIG.factory.consumption,foodConsumption:0,housing:0,growth:0,bonusResource:null,description:'Consome comida, minério e combustível para gerar dinheiro. A produção diminui ou para quando faltam insumos.'},
 farm:{name:'Fazenda',footprint:[[0,0],[1,0],[0,1],[1,1]],...balance.farm,production:{food:ECONOMY_CONFIG.production.farmFood},foodConsumption:0,housing:0,growth:0,bonusResource:'food',description:'Produz comida. Cada hexágono fértil acrescenta 25% à produção, até +100%.'},
 mine:{name:'Mina',footprint:[[0,0],[1,0],[0,1]],...balance.mine,production:{mineral:ECONOMY_CONFIG.production.mineMineral},foodConsumption:ECONOMY_CONFIG.mineFoodConsumption,housing:0,growth:0,bonusResource:'mineral',description:'Produz minério em qualquer solo e consome uma pequena quantidade de comida. Cada hexágono mineral acrescenta 33,33% à produção, até +100%.'},
 refinery:{name:'Refinaria',footprint:[[0,0]],...balance.refinery,production:{fuel:ECONOMY_CONFIG.production.refineryFuel},foodConsumption:ECONOMY_CONFIG.refineryFoodConsumption,housing:0,growth:0,bonusResource:'fuel',description:'Produz combustível e consome comida. Reserva de combustível dobra a produção.'},
 barracks:{name:'Quartel',footprint:[[0,0],[1,0],[2,0]],...balance.barracks,production:{},foodConsumption:0,housing:0,growth:0,bonusResource:null,description:'Recruta infantaria e tanques e recupera unidades feridas.'},
 bridge:{name:'Ponte',footprint:[[0,0]],cost:{money:400,mineral:120},builders:12,production:{},foodConsumption:0,housing:0,growth:0,bonusResource:null,description:'Construa segmentos sobre rios, lagos e estreitos a partir de terra conquistada ou de uma ponte concluída. Limite de 6 segmentos desde a origem; sem margem próxima, cada extensão soma 50% de materiais e 25% de tempo. Pode alcançar terra ainda não conquistada ou aliada.'},
 defense:{name:'Defesa',footprint:[[0,0]],...balance.defense,production:{},foodConsumption:0,housing:0,growth:0,bonusResource:null,description:'Ataca automaticamente inimigos em alcance.'},
};
export const BUILDING_TYPES:BuildingType[]=['city','barracks','factory','port','farm','mine','refinery','defense','bridge','silo'];

export const CONSTRUCTION:Record<BuildingType,{seconds:number;loss:number}>={port:{seconds:28,loss:.30},silo:{seconds:90,loss:.35},city:{seconds:30,loss:.35},factory:{seconds:24,loss:.35},farm:{seconds:10,loss:.25},mine:{seconds:14,loss:.30},refinery:{seconds:18,loss:.30},barracks:{seconds:20,loss:.30},defense:{seconds:8,loss:.25},bridge:{seconds:24,loss:.25}};
