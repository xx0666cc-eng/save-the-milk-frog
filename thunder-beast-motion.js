/* Reference-pose animation. This module never writes to a combat unit. */
(function(root){
'use strict';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
const beast=typeof module!=='undefined'?require('./thunder-beast.js'):root.ThunderBeast;
const pose=(asset,index)=>({asset,index});
const idle=()=>pose('walk',0);
const config=Object.freeze({stride:3.05,walkBlendStart:.60,transition:.075,attackTransition:.055,maxPoseBlend:.055,planeWidth:12,planeHeight:9});
function track(keys,t){
 for(let i=1;i<keys.length;i++)if(t<keys[i][0]){
  const a=keys[i-1],b=keys[i];
  const blendTime=Math.min(config.maxPoseBlend,(b[0]-a[0])*.65);
  // Like the player's sprite animator, hold the readable key pose and use a
  // short premultiplied blend at its end instead of leaving two silhouettes visible.
  return {a:pose(a[1],a[2]),b:pose(b[1],b[2]),mix:ease((t-b[0]+blendTime)/(blendTime||1))};
 }
 const last=keys.at(-1);return {a:pose(last[1],last[2]),b:pose(last[1],last[2]),mix:0};
}
function skill(kind,t,m){
 const w=m.windup,end=w+m.active,total=end+m.recover;
 let keys;
 if(kind==='rake')keys=[
  [0,'walk',0],[w*.46,'rake',1],[w*.82,'rake',2],[m.impacts[0],'rake',3],
  [(m.impacts[0]+m.impacts[1])*.5,'rake',2],[m.impacts[1],'rake',4],
  [end+.08,'rake',5],[total,'walk',0]
 ];
 else if(kind==='vine')keys=[
  [0,'vine',0],[w*.52,'vine',1],[w,'vine',2],[w+.12,'vine',3],
  [m.dive-.12,'vine',3],[m.dive,'vine',4],[m.dive+.12,'vine',5],
  [end-.12,'vine',5],[end,'walk',5],[end+.14,'walk',6],[total,'walk',0]
 ];
 else if(kind==='zigzag')keys=[
  [0,'zigzag',0],[w,'zigzag',1],[.27,'zigzag',2],[.34,'zigzag',3],
  [.43,'zigzag',2],[.53,'zigzag',3],[.64,'zigzag',2],[m.flank,'zigzag',4],
  [m.charge-.035,'zigzag',4],[m.charge+.035,'zigzag',5],
  [end-.04,'zigzag',5],[end+.10,'walk',5],[total,'walk',0]
 ];
 else keys=[
  [0,'walk',0],[w*.25,'storm',1],[w*.56,'storm',2],[w*.85,'storm',3],
  [w,'storm',4],[end-.12,'storm',4],[end+.08,'storm',5],[total,'walk',0]
 ];
 return {...track(keys,t),kind};
}
function sample(unit,phase){
 const m=beast.profile.moves[unit.bossMove];
 if(unit.state==='attack'&&m)return skill(unit.bossMove,unit.t,m);
 if(unit.state==='run'){
  // Frames 2..7 are the actual gallop loop. Idle/preparation frames do not recur mid-run.
  const cycle=[2,3,4,5,6,7],p=((phase%1)+1)%1*cycle.length,i=Math.floor(p);
  return {a:pose('walk',cycle[i]),b:pose('walk',cycle[(i+1)%cycle.length]),mix:ease((p-i-config.walkBlendStart)/(1-config.walkBlendStart)),kind:'run'};
 }
 return {a:idle(),b:idle(),mix:0,kind:unit.hp<=0?'dead':unit.state==='stun'?'hurt':'idle'};
}
const vertexShader=`varying vec2 point;
void main(){point=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragmentShader=`uniform sampler2D mapA,mapB;uniform vec4 cropA,cropB,boxA,boxB;
uniform vec2 flip;uniform float blend,opacity,sceneTone;uniform vec3 tint;varying vec2 point;
vec4 frame(sampler2D tex,vec4 crop,vec4 box,float direction){
 vec2 q=(vec2(point.x*direction,point.y)-box.xy)/box.zw;
 if(q.x<0.||q.x>1.||q.y<0.||q.y>1.)return vec4(0.);
 vec4 c=texture2D(tex,crop.xy+q*crop.zw);
 // Cutout export has near-zero alpha outside the subject; never draw the RGB matte.
 c.a*=smoothstep(.08,.45,c.a);return vec4(c.rgb*c.a,c.a);
}
void main(){vec4 c=mix(frame(mapA,cropA,boxA,flip.x),frame(mapB,cropB,boxB,flip.y),blend);
 if(c.a<.055)discard;vec3 rgb=c.rgb/max(c.a,.001)*tint;rgb=mix(rgb,vec3(dot(rgb,vec3(.2126,.7152,.0722))),sceneTone);
 gl_FragColor=vec4(rgb,c.a*opacity);
 #include <colorspace_fragment>
}`;
let dataPromise=null;
function loadData(){
 if(root.THUNDER_BEAST_MOTION_DATA)return Promise.resolve(root.THUNDER_BEAST_MOTION_DATA);
 if(!dataPromise)dataPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='assets/monsters/thunder-beast/motion/motion-data.js';
  script.onload=()=>root.THUNDER_BEAST_MOTION_DATA?resolve(root.THUNDER_BEAST_MOTION_DATA):reject(new Error('迅电兽动作数据不完整'));
  script.onerror=()=>reject(new Error('迅电兽动作图片加载失败'));document.head.appendChild(script);
 }).catch(error=>{dataPromise=null;throw error;});
 return dataPromise;
}
class View{
 static async prepare(textures){
  const data=await loadData();
  await Promise.all(Object.entries(data).map(async ([name,asset])=>{
   const key='thunder-motion/'+name;if(textures.has(key))return;
   const texture=await new THREE.TextureLoader().loadAsync(location.protocol==='file:'?asset.uri:asset.path);
   texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=texture.magFilter=THREE.LinearFilter;
   texture.generateMipmaps=false;textures.set(key,texture);
  }));
 }
 constructor(sprite,textures,adapter=null){
  this.adapter=adapter;this.sprite=sprite;this.textures=textures;this.data=adapter?.data??root.THUNDER_BEAST_MOTION_DATA;
  this.geometry=new THREE.PlaneGeometry(config.planeWidth,config.planeHeight).translate(0,3.5,0);
  sprite.geometry=this.geometry;sprite.material.dispose();sprite.material=this.material();
  this.phase=0;this.lastTime=null;this.current=null;this.transition=null;
 }
 material(){
  const T=THREE;
  return new T.ShaderMaterial({uniforms:{mapA:{value:null},mapB:{value:null},cropA:{value:new T.Vector4()},cropB:{value:new T.Vector4()},boxA:{value:new T.Vector4()},boxB:{value:new T.Vector4()},flip:{value:new T.Vector2()},blend:{value:0},opacity:{value:1},sceneTone:{value:0},tint:{value:new T.Color(1,1,1)}},vertexShader,fragmentShader,transparent:true,depthWrite:false,depthTest:false,side:T.DoubleSide,toneMapped:false});
 }
 frameInfo(p,face){
  const a=this.data[p.asset],f=a.frames[p.index],units=(this.adapter?.height??ThunderBeast.profile.height)/a.referenceHeight;
  return {a,f,units,flip:face*(f.face??a.face??-1)};
 }
 upload(material,slot,p,face){
  const {a,f,units,flip}=this.frameInfo(p,face),[x,y,w,h]=f.cell;
  material.uniforms['map'+slot].value=this.textures.get((this.adapter?.prefix??'thunder-motion/')+p.asset);
  material.uniforms['crop'+slot].value.set((x+.5)/a.width,1-(y+h-.5)/a.height,(w-1)/a.width,(h-1)/a.height);
  material.uniforms['box'+slot].value.set(-f.anchor[0]*units,(f.anchor[1]-h)*units,w*units,h*units);
  material.uniforms.flip.value[slot==='A'?'x':'y']=flip;
 }
 present(material,s,face,opacity=1){
  this.upload(material,'A',s.a,face);this.upload(material,'B',s.b,face);
  material.uniforms.blend.value=s.mix;material.uniforms.opacity.value=opacity;
 }
 point(name,monster){
  const local=p=>{const {f,units,flip}=this.frameInfo(p,this.face??monster.face),v=f.points[name]||f.points.paw;return new THREE.Vector3((v[0]-f.anchor[0])*units*flip,(f.anchor[1]-v[1])*units,0);};
  const v=local(this.current.a).lerp(local(this.current.b),this.current.mix);
  this.sprite.updateWorldMatrix(true,false);return this.sprite.localToWorld(v);
 }
 update(monster,time,opacity){
  const reset=this.lastTime===null||time<this.lastTime,dt=reset?0:clamp(time-this.lastTime,0,.05);
  const dx=reset?0:monster.x-this.lastX,dz=reset?0:monster.z-this.lastZ;
  const speed=dt>0?Math.hypot(dx,dz)/dt:0;
  if(monster.state==='run')this.phase=(this.phase+Math.min(speed,6.5)*dt/(this.adapter?.stride??config.stride))%1;
  let next=(this.adapter?.sample??sample)(monster,this.phase);
  // The leap first travels backwards. Keep the head toward the player rather than
  // mirroring the entire gripping pose when the AI's translation velocity reverses.
  this.face=monster.state==='attack'&&monster.bossMove==='vine'?monster.bossCast.face:monster.face;
  if(next.kind!==this.kind){
   const previous=this.current?(this.current.mix<.5?this.current.a:this.current.b):next.a;
   this.transition={from:previous,at:time,length:next.kind==='run'?config.transition:config.attackTransition};
   this.kind=next.kind;
  }
  if(this.transition){
   const q=(time-this.transition.at)/this.transition.length;
   if(q>=1)this.transition=null;
   else next={...next,a:this.transition.from,b:next.mix<.5?next.a:next.b,mix:ease(q)};
  }
  this.current=next;this.present(this.sprite.material,next,this.face,opacity);
  const living=monster.hp>0,still=next.kind==='idle',breath=living&&still?Math.sin(time*3.4)*.009:0;
  this.sprite.position.set(0,breath,.03);this.sprite.scale.set(1,1,1);
  // Anatomical movement is in the atlas; only a tiny settling lean is procedural.
  this.sprite.rotation.z=living&&next.kind==='run'?-monster.face*Math.sin(this.phase*Math.PI*2)*.012:0;
  this.sprite.material.uniforms.tint.value.setRGB(1,1,1);
  this.lastTime=time;this.lastX=monster.x;this.lastZ=monster.z;
  this.diagnostics={kind:next.kind,a:next.a,b:next.b,blend:next.mix,phase:this.phase,speed};
 }
 ghost(mesh,entry,camera,scale){
  this.present(mesh.material,entry.pose,entry.face,entry.alpha);
  mesh.material.uniforms.tint.value.setRGB(.36,.78,1);
  mesh.position.set(entry.x,entry.y+.03,entry.z);mesh.quaternion.copy(camera.quaternion);
  mesh.scale.setScalar(scale);mesh.visible=true;
 }
 dispose(){this.geometry.dispose();}
}
const api={config,track,skill,sample,View};
if(typeof module!=='undefined')module.exports=api;else root.ThunderBeastMotion=api;
})(typeof window!=='undefined'?window:globalThis);
