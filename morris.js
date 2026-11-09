/* Morris's cast geometry is shared by combat and the arena telegraphs. */
(function(root){
'use strict';
const config=typeof module!=='undefined'?require('./arena-config.js'):root.ArenaConfig;
const {world,bodyScale}=config;
const asset='assets/monsters/morris/';
const finaleHits=[1,1.7,2.4,4.1];
const finaleEnd=4.6;
const boss={
 name:'无面傀儡师·莫里斯',boss:true,hp:248,speed:2.35,height:4.65,guardMax:100,
 poise(enemy){
  if(enemy.state!=='attack')return false;
  const move=this.moves[enemy.bossMove];
  return enemy.t<move.windup+move.active;
 },
 beforeHurt(enemy){
  if(enemy.state==='attack'&&enemy.bossMove==='finale'&&enemy.t>=finaleEnd)
   enemy.finaleVulnerable=Math.max(enemy.finaleVulnerable||0,finaleEnd+this.moves.finale.recover-enemy.t);
 },
 damageTaken(enemy){return enemy.finaleVulnerable>0||enemy.state==='attack'&&enemy.bossMove==='finale'&&enemy.t>=finaleEnd?1.5:1;},
 frames:{
  idle:{image:asset+'idle.webp',anchorX:.494,footY:.996,bodyHeight:.988,face:1},
  whip:{image:asset+'whip.webp',anchorX:.445,footY:.996,bodyHeight:.984,face:1},
  down:{image:asset+'down.webp',anchorX:.57,footY:.98,bodyHeight:.96,heightScale:.54,face:1}
 },
 moves:{
  whip:{name:'灵丝鞭挞',windup:.5,active:.27,recover:.49,reach:7,lane:.86,height:.62,damage:12,stun:.32,push:.88},
  summon:{name:'傀儡召唤',windup:.84,active:.45,recover:.48,cooldown:12},
  pull:{name:'命运牵线',windup:.8,active:.33,recover:.54,cooldown:10,radius:1.72,damage:14,stun:.36,push:.75,pull:true},
  web:{name:'千丝绞杀',windup:1,active:.46,recover:1.5,cooldown:16,damage:19,stun:.4,push:1.08},
  finale:{name:'提线狂想曲',windup:1,active:finaleEnd-1,recover:2,radius:1.52,damage:12,stun:.34,push:.8},
 },
 finaleWave:{damage:18,stun:.44,push:1.15,height:.65}
};
const puppet={
 name:'木偶士兵',image:asset+'puppet.webp',hp:44,damage:8,speed:3.15,farSpeed:1.26,
 reach:1.56,height:2.25,windup:.44,cooldown:1.25,anchorX:.46
};
const puppetType='morris-puppet',bossType='morris',order=['summon','pull','web','whip'];
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));

