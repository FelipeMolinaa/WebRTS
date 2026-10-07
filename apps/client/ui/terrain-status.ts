import type {TerritoryCell} from '../../../packages/map/types';
export function terrainSuitability(cell:TerritoryCell){
 if(cell.bridgeOwnerId!=null)return {title:'Ponte',detail:'Travessia terrestre sobre a água'};
 if(cell.waterKind==='river')return {title:'Rio',detail:'Construa uma ponte para atravessar'};
 if(cell.waterKind==='lake')return {title:'Lago',detail:'Água interior · pontes por segmentos e navegação'};
 if(cell.terrain==='water')return {title:'Água',detail:'Não permite construções terrestres'};
 if(cell.resource==='food')return {title:'Bom para Fazendas',detail:'Solo fértil · produção de comida +100%'};
 if(cell.resource==='mineral')return {title:'Bom para Minas',detail:'Depósito mineral · produção de minério +100%'};
 if(cell.resource==='fuel')return {title:'Bom para Refinarias',detail:'Reserva de combustível · produção de combustível +100%'};
 return {title:'Solo comum',detail:'Construções terrestres · sem bônus de produção'};
}
