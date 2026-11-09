(function(){
'use strict';
const T=THREE;
const unitSprite=new T.PlaneGeometry(1,1).translate(0,.5,0);
const unitPlane=new T.PlaneGeometry(1,1);
const barBack=new T.MeshBasicMaterial({color:0x241e32,transparent:true,depthTest:false,depthWrite:false});
const barFill=new T.MeshBasicMaterial({color:0xff927e,transparent:true,depthTest:false,depthWrite:false});
const eliteFill=new T.MeshBasicMaterial({color:0xffc44f,transparent:true,depthTest:false,depthWrite:false});
const warningColors={claw:0xff9973,mist:0xcd86ff,charge:0xffbe54};

function makeBossWarning(scene){
 const positions=new T.BufferAttribute(new Float32Array(12),3);
 const area=new T.BufferGeometry(),border=new T.BufferGeometry();
 area.setAttribute('position',positions);area.setIndex([0,1,2,0,2,3]);
 border.setAttribute('position',positions);
 const fill=new T.Mesh(area,new T.MeshBasicMaterial({transparent:true,depthWrite:false,side:T.DoubleSide}));
 const line=new T.LineLoop(border,new T.LineBasicMaterial({transparent:true,depthWrite:false}));
 fill.frustumCulled=line.frustumCulled=false;
 fill.renderOrder=1;line.renderOrder=2;
 const group=new T.Group();group.add(fill,line);group.visible=false;scene.add(group);
 return {group,fill,line,positions};
}

function updateBossWarning(warning,monster,move,bounds){
 warning.group.visible=!!move&&monster.t<move.windup;
 if(!warning.group.visible)return;
 const {x,z,face}=monster,edge=face>0?bounds.right:bounds.left;
 const scale=ArenaConfig.bodyScale(monster),near=move.near*scale,reach=move.reach*scale;
 const far=Math.min(reach+(move.speed||0)*move.active,Math.max(0,(edge-x)*face));
 const start=x+face*Math.min(near,far),end=x+face*far;
 const innerLane=(move.innerLane??move.lane)*scale,progress=monster.t/move.windup;
 const spread=Math.max(0,Math.min(1,(far-near)/(reach-near)));
 const outerLane=innerLane+(move.lane*scale-innerLane)*spread;
 const pos=warning.positions;
 pos.setXYZ(0,start,.044,z-innerLane);pos.setXYZ(1,end,.044,z-outerLane);
 pos.setXYZ(2,end,.044,z+outerLane);pos.setXYZ(3,start,.044,z+innerLane);pos.needsUpdate=true;
 const color=warningColors[monster.bossMove];
 warning.fill.material.color.setHex(color);warning.line.material.color.setHex(color);
 warning.fill.material.opacity=.14+.18*progress;warning.line.material.opacity=.78+.2*progress;
}

class MonsterViews{
 constructor(scene){
  this.scene=scene;this.textures=new Map();this.views=new Map();
  this.morrisView=new MorrisView(scene,this.textures);
  this.thunderBeastView=new ThunderBeastView(scene,this.textures);
  this.sakuraView=new SakuraRoninView(scene,this.textures);
  this.bellView=new BellMasterView(scene,this.textures);
 }
 async prepare(bossTypes=[]){
  const assets=[];
  for(const [type,profile] of Object.entries(Monsters.types)){
   if(type===SakuraRonin.type||type===BellMaster.type)continue;
   if(profile.frames){
    if(!bossTypes.includes(profile.elite?CapitalEnemies.bossType:type))continue;
    const offline=type===CapitalEnemies.bossType||profile.elite?window.CAPITAL_TEXTURES:
     type===ThunderBeast.type?window.THUNDER_BEAST_TEXTURES:type===Morris.bossType?window.MORRIS_TEXTURES:window.DOZE_CHIEF_TEXTURES;
    for(const [pose,frame] of Object.entries(profile.frames))
     assets.push([type+'/'+pose,frame.image,offline?.[frame.texture??pose]]);
   }else if(type===Morris.puppetType){
    if(bossTypes.includes(Morris.bossType))assets.push([type,profile.image,window.MORRIS_TEXTURES?.puppet]);
   }else assets.push([type,profile.image,MONSTER_TEXTURES[type]]);
  }
  if(bossTypes.includes(Morris.bossType))for(const name of ['echo','fist'])
   assets.push([Morris.bossType+'/'+name,'assets/monsters/morris/'+name+'.webp',window.MORRIS_TEXTURES?.[name]]);
  await Promise.all(assets.map(async ([key,image,offline])=>{
   if(this.textures.has(key))return;
   const texture=await new T.TextureLoader().loadAsync(location.protocol==='file:'&&offline?offline:image);
   texture.colorSpace=T.SRGBColorSpace;
   this.textures.set(key,texture);
  }));
  if(bossTypes.includes(ThunderBeast.type))await ThunderBeastMotion.View.prepare(this.textures);
  if(bossTypes.includes(SakuraRonin.type))await SakuraRoninMotion.prepare(this.textures);
  if(bossTypes.includes(BellMaster.type))await BellMasterMotion.prepare(this.textures);
 }
 create(monster){
  const type=monster.monsterType,profile=Monsters.types[type];
  const texture=this.textures.get(profile.frames?type+'/idle':type);
  if(!texture)return null;
  const root=new T.Group(),billboard=new T.Group(),bar=new T.Group();
  const sprite=new T.Mesh(unitSprite,new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false,side:T.DoubleSide}));
  const shadow=GroundIndicators.create(this.scene,profile.boss?'boss':profile.elite?'elite':'enemy');
  const background=new T.Mesh(unitPlane,barBack),fill=new T.Mesh(unitPlane,profile.elite?eliteFill:barFill);
  background.scale.set(1.12,.088,1);fill.position.z=.012;
  background.renderOrder=10;fill.renderOrder=11;
  bar.add(background,fill);billboard.add(sprite,bar);root.add(billboard);this.scene.add(root);
  const warning=type==='doze-chief'?makeBossWarning(this.scene):null;
  const motion=type===BellMaster.type?BellMasterMotion.create(sprite,this.textures):type===SakuraRonin.type?SakuraRoninMotion.create(sprite,this.textures):type===ThunderBeast.type&&this.textures.has('thunder-motion/walk')?new ThunderBeastMotion.View(sprite,this.textures):null;
  return {root,billboard,sprite,shadow,bar,fill,profile,warning,motion,width:profile.height*texture.image.width/texture.image.height};
 }
 poseFramed(view,monster,phase,bounce,breathe,opacity,bounds){
  const {sprite,profile}=view,move=monster.state==='attack'?profile.moves[monster.bossMove]:null;
  const winding=!!move&&monster.t<move.windup;
  const swinging=!!move&&!winding&&monster.t<move.windup+move.active+.12;
  const exposed=monster.bossMove==='finale'&&move&&monster.t>=move.windup+move.active;
  const aiming=profile.elite&&winding&&monster.bossMove==='burst';
  const pose=exposed?'down':(swinging||aiming)&&profile.frames[monster.bossMove]?monster.bossMove:'idle';
  const frame=profile.frames[pose],bodyHeight=profile.height*(frame.heightScale??1);
  const texture=this.textures.get(monster.monsterType+'/'+pose);
  const progress=winding?monster.t/move.windup:0;
  const squash=winding?(monster.bossMove==='charge'?.12:.06)*progress:0;
  const height=bodyHeight/frame.bodyHeight*(1-squash+(swinging?0:breathe*.65));
  const width=bodyHeight/frame.bodyHeight*texture.image.width/texture.image.height*(1+squash*.48);
  const signedWidth=monster.face*frame.face*width;
  const swingProgress=swinging?(monster.t-move.windup)/(move.active+.12):0;
  const lunge=pose==='claw'?monster.face*.2*Math.sin(Math.PI*swingProgress):0;
  sprite.material.map=texture;sprite.material.opacity=opacity*(monster.smokeCover>0?.83:1);
  sprite.material.color.setRGB(1,1-.15*progress,1-.25*progress);
  sprite.rotation.z=monster.face*(winding?-.055*progress:monster.state==='run'?.03*Math.sin(phase):0);
  if(monster.monsterType===ThunderBeast.type){
   const {bossCast:cast,t}=monster;
   sprite.material.color.setRGB(1-progress*.26,1-progress*.06,1);
   if(move&&cast.kind==='vine'&&monster.y>.06)sprite.rotation.z=monster.face*(t<move.windup?.42:t>=move.dive?-.44:.24);
   else if(monster.bossGlide)sprite.rotation.z=-monster.face*.1;
  }
  sprite.scale.set(signedWidth,height,1);
  const lift=monster.bossMove==='finale'&&move&&!exposed?.32*Math.min(1,monster.t*2):0;
  sprite.position.set((.5-frame.anchorX)*signedWidth+lunge,(frame.footY-1)*height+bounce+lift,.03);
  if(view.warning)updateBossWarning(view.warning,monster,move,bounds);
 }
 render(monsters,camera,time,bounds,targetId=null){
  const visible=new Set();
  for(const monster of monsters){
   const dead=monster.hp<=0;
   if(dead&&monster.t>=Monsters.fadeTime)continue;
   const view=this.views.get(monster.id)||this.create(monster);
   if(!view)continue;
   visible.add(monster.id);this.views.set(monster.id,view);
   const {root,billboard,sprite,shadow,bar,fill,profile,width}=view;
   const running=monster.state==='run',hurt=monster.state==='stun',attacking=monster.state==='attack';
   const phase=time*(running?14:4)+monster.id;
   const breathe=dead?0:Math.sin(phase)*.024;
   const bounce=running?Math.abs(Math.sin(phase))*.12:0;
   const flash=hurt&&monster.t<.21&&Math.cos(monster.t*68)>0;
   const opacity=dead?1-monster.t/Monsters.fadeTime:flash?.64:1;
   const scale=ArenaConfig.bodyScale(monster);
   sprite.renderOrder=ArenaConfig.actorDepthOrder(monster);
   root.position.set(monster.x,monster.y,monster.z);
   root.scale.setScalar(scale);
   billboard.quaternion.copy(camera.quaternion);
   if(view.motion)view.motion.update(monster,time,opacity);
   else if(profile.frames)this.poseFramed(view,monster,phase,bounce,breathe,opacity,bounds);
   else{
    const windup=attacking?Math.min(1,monster.t/profile.windup):0;
    const followThrough=attacking?Math.max(0,Math.min(1,(monster.t-profile.windup+.08)/Monsters.recovery)):0;
    const lunge=Math.sin(Math.PI*followThrough);
    sprite.position.set(monster.face*((.5-(profile.anchorX??.5))*width+.32*lunge+(flash?.045*Math.sin(monster.t*95):0)),bounce,.03);
    sprite.rotation.z=monster.face*(running?.045*Math.sin(phase):attacking?.11*windup-.27*lunge:0);
    sprite.scale.set(monster.face*width*(1-breathe*.6),profile.height*(1+breathe),1);
    sprite.material.color.setRGB(1,attacking?1-.24*windup:1,attacking?1-.33*windup:1);
    sprite.material.opacity=opacity;
   }
   bar.visible=!dead&&!profile.boss;
   bar.position.set(0,profile.height+.24/scale+bounce,.09);
   bar.scale.setScalar(1/scale);
   const fraction=monster.hp/monster.maxHP;
   fill.scale.set(1.05*fraction,.043,1);fill.position.x=(fraction-1)*.525;
   GroundIndicators.update(shadow,monster,scale,dead?opacity:1,monster.id===targetId&&!dead);
  }
  for(const [id,view] of this.views){
   if(visible.has(id))continue;
   this.scene.remove(view.root);GroundIndicators.dispose(view.shadow);
   if(view.warning){
    this.scene.remove(view.warning.group);
    for(const mesh of [view.warning.fill,view.warning.line]){mesh.geometry.dispose();mesh.material.dispose();}
   }
   view.motion?.dispose();view.sprite.material.dispose();this.views.delete(id);
  }
  this.morrisView.render(monsters,camera);
  this.thunderBeastView.render(monsters,camera,this.views,time);
  this.sakuraView.render(monsters,camera,time,bounds);
  this.bellView.render(monsters,camera,time,bounds);
 }
}
window.MonsterViews=MonsterViews;
})();
