/* Replace this view adapter when final rigged models arrive. Combat stays in combat.js. */
(function(){
const T=THREE;
const geo={sphere:new T.SphereGeometry(1,12,8),box:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(1,1,1,8)};
function mesh(g,m,x,y,z,sx,sy,sz){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;return o;}
class FighterView{
 constructor(scene,id){
  this.root=new T.Group();scene.add(this.root);this.id=id;this.parts={};
  const mat=c=>new T.MeshStandardMaterial({color:c,roughness:.8,metalness:.08});
  this.color=id?0xf06443:0x39c9c2;this.cloth=mat(id?0x983b33:0x116d76);this.dark=mat(0x192b35);this.trim=mat(this.color);this.skin=mat(0xe7b08b);this.white=mat(0xf3dfc0);this.hair=mat(0x19222b);
  this.body=new T.Group();this.root.add(this.body);
  this.body.add(mesh(geo.sphere,this.cloth,0,1.87,0,.38,.52,.38));
  this.body.add(mesh(geo.box,this.dark,-.015,1.46,0,.53,.29,.61));
  this.body.add(mesh(geo.box,this.trim,.04,1.39,0,.59,.12,.65));
  this.body.add(mesh(geo.box,this.white,.27,1.85,.30,.13,.38,.09));
  this.body.add(mesh(geo.sphere,this.skin,0,2.5,0,.27,.34,.27));
  this.body.add(mesh(geo.box,this.hair,-.07,2.7,0,.48,.2,.55));
  for(let i=0;i<4;i++){const spike=mesh(new T.ConeGeometry(.11,.37,4),this.hair,-.2+i*.11,2.86,0,1,1,1);spike.rotation.z=-.35;this.body.add(spike);}
  this.body.add(mesh(geo.box,this.trim,.013,2.58,0,.51,.095,.56));
  this.body.add(mesh(geo.box,this.dark,.259,2.49,0,.034,.08,.37));
  this.body.add(mesh(geo.box,this.white,.28,2.49,.12,.04,.025,.09));
  this.body.add(mesh(geo.box,this.white,.28,2.49,-.12,.04,.025,.09));
  this.body.add(mesh(geo.sphere,this.skin,.27,2.38,0,.075,.075,.09));
  this.scarf=new T.Group();this.scarf.position.set(-.22,2.18,0);this.body.add(this.scarf);this.scarf.add(mesh(geo.box,this.trim,-.31,-.04,0,.7,.13,.25));
  const limb=(name,y,z,upper,lower,isArm)=>{
   const p=new T.Group();p.position.set(0,y,z);this.body.add(p);
   p.add(mesh(geo.sphere,isArm?this.cloth:this.dark,0,-upper*.45,0,isArm?.19:.23,upper*.61,isArm?.19:.24));
   const k=new T.Group();k.position.y=-upper;p.add(k);
   k.add(mesh(geo.sphere,this.dark,0,-lower*.42,0,isArm?.145:.17,lower*.57,isArm?.16:.19));
   if(isArm){k.add(mesh(geo.box,this.trim,0,-lower*.48,0,.27,.25,.28));k.add(mesh(geo.sphere,this.white,0,-lower,0,.18,.2,.19));}
   else {k.add(mesh(geo.box,this.cloth,0,-lower*.64,0,.29,.28,.36));k.add(mesh(geo.box,this.white,.09,-lower,0,.48,.19,.37));}
   this.parts[name]=p;this.parts[name+'Low']=k;
  };
  limb('rearLeg',1.23,-.23,.57,.55,false);limb('frontLeg',1.23,.23,.57,.55,false);
  limb('rearArm',2.13,-.37,.43,.43,true);limb('frontArm',2.13,.37,.43,.43,true);
  this.shadow=GroundIndicators.create(scene,id?'enemy':'player');
  // Join the actor pass while retaining depth tests within the three-dimensional NPC.
  this.root.traverse(o=>{if(o.isMesh)o.material.transparent=true;});
 }
 update(f,time){
  const p=this.parts;let fl=.18,fr=-.22,kl=-.1,kr=-.15,al=1.05,ar=.6,el=1.85,er=2.15,lean=-.08,bob=Math.sin(time*4)*.035;
  if(f.state==='run'){const s=Math.sin(time*14);fl=s*.8;fr=-s*.8;kl=-Math.max(0,-s)*.9;kr=-Math.max(0,s)*.9;al=.7-s*.5;ar=.7+s*.5;lean=-.18;bob=Math.abs(s)*.06;}
  if(f.y>.01){fl=.6;fr=-.45;kl=-1.3;kr=-.5;al=1.3;ar=.2;}
  if(f.state==='guard'){al=2.25;ar=2.45;el=.7;er=.7;fl=.4;fr=-.45;lean=.1;}
  if(f.state==='dash'){lean=-.5;al=-.7;ar=-.4;el=.4;er=.3;fl=1;fr=-.7;bob=-.13;}
  if(f.state==='stun'){lean=.28;al=-.4;ar=.2;el=.8;er=.9;bob=-.08;}
  if(f.state==='attack'){
   const m=Combat.MOVES[f.attack],peak=Math.max(0,1-Math.abs(f.t-m.hit)/.16),wind=Math.sin(Math.min(1,f.t/m.hit)*Math.PI/2);
   if(f.attack==='jab'){al=1.05+peak*.5;el=1.85*(1-peak);lean=-.08-peak*.1;}
   if(f.attack==='cross'){ar=.6+peak*.96;er=2.15*(1-peak);lean=-.08-peak*.18;}
   if(f.attack==='finisher'){fl=.2+peak*1.55;kl=-.1+peak*.1;fr=-.25;al=.3;el=1.2;lean=.15*peak;}
   if(f.attack==='heavy'){al=1.05+peak*1.9;el=1.85*(1-peak*.8);fl=.4;fr=-.4;lean=-.2;bob=peak*.15-.1;}
   if(f.attack==='wave'){al=ar=1.55;el=er=(1-wind)*1.5;lean=-.12;}
   if(f.attack==='super'){al=ar=1.5;el=er=f.t<.2?1.6:.08;fl=.55;fr=-.5;lean=-.15;}
  }
  const scale=ArenaConfig.scale.npc;
  this.root.position.set(f.x,f.y,f.z||0);this.root.scale.set(f.face*scale,scale,scale);this.body.rotation.z=lean;this.body.position.y=bob;
  const order=ArenaConfig.actorDepthOrder(f);this.root.traverse(o=>{if(o.isMesh)o.renderOrder=order;});
  if(f.hp<=0){this.body.rotation.z=-Math.min(1.45,f.t*2);this.body.position.y=-.1;}
  p.frontLeg.rotation.z=fl;p.rearLeg.rotation.z=fr;p.frontLegLow.rotation.z=kl;p.rearLegLow.rotation.z=kr;p.frontArm.rotation.z=al;p.rearArm.rotation.z=ar;p.frontArmLow.rotation.z=el;p.rearArmLow.rotation.z=er;
  this.scarf.rotation.z=Math.sin(time*8)*.15+(f.state==='run'?.4:0);
  GroundIndicators.update(this.shadow,f,scale,f.hp<=0?Math.max(0,1-f.t/.65):1,!!f.autoTargeted);
  this.root.visible=!(f.inv>0&&f.state!=='dash'&&Math.floor(time*24)%2);
 }
}
window.FighterView=FighterView;
})();
