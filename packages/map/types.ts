export type TerrainType='land'|'water';
export type ResourceType='food'|'mineral'|'fuel';
export type MapSize='small'|'medium'|'large';
export type Landform='continents'|'pangea'|'archipelago';
export interface MapConfig {seed:string;size:MapSize;landform:Landform;}
export interface HexLayout {columns:number;rows:number;radius:number;originX:number;originY:number;}
export interface TerritoryCell {id:number;q:number;r:number;x:number;y:number;terrain:TerrainType;resource:ResourceType|null;ownerId:number|null;richness:number;neighbors:number[];elevation:number;regionId:number;landmassId:number;variation:number;waterKind?:'river'|'lake'|'sea';continentId?:number;bridgeOwnerId?:number|null;}
export interface GeographicRegion {id:number;landmassId:number;anchorId:number;cells:number[];}
export interface Landmass {id:number;cells:number[];}
export interface ProceduralMap {version:1;navigationRevision?:number;config:MapConfig;layout:HexLayout;cells:TerritoryCell[];regions:GeographicRegion[];landmasses:Landmass[];rivers?:RiverCourse[];lakeCount?:number;stats:{land:number;water:number;food:number;mineral:number;fuel:number;};}
export const DEFAULT_MAP_CONFIG:MapConfig={seed:'WEBRTS-01',size:'small',landform:'continents'};
export function validateMapConfig(value:unknown):MapConfig {if(!value||typeof value!=='object')throw new Error('Configuração de mapa inválida.');const c=value as Partial<MapConfig>;if(typeof c.seed!=='string'||!c.seed.trim()||c.seed.trim().length>64)throw new Error('A seed deve ter entre 1 e 64 caracteres.');if(!['small','medium','large'].includes(c.size??''))throw new Error('Tamanho de mapa inválido.');if(!['continents','pangea','archipelago'].includes(c.landform??''))throw new Error('Formato de mapa inválido.');return {seed:c.seed.trim(),size:c.size as MapSize,landform:c.landform==='archipelago'?'pangea':c.landform as Landform};}

export interface RiverCourse {cells:number[];widths:number[];destinationId:number;}
/** A seed is generated at the UI/worker boundary, never inside deterministic generation. */
export function newMapSeed(){const words=crypto.getRandomValues(new Uint32Array(2));return 'RTS-'+Array.from(words,n=>n.toString(36).toUpperCase()).join('-');}
