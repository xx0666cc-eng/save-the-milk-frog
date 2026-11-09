/* Timed campaign encounters. Rendering and combat remain in their existing modules. */
(function(root){
'use strict';
const config=typeof module!=='undefined'?require('./arena-config.js'):root.ArenaConfig;
const regions=[
 {id:'court-1',name:'球场平原 · 区域 1 / 3',triggerX:-14,cameraX:-14,interval:4,
  types:['dozer','bucket','puff'],batchSize:2,total:8,maxAlive:8},
 {id:'court-2',name:'球场平原 · 区域 2 / 3',triggerX:0,cameraX:0,interval:4,
  types:['dozer','bucket','puff'],batchSize:3,total:12,maxAlive:12},
 {id:'court-3',name:'球场平原 · 区域 3 / 3',triggerX:14,cameraX:14,interval:4,
  types:['dozer','bucket','puff'],batchSize:3,total:12,maxAlive:12,
  boss:{type:'doze-chief',after:12,afterClear:true,entranceDelay:.72}}
];
class Director{
 constructor(configs=regions){
  this.regions=configs.map(config=>{
   const lastBatch=config.total%config.batchSize||config.batchSize;
   const boss=config.boss?{...config.boss,after:config.boss.after??config.total-Math.floor(lastBatch/2),elapsed:0,triggered:false,entered:false}:null;
   return {...config,boss,types:[...config.types],state:'waiting',spawned:0,elapsed:0,pending:0};
  });
  this.active=null;this.halfWidth=config.cameraHalfWidth(16/9,true);
 }
 get cleared(){return this.regions.every(r=>r.state==='cleared');}
 restoreCheckpoint(afterRegion){
  const index=this.regions.findIndex(region=>region.id===afterRegion);
  if(index<0)return null;
  for(const region of this.regions.slice(0,index+1)){
   region.state='cleared';region.spawned=region.total;
   if(region.boss){region.boss.triggered=true;region.boss.entered=true;}
  }
  return this.regions[index];
 }
 bounds(game){
  const r=this.active;if(!r)return null;
  const half=Math.max(1,this.halfWidth-config.camera.lockInset);
  const center=config.clampCameraX(r.cameraX,this.halfWidth),edge=config.world.halfWidth;
  return {left:Math.max(-edge,center-half),right:Math.min(edge,center+half)};
 }
 constrain(game){
  const bounds=this.bounds(game);if(!bounds)return;
  for(const body of [game.fighters[0],...game.monsters.filter(m=>m.hp>0)]){
   body.x=Math.max(bounds.left,Math.min(bounds.right,body.x));
  }
 }
 spawnPoint(game,r,forBoss=false){
  const {left,right}=this.bounds(game),player=game.fighters[0];
  const inset=forBoss?Math.min(.55,(right-left)*.15):0;
  // All campaign Bosses, including future types, enter from the right edge.
  // If that edge is occupied, wait; never fall back to the left.
  const edges=forBoss?[right-inset]:[left,right];
  if(!forBoss&&r.spawned%2!==0)edges.reverse();
  const lanes=forBoss?[0,-1.6,1.6,-3.15,3.15]:[-2.5,0,2.5,-1.25,1.25];
  for(const x of edges){
   for(let i=0;i<lanes.length;i++){
    const z=lanes[(i+r.spawned)%lanes.length];
    if(Math.hypot(x-player.x,z-player.z)<3)continue;
    if(game.monsters.some(m=>m.hp>0&&Math.hypot(x-m.x,z-m.z)<(forBoss||m.isBoss?1.9:1.4)))continue;
    return {x,z};
   }
  }
  return null; // Wait for a safe edge position instead of spawning onto a body.
 }
 updateBoss(game,r,dt){
  const boss=r.boss;
  if(!boss||boss.entered||r.spawned<boss.after)return;
  if(boss.afterClear&&game.monsters.some(m=>m.hp>0&&!m.isBoss&&!m.summonedBy))return;
  if(!boss.triggered){
   boss.triggered=true;
   game.emit('bossApproach',{typeId:boss.type});
  }
  boss.elapsed=Math.min(boss.entranceDelay,boss.elapsed+dt);
  if(boss.elapsed+1e-9>=boss.entranceDelay){
   const point=this.spawnPoint(game,r,true);
   if(point){
    const enemy=game.spawnMonster(boss.type,point.x,point.z);
    enemy.alerted=true;enemy.face=Math.sign(game.fighters[0].x-enemy.x)||1;
    enemy.attackCooldown=.55;
    boss.entered=true;boss.elapsed=0;
    game.emit('bossEnter',{id:enemy.id,typeId:boss.type});
   }
  }
 }
 tick(game,dt){
  const player=game.fighters[0];
  if(!this.active){
   const next=this.regions.find(r=>r.state==='waiting');
   if(!next||player.x<next.triggerX)return;
   this.active=next;next.state='active';game.emit('regionStart',{name:next.name,interval:next.interval,maxAlive:next.maxAlive});
  }
  const r=this.active;
  this.constrain(game);
  // The existing entrance runs alongside the reinforcement clock, never stopping it.
  this.updateBoss(game,r,dt);
  if(r.spawned>=r.total){
   if((!r.boss||r.boss.entered)&&!game.monsters.some(m=>m.hp>0)){
    r.state='cleared';this.active=null;game.emit('regionClear',{regionId:r.id,complete:this.cleared});
   }
   return;
  }
  let alive=game.monsters.filter(m=>m.hp>0&&!m.isBoss&&!m.summonedBy).length;
  if(alive>=r.maxAlive)return; // Freeze the clock at capacity; never bank extra batches.
  if(!r.pending){
   r.elapsed=Math.min(r.interval,r.elapsed+dt);
   if(r.elapsed+1e-9<r.interval)return;
   r.pending=Math.min(r.batchSize,r.total-r.spawned);
  }
  while(r.pending&&alive<r.maxAlive){
   const point=this.spawnPoint(game,r);if(!point)break;
   const enemy=game.spawnMonster(r.types[r.spawned%r.types.length],point.x,point.z);
   enemy.alerted=true;enemy.face=Math.sign(player.x-enemy.x)||1;
   r.spawned++;r.pending--;alive++;
   if(r.boss&&r.spawned===r.boss.after)this.updateBoss(game,r,0);
  }
  if(!r.pending)r.elapsed=0;
 }
}
const forestRegions=[
 {id:'forest-1',name:'林间猎场 · 区域 1 / 3',triggerX:-15,cameraX:-15,interval:3.5,
  types:['bucket','puff','dozer'],batchSize:3,total:12,maxAlive:12},
 {id:'forest-2',name:'林间猎场 · 区域 2 / 3',triggerX:-1,cameraX:-1,interval:3.5,
  types:['puff','dozer','bucket','puff'],batchSize:3,total:15,maxAlive:15},
 {id:'forest-3',name:'林间猎场 · 区域 3 / 3',triggerX:13,cameraX:13,interval:3,
  types:['dozer','bucket','puff','bucket'],batchSize:3,total:15,maxAlive:15,
  boss:{type:'thunder-beast',after:15,afterClear:true,entranceDelay:.95}}
];
const towerRegions=[
 {id:'tower-1',name:'星月塔 · 区域 1 / 3',triggerX:-16,cameraX:-16,interval:3,
  types:['dozer','puff','bucket'],batchSize:4,total:16,maxAlive:16},
 {id:'tower-2',name:'星月塔 · 区域 2 / 3',triggerX:-2,cameraX:-2,interval:3,
  types:['bucket','dozer','puff','puff'],batchSize:3,total:18,maxAlive:18},
 {id:'tower-3',name:'星月塔 · 区域 3 / 3',triggerX:12,cameraX:12,interval:2.75,
  types:['puff','bucket','dozer','bucket'],batchSize:4,total:20,maxAlive:20,
  boss:{type:'morris',after:20,afterClear:true,entranceDelay:1.05}}
];
const plazaRegions=[
 {id:'plaza-1',name:'晨曦广场 · 区域 1 / 3',triggerX:-16,cameraX:-16,interval:3.5,
  types:['dozer','bucket','puff','frog-agent'],batchSize:4,total:16,maxAlive:8},
 {id:'plaza-2',name:'晨曦广场 · 区域 2 / 3',triggerX:-2,cameraX:-2,interval:3.25,
  types:['puff','dozer','bucket','frog-agent'],batchSize:4,total:16,maxAlive:8},
 {id:'plaza-3',name:'晨曦广场 · 区域 3 / 3',triggerX:12,cameraX:12,interval:3,
  types:['bucket','puff','dozer','frog-agent'],batchSize:4,total:16,maxAlive:12,
  boss:{type:'obama-frog',after:16,afterClear:true,entranceDelay:1.05}}
];
const sakuraRegions=[
 {id:'sakura-1',name:'金纹樱庭 · 区域 1 / 3',triggerX:-16,cameraX:-16,interval:3,
  types:['dozer','bucket','puff'],batchSize:4,total:16,maxAlive:10},
 {id:'sakura-2',name:'金纹樱庭 · 区域 2 / 3',triggerX:-2,cameraX:-2,interval:2.75,
  types:['bucket','puff','dozer'],batchSize:3,total:18,maxAlive:12},
 {id:'sakura-3',name:'金纹樱庭 · 区域 3 / 3',triggerX:12,cameraX:12,interval:2.75,
  types:['puff','bucket','dozer','bucket'],batchSize:4,total:20,maxAlive:12,
  boss:{type:'sakura-ronin',after:20,afterClear:true,entranceDelay:1.05}}
];
const requiemRegions=[
 {id:'requiem-1',name:'万籁归寂 · 区域 1 / 3',triggerX:-16,cameraX:-16,interval:3,
  types:['dozer','bucket','puff'],batchSize:4,total:16,maxAlive:10},
 {id:'requiem-2',name:'万籁归寂 · 区域 2 / 3',triggerX:-2,cameraX:-2,interval:2.75,
  types:['bucket','puff','dozer'],batchSize:3,total:18,maxAlive:12},
 {id:'requiem-3',name:'万籁归寂 · 区域 3 / 3',triggerX:12,cameraX:12,interval:2.75,
  types:['puff','bucket','dozer','bucket'],batchSize:4,total:20,maxAlive:12,
  boss:{type:'bell-master',after:20,afterClear:true,entranceDelay:1.2}}
];
const levels={
 1:{name:'球场平原',stage:'campaign-1',startX:-22,regions,enemyScale:{hp:1,damage:1}},
 2:{name:'林间猎场',stage:'campaign-2',startX:-22,regions:forestRegions,enemyScale:{hp:1.15,damage:1.10}},
 3:{name:'星月塔',stage:'campaign-3',startX:-22,regions:towerRegions,enemyScale:{hp:1.30,damage:1.20}},
 4:{name:'金纹樱庭',stage:'campaign-4',startX:-22,regions:sakuraRegions,enemyScale:{hp:1.45,damage:1.30}},
 5:{name:'晨曦广场',stage:'campaign-5',startX:-22,regions:plazaRegions,enemyScale:{hp:1.45,damage:1.30}},
 6:{name:'万籁归寂',stage:'campaign-6',final:true,startX:-22,regions:requiemRegions,enemyScale:{hp:1.60,damage:1.40}}
};
const api={regions,levels,Director};
if(typeof module!=='undefined')module.exports=api;else root.Encounters=api;
})(typeof window!=='undefined'?window:globalThis);
