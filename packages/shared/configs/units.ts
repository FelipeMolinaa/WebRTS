import type {ResourceStock} from './buildings';
export type UnitType='infantry'|'tank'|'aircraft'|'transport'|'cargo';
export const UNIT_KIND:UnitType[]=['infantry','tank','aircraft','transport','cargo'];
export const UNIT_TYPES:UnitType[]=['infantry','tank','aircraft'];
export const UNITS:Record<UnitType,{name:string;speed:number;population:number;health:number;attack:number;range:number;cooldown:number;repair:number;cost:Partial<ResourceStock>}>={
 aircraft:{name:'Avião de guerra',speed:170,population:3,health:150,attack:45,range:155,cooldown:1.2,repair:.3,cost:{money:950,mineral:140,fuel:120}},
 transport:{name:'Transporte naval',speed:65,population:0,health:420,attack:0,range:0,cooldown:1,repair:.2,cost:{}},
 cargo:{name:'Barco de carga',speed:50,population:0,health:300,attack:0,range:0,cooldown:1,repair:.2,cost:{}},
 infantry:{name:'Infantaria',speed:55,population:1,health:100,attack:10,range:95,cooldown:1,repair:.1,cost:{money:75,mineral:10}},
 tank:{name:'Tanque',speed:35,population:5,health:500,attack:60,range:150,cooldown:1.5,repair:.4,cost:{money:420,mineral:80,fuel:30}}
};
export const UNIT_LIMIT=5000;
export const UNIT_STRIDE=17; // mode at offset 16; id, x/y, angle, type, owner, moving, destination x/y, HP/maxHP, state, target id (negative=building), group, shot serial, supply
export const UNIT_STATE={idle:0,moving:1,attack:2,retreat:3,recover:4} as const;
export type Formation='line'|'column'|'block';
export const FORMATIONS:Formation[]=['line','column','block'];
export const FORMATION_NAMES:Record<Formation,string>={line:'Linha',column:'Coluna',block:'Bloco'};

export type UnitMode='discovery'|'defense'|'attack';
export const UNIT_MODES={discovery:1,defense:2,attack:3} as const;
