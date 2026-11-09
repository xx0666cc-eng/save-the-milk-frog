/* Loot sprites and unit-anchored numbers. Visuals never change combat or rewards. */
(function(){
'use strict';
const T=THREE;
const numberStyle=Object.freeze({received:'#ff6b6b',dealt:'#64baff',healed:'#79efa7',life:.95,heightPixels:60,rise:.65});
const numeric=amount=>String(Number(amount.toFixed(amount<.01?4:2)));
class GrowthView{
 constructor(scene){
  this.scene=scene;this.drops=new Map();this.popups=[];this.run=null;this.lastTime=null;this.itemMaterials=new Map();
  this.texture=new T.Texture();this.texture.colorSpace=T.SRGBColorSpace;
  const image=new Image();image.onload=()=>{const c=document.createElement('canvas');c.width=c.height=256;c.getContext('2d').drawImage(image,0,0,256,256);this.texture.image=c;this.texture.needsUpdate=true;};image.src=GROWTH_COIN_IMAGE;
  this.geometry=new T.PlaneGeometry(.78,.78);
  this.shadowGeometry=new T.CircleGeometry(.35,24).rotateX(-Math.PI/2);
  this.shadowMaterial=new T.MeshBasicMaterial({color:0x281e18,transparent:true,opacity:.20,depthWrite:false});
  this.material=new T.MeshBasicMaterial({map:this.texture,transparent:true,depthTest:false,depthWrite:false,side:T.DoubleSide,toneMapped:false});
 }
 itemMaterial(drop){
  if(this.itemMaterials.has(drop.itemId))return this.itemMaterials.get(drop.itemId);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const c=canvas.getContext('2d');c.fillStyle='#30413e';c.strokeStyle='#dbc393';c.lineWidth=5;c.beginPath();c.roundRect(14,14,100,100,16);c.fill();c.stroke();
  c.fillStyle='#f2dfb3';c.font='bold 30px "Microsoft YaHei",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(drop.definition.name.slice(0,2),64,64);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const uri=window.GROWTH_ITEM_IMAGES?.[drop.itemId];
  if(uri){const image=new Image();image.onload=()=>{c.clearRect(0,0,128,128);c.drawImage(image,0,0,128,128);texture.needsUpdate=true;};image.src=uri;}
  const material=new T.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,side:T.DoubleSide,toneMapped:false});
  this.itemMaterials.set(drop.itemId,material);return material;
 }
 disposePopup(p){p.o.removeFromParent();p.o.material.map.dispose();p.o.material.dispose();}
 clear(){for(const g of this.drops.values())g.removeFromParent();this.drops.clear();for(const p of this.popups)this.disposePopup(p);this.popups=[];this.lastTime=null;}
 popup(text,event,{kind='label',color='#ffe49a',targetId=event.id??0,amount=0}={}){
  const number=kind!=='label',canvas=document.createElement('canvas');canvas.width=number?256:512;canvas.height=number?128:96;
  const x=canvas.width/2,y=canvas.height/2,c=canvas.getContext('2d');
  c.font=number?'900 60px "Arial Black","Microsoft YaHei",sans-serif':'bold 38px "Microsoft YaHei",sans-serif';
  c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=number?8:7;c.strokeStyle='#25303b';
  c.strokeText(text,x,y,canvas.width-22);c.fillStyle=color;c.fillText(text,x,y,canvas.width-22);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;
  const o=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
  o.renderOrder=number?18:17;o.userData.feedback={text,kind,color,targetId,amount};this.scene.add(o);
  const slot=this.popups.filter(p=>p.targetId===targetId&&p.number===number&&p.age<p.life-.12).length%4;
  this.popups.push({o,age:0,number,targetId,slot,base:{x:event.x||0,y:event.unitY??(event.type==='hit'||event.type==='block'?0:event.y||0),z:event.z||0},life:number?numberStyle.life:1.15});
 }
 effect(event){
  if(event.type==='hit'||event.type==='block'){
   const amount=event.effectiveDamage??event.damage;
   if(amount>0)this.popup(numeric(amount),event,{kind:event.id===0?'received':'dealt',color:event.id===0?numberStyle.received:numberStyle.dealt,amount});
   return;
  }
  if(['heal','recover','experienceLevel'].includes(event.type)&&event.healed>0)
   this.popup('+'+numeric(event.healed),event,{kind:'healed',color:numberStyle.healed,amount:event.healed});
  if(event.type==='experienceLevel')this.popup('升级！',event,{color:'#b6f4d2'});
  if(event.type==='lootCollected')this.popup('+'+(event.kind==='coins'?event.amount+' 奶币':event.quantity+' '+event.name),event,{targetId:0});
 }
 render(game,camera,dt){
  if(this.run!==game.progression||!game.fighters.length){this.clear();this.run=game.progression;}
  const elapsed=this.lastTime===null?0:Math.max(0,Math.min(.1,game.time-this.lastTime));this.lastTime=game.time;
  const visible=new Set();
  for(const d of game.fighters.length?game.progression?.drops||[]:[]){
   if(d.collected)continue;visible.add(d.id);
   let g=this.drops.get(d.id);
   if(!g){
    g=new T.Group();g.name='LootGroup';g.userData.dropId=d.id;
    g.userData.coins=[];
    for(let i=0;i<d.icons;i++){const o=new T.Mesh(this.geometry,d.kind==='item'?this.itemMaterial(d):this.material);o.userData.index=i;o.renderOrder=-5+i*.0001;g.add(o);g.userData.coins.push(o);}
    const shadow=new T.Mesh(this.shadowGeometry,this.shadowMaterial);shadow.position.y=.03;shadow.scale.set(1+d.icons*.15,1,.55);shadow.renderOrder=-9;g.add(shadow);
    this.scene.add(g);this.drops.set(d.id,g);
   }
   g.position.set(d.x,0,d.z);
   g.userData.coins.forEach((o,i)=>{
    const spread=d.icons===1?0:(i-(d.icons-1)/2)*.20;
    o.position.set(spread,.40+Math.sin(d.age*3+i*.5)*.055+(i%2)*.08,0);
    o.quaternion.copy(camera.quaternion);o.rotateZ(Math.sin(d.age*1.7+i*.2)*.045);
    o.scale.set(1+Math.sin(d.age*2)*.06,1,1);
   });
  }
  for(const [id,g] of this.drops)if(!visible.has(id)){g.removeFromParent();this.drops.delete(id);}
  const units=new Map([...game.fighters,...game.monsters].map(unit=>[unit.id,unit]));
  const pixel=(camera.top-camera.bottom)/Math.max(1,innerHeight);
  for(let i=this.popups.length-1;i>=0;i--){
   const p=this.popups[i],unit=units.get(p.targetId);p.age+=elapsed;
   if(p.age>=p.life){this.disposePopup(p);this.popups.splice(i,1);continue;}
   if(unit){p.base={x:unit.x,y:unit.y,z:unit.z||0};p.bodyHeight=(Monsters.types[unit.monsterType]?.height??3)*ArenaConfig.bodyScale(unit);}
   const height=p.bodyHeight??2.6,offset=[0,18,-18,30][p.slot]*pixel;
   p.o.position.set(p.base.x+offset,p.base.y+(p.number?height*.9+.08:height+.65)+p.age*numberStyle.rise+p.slot*(p.number?32*pixel:.18),p.base.z);
   const pop=p.number?1+.12*Math.sin(Math.min(1,p.age/.14)*Math.PI):1;
   if(p.number){const h=numberStyle.heightPixels*pixel*pop;p.o.scale.set(h*2,h,1);}else p.o.scale.set(3.6,.675,1);
   p.o.material.opacity=Math.min(1,Math.max(0,(p.life-p.age)/.24));
  }
 }
}
window.GrowthView=GrowthView;
GrowthView.numberStyle=numberStyle;
})();
