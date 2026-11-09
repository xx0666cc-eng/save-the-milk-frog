/* Chapter cards read live campaign/save data; only app.js starts a run. */
(function(root){
'use strict';
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
class Panel{
 constructor(options){
  this.options=options;this.session=0;this.loading=false;this.animation=null;
  this.dialog=node('dialog','character-showcase chapter-select');this.dialog.id='chapterSelect';
  this.dialog.setAttribute('aria-labelledby','chapterSelectTitle');this.dialog.setAttribute('aria-describedby','chapterSelectDescription');
  this.dialog.innerHTML='<header class="showcase-header chapter-header"><div><h2 id="chapterSelectTitle">选择章节</h2><p id="chapterSelectDescription">重返熟悉的旅途，或继续向前。</p></div><button class="chapter-close" type="button" aria-label="关闭章节选择"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><div class="chapter-scroll"><div class="chapter-grid" role="group" aria-label="主线章节"></div></div><footer class="showcase-footer chapter-footer"><div><p>已通关章节可从起点重玩，进行中的章节从最近检查点继续。</p><p id="chapterSelectStatus" role="status" aria-live="polite"></p></div><button class="showcase-confirm" type="button">返回主界面</button></footer>';
  this.grid=this.dialog.querySelector('.chapter-grid');this.status=this.dialog.querySelector('#chapterSelectStatus');
  this.dialog.querySelector('.chapter-close').onclick=this.dialog.querySelector('.showcase-confirm').onclick=()=>this.close();
  this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});
  this.dialog.addEventListener('click',e=>{if(e.target===this.dialog){const r=this.dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)this.close();}});
  document.body.append(this.dialog);
 }
 isOpen(){return this.dialog.open;}
 render(){
  this.grid.replaceChildren();
  for(const entry of this.options.entries()){
   const card=node('button','chapter-card');card.type='button';card.dataset.level=entry.level;
   card.classList.toggle('is-current',entry.current);card.classList.toggle('is-locked',!entry.available);
   card.disabled=!entry.available||entry.blocked||this.loading;
   const art=node('span','chapter-art'),img=node('img');img.src=entry.image;img.alt='';img.decoding='async';art.append(img);
   img.onerror=()=>{if(entry.fallback&&img.getAttribute('src')!==entry.fallback)img.src=entry.fallback;else{img.hidden=true;art.classList.add('image-missing');}};
   const stamp=node('span','chapter-state',entry.cleared?'已通关':entry.available?'已解锁':'未解锁');art.append(stamp);
   const info=node('span','chapter-info'),number=node('span','chapter-number','第 '+entry.level+' 关'),name=node('span','chapter-name',entry.name);
   const detail=node('span','chapter-detail',entry.detail),action=node('span','chapter-action',entry.cleared?'重新挑战':entry.available?(entry.checkpoint?'继续冒险':'进入章节'):'通过前一关后解锁');
   if(entry.available)action.insertAdjacentHTML('beforeend','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>');
   info.append(number,name,detail,action);card.append(art,info);card.onclick=()=>{if(!card.disabled)this.options.choose(entry.level);};this.grid.append(card);
  }
 }
 open(trigger){
  if(this.isOpen())return;this.lastFocus=trigger;this.session++;this.loading=false;this.status.textContent=this.options.notice?.()||'';this.dialog.setAttribute('aria-busy','false');this.render();
  this.dialog.showModal();this.animate(false);
  const current=this.grid.querySelector('.is-current:not(:disabled)')||this.grid.querySelector('button:not(:disabled)');
  current?.focus();current?.scrollIntoView({block:'nearest',inline:'nearest'});
 }
 animate(closing){
  this.animation?.cancel();const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.animation=this.dialog.animate(closing?[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.985)'}]:[{opacity:0,transform:'scale(.975)'},{opacity:1,transform:'scale(1)'}],{duration:reduce?0:closing?170:240,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'});
  return this.animation.finished.catch(()=>{});
 }
 close(immediate=false){
  if(!this.isOpen())return;const session=++this.session;this.loading=false;
  const finish=()=>{if(this.session!==session)return;this.dialog.close();this.animation?.cancel();if(!immediate&&this.lastFocus?.isConnected)this.lastFocus.focus();};
  if(immediate)finish();else this.animate(true).then(finish);
 }
 busy(value,message=''){
  this.loading=value;this.dialog.setAttribute('aria-busy',String(value));this.status.textContent=message;this.render();
 }
 error(message){this.status.textContent=message;}
}
root.ChapterSelect={create:options=>new Panel(options)};
})(window);
