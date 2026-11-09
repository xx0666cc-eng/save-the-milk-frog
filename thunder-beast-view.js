(function(){
'use strict';
const T=THREE,BLUE=0x2198ff,ICE=0xa7ecff,WHITE=0xe7fbff,GREEN=0x678624;
const GROUND=.06,STEPS=48;
const ghostGeometry=new T.PlaneGeometry(1,1).translate(0,.5,0);
const leafGeometry=new T.CircleGeometry(1,7);
const sequence=(count,fn)=>Array.from({length:count},(_,i)=>fn(i/(count-1),i));
const at=(a,b,t)=>a+(b-a)*t;
const ground=(x,z)=>[x,GROUND,z];
const circle=(x,z,r)=>sequence(STEPS+1,q=>ground(x+Math.cos(q*Math.PI*2)*r,z+Math.sin(q*Math.PI*2)*r));

class ThunderBeastView{
 constructor(scene,textures){
  this.group=new T.Group();scene.add(this.group);this.textures=textures;
  this.pool=[];this.ghosts=[];this.leaves=[];this.history=[];
 }
 ribbon(points,width,color,opacity,flat=false,fill=false){
  let mesh=this.pool[this.used++];
  if(!mesh){
   const geometry=new T.BufferGeometry();
   geometry.setAttribute('position',new T.BufferAttribute(new Float32Array((STEPS+1)*18),3).setUsage(T.DynamicDrawUsage));
   mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({transparent:true,depthWrite:false,side:T.DoubleSide}));
   mesh.frustumCulled=false;this.pool.push(mesh);this.group.add(mesh);
  }
  const data=mesh.geometry.attributes.position;
  let cursor=0;
  const write=p=>data.setXYZ(cursor++,p[0],p[1],p[2]);
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i];
   if(fill){write(points[0]);write(a);write(b);continue;}
   const dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz)||1;
   const closed=Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1],points[0][2]-points.at(-1)[2])<.01;
   const taper=closed||color===GREEN?1:Math.sin(Math.PI*(i-.5)/(points.length-1))**.35;
   const offset=flat?[-dz/length*width*taper,0,dx/length*width*taper]:[Math.abs(dx)<.06?width*taper:0,width*taper,0];
   const edge=(p,s)=>p.map((v,k)=>v+s*offset[k]);
   write(edge(a,1));write(edge(a,-1));write(edge(b,1));
   write(edge(b,1));write(edge(a,-1));write(edge(b,-1));
  }
  data.needsUpdate=true;mesh.geometry.setDrawRange(0,cursor);mesh.material.color.setHex(color);
  mesh.material.blending=fill||color===GREEN?T.NormalBlending:T.AdditiveBlending;
  mesh.material.opacity=opacity;mesh.renderOrder=fill?2:flat?3:6;mesh.visible=true;
 }
 warning(outline,progress){
  this.ribbon(outline,0,0x166bb4,.16+.17*progress,true,true);
  this.ribbon(outline,.09,BLUE,.72,true);
  this.ribbon(outline,.031,ICE,.92,true);
 }
 lightning(points,alpha,flat=false){
  this.ribbon(points,.067,BLUE,alpha*.72,flat);this.ribbon(points,.019,WHITE,alpha,flat);
 }
 ghost(p,camera,face,alpha,scale,motion){
  if(motion){
   let mesh=this.ghosts[this.ghostCount++];
   if(!mesh||!mesh.material.isShaderMaterial){
    if(mesh){this.group.remove(mesh);mesh.material.dispose();}
    mesh=new T.Mesh(motion.geometry,motion.material());mesh.frustumCulled=false;
    this.ghosts[this.ghostCount-1]=mesh;this.group.add(mesh);
   }
   mesh.geometry=motion.geometry;motion.ghost(mesh,{...p,alpha},camera,scale);mesh.renderOrder=ArenaConfig.actorDepthOrder(p)-.00001;return;
  }
  const texture=this.textures.get(ThunderBeast.type+'/idle');if(!texture)return;
  let mesh=this.ghosts[this.ghostCount++];
  if(!mesh){
   mesh=new T.Mesh(ghostGeometry,new T.MeshBasicMaterial({map:texture,color:0x65c9ff,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}));
   mesh.renderOrder=5;this.ghosts.push(mesh);this.group.add(mesh);
  }
  const h=ThunderBeast.profile.height*scale,w=h*texture.image.width/texture.image.height;
  mesh.position.set(p.x+(0.5-.38)*w*-face,.04,p.z);
  mesh.scale.set(-face*w,h,1);mesh.quaternion.copy(camera.quaternion);mesh.material.opacity=alpha;mesh.visible=true;
 }
 vine(cast,camera,alpha,t,grip){
  const x=grip?.x??cast.perch.x,z=grip?.z??cast.perch.z,top=Math.max(6.1,(grip?.y||0)+1.35);
  const twine=offset=>sequence(20,q=>[x+Math.sin(q*9+offset)*.085,GROUND+q*top,z+Math.cos(q*9+offset)*.06]);
  for(const angle of [0,Math.PI])this.ribbon(twine(angle),.037,GREEN,alpha);
  for(let i=0;i<8;i++){
   let mesh=this.leaves[i];
   if(!mesh){
    mesh=new T.Mesh(leafGeometry,new T.MeshBasicMaterial({color:i%2?0x93b645:0x567f26,transparent:true,side:T.DoubleSide,depthWrite:false}));
    this.leaves.push(mesh);this.group.add(mesh);
   }
   const side=i%2?1:-1;
   mesh.position.set(x+side*.22+Math.sin(i+t*2)*.035,.55+i*(top-.9)/8,z+.10);
   mesh.quaternion.copy(camera.quaternion);mesh.rotateZ(side*.65);mesh.scale.set(.26,.10,1);
   mesh.material.opacity=alpha;mesh.visible=true;
  }
 }
 spark(point,radius,alpha,time){
  for(let i=0;i<4;i++){
   const a=i*Math.PI*.5+time*3.6,c=Math.cos(a),s=Math.sin(a);
   this.lightning([[point.x+c*radius*.28,point.y+s*radius*.28,point.z],
    [point.x+c*radius*.7-s*.07,point.y+s*radius*.7+c*.07,point.z+.015],
    [point.x+c*radius,point.y+s*radius,point.z]],alpha);
  }
 }
 landing(x,z,q,radius){
  this.lightning(circle(x,z,radius*(.3+.75*q)),(1-q)*.8,true);
  for(let i=0;i<7;i++){
   const a=i*Math.PI*2/7,r=radius*(.18+q*.65),y=Math.sin(q*Math.PI)*(.18+(i%3)*.1);
   this.ribbon([[x+Math.cos(a)*r,y+.04,z+Math.sin(a)*r],
    [x+Math.cos(a)*(r+.16),y+.08,z+Math.sin(a)*(r+.16)]],.035,0xc0b097,(1-q)*.8);
  }
 }
 render(monsters,camera,views,time){
  const enemy=monsters.find(m=>m.monsterType===ThunderBeast.type&&m.hp>0&&m.state==='attack');
  this.group.visible=!!enemy;
  if(!enemy){this.history.length=0;this.lastTime=null;this.cast=null;return;}
  this.used=this.ghostCount=0;for(const leaf of this.leaves)leaf.visible=false;
  const {bossCast:cast,t}=enemy,move=ThunderBeast.profile.moves[cast.kind],end=move.windup+move.active;
  const progress=Math.min(1,t/move.windup),fade=Math.min(1,Math.max(0,1-(t-end)/.22));
  const motion=views?.get(enemy.id)?.motion,scale=ArenaConfig.bodyScale(enemy);
  if(this.cast!==cast||time<this.lastTime){this.history.length=0;this.grip=null;this.cast=cast;this.lastTrail=null;}
  if(cast.kind==='rake'&&t<end+.18){
   const f=cast.face;
   const paw=motion?.point('paw',enemy)||new T.Vector3(enemy.x+f*.5,.35,enemy.z);
   if(t<move.windup)this.spark(paw,.22+.12*progress,.25+.45*progress,t);
   for(let strike=0;strike<move.impacts.length;strike++){
    const q=(t-move.impacts[strike])/.18;if(q<0||q>1)continue;
    for(let k=0;k<3;k++){
     const arc=sequence(19,s=>[enemy.x+f*(.13+s*1.42),
      .21+k*.17+(strike===0?Math.sin(s*Math.PI)*.82:(1-s)*1.05),
      enemy.z+((k-1)*.19+(s-.5)*(strike===0?.9:-.9))*scale]);
     this.lightning(arc,(1-q)**.7*.88);
    }
    this.spark({x:enemy.x+f*1.2,y:.58,z:enemy.z},.32,(1-q)*.65,t);
   }
  }else if(cast.kind==='vine'&&t<end+.36){
   if(motion&&t<move.dive&&t>=move.windup*.7)this.grip=motion.point('paw',enemy);
   this.vine(cast,camera,t<move.dive?.94:Math.max(0,1-(t-move.dive)/.44),t,this.grip);
   if(cast.target){
    const {x,z}=cast.target;
    if(t<end)this.warning(circle(x,z,cast.radius),Math.min(1,(t-move.windup)/move.active));
    else this.lightning(circle(x,z,cast.radius*at(.55,1.15,(t-end)/.22)),fade,true);
    if(t>=move.dive&&t<end){
     const q=(t-move.dive)/(end-move.dive),r=.28+.20*Math.sin(q*Math.PI);
     for(let side=-1;side<=1;side+=2)this.lightning(sequence(13,s=>[
      enemy.x-cast.face*(1-s)*1.25+side*r*Math.sin(s*9+t*25),enemy.y+.25+(1-s)*1.5,
      enemy.z+side*r*Math.cos(s*9+t*25)]),.60);
    }
    if(t>=end)this.landing(x,z,Math.min(1,(t-end)/.36),cast.radius);
   }
  }else if(cast.kind==='zigzag'&&t<end+.18){
   for(let i=1;i<cast.route.length;i++){
    const a=cast.route[i-1],b=cast.route[i],alpha=Math.max(0,1-(t-b.at)/.9);
    if(t<a.at)break;
    const q=Math.min(1,(t-a.at)/(b.at-a.at));
    this.lightning([ground(a.x,a.z),ground(at(a.x,b.x,q),at(a.z,b.z,q))],alpha*.73,true);
   }
   const moving=enemy.bossGlide&&(t<move.flank||t>move.charge);
   if(motion&&moving&&(this.lastTrail===null||time-this.lastTrail>=.034)){
    this.history.push({time,x:enemy.x,y:enemy.y,z:enemy.z,face:enemy.face,pose:motion.current,id:enemy.id});
    this.lastTrail=time;
   }
   this.history=this.history.filter(p=>time-p.time<=.19);
   for(const p of this.history){const age=time-p.time;if(age>.022)this.ghost(p,camera,p.face,(1-age/.19)*.24,scale,motion);}
   if(cast.target){
    const from=cast.route.at(-1),p=cast.target;
    const path=[ground(from.x,from.z),ground(p.x,p.z)];
    if(t<move.charge)this.ribbon(path,cast.lane,BLUE,.38,true);
    this.lightning(path,t<move.charge?.76:fade,true);
    if(t<move.charge)this.spark({x:enemy.x,y:.55,z:enemy.z},.48,.45,t);
   }
  }else if(cast.kind==='storm'&&t<end+.15){
   const {x,z,reach,depth,face}=cast;
   const arc=sequence(STEPS-1,q=>{const a=(q-.5)*Math.PI;return ground(x+face*Math.cos(a)*reach,z+Math.sin(a)*depth);});
   const outline=[ground(x,z),...arc,ground(x,z)];
   const tail=motion?.point('tail',enemy)||new T.Vector3(enemy.x-face*.8,1.5,enemy.z);
   if(t<move.windup){
    this.warning(outline,progress);this.spark(tail,.22+progress*.52,.25+progress*.5,t);
    // Decorative wind stays close to the tail; the forward damage footprint is unchanged.
    for(let band=0;band<2;band++){
     const wind=sequence(35,q=>{const a=q*Math.PI*2+t*7+band*Math.PI;return [tail.x+Math.cos(a)*(.35+progress*.5),tail.y+Math.sin(a)*.34,tail.z+Math.sin(a)*.25];});
     this.ribbon(wind,.018+progress*.012,ICE,.18+progress*.45);
    }
   }
   else{
    const surge=Math.min(1,(t-move.windup)/move.active),opacity=(1-surge*.63)*fade;
    this.ribbon(outline,0,0x1a79d4,.15*opacity,true,true);
    this.lightning(arc,opacity,true);this.spark(tail,.9,opacity*.65,t);
    for(let j=0;j<3;j++){
     const sweep=sequence(29,(q,i)=>{
      const a=(q-.5)*Math.PI,r=.28+j*.25+surge*.12;
      return [x+face*Math.cos(a)*reach*r,GROUND+.10+j*.06+Math.sin(i*2.83+t*35)*.06,z+Math.sin(a)*depth*r];
     });
     this.lightning(sweep,opacity);
    }
    for(let j=0;j<6;j++){
     const a=(j/5-.5)*Math.PI*.86;
     const fork=sequence(15,(q,i)=>[x+face*Math.cos(a)*reach*q,GROUND+.018,z+Math.sin(a)*depth*q+Math.sin(i*2.4)*.11*Math.sin(q*Math.PI)]);
     this.lightning(fork,opacity*.65,true);
    }
   }
  }
  for(let i=this.used;i<this.pool.length;i++)this.pool[i].visible=false;
  for(let i=this.ghostCount;i<this.ghosts.length;i++)this.ghosts[i].visible=false;
  this.lastTime=time;
 }
}
window.ThunderBeastView=ThunderBeastView;
})();
