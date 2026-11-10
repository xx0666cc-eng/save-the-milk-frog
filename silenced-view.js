/* Clear single-pose Silenced sprites; floor VFX and projectiles stay separate. */
(function(root){
'use strict';
const T=THREE,clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const pose=(asset,index)=>({asset,index}),nameOf=e=>e.monsterType.slice('silenced-'.length);
function sample(e,phase){
 const name=nameOf(e),asset=name+'-motion';
 if(e.hp<=0||e.stun>0)return {a:pose(name+'-base',0),b:pose(name+'-base',0),mix:0,kind:e.hp<=0?'dead':'hurt'};
 if(e.state==='attack'){
  const m=SilencedEnemies.types[e.monsterType].moves[e.bossMove],special=['dash','quake','ritual'].includes(e.bossMove),base=special?16:12,total=m.windup+m.active+m.recover;
  if(e.bossMove==='thrust'){
   const keys=[[0,12],[m.windup*.60,13],[m.windup*.85,14],[m.windup,15],[total,0]];
   let i=0;while(i<keys.length-2&&e.t>=keys[i+1][0])i++;const a=keys[i],b=keys[i+1];
   return {a:pose(asset,a[1]),b:pose(asset,b[1]),mix:ease((e.t-a[0])/(b[0]-a[0])),kind:'thrust'};
  }
  const keys=[[0,base],[m.windup*.67,base+1],[m.windup,base+2],[total,base+3]];
  let i=0;while(i<keys.length-2&&e.t>=keys[i+1][0])i++;
  const a=keys[i],b=keys[i+1];return {a:pose(asset,a[1]),b:pose(asset,b[1]),mix:ease((e.t-a[0])/(b[0]-a[0])),kind:e.bossMove};
 }
 const running=e.state==='run',count=running?8:4,start=running?4:0,p=running?phase:e.t*.55+e.id*.123,q=((p%1+1)%1)*count,i=Math.floor(q);
 return {a:pose(asset,start+i),b:pose(asset,start+(i+1)%count),mix:ease(q-i),kind:running?'run':'idle'};
}
let pending=null;
async function prepare(textures){
 if(!root.SILENCED_DATA){
  pending??=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='assets/monsters/silenced/data.js';s.onload=()=>root.SILENCED_DATA?resolve():reject(new Error('失声者动作包不完整'));s.onerror=()=>reject(new Error('失声者动作加载失败'));document.head.append(s);}).catch(e=>{pending=null;throw e;});
  await pending;
 }
 await Promise.all(Object.entries(root.SILENCED_DATA).map(async([name,a])=>{
  const key='silenced/'+name;if(textures.has(key))return;
  const texture=await new T.TextureLoader().loadAsync(location.protocol==='file:'?a.uri:a.path);texture.colorSpace=T.SRGBColorSpace;texture.minFilter=texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;textures.set(key,texture);
 }));
 for(const type of Object.keys(SilencedEnemies.types))textures.set(type+'/idle',textures.get('silenced/'+nameOf({monsterType:type})+'-base'));
}
function createMotion(sprite,textures,profile){
 const motion=new ThunderBeastMotion.View(sprite,textures,{data:root.SILENCED_DATA,prefix:'silenced/',height:profile.height,stride:profile.role==='ranged'?2.8:2.4,sample});
 // Keep the shared stride/clock/anchor code, but never dissolve two body poses.
 // The displayed pose is also the anchor source, so hand VFX cannot drift between images.
 const present=motion.present.bind(motion);
 motion.present=(material,s,face,opacity)=>{
  const frame=s.mix<.5?s.a:s.b,single={...s,a:frame,b:frame,mix:0};
  if(material===sprite.material)motion.current=single;
  present(material,single,face,opacity);
 };
 const update=motion.update.bind(motion);motion.update=(e,time,opacity)=>{
  update(e,time,e.hp>0?1:opacity);
  if(profile.hoverHeight&&e.hp>0)sprite.position.y+=Math.sin(time*2.7+e.id*.61)*.035;
  if(e.hp>0&&e.state==='stun'&&e.t<.21&&Math.cos(e.t*68)>0)sprite.material.uniforms.tint.value.setRGB(1.12,1.02,1.12);
  motion.diagnostics={...motion.diagnostics,a:motion.current.a,b:motion.current.b,blend:0};
 };return motion;
}
const vertex='varying vec2 point;void main(){point=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const fragment=[
 'uniform sampler2D map;uniform vec4 crop;uniform float opacity,clock;varying vec2 point;',
 'void main(){vec2 q=point;q.y+=sin(q.x*16.-clock*7.)*.003*sin(q.y*3.14159);vec4 c=texture2D(map,crop.xy+q*crop.zw);',
 'c.a*=smoothstep(.025,.25,c.a)*smoothstep(0.,.055,q.x)*smoothstep(0.,.055,1.-q.x)*smoothstep(0.,.055,q.y)*smoothstep(0.,.055,1.-q.y);',
 'if(c.a<.018)discard;gl_FragColor=vec4(c.rgb,c.a*opacity);',
 '#include <colorspace_fragment>','}'
].join(String.fromCharCode(10));
class SilencedView{
 static owns(p){return ['silencedOrb','silencedRitual'].includes(p.kind);}
 static prepare=prepare;
 static createMotion=createMotion;
 constructor(scene,textures){this.scene=scene;this.textures=textures;this.units=new Map();this.shots=[];this.diagnostics={};}
 effect(index){
  const a=root.SILENCED_DATA.vfx,f=a.frames[index],[x,y,w,h]=f.cell;
  const o=new T.Mesh(new T.PlaneGeometry(1,1).translate(.5-f.anchor[0]/w,f.anchor[1]/h-.5,0),new T.ShaderMaterial({
   uniforms:{map:{value:this.textures.get('silenced/vfx')},crop:{value:new T.Vector4((x+.5)/a.width,1-(y+h-.5)/a.height,(w-1)/a.width,(h-1)/a.height)},opacity:{value:1},clock:{value:0}},
   vertexShader:vertex,fragmentShader:fragment,transparent:true,depthTest:false,depthWrite:false,side:T.DoubleSide,toneMapped:false
  }));o.userData.frame=f;o.visible=false;return o;
 }
 place(o,x,y,z,face,height,camera,time,alpha){
  o.visible=alpha>.005;if(!o.visible)return;const f=o.userData.frame;
  o.position.set(x,y,z);o.quaternion.copy(camera.quaternion);o.scale.set(face*height*f.cell[2]/f.cell[3],height,1);
  o.material.uniforms.opacity.value=clamp(alpha);o.material.uniforms.clock.value=time;o.renderOrder=ArenaConfig.actorDepthOrder({z})+.10;
 }
 circle(){
  const p=Array.from({length:96},(_,i)=>new T.Vector3(Math.cos(i/96*Math.PI*2),0,Math.sin(i/96*Math.PI*2)));
  const o=new T.LineLoop(new T.BufferGeometry().setFromPoints(p),new T.LineBasicMaterial({color:0xb989ff,transparent:true,opacity:.3,depthWrite:false}));
  o.renderOrder=-8.5;o.visible=false;return o;
 }
 create(view){
  const group=new T.Group(),slash=this.effect(0),burst=this.effect(1),rings=[this.circle(),this.circle()];
  // Ground-level speed strokes, never copies of the unit's body or weapon.
  const speedLines=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(18),3)),new T.LineBasicMaterial({color:0xc7a7ff,transparent:true,opacity:.4,depthTest:false,depthWrite:false}));
  speedLines.frustumCulled=false;speedLines.visible=false;speedLines.renderOrder=-8.5;
  group.add(slash,burst,...rings,speedLines);
  this.scene.add(group);return {group,slash,burst,rings,speedLines};
 }
 groundCircle(o,x,z,rx,rz,alpha){o.visible=alpha>.005;if(!o.visible)return;o.position.set(x,.045,z);o.scale.set(rx,1,rz);o.material.opacity=alpha;}
 disposeUnit(v){this.scene.remove(v.group);for(const o of [v.slash,v.burst,...v.rings,v.speedLines]){o.geometry.dispose();o.material.dispose();}}
 clear(){for(const v of this.units.values())this.disposeUnit(v);this.units.clear();for(const v of this.shots)v.orb.visible=v.wave.visible=false;}
 render(monsters,views,camera,time,projectiles,phase){
  const live=new Set(),active=['fight','paused','explore'].includes(phase);this.diagnostics={};
  for(const e of monsters){
   if(!SilencedEnemies.owns(e)||e.hp<=0)continue;const view=views.get(e.id);if(!view?.motion)continue;
   live.add(e.id);let v=this.units.get(e.id);if(!v){v=this.create(view);this.units.set(e.id,v);}
   v.group.visible=active;for(const o of [v.slash,v.burst,...v.rings,v.speedLines])o.visible=false;if(!active)continue;
   const p=SilencedEnemies.types[e.monsterType],c=e.bossCast,s=ArenaConfig.bodyScale(e),attacking=e.state==='attack';
   if(c&&attacking){
    const m=p.moves[c.kind],age=e.t-m.windup;
    if(c.kind==='claw'&&age>=0&&age<.26){
     const hand=view.motion.point('hand',e);
     this.place(v.slash,hand.x,hand.y-.3,e.z,e.face,(c.kind==='claw'?1.35:1.6)*s,camera,time,1-age/.26);
    }
    if(c.kind==='thrust'&&age>=0&&age<.26)this.place(v.burst,e.x+c.face*2.4*s,.035,e.z,1,1.0*s,camera,time,(1-age/.26)*.75);
    if(c.kind==='quake'){
     if(age<0)this.groundCircle(v.rings[0],c.hitX,c.hitZ,m.radiusX*s,m.radiusZ*s,.18+.4*clamp(e.t/m.windup));
     else if(age<.48)this.place(v.burst,c.hitX,.035,c.hitZ,1,(2.25+.6*ease(age/.15))*s,camera,time,1-age/.48);
    }
    if(c.kind==='ritual'&&age<.16){
     v.rings.forEach((o,i)=>{const at=.20+i*.35,q=clamp((e.t-at)/.4),f=(i+1)/3;
      this.groundCircle(o,c.x+(c.targetX-c.x)*f,c.z+(c.targetZ-c.z)*f,(.65+.55*q)*s,(.4+.35*q)*s,q*(age<0?.55:.55*(1-age/.16)));
     });
    }
    if(c.kind==='dash'&&age>=0&&age<m.active){
     const positions=v.speedLines.geometry.attributes.position;
     for(let i=0;i<3;i++){
      const lateral=(i-1)*.28*s,back=(.62+i*.10)*s,length=(.85+.18*Math.sin(time*24+i))*s;
      const x=e.x-c.dirX*back-c.dirZ*lateral,z=e.z-c.dirZ*back+c.dirX*lateral;
      positions.setXYZ(i*2,x,.065,z);positions.setXYZ(i*2+1,x-c.dirX*length,.065,z-c.dirZ*length);
     }
     positions.needsUpdate=true;v.speedLines.visible=true;
    }
   }
   this.diagnostics[e.id]={hoverY:e.y,screenedBy:e.screenedBy||[],walkVX:e.walkVX,walkVZ:e.walkVZ,bodyBlend:0,bodyOpacity:view.sprite.material.uniforms.opacity.value,pose:view.motion.current.a,speedLines:v.speedLines.visible};
  }
  for(const [id,v] of this.units)if(!live.has(id)){this.disposeUnit(v);this.units.delete(id);}
  const list=projectiles.filter(SilencedView.owns);
  while(this.shots.length<list.length){const entry={orb:this.effect(2),wave:this.effect(3)};this.scene.add(entry.orb,entry.wave);this.shots.push(entry);}
  this.shots.forEach((entry,i)=>{
   const p=list[i];entry.orb.visible=entry.wave.visible=false;if(!p||!active)return;
   const orb=p.kind==='silencedOrb',o=orb?entry.orb:entry.wave,alpha=Math.min(1,p.life/.20)*Math.min(1,p.traveled/.35),height=orb?.65:2.45;
   this.place(o,p.x,orb?p.y:.035,p.z,p.dir,height,camera,time,alpha);
  });
 }
}
root.SilencedView=SilencedView;root.SilencedMotion={sample,prepare,create:createMotion};
})(window);

