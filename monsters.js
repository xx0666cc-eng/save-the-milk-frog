/* Enemy definitions and behavior use the same fixed step and hurt rules as fighters. */
(function(root){
'use strict';
const {bodyScale}=typeof module!=='undefined'?require('./arena-config.js'):root.ArenaConfig;
const morris=typeof module!=='undefined'?require('./morris.js'):root.Morris;
const thunderBeast=typeof module!=='undefined'?require('./thunder-beast.js'):root.ThunderBeast;
const capital=typeof module!=='undefined'?require('./capital-enemies.js'):root.CapitalEnemies;
const sakura=typeof module!=='undefined'?require('./sakura-ronin.js'):root.SakuraRonin;
const bell=typeof module!=='undefined'?require('./bell-master.js'):root.BellMaster;
const types={
 dozer:{name:'瞌睡毛团',image:'assets/monsters/dozer.png',hp:26,damage:6,speed:2.5,reach:1.48,height:2.65,windup:.52,cooldown:1.35},
 bucket:{name:'提桶小蛙',image:'assets/monsters/bucket.png',hp:30,damage:7,speed:2.95,reach:1.48,height:2.65,windup:.46,cooldown:1.52},
 puff:{name:'气鼓泡泡',image:'assets/monsters/puff.png',hp:22,damage:5,speed:3.55,reach:1.34,height:2.58,windup:.36,cooldown:1.25},
 'doze-chief':{
  name:'阿困',boss:true,hp:144,speed:2.25,height:3.75,guardMax:80,
  poise(enemy){
   const move=enemy.state==='attack'&&this.moves[enemy.bossMove];
   return !!move&&enemy.t<move.windup+move.active;
  },
  frames:{
   idle:{image:'assets/monsters/doze-chief/idle.png',anchorX:.476,footY:.992,bodyHeight:.985,face:-1},
   claw:{image:'assets/monsters/doze-chief/claw.png',anchorX:.549,footY:.923,bodyHeight:.888,face:1},
   mist:{image:'assets/monsters/doze-chief/mist.png',anchorX:.329,footY:.854,bodyHeight:.736,face:1},
   charge:{image:'assets/monsters/doze-chief/charge.png',anchorX:.524,footY:.866,bodyHeight:.834,face:1}
  },
  moves:{
   claw:{name:'挥爪',windup:.44,active:.20,recover:.58,aim:2.5,near:0,reach:2.55,lane:.9,height:1.15,damage:11,stun:.34,push:1.2},
   mist:{name:'紫雾吐息',windup:.66,active:.58,recover:.60,aim:3.7,near:.40,reach:3.58,innerLane:.46,lane:1.16,height:1.55,hitY:1.75,damage:12,stun:.34,push:1.1},
   charge:{name:'蓄力冲撞',windup:.84,active:.52,recover:.78,aim:6.6,near:0,reach:1.58,lane:.87,height:.82,speed:10.2,damage:17,stun:.54,push:1.85}
  }
 },
 [morris.bossType]:morris.boss,
 [morris.puppetType]:morris.puppet,
 [thunderBeast.type]:thunderBeast.profile,
 [capital.bossType]:capital.boss,
 [capital.eliteType]:capital.elite,
 [sakura.type]:sakura.profile,
 [bell.type]:bell.profile
};
const trial=[{type:'dozer',x:1.1,z:-.85},{type:'bucket',x:2.85,z:.2},{type:'puff',x:4.45,z:1.45}];
const fadeTime=.65;
const recovery=.34;
const bossOrder=['claw','mist','charge'];

function steerBoss(boss,player,profile,dt,bounds){
 const dx=player.x-boss.x,dz=player.z-boss.z;
 const scale=bodyScale(boss);
 boss.attackCooldown=Math.max(0,boss.attackCooldown-dt);
 if(boss.stun>0){boss.state='stun';return null;}
 if(boss.state==='attack'){
  const move=profile.moves[boss.bossMove],end=move.windup+move.active;
  if(boss.t>=end+move.recover){boss.state='idle';return null;}
  if(boss.t<move.windup||boss.t>=end)return null;

  // The charge hits along the actual movement step, including the leading edge of its body.
  let travel=0;
  if(move.speed){
   const edge=boss.face>0?bounds.right:bounds.left;
   travel=Math.min(move.speed*dt,Math.max(0,(edge-boss.x)*boss.face));
   boss.walkVX=boss.face*travel/dt;
  }
  const forward=dx*boss.face/scale;
  const spread=Math.min(1,Math.max(0,(forward-move.near)/(move.reach-move.near)));
  const lane=move.innerLane===undefined?move.lane:move.innerLane+(move.lane-move.innerLane)*spread;
  if(!boss.struck&&forward>=move.near&&forward<=move.reach+travel/scale&&Math.abs(dz)<=lane*scale&&player.y<=move.height*scale){
   boss.struck=true;
   return move;
  }
  return null;
 }
 if(boss.y>.03){boss.state='idle';return null;}
 if(Math.abs(dx)>.10)boss.face=Math.sign(dx);
 if(!boss.attackCooldown&&Math.abs(dz)<=.76*scale&&player.y<=scale){
  const next=boss.nextBossMove??0;
  for(let offset=0;offset<bossOrder.length;offset++){
   const index=(next+offset)%bossOrder.length,kind=bossOrder[index],move=profile.moves[kind];
   if(Math.abs(dx)>move.aim*scale||Math.abs(dx)<move.near*scale)continue;
   boss.nextBossMove=(index+1)%bossOrder.length;
   boss.bossMove=kind;
   boss.state='attack';boss.t=0;boss.struck=false;
   boss.attackCooldown=move.windup+move.active+move.recover+.22;
   return null;
  }
 }
 const mx=Math.abs(dx)>1.9*scale?dx:0,mz=Math.abs(dz)>.28?dz:0;
 const gap=Math.hypot(mx,mz);
 boss.state=gap?'run':'idle';
 if(gap){
  const speed=profile.speed*(boss.slow>0?.7:1);
  boss.walkVX=mx/gap*speed;boss.walkVZ=mz/gap*speed;
 }
 return null;
}

function steer(monster,player,dt,bounds,monsters,spawn){
 const profile=types[monster.monsterType];
 if(monster.monsterType===bell.type)return bell.steer(monster,player,dt,bounds);
 if(monster.monsterType===sakura.type)return sakura.steer(monster,player,dt,bounds);
 if(monster.monsterType===morris.bossType)return morris.steer(monster,player,dt,bounds,monsters,spawn);
 if(monster.monsterType===thunderBeast.type)return thunderBeast.steer(monster,player,dt,bounds);
 if(monster.monsterType===capital.bossType||profile.elite)return capital.steer(monster,player,dt,bounds,monsters,spawn);
 if(profile.boss)return steerBoss(monster,player,profile,dt,bounds);
 const dx=player.x-monster.x,dz=player.z-monster.z;
 const distance=Math.hypot(dx,dz);
 const scale=bodyScale(monster),reach=profile.reach*scale;
 const inReach=Math.abs(dx)<=reach&&Math.abs(dz)<=.72*scale&&player.y<=.75*scale;
 monster.attackCooldown=Math.max(0,monster.attackCooldown-dt);
 if(monster.stun>0){monster.state='stun';return null;}
 if(monster.state==='attack'){
  if(monster.t>=profile.windup+recovery){monster.state='idle';return null;}
  const atImpact=!monster.struck&&monster.t>=profile.windup;
  if(atImpact){
   monster.struck=true;
   if(inReach&&dx*monster.face>=-.18)return {damage:profile.damage,stun:.26,push:.75};
  }
  return null;
 }
 if(distance<=9.8)monster.alerted=true;
 if(!monster.alerted||monster.y>.03){monster.state='idle';return null;}
 monster.face=Math.abs(dx)>.12?Math.sign(dx):monster.face;
 if(inReach){
  monster.state='idle';
  if(!monster.attackCooldown){
   monster.state='attack';monster.t=0;monster.struck=false;
   monster.attackCooldown=profile.windup+recovery+profile.cooldown;
  }
 }else{
  const speed=profile.speed*(monster.slow>0?.7:1)*(distance>5?(profile.farSpeed??1):1)*(monster.allyBoost>0?capital.boost.speed:1);
  const gapX=Math.abs(dx)>reach*.88?dx:0;
  const gapZ=Math.abs(dz)>.32?dz:0;
  const gap=Math.hypot(gapX,gapZ);
  if(gap){
   monster.state='run';
   monster.walkVX=gapX/gap*speed;
   monster.walkVZ=gapZ/gap*speed;
  }else monster.state='idle';
 }
 return null;
}
const api={types,trial,fadeTime,recovery,steer};
if(typeof module!=='undefined')module.exports=api;else root.Monsters=api;
})(typeof window!=='undefined'?window:globalThis);
