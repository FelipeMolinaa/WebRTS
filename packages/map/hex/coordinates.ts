import type { HexLayout,ProceduralMap,TerritoryCell } from '../types';
export const HEX_DIRECTIONS:ReadonlyArray<readonly[number,number]>=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
export function hexToWorld(q:number,r:number,layout:HexLayout){return {x:layout.originX+layout.radius*Math.sqrt(3)*(q+r/2),y:layout.originY+layout.radius*1.5*r};}
export function roundHex(q:number,r:number){let x=Math.round(q),z=Math.round(r),y=Math.round(-q-r);const dx=Math.abs(x-q),dz=Math.abs(z-r),dy=Math.abs(y+q+r);if(dx>dy&&dx>dz)x=-y-z;else if(dz>dy)z=-x-y;else y=-x-z;return {q:x||0,r:z||0};}
export function worldToHex(x:number,y:number,layout:HexLayout){const px=(x-layout.originX)/layout.radius,py=(y-layout.originY)/layout.radius;return roundHex(Math.sqrt(3)/3*px-py/3,2/3*py);}
export function axialIndex(q:number,r:number,layout:HexLayout){const col=q+Math.floor(r/2);return r<0||r>=layout.rows||col<0||col>=layout.columns?-1:r*layout.columns+col;}
export function cellAtWorld(map:ProceduralMap,x:number,y:number):TerritoryCell|null {const h=worldToHex(x,y,map.layout),id=axialIndex(h.q,h.r,map.layout);return id<0?null:map.cells[id];}
export function hexDistance(a:{q:number;r:number},b:{q:number;r:number}){const dq=a.q-b.q,dr=a.r-b.r;return (Math.abs(dq)+Math.abs(dr)+Math.abs(dq+dr))/2;}
export function hexCorners(cell:{x:number;y:number},radius:number){const points:number[]=[];for(let i=0;i<6;i++){const a=(i*60-30)*Math.PI/180;points.push(cell.x+Math.cos(a)*radius,cell.y+Math.sin(a)*radius);}return points;}
/** Direction 0 (east) maps to edge from vertex 0 to 1; subsequent directions go anticlockwise. */
export function hexEdge(cell:{x:number;y:number},radius:number,direction:number){const p=hexCorners(cell,radius),i=(6-direction)%6,j=(i+1)%6;return [p[i*2],p[i*2+1],p[j*2],p[j*2+1]];}
