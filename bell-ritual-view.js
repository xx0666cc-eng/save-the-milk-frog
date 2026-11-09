/* Separate bell, ground-anchored soul effects and four-stage reference choreography. */
(function(root){
'use strict';
const T=THREE,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
class BellRitualView{
 constructor(scene,base){this.scene=scene;this.base=base;this.units=new Map();this.tone=0;this.shake={x:0,y:0};this.surfaces=new Map();this.diagnostics={};}
 part(asset,index=0,flow=1){const o=this.base.effect(asset,index);o.material.uniforms.flow.value=flow;o.visible=false;return o;}
 create(){
  const group=new T.Group();group.name='BellReferenceRitual';
  const crown=this.part('bells',0,0),fallBell=this.part('bells',0,0),impact=this.part('bellImpact',1),smoke=this.part('bellImpact',2),
   aura=this.part('soulAura'),terminal=this.part('terminal'),core=this.part('terminal');
  const wisps=Array.from({length:8},()=>this.part('bellImpact',3));
  terminal.material.blending=core.material.blending=T.AdditiveBlending;
  const waves=Array.from({length:4},()=>({left:this.part('soulTide',0),right:this.part('soulTide',1),floor:this.part('soulAura')}));
  for(const w of waves){w.left.material.uniforms.feather.value.set(.025,.24);w.right.material.uniforms.feather.value.set(.24,.025);}
  terminal.material.uniforms.edge.value=core.material.uniforms.edge.value=.08;
  const circle=Array.from({length:96},(_,i)=>new T.Vector3(Math.cos(i/96*Math.PI*2),0,Math.sin(i/96*Math.PI*2)));
  const warning=new T.LineLoop(new T.BufferGeometry().setFromPoints(circle),new T.LineBasicMaterial({color:0xe9e1ff,transparent:true,opacity:.5,depthWrite:false}));
  const fill=new T.Mesh(new T.CircleGeometry(1,96).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xc3b6e5,transparent:true,opacity:.08,depthWrite:false,side:T.DoubleSide}));
  const rays=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(48),3)),new T.LineBasicMaterial({color:0xe5ddff,transparent:true,opacity:.24,depthWrite:false}));
  rays.frustumCulled=false;warning.renderOrder=fill.renderOrder=-9.5;rays.renderOrder=-3.7;
  const parts=[crown,fallBell,impact,smoke,aura,terminal,core,...wisps,...waves.flatMap(w=>[w.left,w.right,w.floor]),warning,fill,rays];
  group.add(...parts);this.scene.add(group);
  return {group,parts,crown,fallBell,impact,smoke,aura,terminal,core,wisps,waves,warning,fill,rays,crownAlpha:0,lastTime:null};
 }
 pose(o,x,z,face,height,camera,time,alpha,y=.035,angle=0){
  o.visible=alpha>.003;if(!o.visible)return;
  this.base.place(o,x,z,face,height,camera,time,clamp(alpha));o.position.y=y;o.rotateZ(angle);
  o.material.uniforms.sceneTone.value=this.tone*.25;
 }
 ground(o,x,z,rx,rz,time,alpha,spin=0){
  o.visible=alpha>.003&&rx>.01&&rz>.01;if(!o.visible)return;
  o.position.set(x,.048,z);o.rotation.set(-Math.PI/2,0,0);o.scale.set(rx*2,rz*2,1);o.renderOrder=-9;
  const u=o.material.uniforms;u.opacity.value=clamp(alpha);u.clock.value=time;u.spin.value=spin;u.sceneTone.value=this.tone*.25;
 }
 bell(o,x,z,lift,height,face,charge,camera,time,alpha){
  const f=o.userData.frame,visibleFraction=(f.anchor[1]-(f.visibleTop??50))/f.cell[3];
  const p=new T.Vector3(x,0,z).project(camera),room=(1-p.y)*camera.top-.65;
  const shown=Math.min(height,Math.max(1.4,(room-lift)/visibleFraction));
  const q=clamp(charge)*9,i=Math.min(8,Math.floor(q));
  this.base.frame(o,'bells',i,i+1,ease(q-i));
  this.pose(o,x,z,face,shown,camera,time,alpha,lift);o.renderOrder=ArenaConfig.actorDepthOrder({z})-.001;
  return shown;
 }
 shakeAt(time,amount){this.shake.x+=Math.sin(time*53)*amount;this.shake.y+=Math.sin(time*71+.8)*amount*.60;}
 fall(v,e,camera,time){
  const m=BellMaster.profile.moves.fall,c=e.bossCast,s=ArenaConfig.bodyScale(e),t=e.t;
  const x=c.targetX,z=c.targetZ,dropping=t>=m.fallAt;
  const drop=clamp((t-m.fallAt)/m.dropTime),age=t-m.impacts[0];
  const lift=m.visual.lift*s*(1-drop*drop),fade=age<0?1:1-ease(age/.28);
  if(dropping)this.bell(v.fallBell,x,z,age<0?lift:-clamp(age/.3)*.20,m.visual.bellHeight*s,e.face,clamp(t/m.impacts[0]),camera,time,fade);
  if(v.fallBell.visible)v.fallBell.rotateZ(e.face*.065*Math.sin(Math.PI*drop));
  v.warning.visible=v.fill.visible=age<.04;
  if(v.warning.visible){
   v.warning.position.set(c.targetX,.055,c.targetZ);v.warning.scale.set(m.radiusX*s,1,m.radiusZ*s);
   v.fill.position.set(c.targetX,.050,c.targetZ);v.fill.scale.set(m.radiusX*s,1,m.radiusZ*s);
   const q=dropping?drop:clamp(t/m.windup)*.35;v.warning.material.opacity=.30+.45*q;v.fill.material.opacity=.05+.06*q;
  }
  v.rays.visible=dropping&&age<0;
  if(v.rays.visible){
   const a=v.rays.geometry.attributes.position;
   for(let i=0;i<8;i++){const angle=i/8*Math.PI*2,dx=Math.cos(angle)*1.2*s,dz=Math.sin(angle)*.80*s;
    a.setXYZ(i*2,c.targetX+dx,.06,c.targetZ+dz);a.setXYZ(i*2+1,c.targetX+dx*.82,lift+.12,c.targetZ+dz*.82);
   }
   a.needsUpdate=true;v.rays.material.opacity=.24*(1-drop);
  }
  if(age>=0){
   this.pose(v.impact,c.targetX,c.targetZ,1,m.visual.blastHeight*s*(.62+.38*ease(age/.15)),camera,time,clamp(1-age/.42));
   const q=clamp(age/.85);this.pose(v.smoke,c.targetX,c.targetZ,1,m.visual.smokeHeight*s*(.8+.45*q),camera,time,Math.sin(Math.PI*q)*.65);
   this.ground(v.aura,c.targetX,c.targetZ,m.radiusX*s*(.4+.6*ease(age/.45)),m.radiusZ*s*(.4+.6*ease(age/.45)),time,clamp(1-age/.78)*.42,time*.05);
   this.shakeAt(time,4.2*Math.exp(-age*9));
  }
  this.diagnostics.fall={locked:c.locked,targetX:c.targetX,targetZ:c.targetZ,bellX:x,bellZ:z,bellVisible:v.fallBell.visible,lift,drop,impact:age>=0};
 }
 requiem(v,e,camera,time){
  const m=BellMaster.profile.moves.requiem,c=e.bossCast,s=ArenaConfig.bodyScale(e),t=e.t,p=BellMaster.phaseAt(t);
  const silence=p.index===0?ease(p.progress):1,finish=1-ease((t-11.3)/1.1);
  this.tone=Math.max(this.tone,silence*finish);
  const up=ease((t-m.stages[1].start)/(m.stages[1].end-m.stages[1].start));
  const settle=ease((t-11.3)/1.1),growth=up*(1-settle),visual=m.visual;
  const lift=T.MathUtils.lerp(visual.crownRest,visual.crownLift,growth)*s;
  const height=T.MathUtils.lerp(visual.crownHeight,visual.crownGrownHeight,growth)*s;
  let charge=up*(1-settle);
  if(p.index===2){
   charge=.28;
   for(const at of m.impacts.slice(0,3)){
    const d=t-at;
    if(d>=-.52&&d<=0)charge=Math.max(charge,.28+.72*ease((d+.52)/.52));
    if(d>0&&d<.32)charge=Math.max(charge,1-.72*ease(d/.32));
   }
  }else if(p.index===3)charge=(.28+.72*ease((t-8.4)/1.6))*(1-settle);
  this.bell(v.crown,e.x,e.z,lift,height,e.face,charge,camera,time,v.crownAlpha);
  if(p.index===2)v.crown.rotateZ(Math.sin(t*8.5)*.018);
  const collapse=p.index===3?ease(p.progress/.48):0;
  const radius=(.65+.35*silence)*(1-collapse*.63);
  this.ground(v.aura,c.x,c.z,c.radiusX*radius,c.radiusZ*radius,time,(.20+.14*silence)*finish,time*(.08+collapse*.16));
  v.wisps.forEach((o,i)=>{
   const q=(time*.36+i/8)%1,angle=i*2.39996+time*.19,r=(1-q)*(1-collapse*.55);
   const x=c.x+Math.cos(angle)*c.radiusX*r,z=c.z+Math.sin(angle)*c.radiusZ*r;
   this.pose(o,x,z,i%2?1:-1,(1.25+r)*s,camera,time,Math.sin(q*Math.PI)*(.12+.18*silence)*finish,.04+q*.25);
   o.renderOrder=ArenaConfig.actorDepthOrder({z})+.003;
  });
  const chargeFinal=ease((t-8.65)/(10-8.65));
  if(t>=8.65&&t<10.22){
   this.pose(v.core,c.x,c.z,1,(.22+chargeFinal*.78)*s,camera,time,chargeFinal,lift-.12);v.core.renderOrder=ArenaConfig.actorDepthOrder({z:c.z})+.24;
   this.shakeAt(time,chargeFinal*2.4);
  }
  const age=t-m.impacts[3];
  if(age>=0&&age<1.65){
   const q=clamp(age/1.65),alpha=Math.sin(Math.PI*q)**.65;
   this.pose(v.terminal,c.x,c.z,1,visual.terminalHeight*s*(.55+.45*ease(age/.30)),camera,time,alpha);v.terminal.renderOrder=ArenaConfig.actorDepthOrder({z:c.z})+.24;
   if(age<.6){this.pose(v.impact,c.x,c.z,1,5.4*s*(.70+.30*ease(age/.18)),camera,time,1-ease(age/.6));v.impact.renderOrder=ArenaConfig.actorDepthOrder({z:c.z})+.25;}
   this.shakeAt(time,visual.maxShake*Math.exp(-age*3.8));
  }
  this.diagnostics.ultimate={stage:p.key,referenceFrame:p.frame+1,progress:p.progress,bellLift:lift,bellHeight:v.crown.scale.y,center:{x:c.x,z:c.z}};
 }
 waves(v,e,camera,time){
  for(const w of e.bellWaves??[]){
   const g=BellMaster.waveGeometry(w),m=BellMaster.profile.moves.requiem,q=clamp(w.age/w.duration),alpha=Math.sin(q*Math.PI)**.55;
   const node=v.waves[w.index],height=m.visual.tideHeight[w.index]*(.68+.32*ease(q/.35));
   this.pose(node.left,w.x-g.radiusX,w.z,1,height,camera,time,alpha);
   this.pose(node.right,w.x+g.radiusX,w.z,1,height,camera,time,alpha);
   this.ground(node.floor,w.x,w.z,g.radiusX,g.radiusZ,time,alpha*.58,time*.045);
   if(q<.3)this.shakeAt(time,(w.index+1)*.7*Math.sin(q/.3*Math.PI));
  }
 }
 render(monsters,camera,time,bounds,phase){
  this.tone=0;this.shake={x:0,y:0};this.diagnostics={};const ids=new Set(),active=['fight','paused'].includes(phase);
  for(const e of monsters){
   if(e.monsterType!==BellMaster.type||e.hp<=0)continue;
   ids.add(e.id);let v=this.units.get(e.id);if(!v){v=this.create();this.units.set(e.id,v);}
   const reset=v.lastTime===null||time<v.lastTime,dt=reset?0:clamp(time-v.lastTime,0,.05);v.lastTime=time;
   if(reset)v.crownAlpha=0;
   for(const o of v.parts)o.visible=false;v.group.visible=active;if(!active){v.crownAlpha=0;continue;}
   const separate=e.state==='attack'&&['fall','requiem'].includes(e.bossMove),target=separate?1:0;
   v.crownAlpha+=(target-v.crownAlpha)*(1-Math.exp(-dt*60));
   if(separate)v.crownAlpha=Math.max(v.crownAlpha,clamp(e.t/.055));
   const visual=BellMaster.profile.moves.requiem.visual,s=ArenaConfig.bodyScale(e);
   if(v.crownAlpha>.003&&!(separate&&e.bossMove==='requiem'))this.bell(v.crown,e.x,e.z,visual.crownRest*s,visual.crownHeight*s,e.face,0,camera,time,v.crownAlpha);
   if(separate&&e.bossMove==='fall')this.fall(v,e,camera,time);
   if(separate&&e.bossMove==='requiem')this.requiem(v,e,camera,time);
   this.waves(v,e,camera,time);
   for(const o of v.parts)if(o.material?.uniforms?.sceneTone)o.material.uniforms.sceneTone.value=this.tone*.25;
  }
  for(const [id,v] of this.units)if(!ids.has(id)){this.dispose(v);this.units.delete(id);}
  const max=BellMaster.profile.moves.requiem.visual.maxShake;this.shake.x=clamp(this.shake.x,-max,max);this.shake.y=clamp(this.shake.y,-max,max);
  this.diagnostics.tone=this.tone;this.diagnostics.shake={...this.shake};
 }
 applyPresentation(canvas,backdrop){
  const active=this.tone>.001||Math.abs(this.shake.x)+Math.abs(this.shake.y)>.001;
  for(const element of [canvas,backdrop]){
   if(active){
    if(!this.surfaces.has(element))this.surfaces.set(element,{filter:element.style.filter,transform:element.style.transform});
    const original=this.surfaces.get(element);
    element.style.transform=(original.transform+' translate3d('+this.shake.x.toFixed(2)+'px,'+this.shake.y.toFixed(2)+'px,0)').trim();
    // Combat number sprites remain in their semantic red/blue/green colors.
    if(element===backdrop)element.style.filter=(original.filter+' saturate('+(1-this.tone*.96).toFixed(3)+') brightness('+(1-this.tone*.22).toFixed(3)+')').trim();
   }else if(this.surfaces.has(element)){
    const original=this.surfaces.get(element);element.style.filter=original.filter;element.style.transform=original.transform;this.surfaces.delete(element);
   }
  }
 }
 clearPresentation(){
  for(const [element,original] of this.surfaces){element.style.filter=original.filter;element.style.transform=original.transform;}
  this.surfaces.clear();this.tone=0;this.shake={x:0,y:0};
  for(const v of this.units.values())this.dispose(v);this.units.clear();
 }
 dispose(v){this.scene.remove(v.group);v.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
}
root.BellRitualView=BellRitualView;
})(window);
