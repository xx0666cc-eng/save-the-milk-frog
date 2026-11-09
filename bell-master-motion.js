/* Foot-anchored reference frames; shared with the existing player-like sprite mixer. */
(function(root){
'use strict';
const pose=(asset,index)=>({asset,index}),clamp=t=>Math.max(0,Math.min(1,t));
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
function sample(enemy,phase){
 const m=BellMaster.profile.moves.rift;
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
 const p=((enemy.t*.46+enemy.id*.117+(enemy.state==='run'?phase*.25:0))%1)*8,i=Math.floor(p);
 return {a:pose('hover',i),b:pose('hover',(i+1)%8),mix:ease(p-i),kind:enemy.state==='run'?'run':'idle'};
}
let pending=null;
async function prepare(textures){
 if(!root.BELL_MASTER_MOTION_DATA){
  pending??=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='assets/monsters/bell-master/motion-data.js';
   script.onload=()=>root.BELL_MASTER_MOTION_DATA?resolve():reject(new Error('钟主动作数据不完整'));
   script.onerror=()=>reject(new Error('钟主动作加载失败'));document.head.append(script);
  }).catch(e=>{pending=null;throw e;});
  await pending;
 }
 await Promise.all(Object.entries(root.BELL_MASTER_MOTION_DATA).map(async ([name,a])=>{
  const key='bell-motion/'+name;if(textures.has(key))return;
  const texture=await new THREE.TextureLoader().loadAsync(location.protocol==='file:'?a.uri:a.path);
  texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;
  textures.set(key,texture);
 }));
 textures.set(BellMaster.type+'/idle',textures.get('bell-motion/hover'));
}
function create(sprite,textures){return new ThunderBeastMotion.View(sprite,textures,{
 data:root.BELL_MASTER_MOTION_DATA,prefix:'bell-motion/',height:BellMaster.profile.height,stride:4.2,sample
});}
root.BellMasterMotion={sample,prepare,create};
})(window);
