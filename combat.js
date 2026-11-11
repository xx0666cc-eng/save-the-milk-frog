/* Fixed-step combat. No dependency on meshes, renderer, browser, or assets. */
(function(root){
'use strict';
const monsters=typeof module!=='undefined'?require('./monsters.js'):root.Monsters;
const encounters=typeof module!=='undefined'?require('./encounters.js'):root.Encounters;
const {boost:allyBoost}=typeof module!=='undefined'?require('./capital-enemies.js'):root.CapitalEnemies;
const {world:ARENA,bodyScale}=typeof module!=='undefined'?require('./arena-config.js'):root.ArenaConfig;
const autoAttacks=typeof module!=='undefined'?require('./auto-attack.js'):root.AutoAttacks;
const growth=typeof module!=='undefined'?require('./growth.js'):root.Growth;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const PLAYER_STATS={
 fist:{hp:120,speed:5.3},bow:{hp:105,speed:5.3},magic:{hp:95,speed:4.9},
 fan:{hp:115,speed:5.3},president:{hp:110,speed:5.2},sword:{hp:130,speed:4.8}
};
const ENERGY_RULES={hit:6,regenInterval:2,comboStep:5,comboBonus:5,breakBonus:15};
const GUARD_RULES={duration:3,vulnerability:1.3,regenDelay:4,regenSpeed:10,
 damage:{jab:6,cross:6,finisher:6,heavy:12,wave:12,super:30}};
// x/z are world-space ground coordinates at the feet. y is jump height.
const MELEE_DEPTH={normal:.8,super:1,bossBonus:.189};
const PROJECTILE_DEPTH={
 tolerance:.24,
 targetHalfDepth:{fighter:.35,monster:.44,boss:.61},
 halfDepth:{wave:.37,arrow:.31,orb:.40,moonBlade:.36,moonFan:.46,blade:.42,goldStar:.32,firedStamp:.60,holyFeather:.24}
};
const PILLAR_TRAVEL_SPEED=6;
const PILLAR_DROP_TIME=.18;
const PILLAR_AREA={radius:1.8,depth:1.8};
const MOON_AREA={radius:3,depth:3};
const SWORD_SWEEP_AREA={radius:4.8,depth:2.5};
const SWORD_FINISH_AREA={radius:5.6,depth:3.2};
const inGroundArea=(dx,dz,radius,depth)=>Math.hypot(dx/radius,dz/depth)<=1;
function groundContactTime(dx,dz,travelX,travelZ,halfWidth,halfDepth){
 // Both axes must overlap during the same part of this fixed step.
 let enter=0,exit=1;
 for(const [offset,travel,extent] of [[dx,travelX,halfWidth],[dz,travelZ,halfDepth]]){
  if(travel===0){
   if(Math.abs(offset)>=extent)return null;
   continue;
  }
  const near=(offset-extent)/travel,far=(offset+extent)/travel;
  enter=Math.max(enter,Math.min(near,far));
  exit=Math.min(exit,Math.max(near,far));
  if(enter>=exit)return null;
 }
 return enter;
}
const MOVES={
 jab:{duration:.31,hit:.085,active:.09,reach:1.55,damage:6,stun:.33,push:1.0,step:2.1},
 cross:{duration:.34,hit:.10,active:.09,reach:1.8,damage:8,stun:.38,push:1.2,step:3.1},
 finisher:{duration:.49,hit:.14,active:.10,reach:2.10,damage:11,stun:.49,push:2.3,step:3.4},
 heavy:{duration:.65,hit:.20,active:.12,reach:2.0,damage:17,stun:.67,push:1.8,lift:7.1,step:2.2},
 wave:{duration:.52,hit:.20,active:0,reach:0,damage:12,cost:20,cooldown:3},
 super:{duration:1.05,hit:.20,active:.08,reach:5.6,damage:10,cost:100}
};
// The original frog's player kit is separate from the arcade CPU's fists.
const FROG_MOVES={
 wave:{...MOVES.wave,kind:'laughWave',duration:.78,hit:.23,damage:14,stun:.72,push:1.2,
  radius:6,halfAngle:Math.PI/4,travelTime:.28,cone:true,daze:true},
 super:{...MOVES.super,kind:'angelForm',duration:.75,hit:.30,active:0,reach:0,damage:0,formDuration:10}
};
const ANGEL_MOVES={
 jab:{...MOVES.jab,kind:'holyFeather',duration:.58,hit:.13,active:0,step:0,damage:8,stun:.30,push:.32,
  projectile:true,shotCount:3,shotInterval:.10,speed:20,life:.43,muzzleX:1.47,muzzleY:2.02,splash:{radius:1.20,damage:4}},
 wave:{...FROG_MOVES.wave,kind:'holyWave',damage:25,stun:1.15,push:1.6,radius:8,
  halfAngle:52*Math.PI/180,travelTime:.34}
};
function soundWaveOrigin(f){
 const scale=bodyScale(f);
 return {x:f.x+f.face*.53*scale,y:f.y+2.18*scale,z:f.z,dir:f.face,scale};
}
const WEAPON_MOVES={
 president:{
  jab:{...MOVES.jab,damage:4,duration:.27,hit:.10,active:0,step:0,projectile:true,kind:'goldStar',speed:22,life:.85},
  cross:{...MOVES.cross,damage:6,duration:.29,hit:.11,active:0,step:0,projectile:true,kind:'goldStar',speed:23,life:.85},
  finisher:{...MOVES.finisher,damage:8,duration:.36,hit:.14,active:0,step:0,projectile:true,kind:'goldStar',speed:24,life:.85},
  wave:{...MOVES.wave,duration:.66,hit:.23,damage:16,stun:.85,push:2.6,projectile:true,kind:'firedStamp',speed:17,life:.9},
  super:{...MOVES.super,duration:3,hit:.25,damage:12,slow:3,kind:'rally',pulses:5,sweepTime:.55}
 },
 fan:{
  jab:{duration:.43,hit:.13,active:0,damage:7,stun:.30,push:.6,step:0,projectile:true,kind:'moonBlade',speed:14,life:1.15},
  cross:{duration:.48,hit:.16,active:0,damage:9,stun:.36,push:.7,step:0,projectile:true,kind:'moonBlade',speed:15,life:1.15,slow:.6},
  finisher:{duration:.60,hit:.22,active:0,damage:12,stun:.48,push:2.6,step:0,projectile:true,kind:'moonBlade',speed:16,life:1.15},
  heavy:{...MOVES.heavy,reach:2.5},
  wave:{duration:.65,hit:.18,active:0,damage:12,stun:.36,push:.25,cost:20,cooldown:3,projectile:true,kind:'moonFan',boomerang:true,range:6,speed:12,life:3},
  super:{duration:1.35,hit:0,active:0,damage:8,cost:100,groundSpell:true,moonField:true}
 },
 magic:{
  jab:{duration:.48,hit:.16,active:0,damage:8,stun:.33,push:.7,step:0,projectile:true,kind:'orb',speed:13,life:1.4},
  cross:{duration:.50,hit:.18,active:0,damage:11,stun:.38,push:.8,step:0,projectile:true,kind:'orb',speed:14,life:1.4},
  finisher:{duration:.62,hit:.24,active:0,damage:15,stun:.48,push:1.4,step:0,projectile:true,kind:'orb',speed:15,life:1.4},
  wave:{...MOVES.wave,damage:16,projectile:true,kind:'orb',speed:12,life:1.6},
  super:{duration:1.3,hit:0,active:0,damage:40,cost:100,groundSpell:true}
 },
 sword:{
  jab:{...MOVES.jab,damage:7,duration:.35,hit:.11,reach:2.75},
  cross:{...MOVES.cross,damage:9,duration:.39,hit:.13,reach:2.95},
  finisher:{...MOVES.finisher,damage:12,duration:.54,hit:.18,reach:3.25},
  heavy:{...MOVES.heavy,duration:.69,hit:.23,reach:3.1},
  wave:{...MOVES.wave,damage:14,duration:.62,hit:.18,step:14,kind:'blade',piercing:true},
  super:{...MOVES.super,reach:4.8}
 },
 bow:{
  jab:{duration:.48,hit:.16,active:0,damage:7,stun:.33,push:.7,step:0,projectile:true,speed:18,life:.7},
  cross:{duration:.50,hit:.18,active:0,damage:10,stun:.38,push:.8,step:0,projectile:true,speed:18,life:.7},
  finisher:{duration:.62,hit:.24,active:0,damage:14,stun:.48,push:1.4,step:0,projectile:true,speed:20,life:.7},
  heavy:{duration:.70,hit:.28,active:0,damage:17,stun:.67,push:1.4,lift:5.7,step:0,projectile:true,speed:20,life:.7},
  wave:{duration:.60,hit:.22,active:0,damage:14,stun:.58,push:2.1,cost:20,cooldown:3,projectile:true,speed:22,life:.7},
  super:{...MOVES.super,projectile:true,speed:24,life:.7}
 }
};
function moveFor(f,name=f.attack){
 if(f.id===0&&f.weapon==='fist')return (f.angelForm&&ANGEL_MOVES[name])||FROG_MOVES[name]||MOVES[name];
 return WEAPON_MOVES[f.weapon]?.[name]||MOVES[name];
}
function activeMoveFor(f){return f.frogMove||moveFor(f);}
function attackLinkTime(f,name=f.attack){
 const m=name===f.attack?activeMoveFor(f):moveFor(f,name);
 return m.hit+(m.shotCount?(m.shotCount-1)*m.shotInterval:0)+(m.projectile&&name!=='super'?.10:.07);
}
function meleeBounds(f,enemy,reach,lane){
 return {maxX:reach*bodyScale(f)+(enemy.isBoss?.42*bodyScale(enemy):0),
  depth:lane*bodyScale(f)+(enemy.isBoss?MELEE_DEPTH.bossBonus*bodyScale(enemy):0)};
}
function shotOffsets(f,m){
 const arrow=f.weapon==='bow',pointing=m.kind==='goldStar'||m.kind==='firedStamp',scale=bodyScale(f);
 return {kind:arrow?'arrow':m.kind||'wave',
  x:(m.muzzleX??(arrow?1.55:pointing?1.82:1))*scale,
  y:(m.muzzleY??(arrow?2.45:pointing?2.02:f.weapon==='magic'||f.weapon==='fan'?2.05:1.35))*scale};
}
function projectileBounds(ball,enemy){
 const type=enemy.isBoss?'boss':enemy.monsterType?'monster':'fighter',scale=bodyScale(enemy);
 return {width:(enemy.isBoss?1.02:.65)*scale+(ball.kind==='firedStamp'?.30:0),
  depth:(ball.halfDepth??PROJECTILE_DEPTH.halfDepth[ball.kind]??PROJECTILE_DEPTH.halfDepth.wave)+PROJECTILE_DEPTH.targetHalfDepth[type]*scale+PROJECTILE_DEPTH.tolerance};
}
function targetable(enemy){return enemy.hp>0&&!monsters.types[enemy.monsterType]?.protection?.(enemy);}
function canHurtAt(enemy,atY,kind){
 const arrow=kind==='arrow',scale=bodyScale(enemy);
 return targetable(enemy)&&!(enemy.inv>0||Math.abs(enemy.y+(arrow?1.65:1.2)*scale-atY)>(arrow?1:1.4)*scale);
}
function moveBody(f,dt,move,depth){
 f.x=clamp(f.x+(move+f.vx)*dt,-ARENA.halfWidth,ARENA.halfWidth);
 f.z=clamp(f.z+(depth+(f.pullVZ||0))*dt,-ARENA.halfDepth,ARENA.halfDepth);
 if(f.pullVZ)f.pullVZ*=Math.exp(-dt*12);
 f.vx*=Math.exp(-dt*12);
 f.y+=f.vy*dt;f.vy-=24*dt;
 const floor=monsters.types[f.monsterType]?.hoverHeight??0;
 if(f.y<=floor){f.y=floor;f.vy=0;if(f.stun===0)f.airHits=0;}
}
function separate(a,b,width=1.1,depth=.7){
 const scale=(bodyScale(a)+bodyScale(b))/2;
 width*=scale;depth*=scale;
 const dx=(b.x-a.x)/width,dz=(b.z-a.z)/depth,dist=Math.hypot(dx,dz);
 if(dist>=1||Math.abs(a.y-b.y)>=1.8*scale)return;
 const nx=dist?dx/dist:1,nz=dist?dz/dist:0,p=(1-dist)/2;
 a.x=clamp(a.x-p*nx*width,-ARENA.halfWidth,ARENA.halfWidth);
 b.x=clamp(b.x+p*nx*width,-ARENA.halfWidth,ARENA.halfWidth);
 a.z=clamp(a.z-p*nz*depth,-ARENA.halfDepth,ARENA.halfDepth);
 b.z=clamp(b.z+p*nz*depth,-ARENA.halfDepth,ARENA.halfDepth);
}
class Fighter{
 constructor(id,x,maxHP){Object.assign(this,{id,x,z:0,y:0,vx:0,vy:0,walkVX:0,walkVZ:0,slow:0,cooldowns:{wave:0,super:0},weapon:'fist',face:id? -1:1,hp:maxHP,maxHP,energy:25,guard:100,state:'idle',t:0,stun:0,inv:0,dashCD:0,attack:null,hit:false,buffer:null,combo:0,comboDamage:0,comboTTL:0,aiWait:0,intent:{},airHits:0,superCasts:[]});}
}
class Game{
 constructor(){this.phase='menu';this.events=[];this.fighters=[];this.monsters=[];this.nextMonsterId=2;this.playerWeapon='fist';this.mode='arcade';this.level=1;this.difficulty=1;this.time=0;this.freeze=0;this.projectiles=[];this.groundSpells=[];this.seed=765;this.stats={maxCombo:0,hits:0,damage:0};}
 rand(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296;}
 emit(type,data={}){this.events.push({type,...data});}
 get acceptsInput(){return this.phase==='fight'||this.phase==='victory'||this.phase==='explore';}
 get campaignWon(){return this.mode==='campaign'&&(this.phase==='victory'||this.phase==='explore');}
 unlimited(f){return f.id===0&&(this.mode==='training'||this.phase==='explore');}
 move(f,name=f.attack){const m=moveFor(f,name);return this.unlimited(f)?{...m,cost:0,cooldown:0}:m;}
 start(mode='arcade',level=1,difficulty=1,waves=[monsters.trial],afterRegion=null){
  const campaign=mode==='campaign'?encounters.levels[level]:null;
  if(mode==='campaign'&&!campaign)throw new RangeError('Campaign level is not available: '+level);
  if(mode==='skirmish'&&(!waves.length||waves.some(group=>!group.length||group.some(({type})=>!Object.hasOwn(monsters.types,type)))))
   throw new RangeError('A skirmish requires at least one valid spawn per wave');
  this.clearEnemyStates();
  this.mode=mode;this.level=level;this.difficulty=difficulty;this.monsters=[];
  this.castSerial=0;
  const player=new Fighter(0,-3,PLAYER_STATS[this.playerWeapon].hp);
  player.autoAttack=null;
  player.energyRegenElapsed=0;
  player.weapon=this.playerWeapon;
  player.permanent=growth.multipliers(this.playerUpgrades);
  player.maxHP=growth.round(player.maxHP*player.permanent.hp);player.hp=player.maxHP;
  this.progression=new growth.Run();
  this.fighters=[player];
  this.encounter=campaign?new encounters.Director(campaign.regions):null;
  const checkpoint=this.encounter?.restoreCheckpoint(afterRegion);
  if(campaign)player.x=checkpoint?.triggerX??campaign.startX;
  this.monsterWaves=mode==='skirmish'?waves:[];
  this.waveIndex=0;this.waveDelay=0;
  if(mode==='skirmish')this.spawnWave();
  else if(mode!=='campaign')this.fighters.push(new Fighter(1,3,mode==='training'?120:100+(level-1)*20));
  if(mode==='training')player.energy=100;
  this.projectiles=[];this.groundSpells=[];this.events=[];this.time=0;this.remaining=99;this.freeze=0;this.phase='intro';this.intro=1.65;this.winner=null;this.stats={maxCombo:0,hits:0,damage:0};this.emit('round');
  if(checkpoint&&this.encounter.cleared){this.phase='victory';this.winner=0;}
 }
 spawnMonster(type,x,z=0){
  if(!Object.hasOwn(monsters.types,type))throw new RangeError('Unknown monster type: '+type);
  const profile=monsters.types[type];
  const growth=this.mode==='campaign'&&!profile.boss?encounters.levels[this.level].enemyScale:null;
  const monster=new Fighter(this.nextMonsterId++,clamp(x,-ARENA.halfWidth,ARENA.halfWidth),Math.round(profile.hp*(growth?.hp??1)));
  Object.assign(monster,{monsterType:type,isBoss:!!profile.boss,y:profile.hoverHeight??0,z:clamp(z,-ARENA.halfDepth,ARENA.halfDepth),alerted:false,struck:false,attackCooldown:0});
  monster.damageScale=growth?.damage??1;
  if(profile.guardMax)Object.assign(monster,{guard:profile.guardMax,guardMax:profile.guardMax,guardIdle:0,guardBreakTime:0,guardCasts:[]});
  this.monsters.push(monster);return monster;
 }
 spawnWave(){
  this.clearEnemyStates();
  this.monsters=[];
  for(const {type,x,z} of this.monsterWaves[this.waveIndex])this.spawnMonster(type,x,z);
 }
 canTarget(enemy){return targetable(enemy);}
 opponents(f){
  const list=f.id!==0?[this.fighters[0]]:['skirmish','campaign'].includes(this.mode)?this.monsters:this.fighters.slice(1);
  return list.filter(enemy=>enemy&&targetable(enemy));
 }
 target(f){
  let nearest,score=Infinity;
  for(const enemy of this.opponents(f)){
   const distance=Math.hypot(enemy.x-f.x,(enemy.z-f.z)*2.5);
   if(distance<score){nearest=enemy;score=distance;}
  }
  return nearest;
 }
 playerSpeed(f){return PLAYER_STATS[f.weapon].speed*(f.slow>0?.7:1)*(this.progression?.boost>0?1+growth.config.experience.speedBonus:1);}
 setPlayerProgression(character,upgrades){
  this.playerCharacter=character;this.playerUpgrades=growth.levels(upgrades);
  const player=this.fighters[0];if(!player)return;
  const fraction=player.hp/player.maxHP;player.permanent=growth.multipliers(this.playerUpgrades);
  player.maxHP=growth.round(PLAYER_STATS[player.weapon].hp*player.permanent.hp);
  player.hp=player.hp>0?growth.round(Math.min(player.maxHP,player.maxHP*fraction)):0;
 }
 addItemDrop(id,quantity,x,z){return this.progression?.addItem(id,quantity,x,z);}
 normalAttackWindow(f,enemy,name=autoAttacks.nextName(f)){
  const m=this.move(f,name),scale=bodyScale(f),targetScale=bodyScale(enemy);
  const clearanceX=(this.fighters[1]?1.1:enemy.isBoss?1.62:1.25)*(scale+targetScale)/2;
  if(!m.projectile)return {...meleeBounds(f,enemy,m.reach,MELEE_DEPTH.normal),minX:0,clearanceX,
   attackable:canHurtAt(enemy,f.y+1.25*scale)};
  const origin=shotOffsets(f,m),shape=projectileBounds({...m,kind:origin.kind},enemy);
  const release=origin.kind==='goldStar'?.85*scale:0;
  return {minX:Math.max(0,origin.x-release-shape.width),maxX:origin.x+(m.speed||12)*(m.life||1.6)+shape.width,
   depth:shape.depth,clearanceX,attackable:enemy.y<=(m.maxTargetY??Infinity)&&canHurtAt(enemy,f.y+origin.y,origin.kind)};
 }
 canNormalHit(f,enemy,name,face=f.face){
  const w=this.normalAttackWindow(f,enemy,name),forward=(enemy.x-f.x)*face;
  return w.attackable&&forward>=w.minX&&forward<w.maxX&&Math.abs(enemy.z-f.z)<w.depth;
 }
 finish(winner){
  this.clearEnemyStates();
  autoAttacks.cancel(this.fighters[0]);
  this.clearPlayerCasts();
  this.projectiles=[];this.phase='ko';this.koTime=1.3;this.winner=winner;this.emit('ko',{winner});
  this.progression?.resetTemporary();
 }
 clearEnemyStates(){for(const enemy of this.monsters)monsters.types[enemy.monsterType]?.endBattle?.(enemy);}
 clearPlayerCasts(){
  const f=this.fighters[0];
  f.superCasts=[];f.angelForm=null;f.frogMove=null;
 }
 updateHealthState(enemy){
  if(!monsters.types[enemy.monsterType]?.afterHurt?.(enemy,this))return;
  if(this.fighters[0]?.autoAttack?.targetId===enemy.id)autoAttacks.cancel(this.fighters[0]);
  this.emit('bossPhase',{id:enemy.id,phase:2});
 }
 exploreCampaign(){
  if(!this.campaignWon)return false;
  if(this.phase==='victory')this.fighters[0].buffer=null;
  this.phase='explore';
  return true;
 }
 strike(f,move,reach,lane,height,area=false){
  const scale=bodyScale(f),hitY=f.y+(height-f.y)*scale;
  for(const enemy of this.opponents(f)){
   const dx=enemy.x-f.x,dz=enemy.z-f.z,forward=dx*f.face;
   const inFront=f.id===0?forward>=0:forward>-.3;
   const bounds=meleeBounds(f,enemy,reach,lane);
   const inRange=area?inGroundArea(dx,dz,reach,lane):inFront&&Math.abs(dx)<bounds.maxX&&Math.abs(dz)<bounds.depth;
   if(inRange)this.hurt(f,enemy,move,hitY,false,area?{dir:Math.sign(dx)||f.face}:null);
   if(this.phase==='ko')break;
  }
 }
 setPlayerWeapon(weapon){
  weapon=Object.hasOwn(WEAPON_MOVES,weapon)?weapon:'fist';this.playerWeapon=weapon;
  const f=this.fighters[0];if(!f||f.weapon===weapon)return;
  autoAttacks.cancel(f);
  const fraction=f.hp/f.maxHP;
  f.maxHP=growth.round(PLAYER_STATS[weapon].hp*(f.permanent?.hp??1));f.hp=f.hp>0?Math.max(1,growth.round(f.maxHP*fraction)):0;
  f.weapon=weapon;f.cooldowns={wave:0,super:0};f.buffer=null;f.combo=f.comboDamage=f.comboTTL=0;f.walkVX=f.walkVZ=0;this.clearPlayerCasts();
  if(f.state==='attack'){f.state=f.y>0?'jump':'idle';f.attack=null;f.t=0;}f.spawned=false;f.hit=false;
  this.projectiles=this.projectiles.filter(p=>p.owner!==0);
  this.groundSpells=this.groundSpells.filter(p=>p.owner!==0);
 }
 queue(id,action){
  const f=this.fighters[id];if(!f||!this.acceptsInput)return;
  if(id===0&&action!=='light')autoAttacks.cancel(f);
  f.buffer={action,expires:this.time+.24};
  if(id===0&&action==='light')autoAttacks.request(this,f);
 }
 launch(f,name){
  const m=this.move(f,name);
  if(m.cooldown&&f.cooldowns[name]>0){if(f.id===0)this.emit('cooldown',{name,remaining:f.cooldowns[name]});return false;}
  if(m.cost&&f.energy<m.cost){if(f.id===0)this.emit('energyLow');return false;}
  f.energy-=m.cost||0;
  if(name in f.cooldowns)f.cooldowns[name]=m.cooldown||0;
  f.attack=name;f.state='attack';f.t=0;f.hit=false;f.spawned=false;f.swingShown=false;f.strikes=0;
  if(f.id===0&&f.weapon==='fist')f.frogMove=m;
  f.castId=++this.castSerial;
  if(f.id===0)autoAttacks.launched(f,name);
  if(f.id!==0)f.face=Math.sign(this.target(f)?.x-f.x)||f.face;
  this.emit('attack',{id:f.id,name,weapon:f.weapon});
  if(f.weapon==='sword'&&name==='wave')f.inv=.15;
  if(name==='super'){
   // Player hit reactions stop the body, not an already committed ultimate.
   if(f.id===0)f.superCasts.push({move:{...m},castId:f.castId,startedAt:this.time,t:0,strikes:0,spawned:false});
   else f.inv=.3;
   this.emit('super',{id:f.id,weapon:f.weapon});
  }
  return true;
 }
 shoot(f,m){
  const arrow=f.weapon==='bow';
  const name=m.attackName??f.attack;
  const power=name==='wave'||name==='super'||name==='heavy';
  const scale=bodyScale(f),origin=shotOffsets(f,m),offsetX=origin.x,offsetY=origin.y;
  const shot={kind:arrow?'arrow':m.kind||'wave',variant:name??f.bossMove,weapon:f.weapon,x:f.x+f.face*offsetX,y:f.y+offsetY,z:f.z,dir:f.face,owner:f.id,life:m.life||1.6,speed:m.speed||12,damage:m.damage||12,stun:m.stun||.45,push:m.push||2.1,lift:m.lift||0,slow:m.slow||0,boomerang:!!m.boomerang,range:m.range||6,traveled:0,returning:false,hitTargets:[[],[]],piercing:!!m.piercing,power};
  shot.castId=m.castId??f.castId;
  if(m.splash)shot.splash=m.splash;
  if(m.aimPoint){
   const dx=m.aimPoint.x-shot.x,dz=m.aimPoint.z-shot.z,distance=Math.hypot(dx,dz)||1;
   Object.assign(shot,{headingX:dx/distance,headingZ:dz/distance,launchY:shot.y,cruiseY:m.aimPoint.y,
    heightBlendDistance:Math.min(1.65,distance),maxTargetY:m.maxTargetY,halfDepth:m.halfDepth});
  }
  if(m.laneEnd!==undefined)Object.assign(shot,{
   laneEnd:m.laneEnd,halfDepth:m.lane,maxTargetY:m.maxTargetY,launchY:shot.y,cruiseY:f.y+m.cruiseY*scale
  });
  if(m.trackTargetHeight){shot.targetHeightId=this.fighters[0].id;shot.maxTargetY=Infinity;}
  if(f.weapon==='magic'&&!power)shot.castFrom={x:f.x,y:f.y,z:f.z};
  this.projectiles.push(shot);
  this.emit(arrow?'arrow':'wave',{id:f.id,weapon:f.weapon});
 }
 launchRally(caster,move){
  const bounds=this.encounter?.bounds(this)||this.arenaWindow||{left:-ARENA.halfWidth,right:ARENA.halfWidth};
  const farX=Math.max(Math.abs(caster.x-bounds.left),Math.abs(bounds.right-caster.x));
  const farZ=ARENA.halfDepth+Math.abs(caster.z);
  this.groundSpells.push({kind:'rally',owner:caster.id,x:caster.x,z:caster.z,age:0,delay:0,
   left:bounds.left,right:bounds.right,radius:Math.hypot(farX,farZ),duration:move.sweepTime,
   damage:move.damage,slow:move.slow,castId:move.castId??caster.castId,hitTargets:[],fired:true});
 }
 updateSuper(f,move,cast,dt){
  const m={...move,attackName:'super',castId:cast.castId};
  if(m.kind==='angelForm'){
   if(cast.spawned||cast.t+1e-9<m.hit)return;
   cast.spawned=true;
   f.angelForm={startedAt:this.time,endsAt:this.time+m.formDuration};
   this.emit('angelTransform',{x:f.x,y:f.y,z:f.z,id:f.id});
  }else if(m.groundSpell){
   if(cast.spawned)return;
   const guiding=!m.moonField&&f.id===0,anchor=m.moonField||guiding?f:this.target(f)||f;
   cast.spawned=true;
   this.groundSpells.push({owner:f.id,kind:m.moonField?'moonField':'pillar',
    x:anchor.x,z:anchor.z,age:-dt,delay:m.moonField?.6:guiding?PILLAR_DROP_TIME:.5,
    duration:2.4,ticks:0,fired:false,castId:cast.castId,
    ...(m.moonField?MOON_AREA:guiding?{...PILLAR_AREA,guiding:true,dir:f.face}:{})});
   this.emit('spellCast',{id:f.id,weapon:f.weapon});
  }else if(m.kind==='rally'){
   const nextPulse=m.hit+cast.strikes*m.sweepTime;
   if(cast.strikes<m.pulses&&cast.t+1e-9>=nextPulse){cast.strikes++;this.launchRally(f,m);}
  }else{
   const sword=f.weapon==='sword',times=sword?[.20,.43,.72]:[.20,.36,.52,.70];
   if(cast.strikes>=times.length||cast.t<times[cast.strikes])return;
   const index=cast.strikes++,last=index===times.length-1,scale=bodyScale(f);
   if(f.weapon==='bow')this.shoot(f,{...m,stun:.5,push:last?3:.3});
   else{
    const area=sword?(last?SWORD_FINISH_AREA:SWORD_SWEEP_AREA):null;
    this.emit(sword?'swordUltimate':'slash',{id:f.id,x:f.x,y:f.y+1.35*scale,z:f.z,face:f.face,weapon:f.weapon,index,last,area,scale});
    this.strike(f,{...m,damage:sword&&last?20:m.damage,stun:sword&&last?.65:.5,push:last?(sword?3.8:3):.3},area?.radius??m.reach,area?.depth??MELEE_DEPTH.super,f.y+1.2,!!area);
   }
  }
 }
 updateRally(spell,caster){
  if(spell.age>spell.duration+1/60)return;
  const waveRadius=spell.radius*Math.min(1,spell.age/spell.duration);
  for(const target of this.opponents(caster)){
   if(spell.hitTargets.includes(target.id)||target.x<spell.left||target.x>spell.right)continue;
   if(Math.hypot(target.x-spell.x,target.z-spell.z)>waveRadius)continue;
   spell.hitTargets.push(target.id);
   this.hurt(caster,target,{damage:spell.damage,slow:spell.slow,fixedDamage:true,unblockable:true,stun:.24,push:.28,attackName:'super',castId:spell.castId},
    target.y+1.2*bodyScale(target),true,{x:spell.x,dir:Math.sign(target.x-spell.x)||caster.face,weapon:'president',kind:'rally'});
   if(this.phase==='ko')return;
  }
 }
 launchSoundWave(f,move,dt){
  const origin=soundWaveOrigin(f);
  this.groundSpells.push({...origin,kind:'soundWave',owner:f.id,age:-dt,delay:0,
   radius:move.radius*origin.scale,halfAngle:move.halfAngle,duration:move.travelTime,
   move:{...move,attackName:'wave',castId:f.castId},hitTargets:[]});
  this.emit('soundWave',{empowered:move.kind==='holyWave'});
 }
 updateSoundWave(spell,caster,dt){
  if(spell.age>spell.duration+dt+1e-9)return;
  const front=spell.radius*Math.min(1,spell.age/spell.duration);
  const rear=Math.max(0,spell.radius*(spell.age-dt)/spell.duration-.60);
  const slope=Math.tan(spell.halfAngle);
  for(const target of this.opponents(caster)){
   if(spell.hitTargets.includes(target.id))continue;
   const forward=(target.x-spell.x)*spell.dir,depth=Math.abs(target.z-spell.z);
   const distance=Math.hypot(forward,depth);
   if(forward<0||depth>forward*slope||distance<rear||distance>front)continue;
   if(this.hurt(caster,target,spell.move,spell.y,true,{x:spell.x,dir:spell.dir,weapon:'fist',kind:spell.move.kind}))
    spell.hitTargets.push(target.id);
   if(this.phase==='ko')return;
  }
 }
 burstFeather(caster,ball,impact){
  this.emit('featherBurst',{x:impact.x,y:ball.y,z:impact.z,dir:ball.dir});
  if(this.phase==='ko')return;
  const move={...ball,damage:ball.splash.damage};
  for(const target of this.opponents(caster)){
   if(target===impact||Math.hypot(target.x-impact.x,target.z-impact.z)>ball.splash.radius)continue;
   this.hurt(caster,target,move,ball.y,true,{x:impact.x-ball.dir,dir:ball.dir,weapon:'fist',kind:ball.kind});
   if(this.phase==='ko')return;
  }
 }
 action(f,action){
  if(f.id===0&&action==='light'&&f.autoAttack?.phase==='approach'&&!f.autoAttack.ready)return false;
  if(action==='super'&&f.id===0&&f.weapon==='magic'){
   const pillar=this.groundSpells.find(s=>s.owner===f.id&&s.kind==='pillar'&&!s.fired);
   if(pillar){
    if(pillar.guiding){
     pillar.guiding=false;
     pillar.age=0;
    }
    return true;
   }
  }
  if(f.stun>0||f.hp<=0||f.state==='dash')return false;
  if(f.state==='attack'){
   const move=activeMoveFor(f);const ranged=move.projectile&&f.attack!=='super',ready=ranged?f.spawned:f.hit;if(!ready||f.t<attackLinkTime(f))return false;
   if(action==='light'&&move.shotCount)return false;
   if(action==='light'&&f.attack==='jab')return this.launch(f,'cross');
   if(action==='light'&&f.attack==='cross')return this.launch(f,'finisher');
   if(action==='heavy'&&['jab','cross','finisher'].includes(f.attack))return this.launch(f,'heavy');
   if(['wave','super'].includes(action)&&f.attack!=='super'&&f.attack!=='wave')return this.launch(f,action);
   return false;
  }
  if(action==='jump'&&f.y<=.001){f.vy=10.0;f.state='jump';return true;}
  if(action==='dash'&&(this.unlimited(f)||f.dashCD<=0)){f.state='dash';f.t=0;f.inv=.12;f.dashCD=this.unlimited(f)?0:.85;const mx=f.intent.move||0,mz=f.intent.depth||0,n=Math.hypot(mx,mz)||1;f.dashDir=mx||mz?mx/n:f.face;f.dashZ=mz/n;this.emit('dash',{id:f.id});return true;}
  if(action==='light')return this.launch(f,'jab');
  if(action==='heavy')return this.launch(f,'heavy');
  if(action==='wave'||action==='super')return this.launch(f,action);
  return false;
 }
 ai(f,dt){
  if(this.mode==='training'){f.intent={move:0,depth:0,guard:false};return;}
  f.aiWait-=dt;if(f.aiWait>0)return;
  const p=this.fighters[0],d=Math.abs(p.x-f.x),toward=Math.sign(p.x-f.x),dz=p.z-f.z,lane=Math.abs(dz),r=this.rand();
  const skill=clamp(this.difficulty*.18+this.level*.06,0,.85);
  f.aiWait=.18+this.rand()*(.32-skill*.18);
  const scale=bodyScale(f);
  f.intent={move:d>1.65*scale?toward:0,depth:lane>.35*scale?Math.sign(dz):0,guard:false};
  if(f.stun>0)return;
  if(f.state==='attack'){if(f.hit&&this.rand()<.65+skill*.25)this.queue(1,f.attack==='cross'&&r<.3?'heavy':'light');return;}
  const incoming=this.projectiles.some(b=>b.owner!==f.id&&Math.abs(b.x-f.x)<3.5&&Math.abs(b.z-f.z)<.8);
  if((p.state==='attack'&&d<2.7&&lane<.85)||incoming){
   if(r<.25+skill*.45){f.intent={move:0,depth:0,guard:true};return;}
   if(r>.8&&f.dashCD<=0){f.intent.move=0;f.intent.depth=f.z>0?-1:1;this.queue(1,'dash');return;}
  }
  if(d<2.05*scale&&lane<.65*scale){
   if(r<.10){f.intent.move=-toward;return;}
   if(f.energy>=100&&r>.65)this.queue(1,'super');
   else this.queue(1,r>.74?'heavy':'light');
  } else if(lane<.6&&d>3&&f.energy>=MOVES.wave.cost&&r<.16+skill*.2){f.intent.move=0;this.queue(1,'wave');}
  else if(d>4&&r>.78)this.queue(1,'dash');
  else if(d>2.5&&r<.08)this.queue(1,'jump');
 }
 damageGuard(a,b,m){
  if(a.id!==0||!b.guardMax||!targetable(b))return;
  b.guardIdle=0;
  if(b.guardBreakTime>0||b.guard<=0)return;
  const name=m.attackName??m.variant??a.attack??'jab',amount=GUARD_RULES.damage[name];
  if(!amount)return;
  const castId=m.castId??a.castId;
  if(castId&&['heavy','wave','super'].includes(name)){
   if(b.guardCasts.includes(castId))return;
   b.guardCasts.push(castId);
  }
  b.guard=Math.max(0,b.guard-amount);
  if(b.guard>0)return;
  b.guardBreakTime=GUARD_RULES.duration;b.stun=GUARD_RULES.duration;
  b.state='stun';b.attack=null;b.buffer=null;b.bossGlide=b.smokeDashing=false;
  a.energy=clamp(a.energy+ENERGY_RULES.breakBonus,0,100);
  this.emit('guardBreak',{id:b.id,enemy:true});
 }
 hurt(a,b,m,atY,projectile=false,source=null){
  if(!canHurtAt(b,atY,source?.kind))return false;
  const profile=monsters.types[b.monsterType];
  const dir=source?.dir??a.face,weapon=source?.weapon||a.weapon,front=((source?.x??a.x)-b.x)*b.face>=-.15;
  if(!m.unblockable&&b.state==='guard'&&front&&b.y===0){
   const before=b.hp;
   b.guard=Math.max(0,b.guard-m.damage*2.7);b.hp=Math.max(Math.min(1,before),growth.round(b.hp-1/(b.id===0?b.permanent?.defense??1:1)));b.vx=dir*2.4;
   this.applyLifesteal(a,before-b.hp);
   a.energy=clamp(a.energy+4,0,100);b.energy=clamp(b.energy+3,0,100);
   a.hit=true;this.freeze=.045;this.emit('block',{x:b.x,y:atY,unitY:b.y,z:b.z,id:b.id,attacker:a.id,effectiveDamage:growth.round(before-b.hp),weapon});
   if(b.guard<=0){b.stun=b.id===0?2:1;b.state='stun';b.attack=null;this.emit('guardBreak',{id:b.id});}
   this.updateHealthState(b);return true;
  }
  if(profile?.parry?.(b,a,m,front)){
   this.damageGuard(a,b,m);
   if(b.guardBreakTime>0)b.counterReady=false;
   else if(!projectile&&Math.hypot(a.x-b.x,a.z-b.z)<3.5){
    a.stun=Math.max(a.stun,.24);a.state='stun';a.attack=null;a.buffer=null;a.walkVX=a.walkVZ=0;
   }
   a.hit=true;this.freeze=.045;
   this.emit('block',{x:b.x,y:atY,unitY:b.y,z:b.z,id:b.id,attacker:a.id,effectiveDamage:0,weapon});
   return true;
  }
  profile?.beforeHurt?.(b);
  const baseDamage=m.fixedDamage?m.damage:Math.round(m.damage*Math.max(.70,1-a.combo*.055));
  const originalDamage=Math.round(baseDamage*(profile?.damageTaken?.(b)??1)*(b.guardBreakTime>0?GUARD_RULES.vulnerability:1));
  const dmg=growth.round(originalDamage*(a.id===0?a.permanent?.attack??1:1)/(b.id===0?b.permanent?.defense??1:1));
  const hpBefore=b.hp;
  const nextHP=Math.max(this.mode==='training'&&b.id===1?1:0,b.hp-dmg);
  b.hp=profile?.limitHP?.(b,nextHP)??nextHP;
  b.hp=growth.round(b.hp);this.applyLifesteal(a,Math.max(0,hpBefore-b.hp));
  if(b.id===0||b.hp<=0&&this.fighters[0]?.autoAttack?.targetId===b.id)autoAttacks.cancel(this.fighters[0]);
  this.damageGuard(a,b,m);
  const poise=profile?.poise?.(b)&&!(b.guardBreakTime>0);
  if(!poise){
   b.stun=Math.max(b.guardBreakTime||0,m.stun||.46);b.state='stun';b.attack=null;b.buffer=null;b.vx=dir*(m.push||2.2)*3;
   if(m.daze)b.dazedUntil=this.time+m.stun;
   if(b.id===0&&b.superCasts.length)b.walkVX=b.walkVZ=0;
   if(m.pull){
    const dx=a.x-b.x,dz=a.z-b.z,gap=Math.hypot(dx,dz);
    if(gap>0){const speed=Math.min(20,gap*8);b.vx=dx/gap*speed;b.pullVZ=dz/gap*speed;}
   }
   if(m.lift){b.vy=m.lift;b.airHits++;}else if(b.y>.1){b.vy=Math.max(b.vy,2.8);b.airHits++;}
  }
  if(m.slow)b.slow=Math.max(b.slow,m.slow);
  if(b.airHits>5){b.inv=.6;b.vy=-3;}
  a.combo++;a.comboDamage+=dmg;a.comboTTL=.95;a.hit=true;
  a.energy=clamp(a.energy+ENERGY_RULES.hit+(a.combo%ENERGY_RULES.comboStep===0?ENERGY_RULES.comboBonus:0),0,100);b.energy=clamp(b.energy+5,0,100);
  this.freeze=m.damage>12?.095:.065;
  if(a.id===0){this.stats.hits++;this.stats.damage+=dmg;this.stats.maxCombo=Math.max(this.stats.maxCombo,a.combo);}
  this.emit('hit',{x:b.x,y:atY,unitY:b.y,z:b.z,damage:dmg,effectiveDamage:growth.round(Math.max(0,hpBefore-b.hp)),id:b.id,attacker:a.id,weapon,kind:source?.kind,heavy:m.damage>12,combo:a.combo});
  if(b.monsterType&&!poise)b.t=0;
  this.updateHealthState(b);
  if(b.hp<=0){
   if(a.id===0)this.progression?.defeat(this,b,profile);
   if(b.monsterType){
    b.state='dead';b.t=0;
    if(b.isBoss)this.emit('bossDefeated',{id:b.id,typeId:b.monsterType});
    if(this.mode==='skirmish'&&!this.monsters.some(enemy=>enemy.hp>0)){
     if(this.waveIndex+1<this.monsterWaves.length)this.waveDelay=monsters.fadeTime+.15;
     else this.finish(0);
    }
   }else this.finish(a.id===0?0:1);
  }
  return true;
 }
 applyLifesteal(attacker,effectiveDamage){
  if(attacker.id!==0||attacker.hp<=0||effectiveDamage<=0)return;
  const amount=effectiveDamage*(attacker.permanent?.lifesteal??0);
  if(amount>0){
   const before=attacker.hp;
   attacker.hp=Math.min(attacker.maxHP,growth.round(attacker.hp+amount));
   const healed=growth.round(attacker.hp-before);
   if(healed>0)this.emit('heal',{id:attacker.id,healed,x:attacker.x,y:attacker.y,z:attacker.z});
  }
 }
 updateMonsters(dt){
  if(this.waveDelay>0){
   this.waveDelay=Math.max(0,this.waveDelay-dt);
   if(this.waveDelay===0){this.waveIndex++;this.spawnWave();}
  }
  const player=this.fighters[0];
  const bounds=this.encounter?.bounds(this)||{left:-ARENA.halfWidth,right:ARENA.halfWidth};
  const spawn=(type,x,z)=>this.spawnMonster(type,x,z);
  for(const enemy of this.monsters){
   enemy.t+=dt;
   if(enemy.hp<=0){if(enemy.t<monsters.fadeTime)moveBody(enemy,dt,0,0);continue;}
   enemy.inv=Math.max(0,enemy.inv-dt);enemy.stun=Math.max(0,enemy.stun-dt);enemy.slow=Math.max(0,enemy.slow-dt);
   if(enemy.guardMax){
    enemy.guardBreakTime=Math.max(0,enemy.guardBreakTime-dt);enemy.guardIdle+=dt;
    const recovery=Math.min(dt,Math.max(0,enemy.guardIdle-GUARD_RULES.regenDelay));
    enemy.guard=Math.min(enemy.guardMax,enemy.guard+recovery*GUARD_RULES.regenSpeed);
   }
   if(enemy.finaleVulnerable>0)enemy.finaleVulnerable=Math.max(0,enemy.finaleVulnerable-dt);
   if(enemy.allyBoost>0)enemy.allyBoost=Math.max(0,enemy.allyBoost-dt);
   enemy.combo=0;enemy.walkVX=enemy.walkVZ=0;
   const previousImpact=enemy.bossCast?.kind==='finale'?enemy.bossCast.nextImpact:undefined;
   const previousBlast=enemy.bossCast?.kind==='bombard'?enemy.bossCast.next:undefined;
   const previousBell=enemy.bellImpactSerial||0;
   const attack=monsters.steer(enemy,player,dt,bounds,this.monsters,spawn);
   if(enemy.bossCast?.nextImpact>previousImpact)this.emit('morrisImpact',{final:enemy.bossCast.nextImpact===4});
   if(enemy.bossCast?.kind==='bombard'&&enemy.bossCast.next>previousBlast)this.emit('capitalBlast');
   if((enemy.bellImpactSerial||0)>previousBell)this.emit('bellImpact',{id:enemy.id,kind:enemy.bellImpactKind});
   if(attack){
    this.emit('attack',{id:enemy.id,weapon:enemy.weapon});
    const scaled={...attack,damage:Math.round(attack.damage*(enemy.damageScale??1))};
    const move=enemy.allyBoost>0?{...scaled,damage:Math.round(scaled.damage*allyBoost.damage)}:scaled;
    if(move.projectile)this.shoot(enemy,move);
    else this.hurt(enemy,player,move,enemy.y+(move.hitY??1.25)*bodyScale(enemy),false,move.source);
    if(this.phase==='ko')return;
   }
   moveBody(enemy,dt,enemy.walkVX,enemy.walkVZ);
  }
 }
 tick(dt,input={}){
  if(['menu','result','paused'].includes(this.phase))return;
  if(input.move||input.depth||input.guard)autoAttacks.manual(this.fighters[0]);
  if(this.freeze>0){this.freeze=Math.max(0,this.freeze-dt);return;}
  this.time+=dt;
  if(this.phase==='intro'){this.intro-=dt;if(this.intro<=0){this.phase='fight';this.emit('fight');}return;}
  if(this.phase==='ko'){this.koTime-=dt;for(const enemy of this.monsters)if(enemy.hp<=0)enemy.t+=dt;for(const s of this.groundSpells){if(s.kind==='moonField')s.age=Math.max(s.age,s.delay+s.duration);s.age+=dt;}this.groundSpells=this.groundSpells.filter(s=>s.fired&&s.age<s.delay+(s.kind==='moonField'?s.duration+.4:.7));for(const f of this.fighters){if(f.hp<=0){f.t+=dt;f.y=Math.max(0,f.y+f.vy*dt);f.vy-=22*dt;}}if(this.koTime<=0){this.phase='result';this.emit('result',{winner:this.winner});}return;}
  if(this.mode==='arcade'){this.remaining-=dt;if(this.remaining<=0){this.remaining=0;this.winner=this.fighters[0].hp/this.fighters[0].maxHP>=this.fighters[1].hp/this.fighters[1].maxHP?0:1;this.phase='result';this.progression?.resetTemporary();this.projectiles=[];this.groundSpells=[];this.clearPlayerCasts();this.emit('result',{winner:this.winner});return;}}
  if(this.encounter&&this.phase==='fight')this.encounter.tick(this,dt);
  // Apply horizontal input before buffered actions can start this frame.
  if(input.move)this.fighters[0].face=Math.sign(input.move);
  this.fighters[0].intent=autoAttacks.steer(this,this.fighters[0],input,dt);
  if(this.fighters[1])this.ai(this.fighters[1],dt);
  for(const f of this.fighters){
   if(f.angelForm&&this.time+1e-9>=f.angelForm.endsAt)f.angelForm=null;
   const unlimited=this.unlimited(f);f.t+=dt;f.inv=Math.max(0,f.inv-dt);f.dashCD=unlimited?0:Math.max(0,f.dashCD-dt);f.stun=Math.max(0,f.stun-dt);f.comboTTL=Math.max(0,f.comboTTL-dt);
   f.slow=Math.max(0,f.slow-dt);for(const key of ['wave','super'])f.cooldowns[key]=unlimited?0:Math.max(0,f.cooldowns[key]-dt);
   if(f.comboTTL===0){f.combo=0;f.comboDamage=0;}
   if(f.state!=='guard')f.guard=clamp(f.guard+dt*13,0,100);
   if(this.mode==='training')f.energy=unlimited?100:clamp(f.energy+dt*18,0,100);
   if(f.id===0&&!unlimited){
    f.energyRegenElapsed+=dt;
    if(f.energyRegenElapsed+1e-9>=ENERGY_RULES.regenInterval){
     const gain=Math.floor((f.energyRegenElapsed+1e-9)/ENERGY_RULES.regenInterval);
     f.energy=clamp(f.energy+gain,0,100);f.energyRegenElapsed-=gain*ENERGY_RULES.regenInterval;
    }
   }
   if(f.buffer){if(this.time>f.buffer.expires)f.buffer=null;else if(this.action(f,f.buffer.action))f.buffer=null;}
   let move=0,depth=0,walking=false;
   const steeringAttack=f.id===0&&f.state==='attack'&&(f.intent.move||f.intent.depth);
   if(f.id===0){
    for(const cast of f.superCasts){
     if(cast.startedAt!==this.time)cast.t+=dt;
     this.updateSuper(f,cast.move,cast,dt);
     if(f.attack==='super'&&f.castId===cast.castId){f.strikes=cast.strikes;f.spawned=cast.spawned;}
     if(this.phase==='ko')return;
    }
    f.superCasts=f.superCasts.filter(cast=>cast.t<cast.move.duration);
   }
   if(f.state==='attack'){
    const m=activeMoveFor(f);if(f.t<m.hit+.05)move=f.face*(m.step||0);
    if(m.shotCount){
     if(!f.spawned&&f.t+1e-9>=m.hit+f.strikes*m.shotInterval){
      this.shoot(f,m);f.spawned=++f.strikes===m.shotCount;
     }
    }else if(!m.groundSpell&&f.attack!=='super'&&(f.attack==='wave'||m.projectile)&&f.t>=m.hit&&!f.spawned){
     f.spawned=true;
     if(m.cone)this.launchSoundWave(f,m,dt);
     else this.shoot(f,m);
    }
    const scale=bodyScale(f);
    if(f.weapon==='sword'&&f.attack!=='super'&&f.t>=m.hit&&!f.swingShown){f.swingShown=true;this.emit('swordSwing',{id:f.id,x:f.x,y:f.y+1.35*scale,z:f.z,face:f.face,name:f.attack,scale});}
    if(f.weapon==='fan'&&f.attack==='heavy'&&f.t>=m.hit&&!f.swingShown){f.swingShown=true;this.emit('fanSwing',{id:f.id,x:f.x,y:f.y+1.6*scale,z:f.z,face:f.face,scale});}
    if(f.attack==='super'){
     if(f.id!==0)this.updateSuper(f,m,f,dt);
    }else if(!m.groundSpell&&!f.hit&&!m.projectile&&f.attack!=='wave'&&f.t>=m.hit&&f.t<=m.hit+m.active)this.strike(f,m,m.reach,MELEE_DEPTH.normal,f.y+1.25);
    if(this.phase==='ko')return;
    if(f.t>=m.duration){f.state='idle';f.attack=null;f.frogMove=null;f.spawned=false;f.t=0;}
   }else if(f.state==='dash'){move=f.dashDir*15;depth=(f.dashZ||0)*15;if(f.id!==0&&f.dashDir)f.face=Math.sign(f.dashDir);if(f.t>.18){f.state='idle';f.t=0;}}
   else if(f.stun>0){f.state='stun';}
   else{
    if(f.intent.guard&&f.y===0&&f.guard>0){
     if(f.id!==0)f.face=Math.sign(this.target(f)?.x-f.x)||f.face;
     f.state='guard';
    }
    else walking=true;
   }
   if(walking||steeringAttack){
    const mx=f.intent.move||0,mz=f.intent.depth||0,n=Math.max(1,Math.hypot(mx,mz)),ease=1-Math.exp(-dt*(mx||mz?22:32));
    if(f.id!==0&&mx)f.face=Math.sign(mx);
    const speed=f.id===0?this.playerSpeed(f):5.3*(f.slow>0?.7:1);f.walkVX+=(mx/n*speed-f.walkVX)*ease;f.walkVZ+=(mz/n*speed-f.walkVZ)*ease;
    if(f.intent.autoGoal){
     const dx=(f.intent.autoGoal.x-f.x)/dt,dz=(f.intent.autoGoal.z-f.z)/dt;
     f.walkVX=clamp(f.walkVX,Math.min(0,dx),Math.max(0,dx));f.walkVZ=clamp(f.walkVZ,Math.min(0,dz),Math.max(0,dz));
    }
    if(!mx&&!mz&&Math.hypot(f.walkVX,f.walkVZ)<.06)f.walkVX=f.walkVZ=0;
    // Keep fast attack lunges at their authored speed while allowing depth movement.
    if(Math.abs(f.walkVX)>Math.abs(move))move=f.walkVX;
    depth=f.walkVZ;
    if(walking)f.state=f.y>0?'jump':move||depth?'run':'idle';
   }else{
    f.walkVX=f.walkVZ=0;
   }
   moveBody(f,dt,move,depth);
  }
  const [player,duelist]=this.fighters;
  if(duelist)separate(player,duelist);
  else{
   this.updateMonsters(dt);
   if(this.phase==='ko')return;
   const bodies=[player,...this.monsters.filter(m=>m.hp>0)];
   for(let pass=0;pass<2;pass++)
    for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
     const a=bodies[i],b=bodies[j],boss=a.isBoss?a:b.isBoss?b:null;
     if(a.state==='attack'&&a.smokeDashing||b.state==='attack'&&b.smokeDashing)continue;
     if(boss?.state==='attack'&&(boss.bossGlide||boss.bossMove==='charge'&&boss.walkVX))continue;
     separate(a,b,boss?1.62:1.25,boss?1.05:.88);
    }
  }
  if(this.encounter){
   this.encounter.constrain(this);
   this.monsters=this.monsters.filter(m=>m.hp>0||m.t<monsters.fadeTime);
   if(this.encounter.cleared&&this.phase==='fight'){
    this.phase='victory';this.winner=0;
    this.progression?.resetTemporary();this.emit('campaignVictory',{level:this.level});
   }
  }
  for(const ball of this.projectiles){
   const release=ball.traveled===0&&['goldStar','firedStamp'].includes(ball.kind);
   const a=this.fighters[ball.owner]??this.monsters.find(m=>m.id===ball.owner);
   if(!a||(a.monsterType&&a.hp<=0)){ball.life=0;continue;}
   const scale=bodyScale(a);
   const oldX=ball.x-(release?ball.dir*.85*scale:0),oldZ=ball.z,hits=ball.hitTargets[ball.returning?1:0];ball.life-=dt;
   if(ball.boomerang&&ball.returning){
    const dx=a.x-ball.x,dz=a.z-ball.z,dy=a.y+2.05*scale-ball.y,n=Math.hypot(dx,dz,dy);
    if(n<.4){ball.life=0;continue;}const d=Math.min(n,(ball.speed||12)*dt);ball.x+=dx/n*d;ball.z+=dz/n*d;ball.y+=dy/n*d;ball.dir=Math.sign(dx)||ball.dir;
   }else{
    let d=(ball.speed||12)*dt;if(ball.boomerang)d=Math.min(d,ball.range-ball.traveled);
    if(ball.laneEnd!==undefined)d=Math.min(d,Math.max(0,(ball.laneEnd-ball.x)*ball.dir));
    ball.x+=(ball.headingX??ball.dir)*d;ball.z+=(ball.headingZ??0)*d;ball.traveled+=d;
     if(ball.targetHeightId!==undefined){
      const target=this.fighters.find(f=>f.id===ball.targetHeightId&&f.hp>0);
      if(target){
       const arrival=Math.max(dt,Math.abs(target.x-ball.x)/(ball.speed||12));
       ball.y+=(target.y+1.3*bodyScale(target)-ball.y)*(1-Math.exp(-dt*Math.max(18,3/arrival)));
      }
     }else if(ball.cruiseY!==undefined)ball.y=ball.launchY+(ball.cruiseY-ball.launchY)*Math.min(1,ball.traveled/(ball.heightBlendDistance??1.65));
    if(ball.boomerang&&(ball.traveled>=ball.range-1e-9||Math.abs(ball.x)>ARENA.halfWidth+1.5))ball.returning=true;
   }
   const segmentX=ball.x-oldX,segmentZ=ball.z-oldZ;
   if(ball.life<0)continue;
   const candidates=[];
   for(const enemy of this.opponents(a)){
    if(hits.includes(enemy.id)||enemy.y>(ball.maxTargetY??Infinity))continue;
    const shape=projectileBounds(ball,enemy);
    const t=groundContactTime(enemy.x-oldX,enemy.z-oldZ,segmentX,segmentZ,shape.width,shape.depth);
    if(t!==null)candidates.push({enemy,t});
   }
   candidates.sort((a,b)=>a.t-b.t||Math.hypot(a.enemy.x-oldX,a.enemy.z-oldZ)-Math.hypot(b.enemy.x-oldX,b.enemy.z-oldZ));
   for(const {enemy} of candidates){
    if(!this.hurt(a,enemy,ball,ball.y,true,{x:enemy.x-ball.dir,dir:ball.dir,weapon:ball.weapon,kind:ball.kind}))continue;
    hits.push(enemy.id);
    if(ball.splash)this.burstFeather(a,ball,enemy);
    if(this.phase==='ko')return;
    if(!ball.piercing&&!ball.boomerang){ball.life=0;break;}
   }
   if(ball.laneEnd!==undefined&&(ball.laneEnd-ball.x)*ball.dir<=1e-7)ball.life=0;
  }
  this.projectiles=this.projectiles.filter(b=>b.life>0&&Math.abs(b.x)<ARENA.halfWidth+ARENA.projectileMargin);
  for(const spell of this.groundSpells){
   spell.age+=dt;const caster=this.fighters[spell.owner];
   if(spell.kind==='soundWave'){
    this.updateSoundWave(spell,caster,dt);
    if(this.phase==='ko')return;
    continue;
   }
   if(spell.kind==='rally'){
    this.updateRally(spell,caster);
    if(this.phase==='ko')return;
    continue;
   }
   if(spell.guiding){
    const bounds=this.encounter?.bounds(this);
    if(spell.age>0)spell.x=clamp(spell.x+spell.dir*PILLAR_TRAVEL_SPEED*dt,bounds?.left??-ARENA.halfWidth,bounds?.right??ARENA.halfWidth);
    continue;
   }
   let radius,depth,move,weapon;
   if(spell.kind==='moonField'){
    if(spell.ticks>=6||spell.age+1e-9<spell.delay+spell.ticks*.4)continue;
    spell.ticks++;this.emit('moonPulse',{x:spell.x,z:spell.z});
    radius=spell.radius;depth=spell.depth;weapon='fan';move={damage:8,fixedDamage:true,unblockable:true,stun:.12,push:.06};
   }else{
    if(spell.fired||spell.age+1e-9<spell.delay)continue;
    this.emit('spellBurst',{x:spell.x,z:spell.z});
    radius=spell.radius??1;depth=spell.depth??.85;weapon='magic';move={damage:40,fixedDamage:true,unblockable:true,stun:.75,push:1.4};
   }
   move.attackName='super';move.castId=spell.castId;
   spell.fired=true;
   for(const target of this.opponents(caster)){
    const dx=target.x-spell.x,dz=target.z-spell.z;
    const inRange=spell.radius?inGroundArea(dx,dz,radius,depth):Math.abs(dx)<=radius&&Math.abs(dz)<=depth;
    if(inRange)
     this.hurt(caster,target,move,target.y+1.2*bodyScale(target),true,{x:spell.x,dir:spell.dir??(Math.sign(target.x-caster.x)||caster.face),weapon,kind:spell.kind});
    if(this.phase==='ko')return;
   }
  }
  this.groundSpells=this.groundSpells.filter(s=>s.guiding||s.age<s.delay+(['moonField','rally','soundWave'].includes(s.kind)?s.duration+.4:.7));
  autoAttacks.settle(this,this.fighters[0]);
  this.progression?.tick(this,dt);
  if(this.mode==='training'&&duelist.hp<30&&duelist.stun<=0){const healed=growth.round(duelist.maxHP-duelist.hp);duelist.hp=duelist.maxHP;this.emit('recover',{id:duelist.id,healed,x:duelist.x,y:duelist.y,z:duelist.z});}
 }
}
const api={Game,ARENA,MOVES,WEAPON_MOVES,FROG_MOVES,ANGEL_MOVES,PLAYER_STATS,ENERGY_RULES,GUARD_RULES,moveFor,activeMoveFor,attackLinkTime,soundWaveOrigin};if(typeof module!=='undefined')module.exports=api;else root.Combat=api;
})(typeof window!=='undefined'?window:globalThis);
