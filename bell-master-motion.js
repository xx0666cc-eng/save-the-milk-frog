/* Foot-anchored reference frames; shared with the existing player-like sprite mixer. */
(function(root){
'use strict';
const pose=(asset,index)=>({asset,index}),clamp=t=>Math.max(0,Math.min(1,t));
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
// Local presentation only. World collision, attack anchors and AI never read these.
const config={
 velocityRate:12,maxSampleSpeed:4,teleportDistance:1.5,
 float:{height:.105,idleAmplitude:.055,movingAmplitude:.11,idleHz:.32,movingHz:.53},
 body:{velocityLean:.039,accelerationLean:.022,maxLean:.065,stiffness:100,damping:15,pivot:3.6},
 cloth:{drag:.24,sway:.075,stiffness:46,damping:10},
 arms:{swing:.032,drag:.026,phaseOffset:1.7},
 bell:{maxAngle:.024,accelerationAngle:.020,stiffness:28,damping:8,bodyCompensation:.65},
 stateRate:11,castWeight:.12,hurtWeight:.22,reducedMotion:.3,
 mist:{max:12,minSpeed:.3,rate:7,life:.78,opacity:.16,size:.46,drift:.25,rise:.28}
};
const bound=(x,a,b)=>Math.max(a,Math.min(b,x));
function spring(s,key,target,stiffness,damping,dt){
 const velocity=key+'Velocity';
 s[velocity]=s[velocity]||0;
 // Bounded substeps keep springs stable at 30/60/144 Hz and during frame stalls.
 for(let left=dt;left>1e-8;){const h=Math.min(left,1/120);s[velocity]+=(target-s[key])*stiffness*h-s[velocity]*damping*h;s[key]+=s[velocity]*h;left-=h;}
}
function createRig(){return {lastTime:null,lastX:0,lastZ:0,vx:0,vz:0,speed:0,phase:0,weight:1,lean:0,cloth:0,bell:0,bob:0,leftArm:0,rightArm:0};}
function advanceRig(s,enemy,time,reduced=false){
 const reset=s.lastTime===null||time<s.lastTime;
 const elapsed=reset?0:Math.max(0,time-s.lastTime),dt=Math.min(elapsed,.1);
 const dx=reset?0:enemy.x-s.lastX,dz=reset?0:enemy.z-s.lastZ;
 const discontinuity=reset||elapsed>.25||Math.hypot(dx,dz)>config.teleportDistance;
 const rawX=dt&&!discontinuity?bound(dx/elapsed,-config.maxSampleSpeed,config.maxSampleSpeed):0;
 const rawZ=dt&&!discontinuity?bound(dz/elapsed,-config.maxSampleSpeed,config.maxSampleSpeed):0;
 const living=enemy.hp>0,cast=enemy.state==='attack',hurt=enemy.stun>0||enemy.state==='stun';
 const oldVX=s.vx,blend=1-Math.exp(-config.velocityRate*dt);
 s.vx+=(rawX-s.vx)*blend;s.vz+=(rawZ-s.vz)*blend;
 const acceleration=dt?bound((s.vx-oldVX)/dt/BellMaster.profile.speed,-3,3):0;
 s.speed+=(clamp(Math.hypot(rawX,rawZ)/BellMaster.profile.speed)-s.speed)*blend;
 const targetWeight=living?(cast?config.castWeight:hurt?config.hurtWeight:1):0;
 s.weight+=(targetWeight-s.weight)*(1-Math.exp(-config.stateRate*dt));
 const amount=(reduced?config.reducedMotion:1)*s.weight;
 const signed=bound(s.vx/BellMaster.profile.speed,-1,1);
 s.phase+=dt*Math.PI*2*(config.float.idleHz+(config.float.movingHz-config.float.idleHz)*s.speed);
 const leanTarget=bound(-signed*config.body.velocityLean-acceleration*config.body.accelerationLean,-config.body.maxLean,config.body.maxLean)*amount;
 spring(s,'lean',leanTarget,config.body.stiffness,config.body.damping,dt);
 spring(s,'cloth',-signed*config.cloth.drag*amount,config.cloth.stiffness,config.cloth.damping,dt);
 const bellTarget=bound(-acceleration*config.bell.accelerationAngle,-config.bell.maxAngle,config.bell.maxAngle)*amount;
 spring(s,'bell',bellTarget,config.bell.stiffness,config.bell.damping,dt);
 s.bob=(config.float.height+Math.sin(s.phase)*(config.float.idleAmplitude+(config.float.movingAmplitude-config.float.idleAmplitude)*s.speed))*amount;
 s.leftArm=(Math.sin(s.phase*1.13)*config.arms.swing*(.25+s.speed)-signed*config.arms.drag)*amount;
 s.rightArm=(Math.sin(s.phase*.91+config.arms.phaseOffset)*config.arms.swing*(.25+s.speed)-signed*config.arms.drag*.7)*amount;
 s.sway=Math.sin(s.phase*1.31+.8)*config.cloth.sway*(.22+s.speed)*amount;
 s.lastTime=time;s.lastX=enemy.x;s.lastZ=enemy.z;
 return {dt,discontinuity,acceleration,amount};
}
function sample(enemy,phase){
 const m=BellMaster.profile.moves[enemy.bossMove]??BellMaster.profile.moves.rift;
 if(enemy.state==='attack'&&enemy.bossMove==='requiem')return {a:pose('channel',0),b:pose('channel',0),mix:0,kind:'requiem'};
 if(enemy.state==='attack'&&enemy.bossMove==='basic'){
  const m=enemy.bossCast.move,h=m.windup,total=m.interval;
  const keys=[[0,0],[h*.4,2],[h*.8,5],[h,7],[h+(total-h)*.45,9],[total,11]];
  let i=0;while(i<keys.length-2&&enemy.t>=keys[i+1][0])i++;
  const a=keys[i],b=keys[i+1];return {a:pose('cast',a[1]),b:pose('cast',b[1]),mix:ease((enemy.t-a[0])/(b[0]-a[0])),kind:'basic'};
 }
 if(enemy.state==='attack'&&enemy.bossMove==='fall'){
  const keys=[[0,0],[.16,1],[.32,2],[.50,3],[m.gatherAt,4],[1.05,5],[1.35,6],[m.fallAt,7],
   [m.impacts[0],8],[2.30,9],[2.65,10],[m.windup+m.active+m.recover,11]];
  let i=0;while(i<keys.length-2&&enemy.t>=keys[i+1][0])i++;
  const a=keys[i],b=keys[i+1];return {a:pose('channel',a[1]),b:pose('channel',b[1]),mix:ease((enemy.t-a[0])/(b[0]-a[0])),kind:'fall'};
 }
 if(enemy.state==='attack'){
  // Gathering, arm sweep, release and settling use the AI's very same game clock.
  const total=m.windup+m.active+m.recover;
  const keys=enemy.bossCast?.phase2
   ?[[0,0],[.16,1],[.32,2],[.49,3],[.67,4],[.85,5],[1.0,6],[m.impacts[0],7],[1.23,8],
     [1.32,4],[1.42,5],[1.54,6],[m.phase2Impacts[1],7],[1.84,8],[2.04,9],[2.4,10],[total,11]]
   :[0,.16,.32,.49,.67,.85,1.0,m.windup,1.30,1.58,2.12,total].map((t,i)=>[t,i]);
  let i=0;while(i<keys.length-2&&enemy.t>=keys[i+1][0])i++;
  const a=keys[i],b=keys[i+1];
  return {a:pose('cast',a[1]),b:pose('cast',b[1]),mix:ease((enemy.t-a[0])/(b[0]-a[0])),kind:'rift'};
 }
 if(enemy.hp<=0||enemy.stun>0)return {a:pose('hover',0),b:pose('hover',0),mix:0,kind:enemy.hp<=0?'dead':'hurt'};
 // One clear silhouette; local procedural motion supplies the hover loop.
 // Do not crossfade differently drawn bells/robes throughout locomotion.
 return {a:pose('hover',0),b:pose('hover',0),mix:0,kind:enemy.state==='run'?'run':'idle'};
}
let pending=null,ritualPending=null;
async function prepare(textures){
 if(!root.BELL_MASTER_MOTION_DATA){
  pending??=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='assets/monsters/bell-master/motion-data.js';
   script.onload=()=>root.BELL_MASTER_MOTION_DATA?resolve():reject(new Error('钟主动作数据不完整'));
   script.onerror=()=>reject(new Error('钟主动作加载失败'));document.head.append(script);
  }).catch(e=>{pending=null;throw e;});
  await pending;
 }
 if(!root.BELL_MASTER_RITUAL_DATA){
  ritualPending??=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='assets/monsters/bell-master/ritual-data.js';
   script.onload=()=>root.BELL_MASTER_RITUAL_DATA?resolve():reject(new Error('无相施法数据不完整'));
   script.onerror=()=>reject(new Error('无相施法动作加载失败'));document.head.append(script);
  }).catch(e=>{ritualPending=null;throw e;});
  await ritualPending;
 }
 Object.assign(root.BELL_MASTER_MOTION_DATA,root.BELL_MASTER_RITUAL_DATA);
 await Promise.all(Object.entries(root.BELL_MASTER_MOTION_DATA).map(async ([name,a])=>{
  const key='bell-motion/'+name;if(textures.has(key))return;
  const texture=await new THREE.TextureLoader().loadAsync(location.protocol==='file:'?a.uri:a.path);
  texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;
  textures.set(key,texture);
 }));
 textures.set(BellMaster.type+'/idle',textures.get('bell-motion/hover'));
}
const localShader=`
uniform float hemDrag,hemSway,armLeft,armRight,crownAngle;
vec2 rotateLocal(vec2 p,vec2 pivot,float angle){
 float c=cos(angle),s=sin(angle);p-=pivot;return pivot+mat2(c,-s,s,c)*p;
}
vec2 bellLocal(vec2 p,float direction){
 // Continuous region weights, never a whole-image stretch. Waist/face remain rigid.
 float hem=1.-smoothstep(.65,3.65,p.y);
 p.x-=(hemDrag+hemSway*sin(p.y*2.1)) * hem*hem;
 float arms=smoothstep(2.45,3.35,p.y)*(1.-smoothstep(3.95,4.55,p.y))*smoothstep(.48,1.15,abs(p.x));
 float side=sign(p.x*direction),angle=side<0.?armLeft:armRight;
 p=mix(p,rotateLocal(p,vec2(sign(p.x)*.68,3.95),angle),arms);
 float crown=smoothstep(4.8,5.55,p.y);
 return mix(p,rotateLocal(p,vec2(0.,5.2),crownAngle),crown);
}
`;
class View extends ThunderBeastMotion.View{
 constructor(sprite,textures){
  super(sprite,textures,{data:root.BELL_MASTER_MOTION_DATA,prefix:'bell-motion/',height:BellMaster.profile.height,stride:4.2,sample});
  this.rig=createRig();this.reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)');
 }
 material(){
  const material=super.material();
  for(const key of ['hemDrag','hemSway','armLeft','armRight','crownAngle'])material.uniforms[key]={value:0};
  material.fragmentShader=localShader+material.fragmentShader.replace('vec2 q=(vec2(point.x*direction,point.y)-box.xy)/box.zw;',
   'vec2 warped=bellLocal(point,direction);vec2 q=(vec2(warped.x*direction,warped.y)-box.xy)/box.zw;');
  return material;
 }
 update(enemy,time,opacity){
  super.update(enemy,time,opacity);
  const s=this.rig,step=advanceRig(s,enemy,time,this.reduced?.matches),u=this.sprite.material.uniforms;
  const pivot=config.body.pivot;
  this.sprite.position.set(Math.sin(s.lean)*pivot,s.bob+(1-Math.cos(s.lean))*pivot,.03);
  this.sprite.rotation.z=s.lean;
  u.hemDrag.value=s.cloth;u.hemSway.value=s.sway;
  u.armLeft.value=s.leftArm;u.armRight.value=s.rightArm;
  u.crownAngle.value=s.bell-s.lean*config.bell.bodyCompensation;
  this.diagnostics={...this.diagnostics,speed:s.speed,velocityX:s.vx,velocityZ:s.vz,acceleration:step.acceleration,
   float:s.bob,lean:s.lean,hem:s.cloth,bell:s.bell,leftArm:s.leftArm,rightArm:s.rightArm,weight:s.weight};
 }
}
function create(sprite,textures){return new View(sprite,textures);}
root.BellMasterMotion={config,sample,prepare,create,createRig,advanceRig};
})(window);
