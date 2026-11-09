(function(){
'use strict';
const T=THREE,TAU=2*Math.PI;
const blue=0x1a79ff,cyan=0x74ddff,pale=0xc9f7ff,amber=0xffbc4b,red=0xff545e;
const disc=new T.CircleGeometry(1,48).rotateX(-Math.PI/2);
const ring=new T.RingGeometry(.943,1,48).rotateX(-Math.PI/2);
const floorQuad=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2);
const quad=new T.PlaneGeometry(1,1);
const arc=new T.RingGeometry(.84,1,36,1,-1.24,2.48);
const dome=new T.SphereGeometry(1,32,14,0,TAU,0,Math.PI/2);
const spike=new T.CircleGeometry(1,3);
const missile=new T.ShapeGeometry(new T.Shape()
 .moveTo(0,-.5).lineTo(.15,-.27).lineTo(.15,.17).lineTo(.27,.35).lineTo(.27,.49)
 .lineTo(.10,.41).lineTo(-.10,.41).lineTo(-.27,.49).lineTo(-.27,.35)
 .lineTo(-.15,.17).lineTo(-.15,-.27).closePath());
const shotKinds=['soundPulse','changeWave','agentShot'];
const clamp=t=>Math.max(0,Math.min(1,t));
function smokeTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
 const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(48,48,4,48,48,48);
 gradient.addColorStop(0,'rgba(255,255,255,.95)');
 gradient.addColorStop(.53,'rgba(255,255,255,.7)');
 gradient.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,96,96);
 return new T.CanvasTexture(canvas);
}

