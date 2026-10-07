/** Two active lanes, weighted 3:1, prevent background work starving behind player commands. */
export class RouteScheduler {
 private lanes:[Job[],Job[]]=[[],[]];private active:[Job|null,Job|null]=[null,null];private turn=0;processed=0;lastMs=0;
 get pending(){return this.lanes[0].length+this.lanes[1].length+Number(!!this.active[0])+Number(!!this.active[1]);}
 enqueue(task:Generator<void,unknown,unknown>,priority:'human'|'background',valid:()=>boolean,onError:(e:unknown)=>void,onFinish:()=>void=()=>{}){this.lanes[priority==='human'?0:1].push({task,valid,onError,onFinish});}
 step(milliseconds=3,maxSlices=64){const start=performance.now();this.processed=0;while(this.processed<maxSlices&&performance.now()-start<milliseconds){let lane=this.turn++%4===3?1:0;if(!this.active[lane]&&!this.lanes[lane].length)lane=1-lane;const job=this.active[lane]??this.lanes[lane].shift();if(!job)break;this.active[lane]=job;try{if(!job.valid()){job.task.return(undefined);this.active[lane]=null;job.onFinish();}else if(job.task.next().done){this.active[lane]=null;job.onFinish();}}catch(e){this.active[lane]=null;job.onError(e);job.onFinish();}this.processed++;}this.lastMs=performance.now()-start;}
 clear(){for(const lane of [0,1]){this.active[lane]?.task.return(undefined);this.active[lane]?.onFinish();for(const job of this.lanes[lane]){job.task.return(undefined);job.onFinish();}this.active[lane]=null;this.lanes[lane].length=0;}}
}
interface Job{task:Generator<void,unknown,unknown>;valid:()=>boolean;onError:(e:unknown)=>void;onFinish:()=>void;}
