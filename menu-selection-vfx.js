(function(){
'use strict';
const TAU=Math.PI*2;
class SelectionVFX{
 constructor(canvas,scene){
  this.canvas=canvas;this.scene=scene;this.context=canvas.getContext('2d');this.contours=new Map();this.lastPaint=-1;
  this.reduced=matchMedia('(prefers-reduced-motion: reduce)');this.selected=null;
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(scene);this.resize();
 }
 resize(){
  const r=this.scene.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);
  this.width=r.width;this.height=r.height;this.dpr=dpr;
  this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);
  this.context.setTransform(dpr,0,0,dpr,0,0);this.lastPaint=-1;
 }
 select(item){
  if(this.selected!==item)this.invalidate();this.selected=item;if(!item||this.contours.has(item.skin.id))return;
  const collect=()=>{
   if(!item.image.naturalWidth)return;
   const c=document.createElement('canvas'),ratio=item.image.naturalWidth/item.image.naturalHeight;
   c.height=180;c.width=Math.max(1,Math.round(c.height*ratio));
   const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(item.image,0,0,c.width,c.height);
   try{
    const rgba=ctx.getImageData(0,0,c.width,c.height).data,points=[];
    for(let y=2;y<c.height-2;y+=2)for(let x=2;x<c.width-2;x+=2){
     const a=(xx,yy)=>rgba[(yy*c.width+xx)*4+3];
     if(a(x,y)>150&&(a(x-2,y)<70||a(x+2,y)<70||a(x,y-2)<70||a(x,y+2)<70))points.push([x/c.width,y/c.height]);
    }
    points.sort((a,b)=>Math.atan2(a[1]-.5,a[0]-.5)-Math.atan2(b[1]-.5,b[0]-.5));
    this.contours.set(item.skin.id,points);
   }catch{this.contours.set(item.skin.id,[]);}
  };
  if(item.image.complete)collect();else item.image.addEventListener('load',collect,{once:true});
 }
 star(x,y,r,alpha,color='#fff0ac'){
  const c=this.context;c.globalAlpha=alpha;c.fillStyle=color;c.beginPath();
  c.moveTo(x-r,y);c.quadraticCurveTo(x,y,x,y-r*1.5);c.quadraticCurveTo(x,y,x+r,y);c.quadraticCurveTo(x,y,x,y+r*1.5);c.quadraticCurveTo(x,y,x-r,y);c.fill();
 }
 render(time){
  if(time-this.lastPaint<1/30&&!this.reduced.matches)return;
  if(this.reduced.matches&&this.lastPaint>=0)return;
  this.lastPaint=time;const c=this.context,w=this.width,h=this.height;
  c.clearRect(0,0,w,h);const base=this.scene.getBoundingClientRect(),mobile=w/h<1.35;
  // A small fixed particle budget; these are live VFX, not scene or character artwork.
  for(let i=0;i<20;i++){
   const t=this.reduced.matches?i*.3:time*.13+i*.719,x=((i*.137+t*.034)%1)*w,y=(.23+((i*.19-t*.13)%1+1)%1*.64)*h;
   this.star(x,y,(i%3+1)*.7,.15+Math.sin(t*3+i)**2*.4,i%4===0?'#e9b6ff':'#fff1ba');
  }
  const item=this.selected;if(!item)return;
  const anchor=item.foot(),x=anchor.x-base.left,y=anchor.y-base.top;
  const r=item.button.getBoundingClientRect(),radius=Math.max(23,Math.min(r.width*.53,r.height*.29)),ry=radius*.18;
  const t=this.reduced.matches?0:time,pulse=.72+Math.sin(t*2.1)*.15;
  c.globalAlpha=pulse;c.strokeStyle='#ffe18c';c.lineWidth=1.4;c.shadowColor='#ffc140';c.shadowBlur=10;
  c.beginPath();c.ellipse(x,y+2,radius,ry,0,0,TAU);c.stroke();
  c.lineWidth=.7;c.globalAlpha=.65;c.beginPath();c.ellipse(x,y+2,radius*.84,ry*.66,0,0,TAU);c.stroke();
  for(let j=0;j<3;j++){
   const a=t*.60+j*TAU/3;c.globalAlpha=.92;c.beginPath();c.ellipse(x,y+2,radius,ry,0,a,a+.48);c.stroke();
   this.star(x+Math.cos(a)*radius,y+2+Math.sin(a)*ry,2,.9);
  }
  c.shadowBlur=0;
  const img=item.image.getBoundingClientRect(),contour=this.contours.get(item.skin.id)||[];
  if(contour.length)for(let j=0;j<11;j++){
   const k=Math.floor(((t*.065+j/11)%1)*contour.length),p=contour[k];
   if(p)this.star(img.left-base.left+p[0]*img.width,img.top-base.top+p[1]*img.height,1.1+(j%3)*.4,.4+Math.sin(t*2.6+j)**2*.5);
  }
  c.globalAlpha=1;
 }
 invalidate(){this.lastPaint=-1;}
}
window.MenuSelectionVFX=SelectionVFX;
})();
