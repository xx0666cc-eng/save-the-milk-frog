(function(){
'use strict';
const T=THREE,TAU=Math.PI*2;
const purple=0xc649ff,lilac=0xe7abff,hot=0xffe4ff,gold=0xffce87;
const ground=.055,steps=64;
const circle=new T.CircleGeometry(1,steps).rotateX(-Math.PI/2);
const plane=new T.PlaneGeometry(1,1);
const rect=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2);
const ease=t=>1-Math.pow(1-Math.max(0,Math.min(1,t)),3);

class MorrisView{
 constructor(scene,textures){
  this.group=new T.Group();scene.add(this.group);
  this.textures=textures;
  this.paths=[];this.discs=[];this.rectangles=[];this.images=[];
 }
 mesh(pool,index,geometry){
  if(!pool[index]){
   const material=new T.MeshBasicMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});
   const mesh=new T.Mesh(geometry(),material);
   mesh.frustumCulled=false;pool[index]=mesh;this.group.add(mesh);
  }
  const mesh=pool[index];mesh.visible=true;return mesh;
 }
 path(points,width,color,opacity,flat=false){
  const count=points.length;
  const mesh=this.mesh(this.paths,this.pathIndex++,()=>{
   const geometry=new T.BufferGeometry(),position=new T.BufferAttribute(new Float32Array((steps+1)*6),3);
   const indices=[];
   for(let i=0;i<steps;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
   geometry.setAttribute('position',position);geometry.setIndex(indices);
   return geometry;
  });
  const pos=mesh.geometry.attributes.position;
  for(let i=0;i<count;i++){
   const [x,y,z]=points[i];
   if(flat){
    const prev=points[Math.max(0,i-1)],next=points[Math.min(count-1,i+1)];
    const dx=next[0]-prev[0],dz=next[2]-prev[2],length=Math.hypot(dx,dz)||1;
    const ox=-dz/length*width,oz=dx/length*width;
    pos.setXYZ(2*i,x+ox,y,z+oz);pos.setXYZ(2*i+1,x-ox,y,z-oz);
   }else{
    pos.setXYZ(2*i,x,y+width,z);pos.setXYZ(2*i+1,x,y-width,z);
   }
  }
  pos.needsUpdate=true;mesh.geometry.setDrawRange(0,(count-1)*6);
  mesh.material.color.setHex(color);mesh.material.opacity=opacity;mesh.renderOrder=flat?3:6;
 }
 ring(x,z,r,y,width,color,alpha){
  const points=Array.from({length:steps+1},(_,i)=>[x+Math.cos(i/steps*TAU)*r,y,z+Math.sin(i/steps*TAU)*r]);
  this.path(points,width,color,alpha,true);
 }
 disc(x,z,r,color,alpha){
  const mesh=this.mesh(this.discs,this.discIndex++,()=>circle);
  mesh.position.set(x,ground,z);mesh.scale.set(r,1,r);
  mesh.material.color.setHex(color);mesh.material.opacity=alpha;mesh.renderOrder=2;
 }
 rectangle(x,z,w,d,color,alpha){
  const mesh=this.mesh(this.rectangles,this.rectangleIndex++,()=>rect);
  mesh.position.set(x,ground,z);mesh.scale.set(w,1,d);
  mesh.material.color.setHex(color);mesh.material.opacity=alpha;mesh.renderOrder=2;
 }
 image(key,x,y,z,w,h,camera,alpha,flip=false){
  const texture=this.textures.get('morris/'+key);
  if(!texture)return;
  const mesh=this.mesh(this.images,this.imageIndex++,()=>plane);
  mesh.material.map=texture;mesh.material.opacity=alpha;
  const ratio=texture.image.width/texture.image.height,width=Math.min(w,h*ratio);
  mesh.position.set(x,y,z);mesh.scale.set(flip?-width:width,width/ratio,1);mesh.quaternion.copy(camera.quaternion);
  mesh.renderOrder=key==='echo'?4:7;
 }
 sigil(point,progress,strong=false){
  const {x,z,radius:r}=point;
  this.disc(x,z,r,purple,.16+.13*progress);
  this.ring(x,z,r,ground+.006,.055,lilac,.75);
  this.ring(x,z,r*.8,ground+.009,.024,strong?gold:purple,.63);
  this.ring(x,z,Math.max(.12,r*(1-progress)),ground+.015,.042,hot,.72);
  const diamond=Array.from({length:5},(_,i)=>{
   const a=i*Math.PI/2;
   return [x+Math.cos(a)*r*.62,ground+.016,z+Math.sin(a)*r*.62];
  });
  this.path(diamond,.027,lilac,.73,true);
 }
 tether(x,y,z,a,b,c,alpha,slack=.35){
  const points=Array.from({length:17},(_,i)=>{
   const t=i/16;return [x+(a-x)*t,y+(b-y)*t-slack*Math.sin(t*Math.PI),z+(c-z)*t];
  });
  this.path(points,.07,purple,alpha*.5);this.path(points,.023,hot,alpha);
 }
 burst({x,z,radius},t){
  if(t<0||t>.43)return;
  const fade=1-t/.43;
  this.disc(x,z,radius,purple,fade*.54);
  this.ring(x,z,radius*(.23+.96*ease(t/.43)),ground+.07,.085,lilac,fade);
  for(let i=0;i<10;i++){
   const a=i/10*TAU,r=radius*(.45+.59*t/.43);
   const dx=Math.cos(a),dz=Math.sin(a);
   this.path([[x+dx*.18,ground,z+dz*.18],[x+dx*r*.62,.45*fade,z+dz*r*.62],[x+dx*r,(.48+i%3*.21)*fade,z+dz*r]],.09*fade,i%3===0?hot:purple,fade*.94);
  }
 }
 render(monsters,camera){
  const enemy=monsters.find(m=>m.monsterType===Morris.bossType&&m.hp>0);
  this.group.visible=!!enemy;
  if(!enemy)return;
  this.pathIndex=this.discIndex=this.rectangleIndex=this.imageIndex=0;
  const handY=enemy.y+3.15;
  for(const puppet of monsters.filter(m=>m.summonedBy===enemy.id&&m.hp>0)){
   const side=Math.sign(puppet.x-enemy.x)||enemy.face;
   for(const offset of [-.29,.29])this.tether(enemy.x+side*1.55+offset,handY,enemy.z,puppet.x+offset,puppet.y+1.64,puppet.z,.36);
   if(puppet.state==='attack')this.puppetSwing(puppet);
  }
  const cast=enemy.state==='attack'?enemy.bossCast:null;
  if(cast)this.renderCast(enemy,cast,camera,handY);
  for(const [pool,count] of [[this.paths,this.pathIndex],[this.discs,this.discIndex],[this.rectangles,this.rectangleIndex],[this.images,this.imageIndex]])
   for(let i=count;i<pool.length;i++)pool[i].visible=false;
 }
 puppetSwing(puppet){
  const t=puppet.t-Morris.puppet.windup;
  if(t<0||t>.22)return;
  const points=Array.from({length:17},(_,i)=>{
   const a=(i/16-.5)*Math.PI*1.15;
   return [puppet.x+puppet.face*Math.cos(a)*1.38,puppet.y+.87+Math.sin(a)*.36,puppet.z+Math.sin(a)*.5];
  });
  this.path(points,.085,purple,1-t/.22);this.path(points,.031,hot,1-t/.22);
 }
 renderCast(enemy,cast,camera,handY){
  const move=Morris.boss.moves[cast.kind],t=enemy.t;
  const warning=t<move.windup,progress=Math.min(1,t/move.windup);
  const elapsed=t-move.windup,fade=1-elapsed/move.active;
  if(cast.kind==='finale'){
   this.finale(cast,t,camera,handY);
   return;
  }
  if(t>=move.windup+move.active)return;
  const {x,z}=cast;
  if(cast.kind==='whip'){
   if(warning){
    this.rectangle((x+cast.end)/2,z,Math.abs(x-cast.end),2*cast.lane,purple,.14+progress*.19);
    for(const side of [-1,1])this.path([[x,ground+.01,z+side*cast.lane],[cast.end,ground+.01,z+side*cast.lane]],.04,lilac,.72,true);
   }else{
    for(let k=0;k<3;k++){
     const arc=Array.from({length:29},(_,i)=>{
      const q=i/28;
      return [x+(cast.end-x)*Math.sin(Math.PI*q/2),.56+handY*(1-q)*(.68+k*.11),z+Math.sin(q*Math.PI)*cast.lane*(k-1)];
     });
     this.path(arc,.18,purple,fade*.86);this.path(arc,.053,lilac,fade);
    }
   }
  }else if(cast.kind==='summon'){
   for(const [i,point] of cast.points.entries()){
    const sigil={...point,radius:.84};
    if(warning)this.sigil(sigil,progress);
    else this.burst(sigil,elapsed);
    for(let strand=-1;strand<=1;strand++)
     this.tether(x+(i?1:-1)*1.56+strand*.16,handY,z,point.x+strand*.32,ground,point.z,warning?.75:fade);
   }
  }else if(cast.kind==='pull'){
   if(warning)this.sigil(cast,progress);
   else this.burst(cast,elapsed);
   for(let strand=-1;strand<=1;strand++)
    this.tether(enemy.x+strand*.58,handY,enemy.z,x+strand*.46,warning?ground:.6,z,(warning?.48:fade)*.94);
   if(!warning)for(let k=0;k<3;k++)this.ring(x,z,cast.radius*(1-.55*ease(elapsed/.33)),.35+k*.39,.055,lilac,fade);
  }else{
   for(const line of cast.lines){
    const points=[[line.ax,ground+.012,line.az],[line.bx,ground+.012,line.bz]];
    this.path(points,line.width,purple,warning?.29+progress*.19:fade*.86,true);
    this.path(points,warning?.028:.066,hot,warning?.66:fade,true);
    if(!warning){
     for(const hand of [-1,1]){
      const at=points[(hand+1)/2];
      this.tether(x+hand*1.6,handY,z,at[0],at[1],at[2],fade*.75);
     }
    }
   }
  }
 }
 finale(cast,t,camera,handY){
  const {x,z,points,left,right}=cast,[first,second,third,wave]=Morris.finaleHits;
  if(t>=Morris.finaleEnd){
   const alpha=Math.max(0,1-(t-Morris.finaleEnd)/Morris.boss.moves.finale.recover);
   this.ring(x,z,1.45,ground+.01,.046,gold,.6*alpha);
   return;
  }
  const rise=ease(t/.7),lastFade=t>wave?Math.max(0,1-(t-wave)/.5):1;
  this.image('echo',(left+right)/2,5.32+rise*.42,z-.85,Math.min(14,right-left),5.12,camera,rise*lastFade*.88);
  for(let i=0;i<points.length;i++){
   const point=points[i],at=[first,second,third][i];
   if(t<at){
    const progress=Math.max(0,1-(at-t)/(i?.7:1));
    this.sigil(point,progress,true);
    this.tether(x+(i-1)*1.5,handY,z,point.x,ground,point.z,.6);
    if(progress>0)this.image('fist',point.x,1.35+3.45*(1-progress),point.z,1.55,2.75,camera,ease(progress/.24)*.98,i===1);
   }else{
    this.burst(point,t-at);
    if(t-at<.2)this.image('fist',point.x,1.25,point.z,1.55,2.75,camera,1-(t-at)/.2,i===1);
   }
  }
  if(t<3.1)return;
  const impact=t-wave,progress=ease((t-3.1)/(wave-3.1));
  this.rectangle((left+right)/2,0,right-left,2*ArenaConfig.world.halfDepth,purple,impact<0?.08+.24*progress:.48*lastFade);
  for(const side of [-1,1]){
   const ox=x+side*1.67;
   this.image('fist',ox,1.28+3.22*(1-progress),z,1.8,3.2,camera,lastFade,side<0);
   this.tether(ox,5.1,z,ox,ground,z,.55*lastFade);
  }
  if(impact>=0){
   this.burst({x,z,radius:3.1},impact);
   const radius=1+(right-left)*ease(impact/.5);
   this.ring(x,z,radius,ground+.13,.19,hot,lastFade*.9);
   this.ring(x,z,radius*.86,ground+.09,.25,purple,lastFade);
  }
 }
}
window.MorrisView=MorrisView;
})();
