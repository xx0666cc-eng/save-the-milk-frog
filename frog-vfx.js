/* Original frog spell presentation. Positions and lifetimes follow the combat clock. */
(function(){
'use strict';
const T=THREE,TAU=Math.PI*2,clamp=T.MathUtils.clamp;
const flatVertex=`
 varying vec2 vUv;
 void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`;
const wingFragment=`
 uniform sampler2D feathers;
 uniform float opening,sceneTone;
 varying vec2 vUv;
 void main(){
  vec4 c=texture2D(feathers,vUv);
  float alpha=c.a*smoothstep(0.,.14,1.-vUv.x)*opening;
  if(alpha<.025)discard;
  vec3 rgb=mix(c.rgb,vec3(dot(c.rgb,vec3(.2126,.7152,.0722))),sceneTone);
  gl_FragColor=vec4(rgb,alpha);
  #include <colorspace_fragment>
 }
`;
const sectorFragment=`
 uniform float progress,halfAngle,direction,opacity,holy;
 varying vec2 vUv;
 void main(){
  vec2 p=vUv*2.-1.;p.x*=direction;
  float r=length(p),a=abs(atan(p.y,max(.0001,p.x)));
  if(p.x<=0.||a>halfAngle||r>progress)discard;
  float front=1.-smoothstep(.006,.030,progress-r);
  float inner=1.-smoothstep(.006,.026,abs(progress*.67-r));
  float edge=smoothstep(halfAngle-.035,halfAngle,a)*smoothstep(.06,.24,r);
  vec3 color=mix(vec3(.95,.32,.015),vec3(1.,.79,.24),max(front,max(inner*.55,edge*.5)));
  float alpha=(.19+front*.56+inner*.24+edge*.25)*smoothstep(0.,.12,r);
  gl_FragColor=vec4(mix(color,vec3(1.,.9,.56),holy*.24),alpha*opacity);
  #include <colorspace_fragment>
 }
`;
const shellVertex=`
 uniform float halfAngle,radius,height,direction;
 varying vec2 vUv;
 void main(){
  vUv=uv;
  float a=(uv.x*2.-1.)*halfAngle;
  float arch=sin(uv.y*3.141593),swell=.93+.07*arch;
  vec3 point=vec3(cos(a)*radius*swell*direction,(uv.y-.43)*height*(.72+.28*cos(a)),sin(a)*radius*swell);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(point,1.);
 }
`;
const shellFragment=`
 uniform float opacity,holy;
 varying vec2 vUv;
 void main(){
  float u=abs(vUv.x*2.-1.),h=vUv.y;
  float crest=smoothstep(.79,.97,h),lip=smoothstep(.91,1.,u);
  float flutes=.5+.5*cos((vUv.x+h*.064)*42.);
  float seams=smoothstep(.82,.99,flutes)*sin(h*3.141593);
  float rim=max(crest,lip),cloud=pow(flutes,3.)*smoothstep(.42,.84,h);
  vec3 gold=mix(vec3(.96,.29,.014),vec3(1.,.61,.10),h);
  vec3 color=mix(gold,vec3(1.,.94,.61),min(1.,rim*.88+cloud*.27+seams*holy*.30));
  float alpha=.16+rim*.67+cloud*.18+holy*seams*.18;
  gl_FragColor=vec4(color,alpha*opacity*smoothstep(0.,.15,h));
  #include <colorspace_fragment>
 }
`;
function surface(vertexShader,fragmentShader,uniforms){
 return new T.ShaderMaterial({vertexShader,fragmentShader,uniforms,transparent:true,
  depthWrite:false,depthTest:false,side:T.DoubleSide,toneMapped:false});
}
function drawnTexture(draw,width=128,height=128){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 draw(canvas.getContext('2d'),width,height);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 return texture;
}
function starPath(ctx,x,y,r,points,inner,rotation=-Math.PI/2){
 ctx.beginPath();
 for(let i=0;i<points*2;i++){
  const a=rotation+i*Math.PI/points,d=i%2?r*inner:r;
  ctx[i?'lineTo':'moveTo'](x+Math.cos(a)*d,y+Math.sin(a)*d);
 }
 ctx.closePath();
}
function marks(){
 const glow=drawnTexture((ctx)=>{
  const gradient=ctx.createRadialGradient(64,64,2,64,64,63);
  gradient.addColorStop(0,'#fff5c5d9');gradient.addColorStop(.38,'#ffcc6780');
  gradient.addColorStop(.72,'#fbb13e36');gradient.addColorStop(1,'#ffa52d00');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 });
 const ring=drawnTexture((ctx)=>{
  ctx.shadowColor='#ffb735';ctx.shadowBlur=13;ctx.strokeStyle='#ffe195';ctx.lineWidth=4;
  ctx.beginPath();ctx.arc(64,64,47,0,TAU);ctx.stroke();
  ctx.shadowBlur=4;ctx.strokeStyle='#fff6cb';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(64,64,40,0,TAU);ctx.stroke();
  ctx.strokeStyle='#ffce72';ctx.lineWidth=2;
  for(let i=0;i<8;i++){
   const a=i*TAU/8;ctx.beginPath();ctx.arc(64,64,54,a+.06,a+.21);ctx.stroke();
  }
 });
 const star=drawnTexture((ctx)=>{
  ctx.shadowColor='#ffb629';ctx.shadowBlur=18;
  const gold=ctx.createLinearGradient(64,18,64,111);
  gold.addColorStop(0,'#fffbc4');gold.addColorStop(1,'#ffc338');
  starPath(ctx,64,64,45,5,.48);ctx.fillStyle=gold;ctx.fill();
  ctx.strokeStyle='#fff4b3';ctx.lineWidth=3;ctx.stroke();
 });
 const burst=drawnTexture((ctx)=>{
  ctx.shadowColor='#ff9f22';ctx.shadowBlur=17;ctx.fillStyle='#ffb944';
  starPath(ctx,64,64,49,8,.37);ctx.fill();
  ctx.shadowBlur=2;ctx.fillStyle='#fff3c1';starPath(ctx,64,64,42,8,.35);ctx.fill();
  ctx.fillStyle='#fffdf0';starPath(ctx,64,64,23,4,.46);ctx.fill();
 });
 const spiral=drawnTexture((ctx)=>{
  ctx.shadowColor='#ffa93a';ctx.shadowBlur=10;ctx.lineCap='round';ctx.lineWidth=8;ctx.strokeStyle='#fff2b9';
  ctx.beginPath();
  for(let i=0;i<=60;i++){
   const a=i*.20,r=3+i*.64;
   ctx[i?'lineTo':'moveTo'](64+Math.cos(a)*r,64+Math.sin(a)*r);
  }
  ctx.stroke();
 });
 const quiver=drawnTexture((ctx)=>{
  ctx.shadowColor='#ffb23b';ctx.shadowBlur=12;ctx.strokeStyle='#ffe9a7';ctx.lineCap='round';ctx.lineWidth=8;
  ctx.beginPath();ctx.moveTo(22,81);ctx.quadraticCurveTo(35,46,49,64);
  ctx.quadraticCurveTo(62,82,73,57);ctx.quadraticCurveTo(87,27,105,47);ctx.stroke();
 });
 const puff=drawnTexture((ctx)=>{
  const gold=ctx.createLinearGradient(0,27,0,104);
  gold.addColorStop(0,'#fff6cc');gold.addColorStop(1,'#eaa745');
  ctx.fillStyle=gold;ctx.shadowColor='#ffb538';ctx.shadowBlur=9;
  ctx.beginPath();ctx.moveTo(28,81);
  ctx.bezierCurveTo(11,77,15,54,34,52);ctx.bezierCurveTo(33,30,65,24,76,44);
  ctx.bezierCurveTo(96,39,111,55,106,70);ctx.bezierCurveTo(105,86,88,91,76,87);
  ctx.bezierCurveTo(61,104,39,100,34,86);ctx.closePath();ctx.fill();
 });
 const feather=drawnTexture((ctx,w,h)=>{
  const gold=ctx.createLinearGradient(0,12,0,h-9);
  gold.addColorStop(0,'#fffde5');gold.addColorStop(.42,'#ffe397');gold.addColorStop(1,'#f39425');
  ctx.shadowColor='#ffb62f';ctx.shadowBlur=15;ctx.fillStyle=gold;
  ctx.beginPath();ctx.moveTo(24,60);ctx.bezierCurveTo(61,19,124,10,174,24);
  ctx.bezierCurveTo(153,47,116,63,79,63);ctx.quadraticCurveTo(64,56,56,64);
  ctx.quadraticCurveTo(42,68,24,60);ctx.fill();
  ctx.shadowBlur=0;ctx.lineCap='round';ctx.lineWidth=2.4;ctx.strokeStyle='#fff9cb';
  ctx.beginPath();ctx.moveTo(13,68);ctx.quadraticCurveTo(87,35,169,25);ctx.stroke();
  ctx.strokeStyle='#fff3b1b0';ctx.lineWidth=1.5;
  for(let i=0;i<6;i++){
   const x=52+i*15,y=52-i*4.2;
   ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+11,y-4,x+23,y-20+i);ctx.stroke();
   ctx.beginPath();ctx.moveTo(x+4,y);ctx.quadraticCurveTo(x+17,y+1,x+26,y+8+i*.7);ctx.stroke();
  }
 },192,80);
 return {glow,ring,star,burst,spiral,quiver,puff,feather};
}
function sprite(map,order=2){
 const object=new T.Sprite(new T.SpriteMaterial({map,transparent:true,depthWrite:false,depthTest:false,toneMapped:false}));
 object.renderOrder=order;return object;
}
function floorRing(map,plane){
 const object=new T.Mesh(plane,new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,depthTest:false,toneMapped:false}));
 object.rotation.x=-Math.PI/2;object.renderOrder=-5;return object;
}
function removeGroup(scene,group){
 scene.remove(group);
 group.traverse(object=>object.material?.dispose());
}
class AngelWings{
 constructor(fighter){
  const texture=new T.TextureLoader().load(ANGEL_WING_TEXTURE);
  texture.colorSpace=T.SRGBColorSpace;
  this.opening={value:0};
  const material=surface(flatVertex,wingFragment,{feathers:{value:texture},opening:this.opening,sceneTone:fighter.uniforms.sceneTone});
  const plane=new T.PlaneGeometry(2.68,2.56);plane.translate(-1.34,.12,0);
  this.pair=[-1,1].map(side=>{
   const wing=new T.Mesh(plane,material);fighter.body.add(wing);wing.visible=false;
   return {side,wing};
  });
 }
 update(f,view,time,widthFactor){
  const form=f?.hp>0&&f.angelForm;
  this.opening.value=form?clamp((time-form.startedAt)/.20,0,1):0;
  for(const {side,wing} of this.pair){
   wing.visible=!!form;
   if(!form)continue;
   const sideView=view.row===0,spread=sideView&&side===f.face?.55:1;
   const flap=Math.sin(time*7)*.10;
   const unfold=.45+.55*this.opening.value;
   wing.position.set(side*(view.row===2?.29:.20),1.89,-.035);
   wing.scale.set(-side*spread*unfold*(1+flap*.16)*widthFactor,.87+.13*unfold,1);
   wing.rotation.z=side*(.045+flap+(.12*(1-unfold)));
   wing.renderOrder=view.sprite.renderOrder+(view.row===2?.0002:-.0002);
  }
 }
}
class FrogVfx{
 constructor(scene,fighter){
  this.scene=scene;this.wings=new AngelWings(fighter);this.textures=marks();
  this.plane=new T.PlaneGeometry(2,2);this.shell=new T.PlaneGeometry(1,1,36,14);
  this.cones=new Map();this.feathers=new Map();this.dazed=new Map();this.bursts=[];
  this.charge=new T.Group();this.chargeGlow=sprite(this.textures.glow);
  this.chargeRings=[sprite(this.textures.ring),sprite(this.textures.ring)];
  this.chargeMarks=[sprite(this.textures.quiver),sprite(this.textures.puff),sprite(this.textures.star)];
  this.charge.add(this.chargeGlow,...this.chargeRings,...this.chargeMarks);
  this.charge.visible=false;scene.add(this.charge);
  this.formGlow=sprite(this.textures.glow,-4.5);this.halo=sprite(this.textures.ring,1);
  this.formRing=floorRing(this.textures.ring,this.plane);
  this.formFeathers=Array.from({length:5},()=>sprite(this.textures.feather,1));
  this.formParts=[this.formGlow,this.halo,this.formRing,...this.formFeathers];
  for(const part of this.formParts){part.visible=false;scene.add(part);}
 }
 static owns(projectile){return projectile.kind==='holyFeather';}
 static soundHit(event){return event.kind==='laughWave'||event.kind==='holyWave';}
 makeCone(spell){
  const group=new T.Group(),holy=spell.move.kind==='holyWave'?1:0;
  const common={halfAngle:{value:spell.halfAngle},direction:{value:spell.dir},holy:{value:holy}};
  const floor=new T.Mesh(this.plane,surface(flatVertex,sectorFragment,{...common,progress:{value:0},opacity:{value:1}}));
  floor.rotation.x=-Math.PI/2;floor.renderOrder=-5;floor.scale.setScalar(spell.radius);
  floor.position.y=.035-spell.y;group.add(floor);
  const rays=new T.Mesh(this.plane,surface(flatVertex,sectorFragment,{...common,progress:{value:0},opacity:{value:0}}));
  rays.rotation.x=-Math.PI/2;rays.renderOrder=1;rays.scale.setScalar(spell.radius);
  group.add(rays);
  const shells=Array.from({length:3},(_,i)=>{
   const shell=new T.Mesh(this.shell,surface(shellVertex,shellFragment,{
    ...common,radius:{value:0},height:{value:0},opacity:{value:0}
   }));
   shell.renderOrder=1+i;shell.frustumCulled=false;group.add(shell);return shell;
  });
  const source=sprite(this.textures.ring,2);
  const accents=[sprite(this.textures.puff,5),sprite(this.textures.quiver,5),
   sprite(holy?this.textures.feather:this.textures.star,5)];
  group.add(source,...accents);group.position.set(spell.x,spell.y,spell.z);this.scene.add(group);
  return {group,floor,rays,shells,source,accents};
 }
 updateCone(spell,visual){
  const progress=clamp(spell.age/spell.duration,0,1);
  const fade=1-clamp((spell.age-spell.duration)/.23,0,1),holy=spell.move.kind==='holyWave';
  visual.floor.material.uniforms.progress.value=progress;
  visual.floor.material.uniforms.opacity.value=fade*(holy?1:.85);
  visual.rays.material.uniforms.progress.value=progress*.98;
  visual.rays.material.uniforms.opacity.value=fade*progress*(holy?.44:.34);
  visual.shells.forEach((shell,index)=>{
   const p=progress*[.36,.66,1][index],u=shell.material.uniforms;
   u.radius.value=spell.radius*p;u.height.value=(.62+spell.radius*p*(holy?.53:.51));
   u.opacity.value=fade*clamp(progress*6,0,1)*[.72,.84,1][index];
  });
  visual.source.scale.setScalar((.62+progress*.40)*spell.scale);
  visual.source.material.opacity=fade*(1-.44*progress);
  visual.accents.forEach((part,i)=>{
   const angle=spell.halfAngle*(i%2?.88:-.92),radius=spell.radius*progress*(.56+i*.16);
   part.position.set(Math.cos(angle)*radius*spell.dir,(i===1?-.44:.51)*progress,Math.sin(angle)*radius);
   part.scale.setScalar(.28+(.17+i*.03)*progress);
   part.material.opacity=fade*clamp(progress*2.4-.32,0,1)*.94;
   part.material.rotation=spell.dir*(i-1)*.50;
  });
 }
 updateCharge(f){
  const move=f?.state==='attack'&&f.weapon==='fist'?Combat.activeMoveFor(f):null;
  const charging=move&&(move.cone||move.kind==='angelForm')&&f.t<move.hit;
  this.charge.visible=!!charging;
  if(!charging)return;
  const form=move.kind==='angelForm',p=clamp(f.t/move.hit,0,1),origin=Combat.soundWaveOrigin(f);
  this.charge.position.set(form?f.x:origin.x,origin.y,origin.z);
  this.chargeGlow.scale.setScalar((form?2.8:1.6)*(.52+.48*p));
  this.chargeGlow.material.opacity=.36+.46*p;
  this.chargeRings.forEach((ring,i)=>{
   ring.scale.setScalar((form?2.25:.87)*(1.22-.45*p+i*.30));
   ring.material.opacity=(.28+.58*p)/(1+i*.40);
  });
  this.chargeMarks.forEach((mark,i)=>{
   mark.position.set((i-1)*.55*origin.dir,.45+(.20+i*.13)*p,0);
   mark.scale.setScalar(.26+i*.045+.18*p);mark.material.opacity=p;
   mark.material.rotation=(i-1)*.38;
  });
 }
 updateForm(f,time){
  const form=f?.hp>0&&f.angelForm;
  for(const part of this.formParts)part.visible=!!form;
  if(!form)return;
  const s=ArenaConfig.bodyScale(f);
  const fade=clamp((form.endsAt-time)/.4,0,1),pulse=.5+.5*Math.sin(time*5.5);
  this.formGlow.position.set(f.x,f.y+1.55*s,f.z);
  this.formGlow.scale.set(4.6*s,4.15*s,1);this.formGlow.material.opacity=fade*(.44+.12*pulse);
  this.halo.position.set(f.x,f.y+3.45*s,f.z);
  this.halo.scale.set(1.32*s,.51*s,1);this.halo.material.opacity=fade*(.73+.18*pulse);
  this.formRing.position.set(f.x,.045,f.z);
  this.formRing.scale.setScalar((1.03+.15*pulse)*s);
  this.formRing.material.opacity=fade*(.48+.15*pulse);
  this.formFeathers.forEach((part,i)=>{
   const angle=i*TAU/5+time*(.8+i*.12);
   part.position.set(f.x+Math.cos(angle)*(1.25+i*.18)*s,f.y+(1.12+(i%3)*.68+.32*Math.sin(angle))*s,f.z+.23*Math.sin(angle));
   part.scale.set(.38*s,.16*s,1);part.material.opacity=fade*(.35+.3*Math.sin(angle*.9)**2);
   part.material.rotation=angle+Math.PI*.26;
  });
 }
 effect(event){
  const transform=event.type==='angelTransform',feather=event.type==='featherBurst';
  if(!transform&&!feather&&!(event.type==='hit'&&FrogVfx.soundHit(event)))return;
  const power=transform?2.75:feather?.83:event.kind==='holyWave'?1.55:1.12;
  const group=new T.Group(),flare=sprite(this.textures.burst,4),glow=sprite(this.textures.glow,2),ring=sprite(this.textures.ring,3);
  const flecks=Array.from({length:transform?10:5},(_,i)=>sprite(transform||feather&&i%2?this.textures.feather:this.textures.star,4));
  group.add(glow,ring,flare,...flecks);group.position.set(event.x,event.y+(transform?1.4:0),event.z);
  const ground=transform?floorRing(this.textures.ring,this.plane):null;
  if(ground){ground.position.set(0,.05-group.position.y,0);group.add(ground);}
  this.scene.add(group);
  this.bursts.push({group,flare,glow,ring,ground,flecks,power,start:null,duration:transform?.72:.38});
  if(this.bursts.length>18)removeGroup(this.scene,this.bursts.shift().group);
 }
 updateBursts(time){
  for(let i=this.bursts.length-1;i>=0;i--){
   const b=this.bursts[i];b.start??=time;
   const p=(time-b.start)/b.duration;
   if(p>=1){removeGroup(this.scene,b.group);this.bursts.splice(i,1);continue;}
   const spread=1-(1-p)**2;
   b.flare.scale.setScalar(b.power*(.48+.73*spread));
   b.flare.material.opacity=(1-p)**2;
   b.glow.scale.setScalar(b.power*(1.16+spread));
   b.glow.material.opacity=.81*(1-p);
   b.ring.scale.setScalar(b.power*(.42+1.55*spread));
   b.ring.material.opacity=.84*(1-p);
   if(b.ground){b.ground.scale.setScalar(.62+b.power*spread);b.ground.material.opacity=.86*(1-p);}
   b.flecks.forEach((part,j)=>{
    const a=j*TAU/b.flecks.length+.38,dist=b.power*(.28+(.85+(j%3)*.25)*spread);
    part.position.set(Math.cos(a)*dist,Math.sin(a)*dist*.73,.24*Math.sin(a));
    part.scale.setScalar(b.power*(j%2?.18:.24)*(1-.42*p));
    part.material.rotation=a+p*.9;part.material.opacity=1-p;
   });
  }
 }
 render(game,view,camera){
  const f=game.fighters[0],time=game.time;
  if(this.fighters!==game.fighters){
   for(const burst of this.bursts)removeGroup(this.scene,burst.group);
   this.bursts.length=0;this.fighters=game.fighters;
  }
  this.wings.update(f,view,time,clamp(camera.right/5.6,.72,1));this.updateForm(f,time);this.updateCharge(f);
  const spells=game.groundSpells.filter(s=>s.kind==='soundWave');
  for(const [spell,visual] of this.cones)if(!spells.includes(spell)){
   removeGroup(this.scene,visual.group);this.cones.delete(spell);
  }
  for(const spell of spells){
   if(!this.cones.has(spell))this.cones.set(spell,this.makeCone(spell));
   this.updateCone(spell,this.cones.get(spell));
  }
  const shots=game.projectiles.filter(FrogVfx.owns);
  for(const [shot,part] of this.feathers)if(!shots.includes(shot)){
   removeGroup(this.scene,part);this.feathers.delete(shot);
  }
  for(const shot of shots){
   if(!this.feathers.has(shot)){
    const part=new T.Group(),halo=sprite(this.textures.glow,2),feather=sprite(this.textures.feather,3);
    halo.scale.set(1.76,.57,1);halo.position.x=-shot.dir*.34;feather.scale.set(1.40,.58,1);
    feather.material.rotation=shot.dir>0?0:Math.PI;
    part.add(halo,feather);this.scene.add(part);this.feathers.set(shot,part);
   }
   this.feathers.get(shot).position.set(shot.x,shot.y,shot.z);
  }
  const targets=[...game.fighters.slice(1),...game.monsters].filter(unit=>unit.hp>0&&unit.stun>0&&unit.dazedUntil>time);
  for(const [unit,part] of this.dazed)if(!targets.includes(unit)){
   removeGroup(this.scene,part);this.dazed.delete(unit);
  }
  for(const unit of targets){
   if(!this.dazed.has(unit)){
    const group=new T.Group();group.add(sprite(this.textures.spiral,4),sprite(this.textures.star,4),sprite(this.textures.quiver,4));
    this.scene.add(group);this.dazed.set(unit,group);
   }
   const group=this.dazed.get(unit),s=ArenaConfig.bodyScale(unit);
   group.position.set(unit.x,unit.y+(unit.isBoss?3.75:2.8)*s,unit.z);
   group.children.forEach((part,i)=>{
    const a=time*7+i*TAU/3;
    part.position.set(Math.cos(a)*.62*s,Math.sin(a)*.24*s,.18*Math.sin(a));
    part.scale.setScalar((i===0?.65:.45)*s);part.material.rotation=(i===0?1:-.34)*a;
    part.material.opacity=clamp((unit.dazedUntil-time)*6,0,1);
   });
  }
  this.updateBursts(time);
 }
}
window.FrogVfx=FrogVfx;
})();
