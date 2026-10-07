import type {TerritoryCell} from './types';
const colors={land:[0x435e43,0x476346,0x496549,0x4c694a,0x4e6c4b,0x526f4e],water:[0x244a59,0x254d5d,0x285361,0x2a5765],food:[0x587e44,0x5d8449,0x638b4b,0x69914d],mineral:[0x6a7770,0x707e77,0x77847c,0x7c8981],fuel:[0x25362c,0x293a2d,0x2c3d31,0x304235]};
export function terrainColor(cell:TerritoryCell,showResources=true){const palette=cell.terrain==='water'?colors.water:showResources&&cell.resource?colors[cell.resource]:colors.land;return palette[Math.min(palette.length-1,Math.floor(cell.variation*palette.length))];}
