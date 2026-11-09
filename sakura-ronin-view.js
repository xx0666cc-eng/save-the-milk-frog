(function(root){
'use strict';
const T=THREE,pink=0xff9ec9,white=0xffeff7;
const mat=(color,opacity=1)=>new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,depthTest:false,side:T.DoubleSide});
function crescent(){
 const group=new T.Group();
 for(const [inner,outer,color,alpha] of [[.81,1.08,pink,.20],[.90,1.02,pink,.65],[.975,1,white,1]]){
  const mesh=new T.Mesh(new T.RingGeometry(inner,outer,64,1,-1.25,2.5),mat(color,alpha));
  mesh.userData.alpha=alpha;group.add(mesh);
 }
 return group;
}
class SakuraRoninView{
 static owns(p){return ['sakuraBlade','sakuraCrossA','sakuraCrossB'].includes(p.kind);}
 constructor(scene,textures){this.scene=scene;this.textures=textures;this.units=new Map();this.shots=[];this.maps=[];}
 map(index){
  if(!this.maps[index]){
   const a=window.SAKURA_RONIN_MOTION_DATA.vfx,[x,y,w,h]=a.frames[index].cell;
   const tex=this.textures.get('sakura-motion/vfx').clone();
   tex.offset.set((x+.5)/a.width,1-(y+h-.5)/a.height);tex.repeat.set((w-1)/a.width,(h-1)/a.height);tex.needsUpdate=true;this.maps[index]=tex;
  }
  return this.maps[index];
 }
 effect(index){
  const material=mat(0xffffff);material.map=this.map(index);material.alphaTest=.06;material.toneMapped=false;
  return new T.Mesh(new T.PlaneGeometry(1,1),material);
 }
 create(){
  const group=new T.Group(),arcs=[crescent(),crescent(),crescent()];group.add(...arcs);
  const warning=new T.Mesh(new T.PlaneGeometry(1,1),mat(pink,.18));warning.rotation.x=-Math.PI/2;warning.renderOrder=-5;
  const rim=new T.LineLoop(new T.BufferGeometry().setFromPoints([new T.Vector3(-.5,0,-.5),new T.Vector3(.5,0,-.5),new T.Vector3(.5,0,.5),new T.Vector3(-.5,0,.5)]),new T.LineBasicMaterial({color:pink,transparent:true,opacity:.7,depthWrite:false}));rim.renderOrder=-5;
  const aura=new T.Mesh(new T.RingGeometry(.9,.93,64),mat(pink,.45));aura.rotation.x=-Math.PI/2;aura.renderOrder=-5;
  const petals=[];
  const leaf=new T.Shape();leaf.moveTo(0,0);leaf.quadraticCurveTo(.18,.17,0,.34);leaf.quadraticCurveTo(-.13,.12,0,0);
  for(let i=0;i<14;i++){const p=new T.Mesh(new T.ShapeGeometry(leaf),mat(i%3?pink:white,.8));group.add(p);petals.push(p);}
  const field=this.effect(3),swords=Array.from({length:18},()=>this.effect(2));
  const fieldRim=new T.Mesh(new T.RingGeometry(.975,1,80),mat(pink,.65));fieldRim.rotation.x=-Math.PI/2;fieldRim.renderOrder=-5;
  const trail=this.effect(0);group.add(warning,rim,aura,field,fieldRim,trail,...swords);this.scene.add(group);
  return {group,arcs,warning,rim,aura,petals,field,fieldRim,swords,trail};
 }
 render(monsters,camera,time,bounds){
  const ids=new Set();
  for(const e of monsters){
   if(e.monsterType!==SakuraRonin.type||e.hp<=0)continue;
   ids.add(e.id);let v=this.units.get(e.id);if(!v){v=this.create();this.units.set(e.id,v);}
   const s=ArenaConfig.bodyScale(e),m=e.state==='attack'?SakuraRonin.profile.moves[e.bossMove]:null;
   v.group.position.set(e.x,0,e.z);v.arcs.forEach(a=>a.visible=false);
   const rain=m&&e.bossMove==='rain',cast=e.bossCast;
   const winding=m&&e.t<m.windup&&e.bossMove!=='parry'&&!rain;
   v.warning.visible=v.rim.visible=!!winding;
   if(winding){
    const reach=Math.min(m.reach*s,Math.max(0,(e.face>0?bounds.right-e.x:e.x-bounds.left)));
    v.warning.scale.set(reach,m.lane*s*2,1);v.warning.position.set(e.face*reach/2,.035,0);
    v.rim.scale.set(reach,1,m.lane*s*2);v.rim.position.set(e.face*reach/2,.038,0);
    v.warning.material.opacity=.08+.12*e.t/m.windup;
   }
   v.aura.visible=!!e.sakuraPhase2||e.state==='attack'&&e.bossMove==='parry';
   v.aura.position.y=.04;v.aura.scale.set(s*1.25,s*.82,1);v.aura.material.opacity=.32+Math.sin(time*5)*.08;
   let intensity=e.sakuraPhase2?.28:0;
   if(m){
    const strikes=['slash','counter'].includes(e.bossMove)?m.impacts:[];
    strikes.forEach((at,i)=>{
     const q=(e.t-at)/.30;if(q<0||q>1)return;
     intensity=1-q*.6;
     const a=v.arcs[i%3];a.visible=true;a.quaternion.copy(camera.quaternion);
     a.position.set(e.face*.3,e.y+1.65*s,.10);a.scale.set(e.face*m.reach*s,(e.bossMove==='double'?1.55:1.0)*s,1);
     a.rotateZ(e.face*(i%2?-.52:.18));
     a.children.forEach(c=>{c.material.opacity=c.userData.alpha*Math.sin(Math.PI*q);c.renderOrder=ArenaConfig.actorDepthOrder(e)+.1;});
    });
   }
   v.trail.visible=!!rain&&e.t>=m.dashStart&&e.t<m.dashEnd+.12;
   if(v.trail.visible){v.trail.quaternion.copy(camera.quaternion);v.trail.position.set(-e.face*1.3,1.5*s,0);v.trail.scale.set(e.face*4.4,1.35,1);v.trail.material.opacity=.35;}
   const fieldOn=!!rain&&e.t>=m.dashEnd&&e.t<m.windup+m.active+.3;
   v.field.visible=v.fieldRim.visible=fieldOn;v.swords.forEach(p=>p.visible=false);
   if(fieldOn){
    const cx=cast.x-e.x,cz=cast.z-e.z,r=m.reach*s,d=m.lane*s;
    const fade=Math.min(1,(e.t-m.dashEnd)/.20,(m.windup+m.active+.3-e.t)/.3);
    v.field.quaternion.copy(camera.quaternion);v.field.position.set(cx,.35,cz);v.field.scale.set(r*2.1,r*.92,1);v.field.material.opacity=fade*(e.t<m.windup?.32:.80);v.field.renderOrder=-4.5;
    v.fieldRim.position.set(cx,.045,cz);v.fieldRim.scale.set(r,d,1);v.fieldRim.material.opacity=fade*(.45+.1*Math.sin(time*9));
    // Six swords descend per damage pulse; every pulse shares the AI's fixed center and ellipse.
    v.swords.forEach((p,i)=>{
     const wave=Math.floor(i/6),n=i%6,t=m.impacts[Math.min(m.impacts.length-1,Math.max(0,Math.floor((e.t-m.windup+.32)/.4)))];
     const q=(e.t-(t-.32)-wave*.035)/.46;if(q<0||q>1)return;
     const angle=n*Math.PI/3+wave*.45,rr=n===0?0:.65;
     p.visible=true;p.position.set(cx+Math.cos(angle)*r*rr,1.5+(1-Math.min(1,q/.72))*5.8,cz+Math.sin(angle)*d*rr);
     p.quaternion.copy(camera.quaternion);p.rotateZ((n%3-1)*.08);p.scale.set(.72,3.0,1);p.material.opacity=fade*Math.min(1,q*8,(1-q)*6);
     p.renderOrder=ArenaConfig.actorDepthOrder({z:cast.z+Math.sin(angle)*d*rr})+.001;
    });
    intensity=.9*fade;
   }
   v.petals.forEach((p,i)=>{
    p.visible=intensity>.1;if(!p.visible)return;
    const q=(time*.8+i/14)%1;
    p.position.set(e.face*(q*3.2-.8),e.y+.5+(i%4)*.45+Math.sin(q*6+i)*.25,(i%3-1)*.32);
    p.quaternion.copy(camera.quaternion);p.rotateZ(time*1.8+i);p.scale.setScalar(.48+intensity*.4);
    p.material.opacity=intensity*Math.sin(q*Math.PI);p.renderOrder=ArenaConfig.actorDepthOrder(e)+.1;
   });
  }
  for(const [id,v] of this.units)if(!ids.has(id)){this.dispose(v.group);this.units.delete(id);}
 }
 renderProjectiles(projectiles,camera){
  const shots=projectiles.filter(SakuraRoninView.owns);
  while(this.shots.length<shots.length){const g=this.effect(0);this.scene.add(g);this.shots.push(g);}
  this.shots.forEach((g,i)=>{
   const p=shots[i];g.visible=!!p;if(!p)return;
   const cross=p.kind!=='sakuraBlade',joined=p.kind==='sakuraCrossB';g.material.map=this.map(joined?1:0);
   const width=joined?3.8:cross?3.2:3.8;
   // The bright leading edge leaves the measured blade tip; the ribbon trails behind it.
   g.position.set(p.x-p.dir*width*(joined?.15:.36),p.y,p.z);g.quaternion.copy(camera.quaternion);
   g.rotateZ(cross&&!joined?.42*p.dir:0);
   g.scale.set(p.dir*width,joined?2.1:cross?1.4:1.65,1);g.material.opacity=Math.min(1,p.life*5);
   g.renderOrder=ArenaConfig.actorDepthOrder(p)+.1;
  });
 }
 dispose(group){this.scene.remove(group);group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
}
root.SakuraRoninView=SakuraRoninView;
})(window);
