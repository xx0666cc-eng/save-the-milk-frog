/* Stage four enemies share the normal monster tick and projectile collision. */
(function(root){
'use strict';
const {world,bodyScale}=typeof module!=='undefined'?require('./arena-config.js'):root.ArenaConfig;
const bossType='obama-frog',eliteType='frog-agent';
const asset='assets/monsters/capital/';
const frame=(texture,anchorX)=>({image:asset+texture+'.webp',texture,anchorX,footY:.995,bodyHeight:.99,face:1});
const boost={duration:6,damage:1.25,speed:1.2};
const boss={
  name:'奥巴蛙',boss:true,hp:284,height:4.35,speed:2.6,guardMax:120,
 frames:{idle:frame('obama',.55)},
 moves:{
  signal:{name:'声波投射',windup:.48,active:.16,recover:.52,reach:9.5,aim:8.6,lane:.5,
   projectile:true,kind:'soundPulse',muzzleX:.69,muzzleY:3.02,cruiseY:1.38,speed:15,damage:11,stun:.27,push:.65,maxTargetY:1.45},
  rally:{name:'Yes We Can!',windup:.73,active:.55,recover:.43,cooldown:13,radius:6.8},
  surge:{name:'变革浪潮',windup:.8,active:.2,recover:.7,cooldown:8,reach:13.5,aim:11.4,lane:1.43,
   projectile:true,kind:'changeWave',muzzleX:.82,muzzleY:2.66,cruiseY:1.52,speed:13,damage:22,stun:.42,push:1.45,lift:6.2,maxTargetY:1.8},
  bombard:{name:'制裁轰炸',windup:.92,active:1.08,recover:.66,cooldown:12,impacts:[.92,1.31,1.70],
    radius:1.54,damage:12,stun:.32,push:.38,maxTargetY:1.08},
  support:{name:'盟友支援',windup:.8,active:.42,recover:.49,cooldown:17,shield:5}
 },
 poise(enemy){
  const move=enemy.state==='attack'&&this.moves[enemy.bossMove];
  return move&&enemy.t<move.windup+move.active;
 },
 damageTaken(enemy){return enemy.supportShield>0?.6:1;}
};
const elite={
  name:'奶蛙特工',elite:true,hp:64,height:3.05,speed:3.9,guardMax:80,
 frames:{idle:frame('agent',.49),burst:frame('agent-aim',.47),smoke:{...frame('agent-dash',.48),heightScale:.86}},
 moves:{
  burst:{name:'消音连射',windup:.44,active:.42,recover:.56,impacts:[.44,.6,.76],reach:8.2,aim:7.5,lane:.36,
    projectile:true,kind:'agentShot',muzzleX:1.63,muzzleY:2.02,cruiseY:1.18,speed:23,damage:5,stun:.19,push:.29,maxTargetY:1.2},
  smoke:{name:'烟幕突袭',windup:.39,active:.38,recover:.55,cooldown:6,reach:4.35,lane:.81,
   damage:13,stun:.32,push:.78,maxTargetY:.86}
 },
 damageTaken(enemy){return enemy.smokeCover>0?.8:1;}
};
const bossOrder=['support','signal','rally','surge','bombard'];
const eliteOrder=['burst','smoke'];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const position=(x,z,bounds)=>({x:clamp(x,bounds.left,bounds.right),z:clamp(z,-world.halfDepth,world.halfDepth)});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const moveEnd=m=>m.windup+m.active;
const canShoot=(move,dx,dz)=>Math.abs(dx)>=move.muzzleX+.18&&Math.abs(dx)<=move.aim&&Math.abs(dz)<=move.lane+.55;

function safeSpawn(point,player,monsters){
 return distance(point,player)>=1.85&&!monsters.some(m=>m.hp>0&&distance(point,m)<1.35);
}
function guardPoints(enemy,player,bounds,monsters){
 const points=[];
 for(const [dx,dz] of [[-2.2,-1.25],[2.2,1.25],[2.2,-1.65],[-2.2,1.65],[0,-2.45],[0,2.45],[-3.45,0],[3.45,0]]){
  const point=position(enemy.x+dx,enemy.z+dz,bounds);
  if(!safeSpawn(point,player,monsters)||points.some(other=>distance(point,other)<1.65))continue;
  points.push(point);
  if(points.length===2)break;
 }
 return points;
}
function allyNearby(enemy,ally,radius){return ally!==enemy&&ally.hp>0&&distance(enemy,ally)<=radius;}
function aim(kind,move,enemy,player,bounds,monsters){
 const {x,z,face}=enemy,cast={kind,x,z,face,next:0};
 if(kind==='support'){
  if(monsters.some(m=>m.hp>0&&m.summonedBy===enemy.id))return null;
  cast.points=guardPoints(enemy,player,bounds,monsters);
  if(cast.points.length!==2)return null;
 }else if(kind==='rally'){
  if(!monsters.some(ally=>allyNearby(enemy,ally,move.radius)))return null;
 }else if(kind==='bombard'){
  cast.points=[[0,0],[-1.5,.91],[1.5,-.91]].map(([dx,dz])=>position(player.x+dx,player.z+dz,bounds));
 }else{
  const dx=player.x-x,dz=player.z-z;
  if(kind==='smoke'){
   if(Math.abs(dx)<1.2||Math.abs(dx)>5.2||Math.abs(dz)>.98)return null;
  }else if(!canShoot(move,dx,dz))return null;
  const extra=kind==='smoke'&&enemy.allyBoost>0?boost.speed:1;
  cast.end=position(x+face*move.reach*extra,z,bounds).x;
  cast.from=x+face*(move.muzzleX||0)*bodyScale(enemy);
 }
 return cast;
}
function groundHit(enemy,player,move,origin){
 return {...move,hitY:(player.y+1.2*bodyScale(player)-enemy.y)/bodyScale(enemy),
  source:{x:origin.x,dir:Math.sign(player.x-origin.x)||enemy.face,kind:enemy.bossMove}};
}
function dash(enemy,player,move,cast,dt){
 const progress=clamp((enemy.t-move.windup)/move.active,0,1);
 const x=cast.x+(cast.end-cast.x)*progress;
 enemy.smokeDashing=true;
 enemy.walkVX=(x-enemy.x)/dt;enemy.walkVZ=(cast.z-enemy.z)/dt;
 if(!enemy.smokeCover)enemy.smokeCover=1.25;
 const ahead=(player.x-enemy.x)*cast.face,travel=Math.abs(x-enemy.x);
 if(cast.next||ahead<-.45||ahead>travel+.91||Math.abs(player.z-cast.z)>move.lane||player.y>move.maxTargetY)return null;
 cast.next++;
 return groundHit(enemy,player,move,enemy);
}
function perform(enemy,player,move,dt,bounds,monsters,spawn){
 const t=enemy.t,cast=enemy.bossCast;
 if(t+1e-8>=moveEnd(move)+move.recover){enemy.state='idle';return null;}
 if(t+1e-8<move.windup||t>moveEnd(move)+dt)return null;
 if(cast.kind==='smoke')return dash(enemy,player,move,cast,dt);
 const at=move.impacts?move.impacts[cast.next]:cast.next?Infinity:move.windup;
 if(t+1e-8>=(at??Infinity)){
  const i=cast.next++;
  if(move.projectile)return {...move,laneEnd:cast.end};
  if(cast.kind==='bombard'){
   const point=cast.points[i];
   if(distance(point,player)<=move.radius&&player.y<=move.maxTargetY)return groundHit(enemy,player,move,point);
  }else if(cast.kind==='rally'){
   for(const ally of monsters)if(allyNearby(enemy,ally,move.radius))ally.allyBoost=boost.duration;
  }else{
   for(const point of cast.points){
    const site=safeSpawn(point,player,monsters)?point:guardPoints(enemy,player,bounds,monsters)[0];
    if(!site)continue;
    const guard=spawn(eliteType,site.x,site.z);
    guard.summonedBy=enemy.id;guard.alerted=true;guard.face=Math.sign(player.x-guard.x)||enemy.face;
    guard.attackCooldown=.9;
    enemy.supportShield=move.shield;
   }
  }
 }
 return null;
}
function steer(enemy,player,dt,bounds,monsters,spawn){
 const profile=enemy.isBoss?boss:elite,order=enemy.isBoss?bossOrder:eliteOrder;
 enemy.smokeDashing=false;
 if(enemy.supportShield>0)enemy.supportShield=Math.max(0,enemy.supportShield-dt);
 if(enemy.smokeCover>0)enemy.smokeCover=Math.max(0,enemy.smokeCover-dt);
 enemy.attackCooldown=Math.max(0,enemy.attackCooldown-dt);
 const cooldowns=enemy.bossCooldowns??={};
 for(const key of Object.keys(cooldowns))cooldowns[key]=Math.max(0,cooldowns[key]-dt);
 if(enemy.stun>0){enemy.state='stun';return null;}
 if(enemy.state==='attack')return perform(enemy,player,profile.moves[enemy.bossMove],dt,bounds,monsters,spawn);
 const dx=player.x-enemy.x,dz=player.z-enemy.z;
 if(Math.abs(dx)>.1)enemy.face=Math.sign(dx);
 if(!enemy.attackCooldown&&enemy.y<.04){
  const next=enemy.nextBossMove??0;
  for(let i=0;i<order.length;i++){
   const index=(next+i)%order.length,kind=order[index],move=profile.moves[kind];
   if(cooldowns[kind])continue;
   const cast=aim(kind,move,enemy,player,bounds,monsters);
   if(!cast)continue;
   enemy.nextBossMove=(index+1)%order.length;
   enemy.bossMove=kind;enemy.bossCast=cast;enemy.state='attack';enemy.t=0;
   enemy.vx=enemy.pullVZ=0;enemy.attackCooldown=moveEnd(move)+move.recover+.28;
   if(move.cooldown)cooldowns[kind]=move.cooldown;
   return null;
  }
 }
 const retreat=Math.abs(dx)<2.1&&Math.abs(dz)<1.15;
 const mx=retreat?-dx:Math.abs(dx)>4.25?dx:0,mz=Math.abs(dz)>.35?dz:0,step=Math.hypot(mx,mz);
 enemy.state=step?'run':'idle';
 if(step){
  const speed=profile.speed*(enemy.slow>0?.7:1)*(enemy.allyBoost>0?boost.speed:1)*(enemy.smokeCover>0?1.2:1);
  enemy.walkVX=mx/step*speed;enemy.walkVZ=mz/step*speed;
 }
 return null;
}
const api={bossType,eliteType,boss,elite,boost,steer};
if(typeof module!=='undefined')module.exports=api;else root.CapitalEnemies=api;
})(typeof window!=='undefined'?window:globalThis);
