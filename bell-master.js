/* Final chapter. One reference skill, with its two-crescent phase-two variant. */
(function(root){
'use strict';
const {bodyScale}=typeof module!=='undefined'?require('./arena-config.js'):root.ArenaConfig;
const type='bell-master';
const profile={
 name:'终焉钟主·无相',boss:true,hp:360,height:7.25,speed:2.65,guardMax:160,
 frames:{idle:{image:'assets/monsters/bell-master/hover.png'}},
 phase:{threshold:.5},
 movement:{standOff:5.8,alignTolerance:.18,castLane:.55,approachRate:7},
 moves:{
  rift:{name:'幽冥裂斩',windup:1.10,active:.90,recover:.80,cooldown:4.6,
   impacts:[1.10],phase2Impacts:[1.10,1.66],damage:22,reach:15,lane:.95,height:1.65,
   projectile:true,kind:'netherCrescent',muzzleX:1.05,muzzleY:1.25,cruiseY:1.25,
   maxTargetY:1.65,speed:10.8,life:1.25,piercing:true,stun:.42,push:1.25,
   visual:{height:4.6,chargeHeight:3.05,formTime:.16,fadeTime:.22}}
 },
 poise(enemy){const m=this.moves[enemy.bossMove];return enemy.state==='attack'&&!!m&&enemy.t<m.windup+m.active;}
};
function begin(enemy){
 const m=profile.moves.rift;
 enemy.state='attack';enemy.bossMove='rift';enemy.t=0;
 enemy.bossCast={kind:'rift',face:enemy.face,x:enemy.x,z:enemy.z,nextStrike:0,phase2:!!enemy.bellPhase2};
 enemy.attackCooldown=m.cooldown;enemy.motionVX=enemy.motionVZ=0;
 enemy.vx=enemy.pullVZ=0;
}
function steer(enemy,player,dt){
 const scale=bodyScale(enemy),m=profile.moves.rift,move=profile.movement;
 enemy.attackCooldown=Math.max(0,enemy.attackCooldown-dt);
 enemy.bellPhase2=enemy.bellPhase2||enemy.hp<=enemy.maxHP*profile.phase.threshold;
 if(enemy.stun>0){enemy.state='stun';enemy.motionVX=enemy.motionVZ=0;return null;}
 if(enemy.state==='attack'){
  const cast=enemy.bossCast;
  if(enemy.t>=m.windup+m.active+m.recover){enemy.state='idle';return null;}
  const at=(cast.phase2?m.phase2Impacts:m.impacts)[cast.nextStrike];
  if(at===undefined||enemy.t+1e-9<at)return null;
  cast.nextStrike++;
  return {...m,laneEnd:enemy.x+cast.face*m.reach*scale};
 }
 const dx=player.x-enemy.x,dz=player.z-enemy.z;
 if(Math.abs(dx)>.15)enemy.face=Math.sign(dx);
 if(!enemy.attackCooldown&&enemy.y<.04&&Math.abs(dx)<=m.reach*.78*scale&&Math.abs(dz)<=move.castLane*scale){begin(enemy);return null;}
 const mx=Math.abs(dx)>move.standOff*scale?Math.sign(dx)*(Math.abs(dx)-move.standOff*scale):0;
 const mz=Math.abs(dz)>move.alignTolerance?Math.sign(dz)*(Math.abs(dz)-move.alignTolerance):0;
 const length=Math.hypot(mx,mz),speed=profile.speed*(enemy.slow>0?.7:1),blend=1-Math.exp(-move.approachRate*dt);
 enemy.motionVX=(enemy.motionVX||0)+((length?mx/length*speed:0)-(enemy.motionVX||0))*blend;
 enemy.motionVZ=(enemy.motionVZ||0)+((length?mz/length*speed:0)-(enemy.motionVZ||0))*blend;
 // Never step past the standing lane, including when dt changes or a target stops.
 enemy.walkVX=Math.sign(mx)*Math.min(Math.max(0,enemy.motionVX*Math.sign(mx)),Math.abs(mx)/dt);
 enemy.walkVZ=Math.sign(mz)*Math.min(Math.max(0,enemy.motionVZ*Math.sign(mz)),Math.abs(mz)/dt);
 enemy.state=Math.hypot(enemy.walkVX,enemy.walkVZ)>.025?'run':'idle';
 return null;
}
const api={type,profile,steer};
if(typeof module!=='undefined')module.exports=api;else root.BellMaster=api;
})(typeof window!=='undefined'?window:globalThis);
