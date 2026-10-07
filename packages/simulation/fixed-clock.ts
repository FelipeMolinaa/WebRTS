/** Bounded catch-up prevents a stalled tab from entering an update spiral. */
export class FixedClock {
 private accumulated=0;private last:number;droppedMs=0;
 constructor(public readonly interval:number,private maxCatchUp:number,now:number){this.last=now;}
 advance(now:number,paused:boolean,step:()=>void){const elapsed=Math.max(0,now-this.last);this.last=now;if(paused){this.accumulated=0;this.droppedMs=0;return 0;}this.accumulated+=elapsed;let ticks=0;while(this.accumulated>=this.interval&&ticks<this.maxCatchUp){step();this.accumulated-=this.interval;ticks++;}this.droppedMs=0;if(this.accumulated>=this.interval){this.droppedMs=this.accumulated-(this.accumulated%this.interval);this.accumulated%=this.interval;}return ticks;}
 reset(now:number){this.last=now;this.accumulated=0;this.droppedMs=0;}
}
