/* Reference-derived raster VFX. Character images are unchanged. */
(function(){
'use strict';const T=THREE;
const ORB_CORE_X=[.79,.76,.77,.76,.535];
class MageVfx{
 constructor(scene){
  this.scene=scene;this.geometry=new T.PlaneGeometry(1,1);this.orbs=[];this.beams=[];this.impacts=[];this.charge=null;this.staffOrigins=new WeakMap();this.lastTime=0;this.ready=false;this.frames={};
  const data=window.MAGE_VFX_ASSETS;if(!data)return;
  this.loading=Promise.all(['orb','beam'].map(name=>new Promise((resolve,reject)=>{
   new T.TextureLoader().load(data[name].uri,texture=>{
    texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;
    this.frames[name]=Array.from({length:8},(_,i)=>{const t=texture.clone();const w=data[name].width,h=data[name].height;t.repeat.set(1/4-2/w,1/2-2/h);t.offset.set(i%4/4+1/w,1-(Math.floor(i/4)+1)/2+1/h);t.needsUpdate=true;return t;});texture.dispose();resolve();
   },undefined,reject);
  }))).then(()=>{this.ready=true;}).catch(error=>{console.error('星月特效加载失败',error);});
 }
 mesh(name,frame=0){
  const o=new T.Mesh(this.geometry,new T.MeshBasicMaterial({map:this.frames[name][frame],transparent:true,depthWrite:false,depthTest:false,side:T.DoubleSide}));
  o.visible=false;this.scene.add(o);return o;
 }
 place(o,camera,x,y,z,w,h,frame,name,face=1,opacity=1){
  o.visible=true;o.material.map=this.frames[name][frame];o.material.opacity=opacity;o.quaternion.copy(camera.quaternion);o.position.set(x,y,z);o.scale.set(w*face,h,1);
 }
 placeOrbCore(o,camera,core,size,frame,face){
  this.place(o,camera,core.x,core.y,core.z,size,size,frame,'orb',face);
  // The bright center is off-center in the atlas, especially with the flight trail.
  o.translateX((.5-ORB_CORE_X[frame])*size*face);
  if(frame===4)o.translateY(.015*size);
 }
 placeWarning(spell){
  if(!this.warning){
   const warning=new T.Group();
   const fill=new T.Mesh(new T.CircleGeometry(1,64),new T.MeshBasicMaterial({color:0xff374a,transparent:true,opacity:.19,depthWrite:false}));
   const edge=new T.Mesh(new T.RingGeometry(.88,1,64),new T.MeshBasicMaterial({color:0xff4a55,transparent:true,opacity:.96,depthWrite:false}));
   // Keep the warning edge readable over the beam's ground glow.
   edge.renderOrder=1;
   warning.add(fill,edge);warning.rotation.x=-Math.PI/2;this.scene.add(warning);this.warning=warning;
  }
  this.warning.position.set(spell.x,.05,spell.z);
  this.warning.scale.set(spell.radius,spell.depth,1);
  this.warning.visible=true;
 }
 effect(e){if(this.ready&&e.type==='hit'&&e.kind==='orb'){
  const o=this.mesh('orb',5);this.impacts.push({o,x:e.x,y:e.y,z:e.z||0,age:0});
 }}
 render(game,camera,fighterView){
  if(!this.ready)return;
  const time=game.time||0,dt=Math.max(0,Math.min(.05,time-this.lastTime)),reset=time<this.lastTime||!game.fighters.length||game.fighters[0].weapon!=='magic';this.lastTime=time;
  const shots=game.projectiles.filter(p=>p.kind==='orb');
  while(this.orbs.length<shots.length)this.orbs.push(this.mesh('orb'));
  this.orbs.forEach((o,i)=>{
   o.visible=false;const p=shots[i];if(!p)return;
   const size=p.power?2.5:2,frame=Math.floor(time*12)%4,age=p.traveled/p.speed;
   if(!p.castFrom){this.place(o,camera,p.x-p.dir*size*.28,p.y,p.z+.25,size,size,frame,'orb',p.dir);return;}
   const flight=new T.Vector3(p.x,p.y,p.z+.25);
   if(age<.18){
    let origin=this.staffOrigins.get(p);
    if(!origin){
     origin=fighterView.mageStaffTip(p.dir);
     if(origin){origin.sub(fighterView.root.position).add(p.castFrom);this.staffOrigins.set(p,origin);}
    }
    // Ease the orb down from the staff into its regular flight lane.
    if(origin)flight.lerp(new T.Vector3(origin.x+p.dir*p.traveled,origin.y,origin.z),1-T.MathUtils.smoothstep(age,0,.18));
   }
   this.placeOrbCore(o,camera,flight,size,frame,p.dir);
  });
  const f=game.fighters[0],m=f?.state==='attack'?Combat.moveFor(f):null;
  if(this.charge)this.charge.visible=false;
  if(f?.weapon==='magic'&&m?.projectile&&f.t<m.hit){
   this.charge=this.charge||this.mesh('orb',4);const size=.65+f.t/m.hit*.65;
   const tip=f.attack!=='wave'?fighterView.mageStaffTip(f.face):null;
   if(tip)this.placeOrbCore(this.charge,camera,tip,size,4,f.face);
   else{
    const scale=ArenaConfig.bodyScale(f);
    this.place(this.charge,camera,f.x+f.face*scale,f.y+2.05*scale,f.z+.3,size,size,4,'orb',f.face);
   }
  }
  const spells=(game.groundSpells||[]).filter(s=>s.kind==='pillar');
  if(this.warning)this.warning.visible=false;
  const beamFrames=[];
  while(this.beams.length<spells.length)this.beams.push(this.mesh('beam'));
  this.beams.forEach((o,i)=>{o.visible=false;const s=spells[i];if(!s)return;
   const after=Math.max(0,s.age-s.delay);
   let frame=s.fired?Math.min(7,3+Math.floor(after/.7*5)):Math.min(2,Math.floor(s.age/s.delay*3));
   if(s.radius){
    if(!s.fired)this.placeWarning(s);
    if(s.guiding){
     frame=Math.min(3,Math.floor(s.age/.08));
    }else if(!s.fired){
     frame=3;
    }else{
     frame=after<.18?5:after<.5?6:7;
    }
   }
   beamFrames.push(frame);
   // The opening atlas frames grow upward while the base stays on the ground.
   const height=7.2,width=5.4,up=new T.Vector3(0,1,0).applyQuaternion(camera.quaternion);
   const groundZ=s.z+(s.radius?0:.15);
   this.place(o,camera,s.x+up.x*height*.38,.04+up.y*height*.38,groundZ+up.z*height*.38,width,height,frame,'beam',s.dir??1,frame===7?Math.max(0,1-(after-.56)/.14):1);
  });
  for(let i=this.impacts.length-1;i>=0;i--){const p=this.impacts[i];p.age+=dt;if(reset||p.age>=.36){this.scene.remove(p.o);p.o.material.dispose();this.impacts.splice(i,1);continue;}
   this.place(p.o,camera,p.x,p.y,p.z+.45,2.6,2.6,Math.min(7,5+Math.floor(p.age/.12)),'orb',1,Math.min(1,(.36-p.age)/.12));
  }
  this.state={ready:this.ready,orbs:shots.length,beams:spells.length,impacts:this.impacts.length,beamFrames};
 }
}
window.MageVfx=MageVfx;
})();
