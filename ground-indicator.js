/* Visual footprints only: world x/z are the feet, independent of sprite pose and y. */
(function(){
'use strict';
const T=THREE;
const styles=Object.freeze({
 player:{width:1.8,depth:1.25,color:0x7dd5c0,outline:.80,shadow:.34,halo:.24},
 enemy:{width:1.55,depth:1.05,color:0xe08f7c,outline:.70,shadow:.32,halo:.19},
 elite:{width:1.9,depth:1.3,color:0xe0be77,outline:.80,shadow:.34,halo:.23},
 boss:{width:2.5,depth:1.65,color:0xc6a6da,outline:.80,shadow:.36,halo:.24}
});
// Artwork footprints, deliberately separate from collision and attack dimensions.
const footprints=Object.freeze({
 dozer:[1.95,1.2],bucket:[1.45,1.05],puff:[1.8,1.1],
 'morris-puppet':[1.15,.9],'doze-chief':[2.6,1.65],
 morris:[1.7,1.3],'thunder-beast':[3.9,1.4],'obama-frog':[2.35,1.55],
 'bell-master':[3.3,1.8]
});
const floorY=.028,shadowOrder=-12,outlineOrder=-11;
const targetStyle=Object.freeze({color:0xffe4a3,outline:.95,scale:1.08});
const plane=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2);
const points=Array.from({length:80},(_,i)=>{
 const angle=i/80*Math.PI*2;return new T.Vector3(Math.cos(angle)*.5,0,Math.sin(angle)*.5);
});
const ellipse=new T.BufferGeometry().setFromPoints(points);
let shadowTexture,haloTexture;
function texture(){
 if(shadowTexture)return shadowTexture;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,0,64,64,64);
 gradient.addColorStop(0,'rgba(255,255,255,.90)');
 gradient.addColorStop(.38,'rgba(255,255,255,.66)');
 gradient.addColorStop(.76,'rgba(255,255,255,.18)');
 gradient.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 shadowTexture=new T.CanvasTexture(canvas);shadowTexture.colorSpace=T.SRGBColorSpace;
 shadowTexture.minFilter=shadowTexture.magFilter=T.LinearFilter;shadowTexture.generateMipmaps=false;
 return shadowTexture;
}
function haloMap(){
 if(haloTexture)return haloTexture;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,0,64,64,64);
 gradient.addColorStop(0,'rgba(255,255,255,.06)');
 gradient.addColorStop(.40,'rgba(255,255,255,.16)');
 gradient.addColorStop(.72,'rgba(255,255,255,.46)');
 gradient.addColorStop(.87,'rgba(255,255,255,.64)');
 gradient.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 haloTexture=new T.CanvasTexture(canvas);haloTexture.colorSpace=T.SRGBColorSpace;
 haloTexture.minFilter=haloTexture.magFilter=T.LinearFilter;haloTexture.generateMipmaps=false;
 return haloTexture;
}
function create(scene,role='enemy'){
 const style=styles[role]||styles.enemy,group=new T.Group();group.name='FootGroundIndicator';
 const shadow=new T.Mesh(plane,new T.MeshBasicMaterial({map:texture(),color:0x1c2026,
  transparent:true,opacity:style.shadow,depthTest:true,depthWrite:false,side:T.DoubleSide,toneMapped:false}));
 const outline=new T.LineLoop(ellipse,new T.LineBasicMaterial({color:style.color,
  transparent:true,opacity:style.outline,depthTest:true,depthWrite:false,toneMapped:false}));
 const halo=new T.Mesh(plane,new T.MeshBasicMaterial({map:haloMap(),color:style.color,
  transparent:true,opacity:style.halo,depthTest:true,depthWrite:false,side:T.DoubleSide,toneMapped:false}));
 shadow.name='SoftFootShadow';outline.name='FootOutline';halo.name='SoftGroundHalo';
 shadow.scale.set(.90,1,.82);outline.position.y=.002;halo.position.y=.001;
 // Draw before every character/VFX; never write depth that could mask a sprite.
 shadow.renderOrder=shadowOrder;halo.renderOrder=(shadowOrder+outlineOrder)/2;outline.renderOrder=outlineOrder;
 group.add(shadow,halo,outline);group.position.y=floorY;
 group.userData.groundIndicator={role,style,shadow,halo,outline};scene.add(group);
 return group;
}
function update(group,unit,scale=1,opacity=1,targeted=false){
 const {style,shadow,halo,outline}=group.userData.groundIndicator;
 const [width,depth]=footprints[unit.monsterType]||[style.width,style.depth];
 group.position.set(unit.x,floorY,unit.z||0);group.scale.set(width*scale,1,depth*scale);
 // Keep the footprint stable in the air and during invulnerability/hit flashes.
 const altitude=Math.max(0,unit.y||0),fade=Math.max(0,Math.min(1,opacity));
 shadow.material.opacity=style.shadow*fade/Math.min(1.5,1+altitude*.10);
 halo.material.color.setHex(targeted?targetStyle.color:style.color);
 halo.material.opacity=style.halo*fade*(targeted?1.35:1);
 outline.material.color.setHex(targeted?targetStyle.color:style.color);
 outline.material.opacity=(targeted?targetStyle.outline:style.outline)*fade;
 outline.scale.setScalar(targeted?targetStyle.scale:1);
}
function dispose(group){
 const {shadow,halo,outline}=group.userData.groundIndicator;
 group.removeFromParent();shadow.material.dispose();halo.material.dispose();outline.material.dispose();
 // Geometry and the tiny radial texture are shared by all current/future units.
}
window.GroundIndicators={styles,footprints,targetStyle,create,update,dispose};
})();
