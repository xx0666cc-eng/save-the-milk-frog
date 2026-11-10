/* Final chapter: reference casts share their ground geometry and game clock with VFX. */
(function(root){
'use strict';
const {bodyScale,world}=typeof module!=='undefined'?require('./arena-config.js'):root.ArenaConfig;
const type='bell-master';
const profile={
 name:'终焉之主.无相',boss:true,hp:360,height:7.25,speed:2.65,guardMax:160,
 frames:{idle:{image:'assets/monsters/bell-master/hover.png'}},
 phase:{threshold:.5},
 movement:{standOff:5.8,alignTolerance:.18,castLane:.55,approachRate:10,brakeRate:13,turnRate:12,brakeDistance:.65,ritualArrival:.08},
 ultimate:{triggerHP:.5,once:true},
 moves:{
  basic:{name:'幽冥速斩',referenceWeapon:'president',sequence:['jab','cross','finisher'],speedMultiplier:2,
   visual:{heightRatio:.60,chargeRatio:.45,formTime:.06,fadeTime:.12}},
  rift:{name:'幽冥裂斩',windup:1.10,active:.90,recover:.80,cooldown:4.6,
   impacts:[1.10],phase2Impacts:[1.10,1.66],damage:22,reach:15,lane:.95,height:1.65,
   projectile:true,kind:'netherCrescent',muzzleX:1.05,muzzleY:1.25,cruiseY:1.25,
   maxTargetY:1.65,speed:10.8,life:1.25,piercing:true,stun:.42,push:1.25,
   visual:{height:4.6,chargeHeight:3.05,formTime:.16,fadeTime:.22}},
  fall:{name:'丧钟天坠',windup:1.50,dropTime:.60,active:.78,recover:.97,cooldown:9.5,rest:.65,
   gatherAt:.75,get lockAt(){return this.windup;},get fallAt(){return this.windup;},get impacts(){return [this.windup+this.dropTime];},reach:20,radiusX:3.8,radiusZ:2.45,height:1.15,
   damage:26,stun:.55,push:1.6,lift:3.4,
   visual:{bellHeight:3.75,lift:5.35,blastHeight:4.8,smokeHeight:3.3}},
  requiem:{name:'终焉·万魂归寂',windup:3.80,active:7.40,recover:1.20,rest:.70,
   stages:[{key:'silence',name:'寂静',start:0,end:1.80},{key:'ascend',name:'升钟',start:1.80,end:3.80},
    {key:'tolls',name:'三响',start:3.80,end:8.40},{key:'terminal',name:'终响',start:8.40,end:12.40}],
   // Ten source-frame timings per stage, interpolated continuously by the view.
   referenceKeys:[0,.20,.40,.60,.80,1,1.20,1.40,1.60,1.79,
    1.80,2.02,2.24,2.46,2.68,2.90,3.12,3.34,3.56,3.79,
    3.80,4.10,4.35,5.40,5.70,5.95,7.05,7.35,7.65,8.39,
    8.40,8.68,8.96,9.40,10,10.30,10.65,11.20,11.80,12.40],
   impacts:[4.35,5.95,7.65,10],waveDamage:[12,15,18,28],waveHeight:[.72,.82,.94,1.20],
   waveDuration:[1.0,1.10,1.25,1.45],waveWidth:[.42,.50,.60,.76],waveExtent:1.45,
   stun:.32,push:.75,damage:12,
   visual:{crownRest:4.75,crownHeight:3.25,crownLift:6.45,crownGrownHeight:6.10,
    tideHeight:[1.8,2.5,3.3,4.2],terminalHeight:8.5,maxShake:5}}
 },
 poise(enemy){const m=this.moves[enemy.bossMove];return enemy.state==='attack'&&enemy.bossMove!=='basic'&&!!m&&enemy.t<m.windup+m.active;},
 // One derived protection source for targeting, damage and guard damage. No
 // invulnerability timer/boolean can outlive the actual protected animation.
 protection,
 limitHP(enemy,nextHP){return !enemy.bellPhase2&&enemy.hp>0?Math.max(Math.min(1,enemy.hp),nextHP):nextHP;},
 afterHurt(enemy,game){return enterPhase(enemy,game.fighters[0],game.encounter?.bounds(game)??{left:-world.halfWidth,right:world.halfWidth});},
 endBattle(enemy){
  if(enemy.bossMove==='requiem'){
   if(enemy.state==='attack')enemy.state=enemy.hp>0?'idle':'dead';
   enemy.bossMove=null;enemy.bossCast=null;
  }
  enemy.bellWaves=[];enemy.ritualTarget=null;
 }
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function protection(enemy){
 const m=profile.moves.requiem,cast=enemy.bossCast;
 if(enemy.hp<=0||enemy.state!=='attack'||enemy.bossMove!=='requiem'||cast?.kind!=='requiem'||
    enemy.stun>0||enemy.guardBreakTime>0||!Number.isFinite(enemy.t)||enemy.t<0||enemy.t+1e-9>=m.windup+m.active+m.recover)return null;
 return cast.phaseEntry&&enemy.t<m.stages[1].end?'transform':'requiem';
}
function enterPhase(enemy,player,bounds){
 if(enemy.bellPhase2||enemy.hp<=0||enemy.hp>enemy.maxHP*profile.phase.threshold)return false;
 enemy.bellPhase2=true;
 // Threshold damage owns this transition, including a hit during another cast,
 // guard break or airborne reaction. Preserve remaining HP; never refill it.
 enemy.stun=enemy.guardBreakTime=enemy.airHits=0;
 enemy.vy=0;enemy.attack=enemy.buffer=null;
 begin(enemy,'requiem',player,bounds);enemy.bossCast.phaseEntry=true;
 return true;
}
function basicMove(index=0){
 // Resolve after Combat has loaded; its dependency on Monsters/BellMaster stays acyclic at initialization.
 const combat=typeof module!=='undefined'?require('./combat.js'):root.Combat;
 const b=profile.moves.basic,r=profile.moves.rift,stage=index%b.sequence.length,name=b.sequence[stage];
 const ref=combat.moveFor({weapon:b.referenceWeapon},name),interval=stage===b.sequence.length-1?ref.duration:combat.attackLinkTime({weapon:b.referenceWeapon},name);
 return {...r,...b,damage:ref.damage,stun:ref.stun,push:ref.push,kind:'netherQuick',
  windup:ref.hit,active:0,recover:ref.duration-ref.hit,interval,cooldown:interval,duration:ref.duration,stage,
  impacts:[ref.hit],phase2Impacts:[ref.hit],
  speed:r.speed*b.speedMultiplier,life:r.life/b.speedMultiplier,
  visual:{height:r.visual.height*b.visual.heightRatio,chargeHeight:r.visual.chargeHeight*b.visual.chargeRatio,
   formTime:b.visual.formTime,fadeTime:b.visual.fadeTime}};
}
function phaseAt(t){
 const stages=profile.moves.requiem.stages;
 const index=Math.max(0,stages.findIndex(s=>t<s.end)),stage=stages[t>=stages.at(-1).end?3:index];
 const keys=profile.moves.requiem.referenceKeys;let frame=0;
 while(frame<keys.length-1&&t>=keys[frame+1])frame++;
 return {...stage,index:stages.indexOf(stage),progress:clamp((t-stage.start)/(stage.end-stage.start),0,1),frame};
}
function createCast(kind,enemy,player,bounds){
 const cast={kind,face:enemy.face,x:enemy.x,z:enemy.z,nextStrike:0,phase2:!!enemy.bellPhase2};
 if(kind==='basic')Object.assign(cast,{phase2:false,move:basicMove(enemy.nextBasicStage??0)});
 if(kind==='fall')Object.assign(cast,{targetX:player.x,targetZ:player.z,locked:false,struck:false});
 if(kind==='requiem')Object.assign(cast,{
  left:bounds.left,right:bounds.right,nextImpact:0,
  radiusX:Math.max(Math.abs(bounds.left-enemy.x),Math.abs(bounds.right-enemy.x))+.8,
  radiusZ:world.halfDepth+Math.abs(enemy.z)+.35
 });
 return cast;
}
function begin(enemy,kind,player,bounds){
 const cast=createCast(kind,enemy,player,bounds),m=cast.move??profile.moves[kind];
 enemy.state='attack';enemy.bossMove=kind;enemy.t=0;
 enemy.bossCast=cast;
 if(kind==='basic')enemy.nextBasicStage=(m.stage+1)%profile.moves.basic.sequence.length;
 else{
  enemy.nextBasicStage=0;
  enemy.attackCooldown=kind==='rift'?m.cooldown:m.windup+m.active+m.recover+m.rest;
  (enemy.bossCooldowns??={})[kind]=m.cooldown??enemy.attackCooldown;
 }
 if(kind==='requiem'){enemy.bellFinaleUsed=true;enemy.ritualTarget=null;}
 enemy.motionVX=enemy.motionVZ=0;
 enemy.walkVX=enemy.walkVZ=enemy.vx=enemy.pullVZ=0;
}
function cue(enemy,kind){enemy.bellImpactSerial=(enemy.bellImpactSerial||0)+1;enemy.bellImpactKind=kind;}
function fallContains(cast,player,scale=1){
 const m=profile.moves.fall;
 return player.y<=m.height&&Math.hypot((player.x-cast.targetX)/(m.radiusX*scale),(player.z-cast.targetZ)/(m.radiusZ*scale))<=1;
}
function waveGeometry(wave,age=wave.age){
 const radius=clamp(age/wave.duration,0,1)*profile.moves.requiem.waveExtent;
 return {radius,x:wave.x,z:wave.z,radiusX:wave.radiusX*radius,radiusZ:wave.radiusZ*radius};
}
function playerHeight(enemy,player){return (player.y+1.2*bodyScale(player)-enemy.y)/bodyScale(enemy);}
function advanceWaves(enemy,player,dt){
 let hit=null;
 for(const wave of enemy.bellWaves??[]){
  const old=waveGeometry(wave).radius;wave.age+=dt;
  const next=waveGeometry(wave).radius;
  const distance=Math.hypot((player.x-wave.x)/wave.radiusX,(player.z-wave.z)/wave.radiusZ);
  const width=wave.width/wave.radiusX+.28/Math.min(wave.radiusX,wave.radiusZ);
  if(!wave.checked&&distance>=old-width&&distance<=next+width){
   // One swept encounter per wave, including a successful jump/dash through its front.
   wave.checked=true;
   if(player.y<=wave.height&&!hit){
    const dir=Math.sign(player.x-wave.x)||enemy.face;
    hit={damage:wave.damage,stun:profile.moves.requiem.stun,push:profile.moves.requiem.push,
     hitY:playerHeight(enemy,player),source:{x:wave.x,z:wave.z,dir,kind:'bellSoulTide'}};
   }
  }
 }
 enemy.bellWaves=(enemy.bellWaves??[]).filter(w=>w.age<=w.duration);
 return hit;
}
function launchWave(enemy,index){
 const c=enemy.bossCast,m=profile.moves.requiem;
 (enemy.bellWaves??=[]).push({id:(enemy.bellWaveSerial=(enemy.bellWaveSerial||0)+1),index,
  x:c.x,z:c.z,radiusX:c.radiusX,radiusZ:c.radiusZ,age:0,duration:m.waveDuration[index],
  width:m.waveWidth[index],height:m.waveHeight[index],damage:m.waveDamage[index],checked:false});
 cue(enemy,index===3?'terminal':'toll'+(index+1));
}
function walk(enemy,dx,dz,dt,standOff=0,align=0){
 const m=profile.movement;
 const mx=Math.abs(dx)>standOff?Math.sign(dx)*(Math.abs(dx)-standOff):0;
 const mz=Math.abs(dz)>align?Math.sign(dz)*(Math.abs(dz)-align):0;
 const length=Math.hypot(mx,mz),speed=profile.speed*(enemy.slow>0?.7:1)*Math.min(1,length/m.brakeDistance);
 const targetX=length?mx/length*speed:0,targetZ=length?mz/length*speed:0;
 const oldX=enemy.motionVX||0,oldZ=enemy.motionVZ||0;
 const turning=oldX*targetX+oldZ*targetZ<0;
 const rate=turning?m.turnRate:Math.hypot(targetX,targetZ)<Math.hypot(oldX,oldZ)?m.brakeRate:m.approachRate;
 const blend=1-Math.exp(-rate*dt);
 // Keep signed momentum on reversal and coast into the dead zone instead of
 // clipping each opposing velocity component to zero in a single frame.
 const limit=(velocity,gap)=>gap*velocity>0?Math.sign(velocity)*Math.min(Math.abs(velocity),Math.abs(gap)/dt):velocity;
 enemy.motionVX=limit(oldX+(targetX-oldX)*blend,mx);
 enemy.motionVZ=limit(oldZ+(targetZ-oldZ)*blend,mz);
 if(!length&&Math.hypot(enemy.motionVX,enemy.motionVZ)<.015)enemy.motionVX=enemy.motionVZ=0;
 enemy.walkVX=enemy.motionVX;enemy.walkVZ=enemy.motionVZ;
 enemy.state=Math.hypot(enemy.walkVX,enemy.walkVZ)>.025?'run':'idle';
}
function steer(enemy,player,dt,bounds){
 const scale=bodyScale(enemy),move=profile.movement;
 enemy.attackCooldown=Math.max(0,enemy.attackCooldown-dt);
 const cds=enemy.bossCooldowns??={};for(const key of Object.keys(cds))cds[key]=Math.max(0,cds[key]-dt);
 // Also covers HP changes made by encounter setup; ordinary damage enters
 // synchronously in profile.afterHurt, before another source can hit this step.
 if(enterPhase(enemy,player,bounds))return null;
 const waveHit=advanceWaves(enemy,player,dt);
 if(enemy.stun>0){enemy.state='stun';enemy.nextBasicStage=0;enemy.motionVX=enemy.motionVZ=0;return waveHit;}
 if(enemy.state==='attack'){
  const cast=enemy.bossCast;
  if(!cast||cast.kind!==enemy.bossMove||!profile.moves[cast.kind]||!Number.isFinite(enemy.t)){
   enemy.state='idle';enemy.t=0;enemy.bossCast=null;enemy.bossMove=null;return waveHit;
  }
  const m=cast.move??(cast.kind==='basic'?basicMove():profile.moves[cast.kind]);
  const total=cast.kind==='basic'?m.interval:m.windup+m.active+m.recover;
  if(enemy.t+1e-9>=total){enemy.state='idle';if(cast.kind!=='basic'||m.stage===profile.moves.basic.sequence.length-1)return waveHit;}
  else{
  if(cast.kind==='requiem'){
   const at=m.impacts[cast.nextImpact];
   if(at!==undefined&&enemy.t+1e-9>=at){launchWave(enemy,cast.nextImpact);cast.nextImpact++;}
   return waveHit;
  }
  if(cast.kind==='fall'){
   if(!cast.locked){cast.targetX=clamp(player.x,bounds.left,bounds.right);cast.targetZ=clamp(player.z,-world.halfDepth,world.halfDepth);if(enemy.t+1e-9>=m.lockAt)cast.locked=true;}
   if(!cast.struck&&enemy.t+1e-9>=m.impacts[0]){
    cast.struck=true;cue(enemy,'fall');
    if(fallContains(cast,player,scale))return {...m,hitY:playerHeight(enemy,player),source:{x:cast.targetX,z:cast.targetZ,dir:Math.sign(player.x-cast.targetX)||cast.face,kind:'bellFall'}};
   }
   return waveHit;
  }
  const at=cast.kind==='basic'?(cast.nextStrike===0?m.windup:undefined):(cast.phase2?m.phase2Impacts:m.impacts)[cast.nextStrike];
  if(at===undefined||(cast.kind==='basic'?enemy.t<at:enemy.t+1e-9<at))return waveHit;
  cast.nextStrike++;return {...m,laneEnd:enemy.x+cast.face*m.reach*scale};
  }
 }
 const dx=player.x-enemy.x,dz=player.z-enemy.z;
 if(Math.abs(dx)>.15)enemy.face=Math.sign(dx);
 if(!enemy.attackCooldown&&enemy.y<.04){
  const order=['rift','fall'],start=enemy.nextBellMove??0;
  for(let i=0;i<order.length;i++){
   const index=(start+i)%order.length,kind=order[index],m=profile.moves[kind];
   if(cds[kind])continue;
   if(kind==='rift'&&(Math.abs(dx)>m.reach*.78*scale||Math.abs(dz)>move.castLane*scale))continue;
   if(kind==='fall'&&Math.hypot(dx,dz)>m.reach*scale)continue;
   enemy.nextBellMove=(index+1)%order.length;begin(enemy,kind,player,bounds);return waveHit;
  }
 }
 if(enemy.y<.04&&Math.abs(dx)<=profile.moves.rift.reach*.78*scale&&Math.abs(dz)<=move.castLane*scale){
  begin(enemy,'basic',player,bounds);return waveHit;
 }
 walk(enemy,dx,dz,dt,move.standOff*scale,move.alignTolerance);
 return waveHit;
}
const api={type,profile,steer,phaseAt,createCast,basicMove,fallContains,waveGeometry};
if(typeof module!=='undefined')module.exports=api;else root.BellMaster=api;
})(typeof window!=='undefined'?window:globalThis);
