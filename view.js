(function(){
'use strict';const T=THREE,framing=ArenaConfig;
class ArenaView{
 constructor(container){
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.setClearColor(0x28353d,0);this.renderer.domElement.style.zIndex=1;container.appendChild(this.renderer.domElement);this.backdrop=new ArenaBackdrop(container);
  this.opponentHint=document.createElement('div');this.opponentHint.className='stage-opponent';this.opponentHint.hidden=true;container.appendChild(this.opponentHint);
  this.scene=new T.Scene();this.scene.background=new T.Color(0xbfa394);this.scene.fog=new T.Fog(0xbfa394,27,70);this.camera=new T.OrthographicCamera(-11,11,6,-6,.1,120);this.camera.position.set(0,10.8,19);this.camera.lookAt(0,1.4,0);
  this.monsterViews=new MonsterViews(this.scene);
  this.growthView=new GrowthView(this.scene);
  this.capitalVfx=new CapitalVfx(this.scene);
  this.presidentVfx=new PresidentVfx(this.scene);
  this.hemi=new T.HemisphereLight(0xfce9d0,0x233846,2.7);this.scene.add(this.hemi);const sun=new T.DirectionalLight(0xffd2a0,3.2);sun.position.set(-6,12,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-15;sun.shadow.camera.right=15;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;sun.shadow.normalBias=.03;this.scene.add(sun);this.sun=sun;this.defaultFog=this.scene.fog;this.defaultBackground=this.scene.background;
  this.scene.add(sun.target);this.materials={};this.fx=[];this.projectileMeshes=[];this.mageVfx=new MageVfx(this.scene);this.lunarVfx=new LunarSakuraVfx(this.scene);this.shake=0;this.flash=0;const existing=new Set(this.scene.children);this.buildArena();this.legacyArena=new T.Group();for(const o of [...this.scene.children])if(!existing.has(o))this.legacyArena.add(o);this.scene.add(this.legacyArena);this.fighters=[new ReferenceFighterView(this.scene,0),new FighterView(this.scene,1)];this.resize();window.addEventListener('resize',()=>this.resize());
 }
 prepareStage(skinId){return this.backdrop.prepare(skinId);}
 applyStage(stage){
  this.monsterViews.bellView.ritual.clearPresentation();this.monsterViews.silencedView.clear();this.setBellSceneTone(0);
  this.backdrop.apply(stage);this.legacyArena.visible=!stage;this.scene.background=stage?null:this.defaultBackground;this.scene.fog=stage?null:this.defaultFog;
  this.hemi.color.setHex(stage?.sky||0xfce9d0);this.sun.color.setHex(stage?.sun||0xffd2a0);this.hemi.intensity=stage?2.2:2.7;this.sun.intensity=stage?2.5:3.2;
  this.sun.shadow.camera.left=-20;this.sun.shadow.camera.right=20;this.sun.shadow.camera.updateProjectionMatrix();
 }
 setBellSceneTone(value){
  for(const f of this.fighters??[])if(f.uniforms?.sceneTone)f.uniforms.sceneTone.value=value;
  for(const v of this.monsterViews.views.values())if(v.sprite.material.uniforms?.sceneTone)v.sprite.material.uniforms.sceneTone.value=value;
 }
 updateCamera(game,dt,fs){
  const battling=game.fighters.length>0,aspect=innerWidth/innerHeight;
  // Fighter separation affects the camera's position only. Zoom depends on the viewport.
  const halfW=framing.cameraHalfWidth(aspect,battling),halfH=halfW/aspect;
  const mapEdge=framing.cameraEdge;
  const opponent=fs[1]||game.target(fs[0]);
  const opponentX=opponent?.x??fs[0].x;
  const separation=Math.abs(fs[0].x-opponentX);
  const follow=T.MathUtils.smoothstep(separation,halfW*1.65,halfW*2.15);
  const focus=battling?(fs[1]?T.MathUtils.lerp((fs[0].x+opponentX)*.5,fs[0].x,follow):fs[0].x):0;
  const locked=battling?game.encounter?.active:null;
  if(game.encounter)game.encounter.halfWidth=halfW;
  const target=framing.clampCameraX(locked?locked.cameraX:focus,halfW);
  this.camX=!locked&&this.cameraFighters===game.fighters?T.MathUtils.damp(this.camX,target,framing.camera.followSpeed,dt):target;
  this.cameraFighters=game.fighters;
  this.camX=framing.clampCameraX(this.camX,halfW);
  game.arenaWindow={left:Math.max(-Combat.ARENA.halfWidth,this.camX-halfW),right:Math.min(Combat.ARENA.halfWidth,this.camX+halfW)};
  if(this.camera.right!==halfW||this.camera.top!==halfH){
   this.camera.left=-halfW;this.camera.right=halfW;this.camera.top=halfH;this.camera.bottom=-halfH;this.camera.updateProjectionMatrix();
  }
  const cameraX=framing.clampCameraX(this.camX+(locked?0:(Math.random()-.5)*this.shake),halfW);
  const illustrated=!!this.backdrop.active,pose=framing.cameraPose(illustrated),angle=pose.angle;
  const depthRise=Combat.ARENA.halfDepth*Math.sin(angle);
  this.floorY=illustrated?this.backdrop.update(cameraX,innerWidth,innerHeight,halfH,mapEdge,depthRise):framing.camera.legacyFloorY;
  const lookY=(this.floorY-.5)*2*halfH/Math.cos(angle);
  // Fixed ground anchor: depth movement must not be cancelled by vertical camera following.
  this.camera.position.set(cameraX,lookY+pose.rise,pose.distance);this.camera.lookAt(cameraX,lookY,0);this.camera.updateMatrixWorld();
  this.sun.position.x=cameraX-6;this.sun.target.position.x=cameraX;
  const opponentSide=battling&&opponent&&Math.abs(opponentX-cameraX)>halfW?Math.sign(opponentX-cameraX):0;
  if(opponentSide!==this.opponentSide){
   this.opponentSide=opponentSide;this.opponentHint.hidden=!opponentSide;
   this.opponentHint.dataset.side=opponentSide<0?'left':'right';this.opponentHint.textContent=opponentSide<0?'‹ 对手':'对手 ›';
  }
  this.fighters[0].body.rotation.x=-angle;
 }
 mat(color,emissive=false){const key=color+'-'+emissive;return this.materials[key]||(this.materials[key]=emissive?new T.MeshBasicMaterial({color}):new T.MeshStandardMaterial({color,roughness:.92}));}
 box(x,y,z,w,h,d,c){const o=new T.Mesh(new T.BoxGeometry(w,h,d),this.mat(c));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;this.scene.add(o);return o;}
 buildArena(){
  const edge=Combat.ARENA.halfWidth,floorWidth=(edge+3.5)*2;
  this.box(0,-.28,0,floorWidth,.55,12,0x61716e);this.box(0,-.58,0,floorWidth+1,.15,12.5,0x293e42);
  const rows=Math.floor(floorWidth/3.6);
  for(let i=-rows;i<=rows;i++)this.box(i*1.8,.007,0,.018,.01,11.8,0x8b9590);
  for(let z=-5;z<=5;z+=2)this.box(0,.008,z,floorWidth-.2,.01,.018,0x8b9590);
  // Playable depth boundary: W moves toward the back, S toward the camera.
  for(const z of [-3.8,3.8])this.box(0,.018,z,edge*2,.025,.045,0xc1b58c);
  // Faded fighting ring in the stone, with physical edge markers.
  const ring=new T.Mesh(new T.RingGeometry(3.65,3.69,96),new T.MeshBasicMaterial({color:0xb7c2af,transparent:true,opacity:.45,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.012;this.scene.add(ring);
  for(const x of [-edge,edge]){this.box(x,.04,0,.06,.05,9,0xe8b666);this.box(x,1.1,-4,.5,2.2,.5,0x36464a);this.box(x,2.2,-4,.9,.18,.9,0x36464a);const lamp=new T.Mesh(new T.SphereGeometry(.28,12,8),this.mat(0xffd895,true));lamp.position.set(x,2.42,-4);this.scene.add(lamp);}
  for(const x of [-21,-17,17,21]){this.box(x,1.25,-6,.45,2.5,.5,0x6a5145);this.box(x,.22,-6,.85,.44,.85,0x34494e);}
  this.box(-19,2.65,-6,6.4,.26,1.65,0x344b53);this.box(-19,1.45,-6,4.4,.22,.62,0x744c43);
  this.box(19,2.65,-6,6.4,.26,1.65,0x344b53);this.box(19,1.45,-6,4.4,.22,.62,0x744c43);
  // Gate and two roof silhouettes behind the playable plane.
  for(const x of [-5.3,5.3]){this.box(x,2.4,-6.8,.65,4.8,.7,0x7e4940);this.box(x,2.5,-6.8,.79,.22,.83,0xc8a786);this.box(x,.22,-6.8,1.1,.44,1.1,0x34494e);}
  this.box(0,4.7,-6.8,13,.42,1.1,0x744c43);this.box(0,5.1,-6.8,14.4,.28,1.55,0x263b42);this.box(0,3.9,-6.8,11.8,.3,.6,0x865448);this.box(0,4.35,-6.8,.35,1,.55,0x865448);
  for(const side of [-1,1]){const x=side*13;this.box(x,1.5,-12,8,3,6,0x5d6663);this.box(x,3.2,-12,10,.45,7,0x344b53);this.box(x,3.65,-12,8.5,.35,6,0x344b53);this.box(x,4,-12,6.5,.3,5,0x344b53);for(let a=-2;a<=2;a++)this.box(x+a,1.8,-8.98,.18,2.2,.1,0x8f8271);}
  for(let i=0;i<14;i++){const x=(i-6.5)*4.4,z=-27-(i%3)*6;const m=new T.Mesh(new T.ConeGeometry(6+(i%3),7+(i%4)*2,5),this.mat(i%2?0x84938f:0x8d9a96));m.position.set(x,1.8,z);this.scene.add(m);}
  const sunDisc=new T.Mesh(new T.CircleGeometry(3.3,64),this.mat(0xf4d6ac,true));sunDisc.position.set(-13,13,-47);this.scene.add(sunDisc);
  // Suspended training banners add scale and a readable boundary.
  for(const side of [-1,1]){this.box(side*7.3,2.7,-5.8,.07,5.4,.07,0x3a484b);this.box(side*6.75,4.7,-5.8,1.2,.06,.07,0x3a484b);this.box(side*6.75,3.63,-5.78,1,2.05,.035,side<0?0x285c61:0x9a5347);this.box(side*6.75,3.7,-5.74,.09,1.2,.02,0xe4cbb0);this.box(side*6.75,3.7,-5.72,.55,.08,.02,0xe4cbb0);}
  // Wind-carried leaves, all deterministic.
  this.leaves=[];for(let i=0;i<22;i++){const o=new T.Mesh(new T.PlaneGeometry(.09,.17),new T.MeshBasicMaterial({color:i%2?0xd8ae7a:0x9e6650,side:T.DoubleSide}));this.scene.add(o);this.leaves.push(o);}
 }
 resize(){this.renderer.setSize(innerWidth,innerHeight);}
 effect(e){
  this.growthView.effect(e);
  this.mageVfx.effect(e);this.lunarVfx.effect(e);this.presidentVfx.effect(e);
  if(e.type==='morrisImpact')this.shake=Math.max(this.shake,e.final?.22:.13);
  if(e.type==='capitalBlast')this.shake=Math.max(this.shake,.13);
  if(['swordSwing','swordUltimate','fanSwing'].includes(e.type))return;
  if(e.type==='hit'&&['sword','fan'].includes(e.weapon)){this.shake=e.heavy?.17:.085;return;}
  if(e.type==='hit'&&e.weapon==='magic'&&['orb','pillar'].includes(e.kind)){this.shake=e.heavy?.17:.085;return;}
  if(e.type==='hit'||e.type==='block'){
   const color=e.type==='block'?0x8bdaee:e.weapon==='magic'?0xd79cff:e.kind==='firedStamp'?0xff574a:0xffd182;this.shake=e.type==='block'?.035:e.heavy?.17:.085;
   for(let i=0;i<(e.type==='block'?10:22);i++){const a=Math.PI*2*i/22,r=3+Math.random()*5;const o=new T.Mesh(new T.BoxGeometry(.07,.07,.32),this.mat(color,true));o.position.set(e.x,e.y,(e.z||0)+.4);this.scene.add(o);this.fx.push({o,v:new T.Vector3(Math.cos(a)*r,Math.sin(a)*r,Math.random()*3),life:.21+Math.random()*.15,max:.36});}
   const o=new T.Mesh(new T.RingGeometry(.15,.23,24),new T.MeshBasicMaterial({color,transparent:true,side:T.DoubleSide,depthWrite:false}));o.position.set(e.x,e.y,(e.z||0)+.65);this.scene.add(o);this.fx.push({o,ring:true,life:.22,max:.22});
  }
  if(e.type==='slash'){
   const scale=e.scale??1;
   const o=new T.Mesh(new T.BoxGeometry(5.2,.13,.2),new T.MeshBasicMaterial({color:e.weapon==='sword'?0xffe3a2:e.id?0xff714d:0x75f5ec,transparent:true}));o.scale.setScalar(scale);o.position.set(e.x+e.face*2.8*scale,e.y??1.35*scale,(e.z||0)+.55);o.rotation.z=(Math.random()-.5)*.35;this.scene.add(o);this.fx.push({o,beam:true,life:.17,max:.17});this.shake=.1;
  }
  if(e.type==='dash'){const f=this.fighters[e.id];for(let i=0;i<5;i++){const o=new T.Mesh(new T.BoxGeometry(.6,.04,.04),new T.MeshBasicMaterial({color:e.id?0xf4a17d:0x8dded4,transparent:true}));o.position.set(f.root.position.x,f.root.position.y+.4+i*.4,f.root.position.z+.4);this.scene.add(o);this.fx.push({o,beam:true,life:.18,max:.18});}}
 }
 render(game,dt,clock){
  const dummy=[{id:0,x:-3,y:0,face:1,hp:120,state:'idle',inv:0},{id:1,x:3,y:0,face:-1,hp:120,state:'idle',inv:0}];const fs=game.fighters.length?game.fighters:dummy;
  this.shake*=Math.exp(-dt*18);this.updateCamera(game,dt,fs);
  this.fighters[1].root.visible=this.fighters[1].shadow.visible=!!fs[1];
  const bounds=game.encounter?.bounds(game)||{left:-Combat.ARENA.halfWidth,right:Combat.ARENA.halfWidth};
  const targetId=fs[0].autoAttack?.targetId;
  this.monsterViews.render(game.monsters,this.camera,game.time,bounds,targetId,game.phase,game.projectiles);
  fs.forEach((f,i)=>this.fighters[i].update({...f,autoTargeted:f.id===targetId,hitStop:game.freeze>0,celebrate:game.phase==='result'&&game.winner===i},game.time||clock));
  for(let i=this.fx.length-1;i>=0;i--){const f=this.fx[i];f.life-=dt;if(f.life<=0){this.scene.remove(f.o);f.o.geometry.dispose();if(f.ring||f.beam)f.o.material.dispose();this.fx.splice(i,1);continue;}if(f.v){f.o.position.addScaledVector(f.v,dt);f.v.y-=18*dt;f.o.rotation.z+=dt*8;}if(f.ring)f.o.scale.setScalar(1+(1-f.life/f.max)*4);if(f.ring||f.beam)f.o.material.opacity=f.life/f.max;}
  const genericProjectiles=game.projectiles.filter(p=>!CapitalVfx.owns(p)&&!SakuraRoninView.owns(p)&&!BellMasterView.owns(p)&&!SilencedView.owns(p));
  while(this.projectileMeshes.length<genericProjectiles.length){
   const g=new T.Group(),wave=new T.Group(),arrow=new T.Group(),blade=new T.Group(),orb=new T.Group();
   wave.add(new T.Mesh(new T.IcosahedronGeometry(.33,1),this.mat(0x83f6e9,true)),new T.Mesh(new T.TorusGeometry(.43,.035,6,24),this.mat(0xb1fff4,true)));
   const shaft=new T.Mesh(new T.CylinderGeometry(.023,.023,.95,6),this.mat(0x704b2a,true));shaft.rotation.z=Math.PI/2;arrow.add(shaft);
   const tip=new T.Mesh(new T.ConeGeometry(.083,.24,4),this.mat(0xf6ecd3,true));tip.rotation.z=-Math.PI/2;tip.position.x=.57;arrow.add(tip);
   for(const side of [-1,1]){const feather=new T.Mesh(new T.BoxGeometry(.24,.065,.02),this.mat(0xd8c993,true));feather.position.set(-.36,side*.055,0);feather.rotation.z=side*.4;arrow.add(feather);}
   blade.add(new T.Mesh(new T.RingGeometry(.28,.39,28,1,-Math.PI*.65,Math.PI*1.3),new T.MeshBasicMaterial({color:0xffe1a0,side:T.DoubleSide})));
   const goldStar=this.presidentVfx.createStar(),firedStamp=this.presidentVfx.createStamp();
   g.add(wave,arrow,blade,orb,goldStar,firedStamp);g.userData={wave,arrow,blade,orb,goldStar,firedStamp};this.scene.add(g);this.projectileMeshes.push(g);
  }
  this.projectileMeshes.forEach((o,i)=>{const p=genericProjectiles[i];o.visible=!!p&&!['sword','fan'].includes(p.weapon);if(p){
   const kind=p.kind||'wave';for(const [name,part] of Object.entries(o.userData))part.visible=name===kind;
   o.position.set(p.x,p.y,(p.z||0)+.2);o.rotation.set(0,0,0);
   if(kind==='arrow')o.scale.set(p.dir*(p.power?1.25:1),p.power?1.15:1,1);
   else if(kind==='blade'){o.scale.set(p.dir*1.35,1.8,1);o.rotation.z=Math.sin(clock*12)*.12;}
   else if(kind==='orb'){o.rotation.z=clock*3;o.scale.setScalar(1+Math.sin(clock*14)*.06);}
   else if(kind==='goldStar'){o.quaternion.copy(this.camera.quaternion);o.scale.set(p.dir,1,1);o.userData.goldStar.userData.head.rotation.z=clock*8;}
   else if(kind==='firedStamp'){o.quaternion.copy(this.camera.quaternion);o.rotateZ(p.dir*(-.32+Math.sin(clock*10)*.21));o.scale.setScalar(1);}
   else{o.rotation.x=clock*7;o.rotation.z=clock*5;o.scale.set(1.5,1,1);}
  }});
  this.mageVfx.render(game,this.camera,this.fighters[0]);this.lunarVfx.render(game,this.camera);this.presidentVfx.render(game,this.fighters[0],this.camera,dt);
  this.capitalVfx.render(game,this.camera);
  this.monsterViews.sakuraView.renderProjectiles(game.projectiles,this.camera);
  this.monsterViews.bellView.renderProjectiles(game.projectiles,this.camera,game.time);
  this.growthView.render(game,this.camera,dt);
  const leafWidth=Combat.ARENA.halfWidth+3;
  this.leaves.forEach((o,i)=>{o.position.set(((clock*(.4+i%3*.2)+i*2.73)%(2*leafWidth))-leafWidth, .8+((i*.61-clock*.15)%6+6)%6,-3-i%7);o.rotation.set(clock+i,clock*.7+i,clock*.4);});
  const ritual=this.monsterViews.bellView.ritual;this.setBellSceneTone(ritual.tone*.96);ritual.applyPresentation(this.renderer.domElement,this.backdrop.element);
  this.renderer.render(this.scene,this.camera);
  this.stageDiagnostics={id:this.backdrop.active?.id||'courtyard',name:this.backdrop.name,source:this.backdrop.active?.src||null,length:Combat.ARENA.halfWidth*2,cameraX:this.camX,locked:!!game.encounter?.active,halfWidth:this.camera.right,halfHeight:this.camera.top,floorY:this.floorY,pan:this.backdrop.pan,feet:fs.map(f=>{const p=new T.Vector3(f.x,0,f.z||0).project(this.camera);return {x:(p.x+1)/2,y:(1-p.y)/2};})};
 }
}
window.ArenaView=ArenaView;
})();
