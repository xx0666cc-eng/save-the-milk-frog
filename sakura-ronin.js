/* Chapter four: all timings and attack geometry are shared with its presentation. */
(function(root){
'use strict';
const {bodyScale,world}=typeof module!=='undefined'?require('./arena-config.js'):root.ArenaConfig;
const type='sakura-ronin';
const profile={
 name:'樱十郎',boss:true,hp:260,height:4.3,moveMultiplier:1.5,guardMax:120,
 get speed(){const combat=typeof module!=='undefined'?require('./combat.js'):root.Combat;return combat.PLAYER_STATS.fist.speed*this.moveMultiplier;},
 frames:{idle:{image:'assets/monsters/sakura-ronin/walk.png'}},
 phase:{threshold:.5,damage:1.2,attackRate:1.15},
 // Pixel-measured blade tips in the release poses; the animation pack uses the same anchors.
 bladeOrigins:{
  iai:[{asset:'draw12',frame:6,x:352,y:132,anchor:[181,354],referenceHeight:342}],
  wave:[{asset:'cross12',frame:5,x:352,y:282,anchor:[181,350],referenceHeight:340},
   {asset:'cross12',frame:7,x:300,y:29,anchor:[181,350],referenceHeight:340}]
 },
 moves:{
  slash:{name:'落樱斩',windup:.34,active:.18,recover:.38,damage:9,reach:2.35,lane:.85,height:1.5,stun:.25,push:.55,impacts:[.34]},
  iai:{name:'居合横斩',windup:.60,active:.22,recover:.55,cooldown:4.5,damage:17,reach:10,lane:.70,height:1.55,
   projectile:true,kind:'sakuraBlade',muzzleX:1.05,muzzleY:1.55,cruiseY:1.25,maxTargetY:1.55,speed:16,life:.65,piercing:true,stun:.38,push:1.2,impacts:[.60]},
  parry:{name:'弹反',windup:.18,active:.50,recover:.55,cooldown:7,damage:0,reach:2.5,lane:1,height:1.6,impacts:[]},
  counter:{name:'落樱反击',windup:.16,active:.22,recover:.56,damage:15,reach:3,lane:1.05,height:1.6,stun:.45,push:1.5,impacts:[.16]},
  wave:{name:'交叉剑气',windup:.62,active:.42,recover:.55,cooldown:6.5,damage:9,reach:10,lane:.85,height:1.55,
   projectile:true,kind:'sakuraCross',muzzleX:1.05,muzzleY:1.65,cruiseY:1.3,maxTargetY:1.55,speed:13,life:1,piercing:true,stun:.20,push:.32,impacts:[.62,.84]},
  rain:{name:'樱雨飞剑',windup:1.15,active:1.9,recover:.65,cooldown:12,damage:8,reach:3.6,lane:2.4,height:1.5,
   dashStart:.16,dashEnd:.48,dashSpeed:18,stun:.18,push:.12,impacts:[1.15,1.55,1.95,2.35,2.75]}
 },
 poise(enemy){
  const m=this.moves[enemy.bossMove];
  return enemy.state==='attack'&&m&&enemy.bossMove!=='parry'&&enemy.bossMove!=='slash'&&enemy.t<m.windup+m.active;
 },
 parry(enemy,attacker,move,front){
  const m=this.moves.parry;
  if(enemy.hp<=0||enemy.guardBreakTime>0||enemy.state!=='attack'||enemy.bossMove!=='parry'||!front||move.unblockable||enemy.t<m.windup||enemy.t>=m.windup+m.active)return false;
  enemy.counterReady=true;enemy.empowered=true;
  return true;
 }
};
const order=['slash','iai','parry','wave','rain'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function begin(enemy,kind,player,bounds){
 const m=profile.moves[kind];enemy.bossMove=kind;enemy.state='attack';enemy.t=0;
 enemy.bossCast={kind,face:enemy.face,x:enemy.x,z:enemy.z,nextStrike:0,struck:false};
 if(kind==='rain')Object.assign(enemy.bossCast,{
  targetX:clamp(player.x-enemy.face*1.8*bodyScale(enemy),bounds.left,bounds.right),
  targetZ:clamp(player.z,-world.halfDepth,world.halfDepth),centered:false
 });
 enemy.vx=enemy.pullVZ=0;enemy.motionVX=enemy.motionVZ=0;
 enemy.attackCooldown=(m.windup+m.active+m.recover)/(enemy.sakuraPhase2?profile.phase.attackRate:1)+.16;
 if(m.cooldown)enemy.bossCooldowns[kind]=m.cooldown;
}
function steer(enemy,player,dt,bounds){
 enemy.bossGlide=false;
 const scale=bodyScale(enemy),phase=enemy.hp<=enemy.maxHP*profile.phase.threshold;
 enemy.sakuraPhase2=enemy.sakuraPhase2||phase;
 enemy.attackCooldown=Math.max(0,enemy.attackCooldown-dt);
 const cds=enemy.bossCooldowns??={};for(const key of Object.keys(cds))cds[key]=Math.max(0,cds[key]-dt);
 if(enemy.stun>0){enemy.state='stun';enemy.counterReady=false;enemy.motionVX=enemy.motionVZ=0;return null;}
 if(enemy.counterReady){enemy.counterReady=false;begin(enemy,'counter',player,bounds);}
 const dx=player.x-enemy.x,dz=player.z-enemy.z;
 if(enemy.state==='attack'){
  if(enemy.sakuraPhase2)enemy.t+=dt*(profile.phase.attackRate-1);
  const m=profile.moves[enemy.bossMove],c=enemy.bossCast,end=m.windup+m.active;
  if(enemy.t>=end+m.recover){enemy.state='idle';return null;}
  if(enemy.t>=end)return null;
  if(enemy.bossMove==='rain'){
   if(enemy.t>=m.dashStart&&enemy.t<m.dashEnd){
    const tx=(c.targetX-enemy.x)*c.face>0?c.targetX:enemy.x,tz=c.targetZ;
    const dx=tx-enemy.x,dz=tz-enemy.z,n=Math.hypot(dx,dz),step=Math.min(n,m.dashSpeed*dt);
    if(n){enemy.walkVX=dx/n*step/dt;enemy.walkVZ=dz/n*step/dt;enemy.bossGlide=true;}
   }
   if(enemy.t>=m.dashEnd&&!c.centered){c.x=enemy.x;c.z=enemy.z;c.centered=true;}
  }
  const next=m.impacts[c.nextStrike];
  if(next===undefined||enemy.t<next)return null;
  c.nextStrike++;
  if(m.projectile){
   const bonus=enemy.empowered?1.25:1;enemy.empowered=false;
   const origin=profile.bladeOrigins[enemy.bossMove][c.nextStrike-1],units=profile.height/origin.referenceHeight;
   return {...m,kind:enemy.bossMove==='wave'?(c.nextStrike===1?'sakuraCrossA':'sakuraCrossB'):m.kind,
    muzzleX:(origin.x-origin.anchor[0])*units,muzzleY:(origin.anchor[1]-origin.y)*units,trackTargetHeight:true,
    speed:enemy.bossMove==='wave'?(c.nextStrike===1?10:16):m.speed,
    laneEnd:enemy.x+enemy.face*m.reach*scale,damage:Math.round(m.damage*(enemy.sakuraPhase2?profile.phase.damage:1)*bonus)};
  }
  const forward=dx*c.face;
  const inside=enemy.bossMove==='rain'
   ?Math.hypot((player.x-c.x)/(m.reach*scale),(player.z-c.z)/(m.lane*scale))<=1&&player.y<=m.height*scale
   :forward>=-.25*scale&&forward<=m.reach*scale&&Math.abs(dz)<=m.lane*scale&&player.y<=m.height*scale;
  if(inside){
   c.struck=true;
   const bonus=enemy.empowered&&enemy.bossMove!=='counter'?1.25:1;
   if(bonus>1)enemy.empowered=false;
   return {...m,damage:Math.round(m.damage*(enemy.sakuraPhase2?profile.phase.damage:1)*bonus),hitY:1.3};
  }
  return null;
 }
 if(Math.abs(dx)>.12)enemy.face=Math.sign(dx);
 if(!enemy.attackCooldown&&enemy.y<.04&&Math.abs(dz)<.78*scale){
  const next=enemy.nextBossMove??0;
  for(let i=0;i<order.length;i++){
   const kind=order[(next+i)%order.length],m=profile.moves[kind];
   if(cds[kind])continue;
   const distance=kind==='rain'?6.2:kind==='iai'||kind==='wave'?8:kind==='parry'?3.8:m.reach;
   if(Math.abs(dx)>distance*scale)continue;
   enemy.nextBossMove=(next+i+1)%order.length;begin(enemy,kind,player,bounds);return null;
  }
 }
 const mx=Math.abs(dx)>1.65*scale?dx:0,mz=Math.abs(dz)>.18?dz:0,gap=Math.hypot(mx,mz);
 const speed=profile.speed*(enemy.slow>0?.7:1),blend=1-Math.exp(-dt*14);
 enemy.motionVX=(enemy.motionVX||0)+((gap?mx/gap*speed:0)-(enemy.motionVX||0))*blend;
 enemy.motionVZ=(enemy.motionVZ||0)+((gap?mz/gap*speed:0)-(enemy.motionVZ||0))*blend;
 if(!gap){enemy.motionVX=enemy.motionVZ=0;}
 enemy.walkVX=Math.sign(enemy.motionVX)*Math.min(Math.abs(enemy.motionVX),Math.max(0,Math.abs(dx)-1.65*scale)/dt);
 enemy.walkVZ=Math.sign(enemy.motionVZ)*Math.min(Math.abs(enemy.motionVZ),Math.max(0,Math.abs(dz)-.18)/dt);
 enemy.state=gap?'run':'idle';
 return null;
}
const api={type,profile,steer};
if(typeof module!=='undefined')module.exports=api;else root.SakuraRonin=api;
})(typeof window!=='undefined'?window:globalThis);
