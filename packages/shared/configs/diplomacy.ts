export const DIPLOMACY={preparationSeconds:15,responseSeconds:2,truceSeconds:60,eventLimit:80,offerLimit:40};
export const WAR_TERRITORY={interval:1,annexSeconds:20,supplyMax:100,supplyRestore:8,neutralDrain:1,hostileDrain:3,attritionDamage:2};
export type DiplomaticAction='request_alliance'|'break_alliance'|'prepare_war'|'cancel_preparation'|'declare_war'|'request_truce'|'call_ally'|'join_war';
