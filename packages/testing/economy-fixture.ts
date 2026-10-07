import type {EconomySystem} from '../simulation/economy/economy';
/** Isolate combat/training tests from economy progression. */
export function fundCountry(economy:EconomySystem,playerId=1,population=200){
 const city=economy.buildings.find(b=>b.ownerId===playerId&&b.city)!.city!;
 city.population=population;const c=economy.countries.find(c=>c.playerId===playerId)!;
 c.stock={money:10000,food:10000,mineral:10000,fuel:50};economy.recalculate();c.builders=c.maxBuilders;return c;
}
/** Fixtures that require operational structures explicitly finish their work. */
export function completeConstruction<T extends {construction?:{duration:number}}>(economy:EconomySystem,building:T):T{if(building.construction)economy.stepConstruction(building.construction.duration);return building;}