function summonPoints(enemy,player,bounds,monsters){
 const living=monsters.filter(m=>m.hp>0);
 const open=3-living.filter(m=>m.summonedBy===enemy.id).length;
 const points=[];
 for(const [dx,dz] of [[-2.2,-1.35],[2.2,1.35],[-2.2,1.65],[2.2,-1.65],[0,-2.45],[0,2.45],[-3.4,0],[3.4,0]]){
  if(points.length>=Math.min(2,open))break;
  const x=clamp(enemy.x+dx,bounds.left+.35,bounds.right-.35),z=clamp(enemy.z+dz,-world.halfDepth+.25,world.halfDepth-.25);
  if(Math.hypot(x-player.x,z-player.z)<2||[...living,...points].some(m=>Math.hypot(x-m.x,z-m.z)<1.48))continue;
  points.push({x,z});
 }
 return points;
}
function makeCast(kind,enemy,player,bounds,monsters){
 const move=boss.moves[kind],{x,z,face}=enemy;
 if(kind==='summon'){
  const points=summonPoints(enemy,player,bounds,monsters);
  return points.length?{kind,x,z,points}:null;
 }
 if(kind==='pull')return {kind,x:player.x,z:player.z,radius:move.radius};
 if(kind==='finale'){
  const {left,right}=bounds,width=right-left;
  return {kind,x,z,left,right,points:[
   {x:clamp(player.x,left+width*.3,right-width*.3),z:player.z,radius:move.radius},
   {x:left+width*.16,z:clamp(player.z+1.7,-2.5,2.5),radius:move.radius},
   {x:right-width*.16,z:clamp(player.z-1.7,-2.5,2.5),radius:move.radius}
  ],nextImpact:0};
 }
 if(kind==='whip'){
  const edge=face>0?bounds.right:bounds.left,scale=bodyScale(enemy);
  return {kind,x,z,end:face>0?Math.min(edge,x+move.reach*scale):Math.max(edge,x-move.reach*scale),lane:move.lane*scale};
 }
 const {left,right}=bounds,d=world.halfDepth;
 return {kind,x,z,lines:[
  {ax:left,az:-d,bx:right,bz:d,width:.23},
  {ax:left,az:d,bx:right,bz:-d,width:.23},
  {ax:left,az:-1.1,bx:right,bz:-2.45,width:.21},
  {ax:left,az:2.45,bx:right,bz:1.1,width:.21}
 ]};
}
function distanceToLine(x,z,{ax,az,bx,bz}){
 const dx=bx-ax,dz=bz-az;
 const t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz),0,1);
 return Math.hypot(x-ax-dx*t,z-az-dz*t);
}
function hits(cast,player){
 const {x,z,y}=player;
 if(cast.kind==='whip')return y<=boss.moves.whip.height&&x>=Math.min(cast.x,cast.end)&&x<=Math.max(cast.x,cast.end)&&Math.abs(z-cast.z)<=cast.lane;
 if(cast.kind==='web')return cast.lines.some(line=>distanceToLine(x,z,line)<=line.width);
 return Math.hypot(x-cast.x,z-cast.z)<=cast.radius;
}
function steer(enemy,player,dt,bounds,monsters,spawn){
 enemy.attackCooldown=Math.max(0,enemy.attackCooldown-dt);
 const cooldowns=enemy.bossCooldowns??={};
 for(const kind of Object.keys(cooldowns))cooldowns[kind]=Math.max(0,cooldowns[kind]-dt);
 if(!enemy.finaleUsed&&!(enemy.guardBreakTime>0)&&enemy.hp<=enemy.maxHP*.4){
  const move=boss.moves.finale;
  enemy.bossMove='finale';enemy.bossCast=makeCast('finale',enemy,player,bounds,monsters);
  enemy.state='attack';enemy.t=0;enemy.struck=false;enemy.finaleUsed=true;
  enemy.attackCooldown=move.windup+move.active+move.recover;
  enemy.vx=enemy.vy=enemy.stun=0;enemy.y=0;
  return null;
 }
 if(enemy.stun>0){enemy.state='stun';return null;}
 if(enemy.state==='attack'){
  const move=boss.moves[enemy.bossMove],end=move.windup+move.active;
  if(enemy.t>=end+move.recover){enemy.state='idle';return null;}
  const cast=enemy.bossCast;
  const atPlayer={hitY:(player.y+1.2*bodyScale(player)-enemy.y)/bodyScale(enemy)};
  if(cast.kind==='finale'){
   const index=cast.nextImpact;
   if(index>=finaleHits.length||enemy.t+1e-9<finaleHits[index])return null;
   cast.nextImpact++;
   if(index<cast.points.length)return hits(cast.points[index],player)?{...move,...atPlayer}:null;
   return player.y>boss.finaleWave.height?null:{...boss.finaleWave,...atPlayer};
  }
  if(enemy.t<move.windup||enemy.struck)return null;
  enemy.struck=true;
  if(cast.kind==='summon'){
   for(const point of cast.points){
    if(Math.hypot(point.x-player.x,point.z-player.z)<1.15||
       monsters.some(m=>m.hp>0&&Math.hypot(m.x-point.x,m.z-point.z)<1.1))continue;
    const soldier=spawn(puppetType,point.x,point.z);
    soldier.summonedBy=enemy.id;soldier.alerted=true;soldier.attackCooldown=.6;
    soldier.face=Math.sign(player.x-point.x)||enemy.face;
   }
  }else if(hits(cast,player))return {...move,...atPlayer};
  return null;
 }
 if(enemy.attackCooldown||enemy.y>.03){
  enemy.state='idle';
  return null;
 }
 const dx=player.x-enemy.x,dz=player.z-enemy.z;
 if(Math.abs(dx)>.1)enemy.face=Math.sign(dx);
 const next=enemy.nextBossMove??0;
 for(let offset=0;offset<order.length;offset++){
  const kind=order[(next+offset)%order.length];
  if(cooldowns[kind])continue;
  if(kind==='whip'&&(Math.abs(dx)>boss.moves.whip.reach*bodyScale(enemy)||Math.abs(dz)>.76))continue;
  const cast=makeCast(kind,enemy,player,bounds,monsters);
  if(!cast)continue;
  const move=boss.moves[kind];
  enemy.bossMove=kind;enemy.bossCast=cast;enemy.state='attack';enemy.t=0;enemy.struck=false;
  enemy.attackCooldown=move.windup+move.active+move.recover+.2;
  enemy.vx=enemy.walkVX=enemy.walkVZ=0;
  if(move.cooldown)cooldowns[kind]=move.cooldown;
  enemy.nextBossMove=(next+offset+1)%order.length;
  return null;
 }
 const mx=Math.abs(dx)>2.8?dx:0,mz=Math.abs(dz)>.27?dz:0,gap=Math.hypot(mx,mz);
 enemy.state=gap?'run':'idle';
 if(gap){
  const speed=boss.speed*(enemy.slow>0?.7:1);
  enemy.walkVX=mx/gap*speed;enemy.walkVZ=mz/gap*speed;
 }
 return null;
}
const api={boss,puppet,bossType,puppetType,finaleHits,finaleEnd,steer,hits};
if(typeof module!=='undefined')module.exports=api;else root.Morris=api;
})(typeof window!=='undefined'?window:globalThis);