class CapitalVfx{
 constructor(scene){
  this.group=new T.Group();scene.add(this.group);
  this.pools=new Map();
 }
 draw(geometry,x,y,z,sx,sy,sz,color,alpha,blend=T.AdditiveBlending,map=null){
  if(alpha<=0)return null;
  // Pool by shape and material mode so simultaneous bursts reuse the same meshes.
  const key=geometry.id+'/'+blend+'/'+Number(!!map);
  if(!this.pools.has(key))this.pools.set(key,{items:[],used:0});
  const pool=this.pools.get(key),index=pool.used++;
  if(!pool.items[index]){
   const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({
    transparent:true,depthWrite:false,side:T.DoubleSide,blending:blend,map
   }));
   pool.items[index]=mesh;this.group.add(mesh);
  }
  const mesh=pool.items[index];
  mesh.visible=true;mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
  mesh.rotation.set(0,0,0);mesh.material.opacity=alpha;mesh.material.color.setHex(color);
  mesh.renderOrder=geometry===disc||geometry===floorQuad?2:geometry===ring?3:5;
  return mesh;
 }
 circle(point,r,color,alpha){
  this.draw(ring,point.x,.057,point.z,r,1,r,color,alpha);
 }
 fill(point,r,color,alpha){
  this.draw(disc,point.x,.048,point.z,r,1,r,color,alpha,T.NormalBlending);
 }
 lane(cast,move,progress){
  const depth=move.lane+(move.projectile?.56:0),left=Math.min(cast.x,cast.end),right=Math.max(cast.x,cast.end),length=right-left;
  const elite=cast.kind==='burst'||cast.kind==='smoke';
  this.draw(floorQuad,(left+right)/2,.045,cast.z,length,1,depth*2,elite?0x966124:0x255bad,.18+.12*progress,T.NormalBlending);
  for(const side of [-1,1])this.draw(floorQuad,(left+right)/2,.054,cast.z+side*depth,length,1,.037,elite?amber:cyan,.7);
 }
 bill(geometry,camera,x,y,z,width,height,color,alpha,rotation=0,blend=T.AdditiveBlending,map=null){
  const mesh=this.draw(geometry,x,y,z,width,height,1,color,alpha,blend,map);
  if(mesh){mesh.quaternion.copy(camera.quaternion);mesh.rotateZ(rotation);}
  return mesh;
 }
 project(shot,camera){
  const {kind,x,y,z,dir,traveled}=shot;
  if(kind==='agentShot'){
   this.bill(quad,camera,x-dir*.27,y,z,.96,.11,amber,.78,-.02*dir);
   this.bill(quad,camera,x-dir*.1,y,z,.52,.045,0xfff0c4,.98);
   return;
  }
  const surge=kind==='changeWave',scale=surge?1.08+Math.min(traveled/5,.6):.64;
  for(let i=2;i>=0;i--){
   const r=scale*(1-i*.15),cx=x-dir*(.22+i*(surge?.52:.27));
   this.bill(arc,camera,cx,y,z,dir*r*.98,r*1.05,blue,.72-i*.13);
   this.bill(arc,camera,cx+dir*.035,y,z+.045,dir*r,r,cyan,.97-i*.22);
  }
  if(surge){
   this.draw(floorQuad,x,.055,z,.66,1,shot.halfDepth*2,blue,.3);
   this.draw(floorQuad,x-.17*dir,.059,z,.25,1,shot.halfDepth*2,cyan,.74);
  }
 }
 blast(camera,point,r,t){
  const progress=clamp(t/.32),fade=1-progress;
  this.fill(point,r,0xff982b,fade*.45);
  this.circle(point,r*(.32+progress*.77),amber,fade*.96);
  for(let i=0;i<9;i++){
   const angle=TAU*i/9,radius=r*(.18+progress*.76),x=point.x+Math.cos(angle)*radius,z=point.z+Math.sin(angle)*radius;
   const height=(.55+(i%3)*.19)*Math.sin(Math.PI*(.24+progress*.7));
   this.bill(spike,camera,x,.23+height,z,.19*fade,.58*fade,i%3===0?0xfff0aa:0xff712e,fade*.97,-angle*.34);
  }
 }
 bombard(enemy,cast,move,camera){
  const t=enemy.t;
  cast.points.forEach((point,i)=>{
   const until=move.impacts[i]-t,r=move.radius;
   if(until<=0){
    this.blast(camera,point,r,-until);return;
   }
   this.fill(point,r,0xc22944,.23+Math.sin(t*13+i)*.055);
   this.circle(point,r,red,.86);this.circle(point,r*.8,amber,.51);
   const mark=Math.max(.16,r*Math.min(1,until/.68));
   this.circle(point,mark,amber,.64);
   for(const [sx,sz] of [[.48,.065],[.065,.48]])this.draw(floorQuad,point.x,.06,point.z,sx,1,sz,pale,.82);
   if(until<.55){
    const lift=until/.55,x=point.x-lift*1.65,y=.5+lift*4.7;
    this.bill(spike,camera,x-.31,y+.89,point.z,.85,1.03,0xff8238,.57,-1.91);
    this.bill(spike,camera,x-.19,y+.57,point.z,.52,.72,0xffd486,.82,-1.91);
    this.bill(missile,camera,x,y,point.z,.55,.81,0xfff0ce,.97,.33,T.NormalBlending);
   }
  });
 }
 shield(enemy,time){
  if(!this.shieldMesh){
   const material=new T.ShaderMaterial({
    transparent:true,depthWrite:false,
    uniforms:{strength:{value:1},clock:{value:0}},
    vertexShader:`
     varying vec3 normalView;
     varying vec3 toCamera;
     varying float localHeight;
     void main(){
      vec4 view=modelViewMatrix*vec4(position,1.0);
      normalView=normalMatrix*normal;
      toCamera=-view.xyz;
      localHeight=position.y;
      gl_Position=projectionMatrix*view;
     }`,
    fragmentShader:`
     uniform float strength;
     uniform float clock;
     varying vec3 normalView;
     varying vec3 toCamera;
     varying float localHeight;
     void main(){
      float rim=pow(1.0-max(0.0,dot(normalize(normalView),normalize(toCamera))),2.5);
      float stripe=pow(max(0.0,cos(localHeight*28.0-clock*4.2)),26.0);
      vec3 color=mix(vec3(.04,.4,1.0),vec3(.53,.88,1.0),rim);
      gl_FragColor=vec4(color,strength*(.085+.58*rim+.09*stripe));
     }`
   });
   this.shieldMesh=new T.Mesh(dome,material);
   this.shieldMesh.renderOrder=5;this.group.add(this.shieldMesh);
  }
  const a=Math.min(1,enemy.supportShield/.42);
  const mesh=this.shieldMesh;
  mesh.visible=true;mesh.position.set(enemy.x,.04,enemy.z);mesh.scale.set(2.45,4.84,1.94);
  mesh.material.uniforms.strength.value=a;mesh.material.uniforms.clock.value=time;
  this.circle(enemy,2.2,cyan,.72*a);
 }
 smoke(enemy,camera){
  const {bossCast:cast,smokeCover}=enemy;
  if(!cast||cast.kind!=='smoke'||!smokeCover)return;
  this.smokeMap??=smokeTexture();
  const age=1.25-smokeCover,fade=clamp(smokeCover/.42)*clamp(age/.16);
  for(let i=0;i<10;i++){
   const along=(i%5)/4,x=cast.x+(enemy.x-cast.x)*along+Math.sin(i*3.2)*.51;
   const z=cast.z+Math.cos(i*1.9)*.74,y=.45+(i%4)*.24+age*.38;
   this.bill(quad,camera,x,y,z,1.4+age,1.18+age*.53,i%3===0?0xc5d8e3:0x6d7b87,fade*.6,0,T.NormalBlending,this.smokeMap);
  }
 }
 cast(enemy,camera){
  const cast=enemy.bossCast,profile=enemy.isBoss?CapitalEnemies.boss:CapitalEnemies.elite;
  const move=profile.moves[cast.kind],t=enemy.t;
  if(t>=move.windup+move.active)return;
  const winding=t<move.windup,progress=clamp(t/move.windup);
  if(cast.kind==='bombard')this.bombard(enemy,cast,move,camera);
  else if(cast.kind==='rally'){
   this.fill(enemy,move.radius,0x1d59ca,.12);
   this.circle(enemy,move.radius,cyan,.62);
   this.circle(enemy,1+progress*(move.radius-1),pale,.8);
   for(let i=0;i<9;i++){
    const a=TAU*i/9,r=1.65+.36*(i%2),height=1.1+progress*2.9;
    this.bill(quad,camera,enemy.x+r*Math.cos(a),height/2,enemy.z+r*Math.sin(a),.041,height,cyan,.57);
   }
  }else if(cast.kind==='support'){
   for(const point of cast.points){
    this.circle(point,.83,cyan,.9);this.circle(point,.35+progress*.4,pale,.67);
    this.bill(quad,camera,point.x,1,point.z,.19+progress*.16,2.1,blue,.18+progress*.25);
   }
  }else if(winding)this.lane(cast,move,progress);
  else if(move.projectile){
   const since=t-(move.impacts?.[cast.next-1]??move.windup);
   if(since<.12){
    const muzzleY=enemy.y+move.muzzleY*ArenaConfig.bodyScale(enemy);
    this.bill(arc,camera,cast.from,muzzleY,cast.z,cast.face*.48,.45,cast.kind==='burst'?amber:cyan,.84*(1-since/.12));
   }
  }
 }
 render(game,camera){
  for(const pool of this.pools.values())pool.used=0;
  if(this.shieldMesh)this.shieldMesh.visible=false;
  for(const enemy of game.monsters){
   if(enemy.hp<=0)continue;
   if(enemy.allyBoost>0){
    const pulse=.7+Math.sin(game.time*8)*.16;
    this.circle(enemy,.76,cyan,pulse);
    const head=Monsters.types[enemy.monsterType].height*ArenaConfig.bodyScale(enemy);
    this.bill(spike,camera,enemy.x,enemy.y+head+.47,enemy.z,.25,.28,pale,pulse,Math.PI/2);
   }
   if(enemy.supportShield>0)this.shield(enemy,game.time);
   if(enemy.smokeCover>0)this.smoke(enemy,camera);
   if((enemy.monsterType===CapitalEnemies.bossType||enemy.monsterType===CapitalEnemies.eliteType)&&enemy.state==='attack'&&enemy.bossCast)
    this.cast(enemy,camera);
  }
  for(const shot of game.projectiles)if(shotKinds.includes(shot.kind))this.project(shot,camera);
  for(const pool of this.pools.values())for(let i=pool.used;i<pool.items.length;i++)pool.items[i].visible=false;
 }
 static owns(shot){return shotKinds.includes(shot.kind);}
}
window.CapitalVfx=CapitalVfx;
})();
