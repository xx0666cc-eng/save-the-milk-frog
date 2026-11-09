/* The supplied smoky crescent is a real alpha sprite, not a generic ring effect. */
(function(root){
'use strict';
const T=THREE,clamp=t=>Math.max(0,Math.min(1,t));
const vertexShader='varying vec2 point;void main(){point=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const fragmentShader=`uniform sampler2D map,mapB;uniform vec4 crop,cropB;uniform vec2 shift,shiftB,feather;
uniform float opacity,clock,blend,flow,spin,sceneTone,edge;varying vec2 point;
vec4 samplePart(sampler2D tex,vec4 box,vec2 q){
 if(q.x<0.||q.x>1.||q.y<0.||q.y>1.)return vec4(0.);
 vec4 c=texture2D(tex,box.xy+q*box.zw);c.a*=smoothstep(.015,.20,c.a);
 c.a*=smoothstep(0.,edge,q.x)*smoothstep(0.,edge,1.-q.x)*smoothstep(0.,edge,q.y)*smoothstep(0.,edge,1.-q.y);
 c.a*=smoothstep(0.,feather.x,q.x)*smoothstep(0.,feather.y,1.-q.x);
 return vec4(c.rgb*c.a,c.a);
}
void main(){vec2 p=point-.5;vec2 q=mat2(cos(spin),-sin(spin),sin(spin),cos(spin))*p+.5;
 float tail=1.-smoothstep(.25,.86,q.x);q.y+=flow*sin(q.x*20.-clock*6.)*.004*tail*sin(q.y*3.14159);
 vec4 c=mix(samplePart(map,crop,q+shift),samplePart(mapB,cropB,q+shiftB),blend);
 if(c.a<.012)discard;vec3 rgb=c.rgb/max(c.a,.001);rgb=mix(rgb,vec3(dot(rgb,vec3(.2126,.7152,.0722))),sceneTone);
 gl_FragColor=vec4(rgb,c.a*opacity);
 #include <colorspace_fragment>
}`;
class BellMasterView{
 static owns(p){return ['netherCrescent','netherQuick'].includes(p.kind);}
 constructor(scene,textures){this.scene=scene;this.textures=textures;this.units=new Map();this.shots=[];this.ritual=new BellRitualView(scene,this);}
 effect(asset,index=0){
  const a=root.BELL_MASTER_MOTION_DATA[asset],f=a.frames[index],[x,y,w,h]=f.cell;
  const mesh=new T.Mesh(new T.PlaneGeometry(1,1).translate(.5-f.anchor[0]/w,f.anchor[1]/h-.5,0),new T.ShaderMaterial({
   uniforms:{map:{value:this.textures.get('bell-motion/'+asset)},mapB:{value:this.textures.get('bell-motion/'+asset)},crop:{value:new T.Vector4((x+.5)/a.width,1-(y+h-.5)/a.height,(w-1)/a.width,(h-1)/a.height)},cropB:{value:new T.Vector4((x+.5)/a.width,1-(y+h-.5)/a.height,(w-1)/a.width,(h-1)/a.height)},shift:{value:new T.Vector2()},shiftB:{value:new T.Vector2()},blend:{value:0},flow:{value:1},spin:{value:0},edge:{value:.012},sceneTone:{value:0},opacity:{value:1},clock:{value:0}},
   vertexShader,fragmentShader,transparent:true,depthTest:false,depthWrite:false,side:T.DoubleSide,toneMapped:false
  }));
  mesh.material.uniforms.feather={value:new T.Vector2(.001,.001)};
  mesh.userData.frame=f;return mesh;
 }
 frame(mesh,asset,index,next=index,blend=0){
  const a=root.BELL_MASTER_MOTION_DATA[asset],u=mesh.material.uniforms,origin=mesh.userData.frame;
  for(const [slot,i] of [['',index],['B',next]]){
   const f=a.frames[i],[x,y,w,h]=f.cell;u['map'+slot].value=this.textures.get('bell-motion/'+asset);
   u['crop'+slot].value.set((x+.5)/a.width,1-(y+h-.5)/a.height,(w-1)/a.width,(h-1)/a.height);
   u['shift'+slot].value.set(f.anchor[0]/w-origin.anchor[0]/origin.cell[2],origin.anchor[1]/origin.cell[3]-f.anchor[1]/h);
  }
  u.blend.value=blend;
 }
 place(mesh,x,z,face,height,camera,time,opacity){
  const f=mesh.userData.frame,w=f.cell[2],h=f.cell[3],width=height*w/h;
  mesh.position.set(x,.035,z);
  mesh.quaternion.copy(camera.quaternion);mesh.scale.set(face*width,height,1);
  mesh.material.uniforms.opacity.value=opacity;mesh.material.uniforms.clock.value=time;
  mesh.renderOrder=ArenaConfig.actorDepthOrder({z})+.12;
 }
 create(){
  const charge=[this.effect('rift',0),this.effect('rift',1)];charge.forEach(p=>this.scene.add(p));
  const warning=new T.Mesh(new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xd8c3ff,transparent:true,opacity:.08,depthWrite:false,side:T.DoubleSide}));
  const rim=new T.LineLoop(new T.BufferGeometry().setFromPoints([new T.Vector3(-.5,0,-.5),new T.Vector3(.5,0,-.5),new T.Vector3(.5,0,.5),new T.Vector3(-.5,0,.5)]),new T.LineBasicMaterial({color:0xe2d4ff,transparent:true,opacity:.38,depthWrite:false}));
  warning.renderOrder=rim.renderOrder=-8;this.scene.add(warning,rim);return {charge,warning,rim};
 }
 render(monsters,camera,time,bounds,phase='fight'){
  const ids=new Set();
  for(const e of monsters){
   if(e.monsterType!==BellMaster.type||e.hp<=0)continue;
   ids.add(e.id);let v=this.units.get(e.id);if(!v){v=this.create();this.units.set(e.id,v);}
   const basic=e.bossMove==='basic',m=basic&&e.bossCast?.move?e.bossCast.move:BellMaster.profile.moves.rift;
   const scale=ArenaConfig.bodyScale(e),cast=['fight','paused'].includes(phase)&&e.state==='attack'&&['rift','basic'].includes(e.bossMove)&&e.bossCast;
   const impacts=basic?[m.windup]:cast?.phase2?m.phase2Impacts:m.impacts;
   // A short re-gather between the two releases is the same skill, not a new attack.
   const at=cast?impacts.find(t=>e.t<t):undefined,previous=cast&&at===impacts[1]?impacts[0]+.15:0;
   const wind=at!==undefined&&e.t>=previous;
   const q=wind?clamp((e.t-previous)/(at-previous)):0;
   v.charge.forEach((mesh,i)=>{
    mesh.visible=!!wind;if(!wind)return;
    const blend=clamp((q-.52)/.36),alpha=i?blend:1-blend;
    this.place(mesh,e.x+cast.face*.75*scale,e.z,cast.face,m.visual.chargeHeight*scale*(.48+.52*q),camera,time,alpha*Math.min(1,q*6)*.88);
   });
   v.warning.visible=v.rim.visible=!!wind&&!basic;
   if(wind&&!basic){
    const reach=Math.min(m.reach*scale,Math.max(0,cast.face>0?bounds.right-e.x:e.x-bounds.left));
    v.warning.position.set(e.x+cast.face*reach*.5,.038,e.z);v.warning.scale.set(reach,m.lane*2,1);v.warning.material.opacity=.035+q*.055;
    v.rim.position.set(e.x+cast.face*reach*.5,.041,e.z);v.rim.scale.set(reach,1,m.lane*2);v.rim.material.opacity=.18+q*.22;
   }
  }
  for(const [id,v] of this.units)if(!ids.has(id)){for(const mesh of [...v.charge,v.warning,v.rim])this.dispose(mesh);this.units.delete(id);}
  this.ritual.render(monsters,camera,time,bounds,phase);
 }
 renderProjectiles(projectiles,camera,time){
  const list=projectiles.filter(BellMasterView.owns);
  if(list.length&&!root.BELL_MASTER_MOTION_DATA)return;
  while(this.shots.length<list.length){const mesh=this.effect('flight');this.scene.add(mesh);this.shots.push(mesh);}
  this.shots.forEach((mesh,i)=>{
   const p=list[i];mesh.visible=!!p;if(!p)return;
   const m=p.kind==='netherQuick'?BellMaster.basicMove():BellMaster.profile.moves.rift;
   const form=clamp(p.traveled/(p.speed*m.visual.formTime)),fade=clamp(p.life/m.visual.fadeTime);
   const height=m.visual.height*(.58+.42*form);
   // The measured bright leading edge follows the actual swept collision point.
   this.place(mesh,p.x,p.z,p.dir,height,camera,time,fade*Math.min(1,form*4));
  });
 }
 dispose(mesh){this.scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}
}
root.BellMasterView=BellMasterView;
})(window);
