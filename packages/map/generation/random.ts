export function hashSeed(seed:string){let h=2166136261;for(let i=0;i<seed.length;i++)h=Math.imul(h^seed.charCodeAt(i),16777619);return h>>>0;}
export function randomSequence(seed:number){let state=seed;return ()=>{let t=state+=0x6d2b79f5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export function hashPoint(x:number,y:number,seed:number){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^seed;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
const smooth=(t:number)=>t*t*(3-2*t);
export function noise(x:number,y:number,seed:number){const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);const a=hashPoint(ix,iy,seed),b=hashPoint(ix+1,iy,seed),c=hashPoint(ix,iy+1,seed),d=hashPoint(ix+1,iy+1,seed);return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;}
export function fractalNoise(x:number,y:number,seed:number){return noise(x,y,seed)*.6+noise(x*2,y*2,seed^17351)*.28+noise(x*4,y*4,seed^982451653)*.12;}
