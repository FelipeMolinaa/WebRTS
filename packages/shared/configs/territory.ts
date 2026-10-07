const INITIAL_RADIUS=4;
export const TERRITORY_RULES={initialRadius:INITIAL_RADIUS,initialCells:1+3*INITIAL_RADIUS*(INITIAL_RADIUS+1),minPlayers:2,maxPlayers:8,candidateSample:600,expeditionSpeed:180};
export const CITY_FOOTPRINT:ReadonlyArray<readonly[number,number]>=[[0,0],[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
