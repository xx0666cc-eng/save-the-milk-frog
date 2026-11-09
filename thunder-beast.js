(function(root){
'use strict';
const {world,bodyScale}=typeof module!=='undefined'?require('./arena-config.js'):root.ArenaConfig;
const type='thunder-beast';
const profile={
 name:'森林迅电兽',boss:true,hp:196,height:2.95,speed:4.15,guardMax:100,
 frames:{idle:{image:'assets/monsters/thunder-beast/idle.webp',anchorX:.38,footY:.995,bodyHeight:.99,face:-1}},
 moves:{
  rake:{name:'疾电爪袭',windup:.22,active:.31,recover:.37,impacts:[.22,.43],damage:7,height:.83,stun:.23,push:.35},
  vine:{name:'藤蔓跃遁',windup:.40,active:1,recover:.64,dive:.97,radius:1.7,cooldown:7,damage:16,height:1.12,stun:.34,push:.88},
  zigzag:{name:'残影穿林',windup:.18,active:1,recover:.58,flank:.72,charge:.94,lane:.83,cooldown:9,damage:18,height:.92,stun:.36,push:1},
  storm:{name:'雷尾风暴',windup:1,active:.58,recover:.95,depth:2.95,reach:9.6,cooldown:15,damage:25,height:.7,stun:.44,push:1.4}
 },
 poise(enemy){
  if(enemy.state!=='attack')return false;
  const move=this.moves[enemy.bossMove];
  return enemy.t<move.windup+move.active;
 }
};
const order=['rake','vine','zigzag','storm'];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const lerp=(a,b,t)=>a+(b-a)*t;
const point=(x,z)=>({x,z});
function bounded(x,z,bounds){
 return point(clamp(x,bounds.left,bounds.right),clamp(z,-world.halfDepth,world.halfDepth));
}
function interpolate(a,b,t){
 return point(lerp(a.x,b.x,t),lerp(a.z,b.z,t));
}
function aim(enemy,player,bounds){
 const scale=bodyScale(enemy),{x,z,face}=enemy,kind=enemy.bossMove;
 const cast={kind,x,z,face,nextStrike:0};
 if(kind==='rake'){
  cast.end=bounded(x+face*2.65*scale,z,bounds);
  cast.lane=.91*scale;
 }else if(kind==='vine'){
  cast.perch=bounded(x-face*.8,z,bounds);
  cast.radius=profile.moves.vine.radius;
 }else if(kind==='zigzag'){
  const width=bounds.right-bounds.left;
  const side=player.z>=0?-1:1;
  cast.route=[
   {x,z,at:.18},
   {...bounded(x+face*width*.42,side*2.6,bounds),at:.34},
   {...bounded(x-face*width*.19,-side*2.6,bounds),at:.53},
   {...bounded(player.x+face*3.8,-side*2.35,bounds),at:.72}
  ];
  cast.lane=profile.moves.zigzag.lane;
 }else{
  cast.reach=Math.min(profile.moves.storm.reach,Math.max(.1,(face>0?bounds.right-x:x-bounds.left)));
  cast.depth=profile.moves.storm.depth;
 }
 return cast;
}
function stormContains(cast,target){
 const dx=(target.x-cast.x)*cast.face,dz=(target.z-cast.z)/cast.depth;
 return dx>=0&&(dx/cast.reach)**2+dz**2<=1;
}
function lineDistance(a,b,p){
 const dx=b.x-a.x,dz=b.z-a.z;
 const t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);
 return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);
}
function follow(enemy,p,y,dt){
 enemy.walkVX=(p.x-enemy.x)/dt;enemy.walkVZ=(p.z-enemy.z)/dt;
 if(Math.abs(enemy.walkVX)>.1)enemy.face=Math.sign(enemy.walkVX);
 enemy.y=y;enemy.vy=0;enemy.vx=0;enemy.bossGlide=true;
}
function impact(enemy,player,move,inside){
 if(!inside||player.y>move.height)return null;
 return {...move,hitY:(player.y+1.2*bodyScale(player)-enemy.y)/bodyScale(enemy)};
}
function perform(enemy,player,dt,bounds,move,cast){
 const t=enemy.t;
 if(t>=move.windup+move.active+move.recover){enemy.state='idle';return null;}
 if(cast.kind==='rake'){
  if(t>=move.windup&&t<=.48)follow(enemy,interpolate(cast,cast.end,clamp((t-move.windup)/.25,0,1)),0,dt);
  if(t+1e-8<(move.impacts[cast.nextStrike]??Infinity))return null;
  cast.nextStrike++;
  const dx=(player.x-enemy.x)*cast.face;
  return impact(enemy,player,move,dx>=-.32&&dx<=1.55&&Math.abs(player.z-cast.z)<=cast.lane);
 }
 if(cast.kind==='vine'){
  if(t<move.windup){
   const progress=t/move.windup;
   follow(enemy,interpolate(cast,cast.perch,progress),4.3*progress,dt);
  }else{
   if(!cast.target)cast.target=bounded(player.x,player.z,bounds);
   const progress=clamp((t-move.dive)/(move.windup+move.active-move.dive),0,1);
   if(!cast.nextStrike)follow(enemy,interpolate(cast.perch,cast.target,progress),4.3*(1-progress**1.6),dt);
   if(progress>=1&&!cast.nextStrike){
    cast.nextStrike++;
    return impact(enemy,player,move,Math.hypot(player.x-cast.target.x,player.z-cast.target.z)<=cast.radius);
   }
  }
  return null;
 }
 if(cast.kind==='zigzag'){
  if(t<move.windup)return null;
  if(t<move.flank){
   const next=cast.route.findIndex(p=>p.at>t);
   const a=cast.route[next-1],b=cast.route[next];
   follow(enemy,interpolate(a,b,(t-a.at)/(b.at-a.at)),0,dt);
  }else if(t<=move.windup+move.active){
   const from=cast.route.at(-1);
   if(!cast.target){
    cast.target=bounded(player.x,player.z,bounds);
    enemy.face=Math.sign(cast.target.x-from.x)||enemy.face;
   }
   const progress=clamp((t-move.charge)/(move.windup+move.active-move.charge),0,1);
   const next=interpolate(from,cast.target,progress);
   follow(enemy,next,0,dt);
   if(!cast.nextStrike&&progress>0&&player.y<=move.height&&lineDistance(enemy,next,player)<=cast.lane){
    cast.nextStrike++;
    return impact(enemy,player,move,true);
   }
   if(progress>=1&&!cast.nextStrike)cast.nextStrike++;
  }
  return null;
 }
 if(t+1e-8>=move.windup&&!cast.nextStrike){
  cast.nextStrike++;
  return impact(enemy,player,move,stormContains(cast,player));
 }
 return null;
}
function steer(enemy,player,dt,bounds){
 enemy.bossGlide=false;
 enemy.attackCooldown=Math.max(0,enemy.attackCooldown-dt);
 const cooldowns=enemy.bossCooldowns??={};
 for(const key of Object.keys(cooldowns))cooldowns[key]=Math.max(0,cooldowns[key]-dt);
 if(enemy.stun>0){enemy.state='stun';return null;}
 if(enemy.state==='attack')return perform(enemy,player,dt,bounds,profile.moves[enemy.bossMove],enemy.bossCast);
 const dx=player.x-enemy.x,dz=player.z-enemy.z;
 if(Math.abs(dx)>.1)enemy.face=Math.sign(dx);
 if(!enemy.attackCooldown&&enemy.y<.04){
  const next=enemy.nextBossMove??0;
  for(let i=0;i<order.length;i++){
   const kind=order[(next+i)%order.length],move=profile.moves[kind];
   if(cooldowns[kind]||kind==='rake'&&(Math.abs(dx)>3.6||Math.abs(dz)>.84)||
      kind==='storm'&&(Math.abs(dx)>8.4||Math.abs(dz)>2.3))continue;
   enemy.nextBossMove=(next+i+1)%order.length;enemy.bossMove=kind;
   enemy.bossCast=aim(enemy,player,bounds);enemy.state='attack';enemy.t=0;
   enemy.vx=enemy.pullVZ=0;enemy.attackCooldown=move.windup+move.active+move.recover+.2;
   if(move.cooldown)cooldowns[kind]=move.cooldown;
   return null;
  }
 }
 const gap=Math.hypot(dx,dz);
 enemy.state=gap>1.6?'run':'idle';
 if(enemy.state==='run'){
  const speed=profile.speed*(enemy.slow>0?.7:1);
  enemy.walkVX=dx/gap*speed;enemy.walkVZ=dz/gap*speed;
 }
 return null;
}
const api={type,profile,steer,stormContains};
if(typeof module!=='undefined')module.exports=api;else root.ThunderBeast=api;
})(typeof window!=='undefined'?window:globalThis);
