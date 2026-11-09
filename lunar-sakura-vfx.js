/* Moon-fan and sakura sword artwork is loaded from transparent reference-derived atlases. */
(function(){
'use strict';const T=THREE;
class LunarSakuraVfx{
 constructor(scene){
  this.scene=scene;this.geometry=new T.PlaneGeometry(1,1);this.frames={};this.shots=[];this.fields=[];this.bursts=[];this.areaRings=[];this.lastTime=0;this.ready=false;
  const data=window.LUNAR_SAKURA_ASSETS;if(!data)return;
  this.loading=Promise.all(['moon','sakura'].map(name=>new Promise((resolve,reject)=>{
   new T.TextureLoader().load(data[name].uri,texture=>{
    const a=data[name];texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;
    this.frames[name]=Array.from({length:a.columns*a.rows},(_,i)=>{const t=texture.clone();t.repeat.set(1/a.columns-2/a.width,1/a.rows-2/a.height);t.offset.set(i%a.columns/a.columns+1/a.width,1-(Math.floor(i/a.columns)+1)/a.rows+1/a.height);t.needsUpdate=true;return t;});texture.dispose();resolve();
   },undefined,reject);
  }))).then(()=>{this.ready=true;}).catch(e=>console.error('月华与樱刃特效加载失败',e));
 }
 mesh(name,frame=0){const o=new T.Mesh(this.geometry,new T.MeshBasicMaterial({map:this.frames[name][frame],transparent:true,depthWrite:false,depthTest:false,side:T.DoubleSide}));o.visible=false;this.scene.add(o);return o;}
 place(o,camera,name,frame,x,y,z,w,h,face=1,opacity=1){o.visible=true;o.material.map=this.frames[name][frame];o.material.opacity=opacity;o.position.set(x,y,z);o.quaternion.copy(camera.quaternion);o.scale.set(w*face,h,1);}
 burst(name,frame,e,w,h,life,x=e.x,y=e.y){
  const o=this.mesh(name,frame),area=e.area&&{...e.area,x:e.x,z:e.z,color:0xff876b};
  this.bursts.push({o,name,frame,x,y,z:e.z||0,face:e.face||1,w,h,life,max:life,area,weapon:name==='moon'?'fan':'sword'});
 }
 effect(e){
  if(!this.ready)return;
  const scale=e.scale??1;
  if(e.type==='swordSwing'&&e.name!=='wave')this.burst('sakura',e.name==='finisher'?2:e.name==='cross'||e.name==='heavy'?1:0,e,3.8*scale,3.3*scale,.26,e.x+e.face*1.05*scale,e.y+.2*scale);
  if(e.type==='swordUltimate')this.burst('sakura',4+e.index,e,e.last?7:5,e.last?5.8:4.2,e.last?.55:.30,e.x+e.face*(e.last?2:1),e.y+(e.last?1.1:.5));
  if(e.type==='fanSwing')this.burst('moon',2,e,3.5*scale,3*scale,.25,e.x+e.face*.8*scale,e.y);
  if(e.type==='hit'&&e.weapon==='sword')this.burst('sakura',7,e,1.8,1.8,.25);
  if(e.type==='hit'&&e.weapon==='fan'&&e.kind!=='moonField')this.burst('moon',5,e,2.1,2.1,.3);
 }
 render(game,camera){
  if(!this.ready)return;
  const time=game.time||0,dt=Math.max(0,Math.min(.05,time-this.lastTime)),reset=time<this.lastTime||!game.fighters.length;this.lastTime=time;
  const shots=game.projectiles.filter(p=>p.weapon==='fan'||p.weapon==='sword');
  while(this.shots.length<shots.length)this.shots.push(this.mesh('moon'));
  this.shots.forEach((o,i)=>{o.visible=false;const p=shots[i];if(!p)return;
   if(p.weapon==='sword')this.place(o,camera,'sakura',3,p.x-p.dir*1.4,p.y+.1,p.z+.3,5.2,2.6,p.dir);
   else if(p.kind==='moonFan'){this.place(o,camera,'moon',3+Math.floor(time*12)%2,p.x,p.y,p.z+.3,2.5,2.5,p.dir);o.rotateZ(time*6);}
   else{const frame=p.variant==='cross'?1:p.variant==='finisher'?2:0,size=frame===2?3.4:2.6;this.place(o,camera,'moon',frame,p.x,p.y,p.z+.3,size,size,p.dir);}
  });
  const fields=(game.groundSpells||[]).filter(s=>s.kind==='moonField');
  while(this.fields.length<fields.length)this.fields.push(this.mesh('moon',6));
  const fieldFrames=[];
  this.fields.forEach((o,i)=>{o.visible=false;const s=fields[i];if(!s)return;let frame,opacity=1;
   if(s.age<s.delay)frame=s.age<s.delay*.45?6:7;
   else if(s.age<s.delay+s.duration){const pulse=(s.age-s.delay)%.4;frame=pulse<.10?10:8+Math.floor(time*5)%2;}
   else{frame=11;opacity=Math.max(0,1-(s.age-s.delay-s.duration)/.4);}
   fieldFrames.push(frame);const h=7,w=8,up=new T.Vector3(0,1,0).applyQuaternion(camera.quaternion);
   this.place(o,camera,'moon',frame,s.x+up.x*h*.37,.04+up.y*h*.37,s.z+.2+up.z*h*.37,w,h,1,opacity);
  });
  for(let i=this.bursts.length-1;i>=0;i--){const p=this.bursts[i];p.life-=dt;
   if(reset||p.life<=0||game.fighters[0]?.weapon!==p.weapon){this.scene.remove(p.o);p.o.material.dispose();this.bursts.splice(i,1);continue;}
   const scale=1+(1-p.life/p.max)*.12;this.place(p.o,camera,p.name,p.frame,p.x,p.y,p.z+.45,p.w*scale,p.h*scale,p.face,Math.min(1,p.life/.1));
  }
  const areas=fields.filter(s=>s.age<s.delay+s.duration).map(s=>({...s,color:0xbda1ff}));
  for(const burst of this.bursts)if(burst.area)areas.push(burst.area);
  while(this.areaRings.length<areas.length){
   const ring=new T.Mesh(new T.RingGeometry(.96,1,64),new T.MeshBasicMaterial({transparent:true,opacity:.76,depthWrite:false}));
   ring.rotation.x=-Math.PI/2;ring.renderOrder=1;this.scene.add(ring);this.areaRings.push(ring);
  }
  this.areaRings.forEach((ring,i)=>{
   const area=areas[i];ring.visible=!!area;if(!area)return;
   ring.position.set(area.x,.05,area.z);ring.scale.set(area.radius,area.depth,1);ring.material.color.setHex(area.color);
  });
  this.state={ready:true,projectiles:shots.map(p=>({kind:p.kind,returning:p.returning,weapon:p.weapon})),fields:fields.length,fieldFrames,bursts:this.bursts.map(p=>({weapon:p.weapon,frame:p.frame}))};
 }
}
window.LunarSakuraVfx=LunarSakuraVfx;
})();
