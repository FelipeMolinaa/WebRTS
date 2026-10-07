import type {BuildingType} from '../../../packages/shared/configs/buildings';
import type {Building} from '../../../packages/simulation/economy/types';

export type BuildingArtKey=BuildingType|'silo-loaded';
/** Shared by the map and the construction catalog so previews match placed art. */
export const BUILDING_ASSETS:Record<BuildingArtKey,string>={
 city:'/assets/structures-color/city.png',
 barracks:'/assets/structures-color/barracks.png',
 factory:'/assets/structures-color/factory.png',
 farm:'/assets/structures-color/farm.png',
 mine:'/assets/structures-color/mine.png',
 refinery:'/assets/structures-color/refinery.png',
 defense:'/assets/structures-color/defense.png',
 bridge:'/assets/structures-color/bridge.png',
 port:'/assets/structures-color/port.png',
 silo:'/assets/structures-color/silo.png',
 'silo-loaded':'/assets/structures-color/silo-loaded.png',
};

export function buildingArtKey(building:Pick<Building,'type'|'missile'|'construction'>):BuildingArtKey{
 return building.type==='silo'&&!building.construction&&building.missile&&building.missile.elapsed>=building.missile.duration?'silo-loaded':building.type;
}
