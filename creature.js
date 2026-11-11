/* Reference-image animation only. The body remains supplied/generated raster artwork. */
(function(){
'use strict';const T=THREE,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Crystal center in the mage's staff-holding pose, in atlas pixels.
const MAGE_STAFF_CRYSTAL=[45,70];
function loadTexture(data){const image=new Image(),texture=new T.Texture(image);texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;image.onload=()=>texture.needsUpdate=true;image.src=data.uri;return texture;}
const vertexShader=`varying vec2 localPoint;
void main(){localPoint=vec2((uv.x-.5)*7.,uv.y*4.5);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragmentShader=`uniform sampler2D mapA,mapB;uniform vec4 cropA,cropB,shapeA,shapeB;uniform float blend,sceneTone,holyLight;
varying vec2 localPoint;
vec4 sampleFrame(sampler2D tex,vec4 crop,vec4 shape){
 vec2 p=vec2(localPoint.x*shape.w,localPoint.y);vec2 q=(p-vec2(shape.x,0.))/shape.yz;
 if(q.x<0.||q.x>1.||q.y<0.||q.y>1.)return vec4(0.);
 vec4 c=texture2D(tex,crop.xy+q*crop.zw);return vec4(c.rgb*c.a,c.a);
}
void main(){vec4 c=mix(sampleFrame(mapA,cropA,shapeA),sampleFrame(mapB,cropB,shapeB),blend);
 if(c.a<.08)discard;vec3 rgb=c.rgb/max(c.a,.001);
 rgb=mix(rgb,rgb*vec3(1.12,1.03,.82)+vec3(.085,.046,.01),holyLight);
 rgb=mix(rgb,vec3(dot(rgb,vec3(.2126,.7152,.0722))),sceneTone);
 gl_FragColor=vec4(rgb,c.a);
 #include <colorspace_fragment>
}`;
class ReferenceFighterView{
 constructor(scene,id=0){
  this.id=id;this.root=new T.Group();this.root.name='ReferenceImageFighter';scene.add(this.root);this.body=new T.Group();this.root.add(this.body);this.model=this.body;
  this.assets=CHARACTER_ASSETS;this.textures={};for(const name of Object.keys(this.assets))this.textures[name]=loadTexture(this.assets[name]);
  this.uniforms={mapA:{value:this.textures.idle},mapB:{value:this.textures.idle},cropA:{value:new T.Vector4()},cropB:{value:new T.Vector4()},shapeA:{value:new T.Vector4()},shapeB:{value:new T.Vector4()},blend:{value:0},sceneTone:{value:0},holyLight:{value:0}};
  this.material=new T.ShaderMaterial({uniforms:this.uniforms,vertexShader,fragmentShader,transparent:true,side:T.DoubleSide,depthWrite:false,depthTest:false,toneMapped:false});
  this.sprite=new T.Mesh(new T.PlaneGeometry(7,4.5),this.material);this.sprite.name='ReferenceCutoutSprite';this.sprite.position.set(0,2.25,.08);this.body.rotation.x=-Math.atan2(9.4,19);this.body.add(this.sprite);
  this.shadow=GroundIndicators.create(scene,'player');
  this.reset();this.setFrame('idle',0);
 }
 async setSkin(skin){
  await FighterSkins.resolve(skin);
  FighterSkins.validate(skin);
  if(skin.assets===this.assets){this.skinId=skin.id;this.weapon=skin.weapon||'fist';this.artFacing=skin.artFacing??-1;return;}
  const next={},loads=new Map();
  try{
   await Promise.all(Object.keys(skin.assets).map(async name=>{
    const uri=skin.assets[name].uri;
    if(loads.has(uri)){next[name]=await loads.get(uri);return;}
    const promise=new Promise((resolve,reject)=>{
    const texture=loadTexture(skin.assets[name]);next[name]=texture;
    const timer=setTimeout(()=>reject(new Error('图片加载超时，请重试')),10000);
    const ready=()=>{clearTimeout(timer);texture.needsUpdate=true;resolve(texture);};
    texture.image.onload=ready;texture.image.onerror=()=>{clearTimeout(timer);reject(new Error('图片加载失败，请重新选择'));};
    if(texture.image.complete){if(texture.image.naturalWidth)ready();else reject(new Error('形象图片无法读取'));}
    });loads.set(uri,promise);await promise;
   }));
  }catch(error){new Set(Object.values(next)).forEach(t=>t.dispose());throw error;}
  const previous=this.textures;this.assets=skin.assets;this.textures=next;this.skinId=skin.id;this.weapon=skin.weapon||'fist';this.artFacing=skin.artFacing??-1;this.reset();this.setFrame('idle',0);new Set(Object.values(previous)).forEach(t=>t.dispose());
 }
 reset(){this.lastTime=null;this.lastX=null;this.phase=0;this.walkWeight=0;this.speed=0;this.row=0;this.lastKey='';this.transition=null;this.primary=null;this.lean=0;this.bob=0;this.sx=1;this.sy=1;}
 descriptor(asset,index,flip=1){return {asset,index,flip:flip*(this.assets[asset].frames[index].flip??1)};}
 upload(slot,f){
  const data=this.assets[f.asset],frame=data.frames[f.index],[x0,y0,x1,y1]=frame.box,bw=x1-x0,bh=y1-y0;
  const height=data.displayHeight?(f.asset==='actions'?data.displayHeight*bh/(frame.referenceHeight||bh):data.displayHeight):(f.asset==='idle'?3:f.asset==='walk'?3:3*bh/404),width=height*bw/bh*(!data.displayHeight&&f.asset==='walk'&&f.index<8?.92:1);
  this.uniforms['map'+slot].value=this.textures[f.asset];this.uniforms['crop'+slot].value.set(x0/data.width,1-y1/data.height,bw/data.width,bh/data.height);
  this.uniforms['shape'+slot].value.set(-(frame.anchor-x0)/bw*width,width,height,f.flip);
 }
 present(a,b=a,t=0){this.upload('A',a);this.upload('B',b);this.uniforms.blend.value=t;this.primary=t<.5?a:b;this.lastFrame=this.primary.asset+this.primary.index;}
 setFrame(asset,index){const f=this.descriptor(asset,index);this.present(f);}
 mageStaffTip(face){
  if(this.skinId!=='outfit-1')return null;
  const [x,y]=MAGE_STAFF_CRYSTAL,data=this.assets.idle,frame=data.frames[0];
  const unitsPerPixel=data.displayHeight/(frame.box[3]-frame.box[1]);
  return this.body.localToWorld(new T.Vector3(
   (frame.anchor-x)*unitsPerPixel*face,
   (frame.box[3]-y)*unitsPerPixel,
   this.sprite.position.z
  ));
 }
 update(f,time){
  const reset=this.lastTime===null||time<this.lastTime||Math.abs(f.x-(this.lastX??f.x))>2;
  const dt=reset?0:clamp(time-this.lastTime,0,.05),dx=reset?0:f.x-this.lastX,dz=reset?0:(f.z||0)-this.lastZ;
  if(reset){this.reset();this.row=0;}
  this.lastTime=time;this.lastX=f.x;this.lastZ=f.z||0;
  const moving=f.state==='run',dash=f.state==='dash',preview=!!f.previewMotion;
  const vx=preview?(f.walkVX||0):dt>0?dx/dt:0,vz=preview?(f.walkVZ||0):dt>0?dz/dt:0;
  const actualSpeed=dt===0?this.speed:Math.hypot(vx,vz);
  const desiredWeight=moving&&actualSpeed>.1?1:0,ease=1-Math.exp(-dt*20);
  this.walkWeight+=(desiredWeight-this.walkWeight)*ease;this.speed=actualSpeed;
  if(moving||dash){
   const mx=f.intent?.move||f.walkVX||vx,mz=f.intent?.depth||f.walkVZ||vz;
   if(Math.abs(mx)>.1)this.row=0;else if(Math.abs(mz)>.1)this.row=mz<0?2:1;
   if(moving)this.phase=(this.phase+Math.min(actualSpeed,6.5)*dt/3.15)%1;
  }
  let a,b,mix=0,lean=0,bob=Math.sin(time*3)*.009,sx=1,sy=1,kind='idle';
  const leanSign=-f.face;
  const flip=(this.artFacing??-1)*f.face,walking=this.assets.walk&&moving&&actualSpeed>.1,neutral=this.row===0?this.descriptor('idle',0,flip):this.assets.idle.frames.length>this.row?this.descriptor('idle',this.row,1):this.descriptor('walk',this.row*8,1);
  const alignedSideWalk=walking&&this.row===0&&!!this.assets.sideWalk;
  if(walking){
   const position=this.phase*8,index=Math.floor(position),fraction=position-index;kind='walk'+this.row;
   const turn=this.row===0?flip:1,asset=alignedSideWalk?'sideWalk':'walk',offset=this.row*8;
   a=this.descriptor(asset,offset+index,turn);b=this.descriptor(asset,offset+(index+1)%8,turn);
   // Short frame blends soften knee/ankle changes without long double-image trails.
   const blendStart=alignedSideWalk?.4:.75;
   const t=clamp((fraction-blendStart)/(1-blendStart),0,1);mix=t*t*(3-2*t);
   const cycle=this.phase*Math.PI*2;
   bob=Math.sin(cycle*2)*(alignedSideWalk?.007:.014)*this.walkWeight;
   lean=(alignedSideWalk?0:this.row===0?leanSign*.018:Math.sin(cycle)*.012)*this.walkWeight;
  }else{a=b=neutral;kind='idle'+this.row;}
  let actionFrame=null;
  if(f.y>.03){actionFrame=2;kind='jump';}
  if(f.state==='guard'){actionFrame=6;kind='guard';}
  if(dash){actionFrame=null;kind='dash'+this.row;a=b=this.assets.walk?this.descriptor('walk',this.row*8+2,this.row===0?flip:1):this.descriptor('actions',1,flip);lean=leanSign*.09;sx=1.03;sy=.97;}
  if(f.state==='stun'){actionFrame=7;kind='stun';lean=-leanSign*.045;}
  if(f.state==='attack'){
   const weapon=f.weapon||this.weapon||'fist',m=f.weapon?Combat.activeMoveFor(f):Combat.moveFor({weapon},f.attack),t=f.t||0,active=t>=m.hit*.8&&t<m.hit+m.active+.11;actionFrame=active?4:3;kind=f.attack+(active?'active':'windup');
   if(f.attack==='finisher')actionFrame=active?5:3;
   if(f.attack==='heavy'){lean=active?-leanSign*.055:0;if(active&&this.assets.actions.frames.length>9)actionFrame=9;}
   if(f.attack==='wave')actionFrame=t>=m.hit?(this.assets.actions.frames.length>10?10:4):3;
   if(f.attack==='super'){actionFrame=this.assets.actions.frames.length>11?11:8;bob=Math.sin(t*40)*.015;}
   if(m.cone){actionFrame=8;kind=m.kind;bob=Math.sin(t*40)*.015;}
   if(m.kind==='angelForm'){actionFrame=t<m.hit?6:0;kind='angelForm';}
   if(m.shotCount){
    const release=t-m.hit,interval=m.shotInterval;
    actionFrame=release>=0&&release<(m.shotCount-1)*interval+.06&&release%interval<.06?4:3;
    kind='holyFeather'+actionFrame;
   }
   if(weapon==='sword'&&f.attack==='cross'&&active)actionFrame=9;
   if(weapon==='magic'&&m.projectile){
    if(f.attack==='wave'){
     actionFrame=t>=m.hit?10:3;kind='castOrb';
    }else{
     // Keep the staff and book in the mage's hands through all three normal casts.
     a=b=this.descriptor('idle',0,flip);mix=0;actionFrame=null;kind='staffCast';
     const charge=clamp(t/m.hit,0,1);
     const release=Math.max(0,t-m.hit);
     lean=flip*(.16*charge**5*Math.exp(-release*11)-.075*Math.sin(Math.PI*charge));
     sy=1-.025*Math.sin(Math.PI*charge);
    }
   }
   if(weapon==='fan'){
    if(m.projectile){actionFrame=t>=m.hit?(f.attack==='finisher'?5:f.attack==='cross'?9:f.attack==='wave'?10:4):3;kind='fanCast'+f.attack;}
    if(f.attack==='super'){actionFrame=11;kind='moonInvoke';}
   }
   if(weapon==='sword'&&f.attack==='super'){actionFrame=t<.3?9:t<.6?4:5;kind='sakuraUltimate';}
   if(weapon==='bow'){
    const prepared=f.attack==='heavy'?9:f.attack==='wave'?10:f.attack==='finisher'?5:3;
    actionFrame=t>=m.hit?4:prepared;
    if(f.attack==='super'){const last=[.20,.36,.52,.70].filter(at=>at<=t).pop();actionFrame=last!==undefined&&t-last<.085?4:11;}
   }
   if(weapon==='president'&&f.attack==='super'){
    a=b=this.descriptor('rally',0,flip);actionFrame=null;kind='rally';
    bob=Math.sin(t*16)*.014;
   }
   if(active)sx=1.025;
   this.row=0;
  }
  if(f.celebrate){actionFrame=8;kind='laugh';bob=Math.sin(time*15)*.015;}
  if(f.hp<=0){const fallen=this.assets.actions.frames.length>12;actionFrame=fallen?12:7;kind='ko';lean=fallen?0:leanSign*Math.min(1.45,(f.t||0)*1.8);bob=.1;}
  if(actionFrame!==null){a=b=this.descriptor('actions',actionFrame,flip);mix=0;}
  const key=kind+':'+a.flip;
  if(key!==this.lastKey){
   // Combat anticipation stays responsive; movement changes receive a longer ease.
   const mirroredSideWalk=alignedSideWalk&&this.primary?.flip!==a.flip;
   this.transition=this.primary&&!reset&&!mirroredSideWalk?{from:this.primary,time:0,duration:f.state==='attack'||f.state==='stun'?.055:.13}:null;this.lastKey=key;
  }
  // Hit-stop holds the completed strike pose rather than a double-exposed blend.
  if(kind==='staffCast'||f.hitStop||(f.state==='attack'&&f.hit)){this.transition=null;mix=mix<.5?0:1;}
  if(this.transition){const tr=this.transition;tr.time+=dt;const t=clamp(tr.time/tr.duration,0,1);this.present(tr.from,mix<.5?a:b,t*t*(3-2*t));if(t>=1)this.transition=null;}
  else this.present(a,b,mix);
  const smooth=reset?1:1-Math.exp(-dt*22);this.lean+=(lean-this.lean)*smooth;this.bob+=(bob-this.bob)*smooth;this.sx+=(sx-this.sx)*smooth;this.sy+=(sy-this.sy)*smooth;
  const scale=ArenaConfig.scale.player;
  this.root.position.set(f.x,f.y,f.z||0);this.root.scale.setScalar(scale);this.body.position.y=this.bob;this.body.scale.set(this.sx,this.sy,1);this.body.rotation.z=this.lean;
  this.sprite.renderOrder=ArenaConfig.actorDepthOrder(f);
  this.uniforms.holyLight.value=f.angelForm?.endsAt>time?clamp((f.angelForm.endsAt-time)/.35,0,1):0;
  GroundIndicators.update(this.shadow,f,scale,f.hp<=0?clamp(1-f.t/.65,0,1):1);
  const castingPillar=f.weapon==='magic'&&f.state==='attack'&&f.attack==='super';
  this.root.visible=castingPillar||kind==='rally'||!(f.inv>0&&f.state!=='dash'&&Math.floor(time*24)%2);
  this.animationState={skin:this.skinId||'original',weapon:this.weapon||'fist',row:this.row,phase:this.phase,frame:this.lastFrame,blend:this.uniforms.blend.value,flip:a.flip,speed:this.speed,form:f.angelForm?'angel':null};
 }
}
window.ReferenceFighterView=ReferenceFighterView;
})();
