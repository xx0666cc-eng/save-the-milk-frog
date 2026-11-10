/* Chapter-six Silenced faction. Ground x/z, ordinary hurt rules and game-clock casts. */
(function(root){
'use strict';
const {bodyScale,world}=typeof module!=='undefined'?require('./arena-config.js'):root.ArenaConfig;
const ids={shade:'silenced-shade',guard:'silenced-guard',cantor:'silenced-cantor'};
const asset='assets/monsters/silenced/';
const types={
 [ids.shade]:{name:'雾游残影',faction:'silenced',role:'melee',hp:22,speed:3.55,height:2.65,hoverHeight:.12,barHeight:2.35,
  frames:{idle:{image:asset+'shade-base.png'}},standOff:1.30,
  moves:{
   claw:{name:'幽爪抓挠',windup:.32,active:.12,recover:.26,cooldown:1.15,damage:5,reach:1.55,lane:.72,height:1.25,stun:.25,push:.6},
   dash:{name:'雾影突进',windup:.48,active:.34,recover:.38,cooldown:4.8,damage:7,reach:1.50,lane:.68,height:1.40,speed:8.6,stun:.28,push:.8,aim:5.2}
  }},
 [ids.guard]:{name:'破誓守卫',faction:'silenced',role:'melee',hp:38,speed:2.25,height:4.75,barHeight:3.55,
  frames:{idle:{image:asset+'guard-base.png'}},standOff:2.30,damageTaken(){return .8;},
  moves:{
   thrust:{name:'破誓重刺',windup:.70,active:.14,recover:.36,cooldown:2.10,damage:7,reach:2.75,lane:.75,height:1.45,stun:.36,push:1.05},
   quake:{name:'裂地震击',windup:1.15,active:.18,recover:.58,cooldown:6.2,damage:10,radiusX:3.5,radiusZ:2.15,height:.68,stun:.45,push:1.35,aim:3.6}
  }},
 [ids.cantor]:{name:'余响祭司',faction:'silenced',role:'ranged',hp:26,speed:2.5,height:3.45,hoverHeight:.80,barHeight:3.30,
  frames:{idle:{image:asset+'cantor-base.png'}},standOff:7.5,minDistance:4.6,maxDistance:9.5,sight:20,
  moves:{
   bolt:{name:'幽能弹',windup:.60,active:.04,recover:.38,cooldown:1.65,damage:5,projectile:true,kind:'silencedOrb',speed:10.2,life:2.6,muzzleX:1.54,muzzleY:2.07,stun:.24,push:.45,halfDepth:.24},
   ritual:{name:'余响仪式波',windup:1.20,active:.08,recover:.55,cooldown:6.4,damage:8,projectile:true,kind:'silencedRitual',speed:7.4,life:2.8,muzzleX:.9,muzzleY:.18,stun:.32,push:1.05,halfDepth:.65,slow:1.1}
  }}
};
const motion={acceleration:9,arrival:.10,depthTolerance:.28};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function owns(unit){return !!types[unit.monsterType];}
function coveredBy(enemy,player,monsters){
 const dir=Math.sign(player.x-enemy.x)||enemy.face,distance=Math.abs(player.x-enemy.x);
 return monsters.filter(m=>{
  const p=types[m.monsterType],forward=(m.x-enemy.x)*dir;
  return m!==enemy&&m.hp>0&&p?.role==='melee'&&forward>.15&&forward<distance+.15;
 });
}
function walk(enemy,dx,dz,dt,speed,stop=0){
 const mx=Math.abs(dx)>stop?Math.sign(dx)*(Math.abs(dx)-stop):0,mz=Math.abs(dz)>motion.depthTolerance?Math.sign(dz)*(Math.abs(dz)-motion.depthTolerance):0,n=Math.hypot(mx,mz);
 const blend=1-Math.exp(-motion.acceleration*dt),slow=enemy.slow>0?.7:1;
 enemy.silencedVX=(enemy.silencedVX||0)+((n?mx/n*speed*slow:0)-(enemy.silencedVX||0))*blend;
 enemy.silencedVZ=(enemy.silencedVZ||0)+((n?mz/n*speed*slow:0)-(enemy.silencedVZ||0))*blend;
 enemy.walkVX=mx?Math.sign(mx)*Math.min(Math.max(0,enemy.silencedVX*Math.sign(mx)),Math.abs(mx)/dt):0;
 enemy.walkVZ=mz?Math.sign(mz)*Math.min(Math.max(0,enemy.silencedVZ*Math.sign(mz)),Math.abs(mz)/dt):0;
 enemy.state=Math.hypot(enemy.walkVX,enemy.walkVZ)>.025?'run':'idle';
}
function hold(enemy){enemy.walkVX=enemy.walkVZ=enemy.silencedVX=enemy.silencedVZ=0;enemy.state='idle';}
function begin(enemy,player,kind){
 const m=types[enemy.monsterType].moves[kind],dx=player.x-enemy.x,dz=player.z-enemy.z,n=Math.hypot(dx,dz)||1;
 enemy.state='attack';enemy.t=0;enemy.bossMove=kind;
 enemy.bossCast={kind,face:enemy.face,x:enemy.x,z:enemy.z,targetX:player.x,targetZ:player.z,dirX:dx/n,dirZ:dz/n,fired:false};
 if(kind==='quake')Object.assign(enemy.bossCast,{hitX:enemy.x+enemy.face*1.2*bodyScale(enemy),hitZ:enemy.z});
 enemy.attackCooldown=m.windup+m.active+m.recover+.10;
 (enemy.silencedCooldowns??={})[kind]=m.cooldown;
 enemy.walkVX=enemy.walkVZ=enemy.silencedVX=enemy.silencedVZ=0;
}
function meleeHit(enemy,player,m,travel=0){
 const s=bodyScale(enemy),c=enemy.bossCast,dx=player.x-enemy.x,dz=player.z-enemy.z;
 if(player.y>m.height)return false;
 if(c.kind==='dash'){
  const along=dx*c.dirX+dz*c.dirZ,side=Math.abs(dx*c.dirZ-dz*c.dirX);
  return along>=-.25&&along<=m.reach*s+travel&&side<=m.lane*s;
 }
 return dx*c.face>=-.18&&dx*c.face<=m.reach*s&&Math.abs(dz)<=m.lane*s;
}
function hitMove(enemy,player,m){return {...m,hitY:(player.y+1.2*bodyScale(player)-enemy.y)/bodyScale(enemy)};}
function cast(enemy,player,dt,bounds){
 const profile=types[enemy.monsterType],c=enemy.bossCast,m=profile.moves[c.kind],end=m.windup+m.active;
 if(enemy.t>=end+m.recover){enemy.state='idle';return null;}
 if(enemy.t<m.windup)return null;
 let travel=0;
 if(c.kind==='dash'&&enemy.t<end){
  const length=m.speed*dt,tx=clamp(enemy.x+c.dirX*length,bounds.left,bounds.right),tz=clamp(enemy.z+c.dirZ*length,-world.halfDepth,world.halfDepth);
  enemy.walkVX=(tx-enemy.x)/dt;enemy.walkVZ=(tz-enemy.z)/dt;travel=Math.hypot(tx-enemy.x,tz-enemy.z);
 }
 if(c.fired)return null;
 if(m.projectile){
  c.fired=true;
  return {...m,aimPoint:{x:player.x,y:player.y+1.2*bodyScale(player),z:player.z},maxTargetY:1.6};
 }
 if(c.kind==='quake'){
  c.fired=true;const s=bodyScale(enemy);
  if(player.y<=m.height&&Math.hypot((player.x-c.hitX)/(m.radiusX*s),(player.z-c.hitZ)/(m.radiusZ*s))<=1)
   return {...hitMove(enemy,player,m),source:{x:c.hitX,z:c.hitZ,dir:Math.sign(player.x-c.hitX)||c.face,kind:'silencedQuake'}};
  return null;
 }
 if(enemy.t>=end){c.fired=true;return null;}
 if(meleeHit(enemy,player,m,travel)){c.fired=true;return hitMove(enemy,player,m);}
 return null;
}
function steer(enemy,player,dt,bounds,monsters){
 const p=types[enemy.monsterType],s=bodyScale(enemy);
 enemy.attackCooldown=Math.max(0,enemy.attackCooldown-dt);
 const cds=enemy.silencedCooldowns??={};for(const k of Object.keys(cds))cds[k]=Math.max(0,cds[k]-dt);
 if(enemy.stun>0){hold(enemy);enemy.state='stun';return null;}
 if(enemy.state==='attack')return cast(enemy,player,dt,bounds);
 if(enemy.y>(p.hoverHeight??0)+.06){hold(enemy);enemy.state='jump';return null;}
 const dx=player.x-enemy.x,dz=player.z-enemy.z,distance=Math.hypot(dx,dz);
 if(distance<=(p.sight??12))enemy.alerted=true;
 if(!enemy.alerted){hold(enemy);return null;}
 if(Math.abs(dx)>.10)enemy.face=Math.sign(dx);
 if(p.role==='ranged'){
  const covering=coveredBy(enemy,player,monsters);enemy.screenedBy=covering.map(m=>m.id);
  if(covering.length)hold(enemy); // No chasing/forward drift while a melee line is in front.
  else if(distance<p.minDistance){
   const away=-Math.sign(dx||enemy.face),room=away>0?bounds.right-enemy.x:enemy.x-bounds.left;
   if(room>motion.arrival)walk(enemy,away*(p.minDistance-distance),0,dt,p.speed);
   else hold(enemy);
  }else if(distance>p.maxDistance)walk(enemy,dx,dz,dt,p.speed,p.standOff);
  else hold(enemy);
  if(enemy.state==='run'||enemy.attackCooldown||distance>p.sight)return null;
  const order=['bolt','ritual'],start=enemy.nextSilencedMove??0;
  for(let i=0;i<order.length;i++){const index=(start+i)%2,kind=order[index];if(cds[kind])continue;begin(enemy,player,kind);enemy.nextSilencedMove=(index+1)%2;break;}
  return null;
 }
 const basic=p===types[ids.shade]?'claw':'thrust',special=p===types[ids.shade]?'dash':'quake',b=p.moves[basic],m=p.moves[special];
 if(!enemy.attackCooldown){
  if(!cds[special]&&distance<=m.aim*s&&(special!=='dash'||distance>2.0*s)){begin(enemy,player,special);return null;}
  if(!cds[basic]&&Math.abs(dx)<=b.reach*s&&Math.abs(dz)<=b.lane*s){begin(enemy,player,basic);return null;}
 }
 walk(enemy,dx,dz,dt,p.speed,p.standOff*s);return null;
}
const api={ids,types,motion,owns,coveredBy,meleeHit,steer};
if(typeof module!=='undefined')module.exports=api;else root.SilencedEnemies=api;
})(typeof window!=='undefined'?window:globalThis);

