/* One J input owns one target and approach; combat keeps the actual hit rules. */
(function(root){
'use strict';
const {world,bodyScale}=typeof module!=='undefined'?require('./arena-config.js'):root.ArenaConfig;
const config=Object.freeze({
 autoTargetRangeMultiplier:1.5,stopTolerance:.12,arrivalTolerance:.035,
 disengageRangeMultiplier:1.5,noProgressTimeout:.85,progressDistance:.06,maxApproachTime:4
});
const normalNames=['jab','cross','finisher'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function nextName(f){return f.state==='attack'&&f.attack==='jab'?'cross':f.state==='attack'&&f.attack==='cross'?'finisher':'jab';}
function limits(game,f){
 const reference={id:0,weapon:'sword'};
 const baseline=Math.max(...normalNames.map(name=>game.move(reference,name).reach))*bodyScale(reference);
 const range=baseline*config.autoTargetRangeMultiplier;
 return {baseline,range,disengageDistance:range*config.disengageRangeMultiplier};
}
function bounds(game){return game.encounter?.bounds(game)||{left:-world.halfWidth,right:world.halfWidth};}
function attackable(game,f,target,name){
 const edge=bounds(game),epsilon=config.arrivalTolerance;
 return target.hp>0&&Number.isFinite(target.x)&&Number.isFinite(target.z)&&
  target.x>=edge.left-epsilon&&target.x<=edge.right+epsilon&&Math.abs(target.z)<=world.halfDepth+epsilon&&
  game.normalAttackWindow(f,target,name).attackable;
}
function goal(game,f,target,name){
 const w=game.normalAttackWindow(f,target,name),edge=bounds(game),margin=config.stopTolerance;
 const minX=Math.max(w.minX+margin,w.clearanceX+config.arrivalTolerance),maxX=w.maxX-margin;
 const depth=Math.max(0,w.depth-margin),candidates=[];
 if(minX>maxX)return null;
 for(const face of [1,-1]){
  const a=target.x-face*maxX,b=target.x-face*minX;
  const left=Math.max(edge.left,Math.min(a,b)),right=Math.min(edge.right,Math.max(a,b));
  const near=Math.max(-world.halfDepth,target.z-depth),far=Math.min(world.halfDepth,target.z+depth);
  if(left>right||near>far)continue;
  const point={x:clamp(f.x,left,right),z:clamp(f.z,near,far),face};
  point.distance=Math.hypot(point.x-f.x,point.z-f.z);candidates.push(point);
 }
 candidates.sort((a,b)=>a.distance-b.distance||Number(b.face===f.face)-Number(a.face===f.face));
 return candidates[0]||null;
}
function cancel(f,discard=true,stop=true){
 if(!f?.autoAttack)return;
 f.autoAttack=null;
 if(discard&&f.buffer?.autoAttack)f.buffer=null;
 if(stop)f.walkVX=f.walkVZ=0;
}
function manual(f){
 // Cancel a running approach completely; simultaneous manual movement + J stays manual.
 cancel(f,f?.autoAttack?.phase==='approach'&&f.autoAttack.moving,false);
}
function request(game,f){
 cancel(f,false,false);
 if(f.stun>0||f.hp<=0||f.state==='dash'||f.state==='attack'&&!normalNames.includes(f.attack))return;
 const name=nextName(f),range=limits(game,f).range;
 let target,distance=Infinity;
 for(const enemy of game.opponents(f)){
  const d=Math.hypot(enemy.x-f.x,enemy.z-f.z);
  if(d>range||d>=distance||!attackable(game,f,enemy,name))continue;
  const face=Math.sign(enemy.x-f.x)||f.face;
  if(!game.canNormalHit(f,enemy,name,face)&&!goal(game,f,enemy,name))continue;
  target=enemy;distance=d;
 }
 if(!target)return;
 f.autoAttack={targetId:target.id,phase:'approach',ready:false,moving:false,
  started:game.time,originX:f.x,originZ:f.z,lastX:f.x,lastZ:f.z,lastProgress:game.time};
 f.buffer.autoAttack=true;
}
function valid(game,f,lock){
 const target=game.opponents(f).find(enemy=>enemy.id===lock.targetId),name=nextName(f);
 if(!target||!attackable(game,f,target,name))return null;
 const leash=limits(game,f).disengageDistance;
 if(Math.hypot(target.x-f.x,target.z-f.z)>leash||Math.hypot(target.x-lock.originX,target.z-lock.originZ)>leash)return null;
 return target;
}
function steer(game,f,input,dt){
 const lock=f.autoAttack;if(!lock)return input;
 if(input.move||input.depth||input.guard){manual(f);return input;}
 const target=valid(game,f,lock);
 if(!target||f.stun>0||f.state==='dash'||f.state==='attack'&&!normalNames.includes(f.attack)){
  cancel(f);return input;
 }
 if(lock.phase==='attack'){
  if(f.state!=='attack'||f.castId!==lock.castId){cancel(f);return input;}
  // Aim only before this normal attack releases. Movement/other actions cancel this lock.
  const m=game.move(f);
  if(f.t<m.hit&&!f.hit&&!f.spawned)f.face=Math.sign(target.x-f.x)||f.face;
  return input;
 }
 if(!f.buffer?.autoAttack){cancel(f);return input;}
 const name=nextName(f),face=Math.sign(target.x-f.x)||f.face,point=goal(game,f,target,name);
 const canHit=game.canNormalHit(f,target,name,face);
 if(canHit&&(!lock.moving||!point||point.distance<=config.arrivalTolerance)){
  lock.ready=true;f.face=face;f.walkVX=f.walkVZ=0;
  f.buffer.expires=game.time+.24;
  return input;
 }
 if(!point){cancel(f);return input;}
 if(game.time-lock.started>config.maxApproachTime||game.time-lock.lastProgress>config.noProgressTimeout){cancel(f);return input;}
 if(Math.hypot(f.x-lock.lastX,f.z-lock.lastZ)>=config.progressDistance){
  lock.lastX=f.x;lock.lastZ=f.z;lock.lastProgress=game.time;
 }
 lock.ready=false;lock.moving=true;f.buffer.expires=game.time+.24;
 const dx=point.x-f.x,dz=point.z-f.z,distance=Math.hypot(dx,dz);
 const speed=game.playerSpeed(f),ratio=Math.min(1,distance/Math.max(speed*dt,1e-6));
 f.face=point.face;
 return {...input,move:distance?dx/distance*ratio:0,depth:distance?dz/distance*ratio:0,autoGoal:point};
}
function launched(f,name){
 if(!f.autoAttack)return;
 if(!normalNames.includes(name)){cancel(f);return;}
 f.autoAttack.phase='attack';f.autoAttack.castId=f.castId;
}
function settle(game,f){
 const lock=f?.autoAttack;if(!lock)return;
 if(!valid(game,f,lock)||lock.phase==='attack'&&(f.state!=='attack'||f.castId!==lock.castId))cancel(f);
}
const api={config,normalNames,nextName,limits,request,cancel,manual,steer,launched,settle};
if(typeof module!=='undefined')module.exports=api;else root.AutoAttacks=api;
})(typeof window!=='undefined'?window:globalThis);
