(function(root){
'use strict';
const order=['original','outfit-8','outfit-9','outfit-1','outfit-4','president'];
const layout=[
 [29.7,90.0,14.8],[40.7,89.4,21.4],[52.6,87.0,21.7],
 [66.2,84.2,23.2],[78.5,79.5,26.9],[90.5,74.4,25.6]
];
class Model{
 constructor(ids,unlocked,selected){this.ids=ids;this.unlocked=new Set(unlocked);this.selected=this.unlocked.has(selected)?selected:ids.find(id=>this.unlocked.has(id));this.hovered=null;this.pending=null;}
 state(id){return {locked:!this.unlocked.has(id),hovered:this.hovered===id,selected:this.selected===id,pending:this.pending===id};}
 begin(id){if(this.pending||!this.unlocked.has(id)||!this.ids.includes(id))return false;this.pending=id;return true;}
 commit(id){if(this.pending!==id)return false;this.selected=id;this.pending=null;return true;}
 cancel(){this.pending=null;}
}
class Item{
 constructor(skin,index,container,activate,hover){
  this.skin=skin;this.art=MENU_CHARACTER_ART[skin.id];
  const [x,y,h]=layout[index],ratio=this.art.width/this.art.height;
  const button=document.createElement('button');button.type='button';button.className='menu-character';
  button.dataset.character=skin.id;button.setAttribute('aria-label',skin.name);button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','characterShowcase');
  button.style.setProperty('--foot-x',x+'%');button.style.setProperty('--foot-y',y+'%');
  button.style.setProperty('--character-h',h);button.style.setProperty('--character-ratio',ratio);
  button.style.setProperty('--foot-anchor',this.art.anchor);button.style.setProperty('--index',index);
  const motion=document.createElement('span');motion.className='character-motion';
  const image=new Image();image.src=this.art.path;image.alt='';image.draggable=false;image.className='character-art';
  // Frame the native transparent canvas without changing its aspect ratio.
  if(this.art.frame){
   const [left,top,width,height]=this.art.frame;
   image.style.position='absolute';image.style.left=(-left/width*100)+'%';image.style.top=(-top/height*100)+'%';
   image.style.width=(this.art.sourceWidth/width*100)+'%';image.style.height=(this.art.sourceHeight/height*100)+'%';
  }
  motion.append(image);button.append(motion);
  const caption=document.createElement('span');caption.className='character-caption';
  const enter=document.createElement('b');enter.textContent='登场';
  const name=document.createElement('span');name.textContent=skin.name;caption.append(enter,name);button.append(caption);
  const lock=new Image();lock.src='assets/menu-hub/icons/lock-key.svg';lock.className='character-lock';lock.alt='未解锁';button.append(lock);
  button.onclick=()=>activate(skin.id);
  button.addEventListener('pointerenter',()=>hover(skin.id));button.addEventListener('pointerleave',()=>hover(null));
  button.addEventListener('focus',()=>hover(skin.id));button.addEventListener('blur',()=>hover(null));
  container.append(button);this.button=button;this.image=image;this.motion=motion;
 }
 update(state,busy){
  const b=this.button;b.dataset.state=state.locked?'Locked':state.selected?'Selected':state.hovered?'Hovered':'Idle';
  b.classList.toggle('is-hovered',state.hovered);b.classList.toggle('is-selected',state.selected);b.classList.toggle('is-pending',state.pending);
  b.setAttribute('aria-pressed',String(state.selected));b.setAttribute('aria-disabled',String(busy));
  b.setAttribute('aria-label',this.skin.name+(state.locked?'，尚未解锁，可查看详情':state.selected?'，当前登场，查看详情':'，查看详情'));
  b.tabIndex=state.selected?0:-1;
 }
 foot(){const r=this.button.getBoundingClientRect();return {x:r.left+r.width*this.art.anchor,y:r.bottom};}
}
class Selection{
 constructor(container,options){
  this.container=container;this.options=options;this.busy=false;this.ready=false;this.items=new Map();
  this.model=new Model(order,options.unlocked(),options.selected());
  for(const [index,id] of order.entries()){
   const skin=FighterSkins.find(id);this.items.set(id,new Item(skin,index,container,id=>this.preview(id),id=>{this.model.hovered=id;this.refresh();}));
  }
  container.addEventListener('keydown',e=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();
   if(this.busy||!this.ready)return;
   const ids=order,index=ids.indexOf(document.activeElement?.dataset.character);
   const next=e.key==='Home'?ids[0]:e.key==='End'?ids.at(-1):ids[(index+(e.key==='ArrowRight'?1:-1)+ids.length)%ids.length];
   if(next)this.items.get(next).button.focus();
  });
  this.refresh();
 }
 setReady(ready){this.ready=ready;this.refresh();}
 sync(id){this.model.unlocked=new Set(this.options.unlocked());if(this.model.unlocked.has(id))this.model.selected=id;this.refresh();}
 refresh(){for(const [id,item] of this.items)item.update(this.model.state(id),this.busy||!this.ready);this.options.changed?.(this.items.get(this.model.selected),this.model);}
 preview(id){if(this.busy||!this.ready)return;this.options.preview?.(id,this.items.get(id).button);}
 async choose(id){
  if(!this.model.unlocked.has(id)){this.options.notice('这个角色尚未解锁');return false;}
  if(this.busy||!this.ready||id===this.model.selected)return false;
  if(!this.model.begin(id))return false;this.busy=true;this.refresh();
  try{
   const ok=await this.options.select(id);
   if(ok){this.model.commit(id);this.options.notice(FighterSkins.find(id).name+' · 已准备登场');}
   else this.model.cancel();
   return !!ok;
  }catch{this.model.cancel();this.options.notice('形象未能加载，已保留原角色，请重试。');return false;}
  finally{this.busy=false;this.refresh();}
 }
}
const api={order,layout,Model,Item,Selection};
if(typeof module!=='undefined')module.exports=api;else root.MenuCharacters=api;
})(typeof window!=='undefined'?window:globalThis);
