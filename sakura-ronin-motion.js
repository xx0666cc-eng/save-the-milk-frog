/* Reuses the existing foot-anchored, premultiplied sprite animation renderer. */
(function(root){
'use strict';
const idle=['walk',0],pose=(asset,index)=>({asset,index});
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function denseTrack(keys,t){
 for(let i=1;i<keys.length;i++)if(t<keys[i][0]){
  const a=keys[i-1],b=keys[i],blend=Math.min(.09,(b[0]-a[0])*.85);
  return {a:pose(a[1],a[2]),b:pose(b[1],b[2]),mix:ease((t-b[0]+blend)/blend)};
 }
 const last=keys.at(-1);return {a:pose(last[1],last[2]),b:pose(last[1],last[2]),mix:0};
}
function sample(enemy,phase){
 const m=SakuraRonin.profile.moves[enemy.bossMove];
 if(enemy.state==='attack'&&m){
  const w=m.windup,end=w+m.active,total=end+m.recover;
  let keys;
  if(enemy.bossMove==='parry')keys=[[0,...idle],[w,'attacks',5],[end,'attacks',5],[total,...idle]];
  else if(enemy.bossMove==='counter')keys=[[0,'attacks',5],[w,'attacks',6],[end,'attacks',7],[total,...idle]];
  else if(enemy.bossMove==='iai')keys=[0,.10,.20,.30,.40,.50,.60,.70,.82,.96,1.10,total].map((t,i)=>[t,'draw12',i]);
  else if(enemy.bossMove==='wave')keys=[0,.10,.22,.38,.53,.62,.73,.84,.95,1.10,1.30,total].map((t,i)=>[t,'cross12',i]);
  else if(enemy.bossMove==='rain')keys=[0,.10,.16,.32,.48,.70,.92,1.15,1.95,2.75,3.22,total].map((t,i)=>[t,'rain12',i]);
  else keys=[[0,...idle],[w*.38,'attacks',0],[w*.78,'attacks',1],[w,'attacks',2],[end+.12,'attacks',3],[total,...idle]];
  if(enemy.bossMove==='rain')keys.splice(8,0,[1.35,'rain12',8],[1.55,'rain12',7],[1.75,'rain12',8]);
  return {...(['iai','wave','rain'].includes(enemy.bossMove)?denseTrack:ThunderBeastMotion.track)(keys,enemy.t),kind:enemy.bossMove};
 }
 if(enemy.state==='run'){
  const p=((phase%1)+1)%1*8,i=Math.floor(p);
  return {a:pose('walk',i),b:pose('walk',(i+1)%8),mix:ease((p-i-.50)/.50),kind:'run'};
 }
 return {a:pose(...idle),b:pose(...idle),mix:0,kind:enemy.hp<=0?'dead':enemy.stun>0?'hurt':'idle'};
}
let pending=null;
async function prepare(textures){
 if(!root.SAKURA_RONIN_MOTION_DATA){
  pending??=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='assets/monsters/sakura-ronin/motion-data.js';
   script.onload=()=>root.SAKURA_RONIN_MOTION_DATA?resolve():reject(new Error('樱十郎动作数据不完整'));
   script.onerror=()=>reject(new Error('樱十郎动作加载失败'));document.head.append(script);
  }).catch(e=>{pending=null;throw e;});
  await pending;
 }
 await Promise.all(Object.entries(root.SAKURA_RONIN_MOTION_DATA).map(async ([name,a])=>{
  const key='sakura-motion/'+name;if(textures.has(key))return;
  const texture=await new THREE.TextureLoader().loadAsync(location.protocol==='file:'?a.uri:a.path);
  texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;
  textures.set(key,texture);
 }));
 textures.set(SakuraRonin.type+'/idle',textures.get('sakura-motion/walk'));
}
function create(sprite,textures){return new ThunderBeastMotion.View(sprite,textures,{
 data:root.SAKURA_RONIN_MOTION_DATA,prefix:'sakura-motion/',height:SakuraRonin.profile.height,stride:3.4,sample
});}
root.SakuraRoninMotion={sample,prepare,create};
})(window);
