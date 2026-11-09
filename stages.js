/* Supplied artwork anchors the center of each scrolling arena. */
(function(){
'use strict';
const astralArt={
 src:'assets/stages/astral.png',extensionSrc:'assets/stages/astral-extensions.png',floor:.72,
 wings:[{rear:.745,trim:.18},{rear:.735,trim:.08}],sky:0xe6dcff,sun:0xffdfbd
};
const definitions={
 'campaign-1':{id:'frog-village',name:'球场平原',label:'FROG VILLAGE',src:'assets/stages/frog-village.jpg',floor:.76},
 'campaign-2':{id:'forest-hunt',name:'林间猎场',label:'FOREST HUNT',src:'assets/stages/forest-hunt-hd.webp',fallbackSrc:'assets/stages/forest-hunt.jpg',floor:.875,screenFloor:.78,sky:0xffeed2,sun:0xffdfad},
 'campaign-3':{...astralArt,id:'astral-tower',name:'星月塔',label:'ASTRAL TOWER'},
 'campaign-4':{id:'sakura',name:'金纹樱庭',label:'SAKURA COURT',src:'assets/stages/sakura.png',floor:.78,wings:[{rear:.775,trim:.14},{rear:.73,trim:.05}],sky:0xe9e2ff,sun:0xffdbbd},
 'campaign-5':{id:'capital-plaza',name:'晨曦广场',label:'DAWN PLAZA',src:'assets/stages/capital-plaza.jpg',floor:.755,screenFloor:.79,sky:0xffe3e8,sun:0xffdcaf},
 'campaign-6':{id:'silent-requiem',name:'万籁归寂',label:'SILENT REQUIEM',src:'assets/stages/silent-requiem.png',floor:.707,screenFloor:.79,groundBand:{rear:.682,front:.732,padding:.018,src:'assets/stages/silent-requiem-ground.png',repeat:4,fade:.08,brightness:.90,saturation:.75},sky:0xc5c0e8,sun:0xe4dfff},
 'outfit-1':{...astralArt,id:'astral',name:'星月秘庭',label:'ASTRAL COURT'},
 'outfit-2':{id:'basketball',name:'荣耀球馆',label:'CHAMPION ARENA',src:'assets/stages/basketball.png',floor:.78,wings:[{rear:.755,trim:.13},{rear:.75,trim:.13}],sky:0xe5e8ff,sun:0xffeed4},
 'outfit-3':{id:'detective',name:'雾都探案馆',label:'MISTY LONDON',src:'assets/stages/detective.png',floor:.79,wings:[{rear:.69,trim:.20},{rear:.65,trim:.16}],sky:0xffe6cd,sun:0xffd9aa},
 'outfit-4':{id:'sakura',name:'金纹樱庭',label:'SAKURA COURT',src:'assets/stages/sakura.png',floor:.78,wings:[{rear:.775,trim:.14},{rear:.73,trim:.05}],sky:0xe9e2ff,sun:0xffdbbd},
 'outfit-8':{id:'moon',name:'月华仙境',label:'MOONLIT SANCTUARY',src:'assets/stages/moon.png',floor:.66,wings:[{rear:.595,trim:.03},{rear:.56,trim:.03}],sky:0xe6e2ff,sun:0xffe3ce}
};
class ArenaBackdrop{
 constructor(container){
  this.element=document.createElement('div');this.element.className='stage-backdrop';this.element.hidden=true;this.element.setAttribute('aria-hidden','true');container.prepend(this.element);
  this.track=document.createElement('div');this.track.className='stage-panorama';this.element.appendChild(this.track);
  this.wings=['left','right'].map(side=>{
   const wing=document.createElement('div');wing.className=`stage-wing stage-wing-${side}`;
   wing.append(document.createElement('div'),document.createElement('div'));return wing;
  });
  this.cache=new Map();this.active=null;this.pan=0;
 }
 loadImage(src){
  return new Promise((resolve,reject)=>{
   const image=new Image();image.alt='';image.decoding='async';
   const timer=setTimeout(()=>reject(new Error('场景图片加载超时，请重试')),12000);
   image.onload=async()=>{try{await image.decode();resolve(image);}catch{reject(new Error('场景图片无法读取'));}finally{clearTimeout(timer);}};
   image.onerror=()=>{clearTimeout(timer);reject(new Error('场景图片加载失败'));};image.src=src;
  });
 }
 async prepare(skinId){
  const definition=definitions[skinId];if(!definition)return null;
  if(!this.cache.has(skinId)){
   const art=this.loadImage(definition.src);
   const pending=Promise.all([
    definition.fallbackSrc?art.catch(()=>this.loadImage(definition.fallbackSrc)):art,
    definition.wings?this.loadImage(definition.extensionSrc??`assets/stages/${definition.id}-extensions.png`).catch(()=>null):null,
    definition.groundBand?.src?this.loadImage(definition.groundBand.src):null
   ]).then(([image,atlas,groundImage])=>{
    image.className='stage-illustration';return {...definition,src:image.getAttribute('src'),image,atlas,groundImage};
   }).catch(error=>{this.cache.delete(skinId);throw error;});
   this.cache.set(skinId,pending);
  }
  return this.cache.get(skinId);
 }
 apply(stage){
  this.active=stage;this.element.hidden=!stage;this.layout=null;this.pan=0;this.groundSlices=null;this.groundLayout=null;this.groundTiles=null;
  if(!stage){this.track.replaceChildren();return;}
  this.track.classList.toggle('has-wings',!!stage.atlas);
  if(stage.groundBand){
   // Use the original road pixels as the 2.5D ground plane; no replacement art.
   this.groundSlices=Array.from({length:3},(_,i)=>{
    const clip=document.createElement('div'),image=i?stage.image.cloneNode():stage.image;
    Object.assign(clip.style,{position:'absolute',overflow:'hidden'});clip.append(image);return clip;
   });
   if(stage.groundImage){
    const band=stage.groundBand,overlay=document.createElement('div');
    Object.assign(overlay.style,{position:'absolute',inset:'0',maskImage:`linear-gradient(to bottom,transparent,#000 ${band.fade*100}%,#000 ${(1-band.fade)*100}%,transparent)`,filter:`brightness(${band.brightness}) saturate(${band.saturation})`});
    this.groundTiles=Array.from({length:band.repeat},()=>{const image=stage.groundImage.cloneNode();image.className='stage-illustration';overlay.append(image);return image;});
    this.groundSlices[1].append(overlay);
   }
   this.track.replaceChildren(...this.groundSlices);
  }else if(stage.atlas){
   for(const wing of this.wings)for(const slice of wing.children)slice.style.backgroundImage=`url("${stage.atlas.src}")`;
   this.track.replaceChildren(...this.wings,stage.image);
  }else this.track.replaceChildren(stage.image);
 }
 get name(){return this.active?.name||'风起之庭';}
 get label(){return this.active?.label||'THE COURTYARD';}
 update(cameraX,width,height,halfH,mapEdge,depthRise){
  const stage=this.active;if(!stage)return .61;
  const pixelsPerUnit=height/(2*halfH);
  const floorY=stage.screenFloor??(1.04-1.08*(1-stage.floor));
  if(this.layout?.width!==width||this.layout.height!==height||this.layout.halfH!==halfH){
   this.layout={width,height,halfH};
   const mapWidth=Math.max(width+pixelsPerUnit*2,(mapEdge+1)*2*pixelsPerUnit);
   const aspect=stage.image.naturalWidth/stage.image.naturalHeight;
   // A stage can pin its painted path to a different screen line without stretching the image.
   const floorCover=stage.screenFloor===undefined?0:height*(1.04-floorY)/(1-stage.floor);
   const artHeight=stage.atlas?height*1.08:Math.max(height*1.08,mapWidth/aspect,floorCover);
   const artWidth=artHeight*aspect,artTop=floorY*height-artHeight*stage.floor;
   Object.assign(stage.image.style,{left:`${-artWidth/2}px`,top:`${artTop}px`,width:`${artWidth}px`,height:`${artHeight}px`});
   if(stage.groundBand){
    const {rear,front,padding}=stage.groundBand;
    const depth=depthRise*pixelsPerUnit+height*padding,far=floorY*height-depth,near=floorY*height+depth;
    const slices=[{start:0,end:rear,top:far-artHeight*rear,height:artHeight*rear},
     {start:rear,end:front,top:far,height:near-far},
     {start:front,end:1,top:near,height:artHeight*(1-front)}];
    this.groundLayout={left:-artWidth/2,width:artWidth,far,near,slices};
    this.groundSlices.forEach((clip,i)=>{
     const s=slices[i],imageHeight=s.height/(s.end-s.start);
     Object.assign(clip.style,{left:`${-artWidth/2}px`,top:`${s.top}px`,width:`${artWidth}px`,height:`${s.height+.5}px`});
     Object.assign(clip.firstChild.style,{left:'0px',top:`${-s.start*imageHeight}px`,width:`${artWidth}px`,height:`${imageHeight}px`});
    });
    if(this.groundTiles)this.groundTiles.forEach((image,i)=>Object.assign(image.style,{left:`${i*artWidth/this.groundTiles.length}px`,top:'0px',width:`${artWidth/this.groundTiles.length+.5}px`,height:`${near-far}px`,transform:i%2?'scaleX(-1)':'none'}));
   }
   if(stage.atlas){
    const seam=1.9*pixelsPerUnit;
    const wingWidth=Math.max(0,(mapWidth-artWidth)/2)+seam+1;
    const atlasWidth=Math.max(wingWidth,artHeight*2*stage.atlas.naturalWidth/stage.atlas.naturalHeight);
    this.track.style.setProperty('--stage-seam',`${seam}px`);
    this.wings.forEach((wing,i)=>{
     const {rear,trim}=stage.wings[i];
     Object.assign(wing.style,{
      left:`${i===0?-artWidth/2-wingWidth+seam+1:artWidth/2-seam-1}px`,top:`${artTop}px`,
      width:`${wingWidth}px`,height:`${artHeight}px`
     });
     // Align the back of the painted floor with the farthest walkable lane.
     const rearLine=Math.min(artHeight*rear,floorY*height-artTop-depthRise*pixelsPerUnit-height*.022);
     const inset=Math.min(atlasWidth-wingWidth,atlasWidth*trim);
     const atlasX=i===0?wingWidth-atlasWidth+inset:-inset;
     const setSlice=(slice,top,sliceHeight,start,end)=>{
      const panelHeight=sliceHeight/(end-start);
      Object.assign(slice.style,{
       top:`${top}px`,height:`${sliceHeight}px`,backgroundSize:`${atlasWidth}px ${panelHeight*2}px`,
       backgroundPosition:`${atlasX}px ${-(i+start)*panelHeight}px`
      });
     };
     setSlice(wing.children[0],0,rearLine,0,rear);
     setSlice(wing.children[1],rearLine,artHeight-rearLine,rear,1);
    });
   }
  }
  // Move one world unit of artwork for one world unit of camera travel.
  this.pan=-cameraX*pixelsPerUnit;
  this.track.style.transform=`translate3d(${this.pan}px,0,0)`;
  return floorY;
 }
}
window.ArenaBackdrop=ArenaBackdrop;
window.ARENA_STAGES=definitions;
})();
