/* Gold star, dismissal seal and rally effects for 特奶普. */
(function(){
'use strict';
const T=THREE;

function texture(width,height,draw){
 const canvas=document.createElement('canvas');
 canvas.width=width;canvas.height=height;
 draw(canvas.getContext('2d'));
 const result=new T.CanvasTexture(canvas);
 result.colorSpace=T.SRGBColorSpace;
 return result;
}

function starShape(outer,inner){
 const shape=new T.Shape();
 for(let i=0;i<10;i++){
  const angle=Math.PI/2+i*Math.PI/5,r=i%2?inner:outer;
  const x=Math.cos(angle)*r,y=Math.sin(angle)*r;
  if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);
 }
 shape.closePath();
 return shape;
}

function sealTexture(impact=false){
 return texture(512,240,ctx=>{
  ctx.beginPath();ctx.roundRect(14,14,484,212,28);
  ctx.fillStyle=impact?'#f43b35':'#8a171e';ctx.fill();
  ctx.strokeStyle='#ffb08c';ctx.lineWidth=12;ctx.stroke();
  ctx.beginPath();ctx.roundRect(35,35,442,170,14);
  ctx.strokeStyle='#ff624d';ctx.lineWidth=7;ctx.stroke();
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 116px Arial';
  ctx.fillStyle='#fff0d6';ctx.fillText('FIRED!',256,126);
 });
}

function flagTexture(){
 return texture(640,360,ctx=>{
  const red=ctx.createLinearGradient(0,0,640,360);
  red.addColorStop(0,'#ac1821');red.addColorStop(.48,'#db332a');red.addColorStop(1,'#84131d');
  ctx.fillStyle=red;ctx.fillRect(0,0,640,360);
  ctx.strokeStyle='#ffc17b';ctx.lineWidth=4;ctx.strokeRect(12,12,616,336);
  ctx.fillStyle='#fff0d6';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='bold 33px Arial';ctx.fillText('★  ★  ★  ★  ★',320,55);ctx.fillText('★  ★  ★  ★  ★',320,305);
  ctx.font='900 60px Arial';ctx.fillText('MAKE FROGS',320,139);ctx.fillText('GREAT AGAIN!',320,223);
 });
}

class PresidentVfx{
 constructor(scene){
  this.scene=scene;
  this.starGeometry=new T.ShapeGeometry(starShape(.43,.21));
  this.starCore=new T.ShapeGeometry(starShape(.32,.148));
  this.starEdge=new T.MeshBasicMaterial({color:0xffb52b,side:T.DoubleSide});
  this.starLight=new T.MeshBasicMaterial({color:0xffeb99,side:T.DoubleSide});
  this.trailMaterial=new T.MeshBasicMaterial({color:0xffbb4e,transparent:true,opacity:.48,blending:T.AdditiveBlending,depthWrite:false});
  this.seal=sealTexture();this.imprint=sealTexture(true);
  this.sealMaterial=new T.MeshBasicMaterial({map:this.seal,transparent:true,side:T.DoubleSide,depthWrite:false});
  this.handleMaterial=new T.MeshStandardMaterial({color:0xb32520,metalness:.22,roughness:.32});
  this.ringGeo=new T.RingGeometry(.975,1,96).rotateX(-Math.PI/2);
  this.rimGeo=new T.RingGeometry(.76,1.07,96).rotateX(-Math.PI/2);
  this.rings=[];this.stamps=[];

  this.flag=new T.Group();this.flag.visible=false;scene.add(this.flag);
  const brass=new T.MeshBasicMaterial({color:0xe1aa54});
  const pole=new T.Mesh(new T.CylinderGeometry(.026,.038,3.64,8),brass);pole.position.y=.42;
  const cap=new T.Mesh(new T.SphereGeometry(.078,10,8),brass);cap.position.y=2.28;
  this.cloth=new T.Mesh(new T.PlaneGeometry(2.75,1.48,18,4),new T.MeshBasicMaterial({map:flagTexture(),side:T.DoubleSide}));
  this.clothRows=this.cloth.geometry.attributes.position.array.slice();
  this.cloth.position.y=1.49;
  this.flag.add(pole,cap,this.cloth);
 }
 createStar(){
  const group=new T.Group(),head=new T.Group();
  const edge=new T.Mesh(this.starGeometry,this.starEdge),core=new T.Mesh(this.starCore,this.starLight);
  core.position.z=.018;head.add(edge,core);group.add(head);group.userData.head=head;
  for(let i=0;i<3;i++){
   const streak=new T.Mesh(new T.PlaneGeometry(1.25-i*.22,.042),this.trailMaterial);
   streak.position.set(-.68-i*.09,(i-1)*.12,-.02);group.add(streak);
  }
  return group;
 }
 createStamp(){
  const group=new T.Group();
  const plate=new T.Mesh(new T.PlaneGeometry(1.82,.85),this.sealMaterial);plate.position.y=-.16;
  const neck=new T.Mesh(new T.CylinderGeometry(.14,.22,.52,14),this.handleMaterial);neck.position.y=.34;
  const knob=new T.Mesh(new T.SphereGeometry(.28,20,12),this.handleMaterial);knob.position.y=.62;
  group.add(neck,knob,plate);
  return group;
 }
 effect(event){
  if(event.type!=='hit'||event.kind!=='firedStamp')return;
  const imprint=new T.Mesh(new T.PlaneGeometry(2.9,1.38).rotateX(-Math.PI/2),new T.MeshBasicMaterial({map:this.imprint,transparent:true,depthWrite:false,opacity:.94}));
  imprint.position.set(event.x,.052,event.z);
  this.scene.add(imprint);this.stamps.push({imprint,time:0});
 }
 ring(index){
  if(!this.rings[index]){
   const make=(geometry,color)=>new T.Mesh(geometry,new T.MeshBasicMaterial({color,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}));
   const core=make(this.ringGeo,0xffe19a);
   const rim=new T.Mesh(this.rimGeo,new T.ShaderMaterial({
    transparent:true,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending,
    uniforms:{alpha:{value:0}},
    vertexShader:'varying vec2 local; void main(){local=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 local; uniform float alpha;
     void main(){
      float r=length(local);
      float a=(r-.972)/.041,b=(r-.90)/.063;
      float peak=exp(-a*a),tail=exp(-b*b);
      float flicker=.83+.17*sin(atan(local.y,local.x)*17.);
      gl_FragColor=vec4(1.,.61+.29*peak,.22+.40*peak,alpha*flicker*(.76*peak+.30*tail));
     }`
   }));
   const sparks=new T.Group();
   for(let j=0;j<16;j++)sparks.add(new T.Mesh(this.starCore,this.starLight));
   core.renderOrder=3;rim.renderOrder=2;
   this.scene.add(core,rim,sparks);this.rings[index]={core,rim,sparks};
  }
  return this.rings[index];
 }
 render(game,fighter,camera,dt){
  const f=game.fighters[0];
  const waving=!!f&&f.weapon==='president'&&f.attack==='super'&&f.state==='attack'&&fighter.root.visible;
  this.flag.visible=waving;
  if(waving){
   const data=fighter.assets.rally,frame=data.frames[0],unit=data.displayHeight/(frame.box[3]-frame.box[1]);
   this.flag.position.copy(fighter.body.localToWorld(new T.Vector3((data.grip[0]-frame.anchor)*unit*f.face,(frame.box[3]-data.grip[1])*unit,.045)));
   this.flag.scale.setScalar(ArenaConfig.bodyScale(f));
   this.flag.quaternion.copy(camera.quaternion);this.flag.rotateZ(f.face*Math.sin(f.t*8)*.13);
   this.cloth.position.x=f.face*1.375;
   const points=this.cloth.geometry.attributes.position;
   for(let i=0;i<points.count;i++){
    const away=(points.getX(i)*f.face+1.375)/2.75;
    const flutter=away*Math.sin(away*8-f.t*14);
    points.setY(i,this.clothRows[3*i+1]+flutter*.12);
    points.setZ(i,flutter*.23);
   }
   points.needsUpdate=true;
  }
  const waves=game.groundSpells.filter(spell=>spell.kind==='rally');
  waves.forEach((wave,i)=>{
   const {core,rim,sparks}=this.ring(i),progress=Math.min(1,wave.age/wave.duration);
   const fade=Math.max(0,1-Math.max(0,wave.age-wave.duration)/.4);
   const radius=Math.max(.12,progress*wave.radius);
   core.visible=rim.visible=sparks.visible=true;
   core.position.set(wave.x,.066,wave.z);rim.position.set(wave.x,.059,wave.z);
   core.scale.setScalar(radius);rim.scale.setScalar(radius*.987);
   core.material.opacity=.78*fade;rim.material.uniforms.alpha.value=.85*fade;
   sparks.children.forEach((spark,j)=>{
    const angle=j*Math.PI/8+.12,spread=radius*(.81+.10*(j%3));
    spark.position.set(wave.x+Math.cos(angle)*spread,.14+(j%4)*.11,wave.z+Math.sin(angle)*spread);
    spark.quaternion.copy(camera.quaternion);
    spark.scale.setScalar((.24+.09*(j%3))*fade*Math.sin(Math.PI*progress));
   });
  });
  for(let i=waves.length;i<this.rings.length;i++){
   const {core,rim,sparks}=this.rings[i];core.visible=rim.visible=sparks.visible=false;
  }
  for(let i=this.stamps.length-1;i>=0;i--){
   const mark=this.stamps[i];mark.time+=dt;
   mark.imprint.material.opacity=Math.max(0,Math.min(.94,(.63-mark.time)*2.8));
   if(mark.time<.63&&f&&game.phase!=='intro')continue;
   this.scene.remove(mark.imprint);mark.imprint.geometry.dispose();mark.imprint.material.dispose();this.stamps.splice(i,1);
  }
 }
}

window.PresidentVfx=PresidentVfx;
})();
