/* Preview is local UI state; only confirm calls the existing selection transaction. */
(function(root){
'use strict';
let panel;
const number=value=>Number(value.toFixed(2)).toLocaleString('zh-CN');
function node(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
class Panel{
 constructor(options){
  this.options=options;this.previewCharacter=null;this.busy=false;this.closing=false;this.lastFocus=null;this.animation=null;
  const dialog=node('dialog','character-showcase');dialog.id='characterShowcase';dialog.setAttribute('aria-labelledby','showcaseName');dialog.setAttribute('aria-describedby','showcaseSummary');
  dialog.innerHTML='<header class="showcase-header"><span>角色详情</span><button type="button" id="showcaseClose" aria-label="关闭角色详情"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><div class="showcase-content"><section class="showcase-visual" aria-label="角色形象"><div id="showcaseArt" class="showcase-art"></div><p id="showcaseActive" class="showcase-active"></p></section><section class="showcase-info"><h2 id="showcaseName"></h2><p id="showcaseSummary" class="showcase-summary"></p><p id="showcaseGrowth" class="showcase-growth"></p><div id="showcaseAttributes" class="showcase-attributes"></div><p class="showcase-base-note">基础属性 · 首段伤害为未强化普攻第一段</p><h3>招式与技能</h3><div id="showcaseSkills" class="showcase-skills"></div><details class="showcase-background"><summary>背景介绍</summary><p id="showcaseBackground"></p></details></section></div><footer class="showcase-footer"><div><p id="showcaseAvailability"></p><p id="showcaseStatus" role="status" aria-live="polite"></p></div><button type="button" id="showcaseConfirm" class="showcase-confirm">登场</button></footer>';
  document.body.append(dialog);this.dialog=dialog;
  this.$=id=>dialog.querySelector('#'+id);
  this.$('showcaseClose').onclick=()=>this.close();this.$('showcaseConfirm').onclick=()=>this.confirm();
  dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});
  dialog.addEventListener('keydown',e=>e.stopPropagation());
  const outside=e=>{const r=dialog.getBoundingClientRect();return e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);};
  dialog.addEventListener('pointerdown',e=>{this.outsideStart=outside(e);});
  dialog.addEventListener('pointerup',e=>{if(this.outsideStart&&outside(e))this.close();this.outsideStart=false;});
 }
 get activeCharacter(){return this.options.active();}
 get isOpen(){return this.dialog.open;}
 open(id,trigger){
  if(this.busy||this.closing||this.isOpen||!this.options.ready())return;
  this.previewCharacter=id;this.lastFocus=trigger||document.activeElement;this.render();
  this.dialog.showModal();this.dialog.dataset.phase='open';
  this.dialog.querySelector('.showcase-content').scrollTop=0;this.dialog.querySelector('.showcase-info').scrollTop=0;
  this.animate([{opacity:0,transform:'scale(.96)'},{opacity:1,transform:'scale(1)'}],240);
  this.$('showcaseClose').focus({preventScroll:true});
 }
 animate(frames,duration){
  this.animation?.cancel();
  this.animation=this.dialog.animate(frames,{duration:matchMedia('(prefers-reduced-motion:reduce)').matches?0:duration,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
  return this.animation.finished.catch(()=>{});
 }
 async close(){
  if(!this.isOpen||this.busy||this.closing)return;
  this.closing=true;this.dialog.dataset.phase='closing';
  await this.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.985)'}],170);
  this.dialog.close();this.animation?.cancel();this.previewCharacter=null;this.closing=false;
  this.lastFocus?.focus({preventScroll:true});
 }
 state(){
  const unlocked=this.options.unlocked().includes(this.previewCharacter),current=this.previewCharacter===this.activeCharacter;
  const button=this.$('showcaseConfirm');button.disabled=this.busy||!unlocked||current;
  button.textContent=this.busy?'正在准备动作…':!unlocked?'未解锁':current?'当前登场':'登场';
  this.$('showcaseClose').disabled=this.busy;
  this.dialog.setAttribute('aria-busy',String(this.busy));
  this.$('showcaseActive').textContent=current?'当前登场角色':'角色形象预览';
  const skin=FighterSkins.find(this.previewCharacter);
  this.$('showcaseAvailability').textContent=unlocked?'已解锁':'未解锁 · '+this.options.unlockCondition(skin.id);
 }
 render(){
  const skin=FighterSkins.find(this.previewCharacter),data=CharacterInfo.details(skin,this.options.account());
  this.$('showcaseName').textContent=data.name;this.$('showcaseSummary').textContent=data.summary;
  this.$('showcaseGrowth').textContent='永久强化 '+data.growth.total+' / '+data.growth.max+' · 未设置独立进化阶段';
  this.$('showcaseBackground').textContent=data.background;this.$('showcaseStatus').textContent='';
  const art=this.$('showcaseArt'),item=this.options.item(skin.id);art.replaceChildren(item.motion.cloneNode(true));
  art.style.setProperty('--art-ratio',item.art.width/item.art.height);
  this.$('showcaseAttributes').replaceChildren(...[
   ['最大生命',number(data.base.hp)],['首段伤害',number(data.base.attack)],['移动速度',number(data.base.speed)],['相对移速',data.base.relativeSpeed.toFixed(2)+'×']
  ].map(([name,value])=>{const cell=node('div');cell.append(node('span','',name),node('b','',value));return cell;}));
  this.$('showcaseSkills').replaceChildren(...data.skills.map(skill=>{
   const row=node('article','showcase-skill'),head=node('div','showcase-skill-heading');
   head.append(node('kbd','',skill.key),node('h4','',skill.name));
   const meta=[];
   if(skill.damage)meta.push((skill.damage.length>1?'三段伤害 ':'伤害 ')+skill.damage.map(number).join(' / '));
   meta.push(skill.move.cooldown?'冷却 '+number(skill.move.cooldown)+' 秒':'无独立冷却');
   if(skill.move.cost)meta.push(number(skill.move.cost)+' 笑声值');
   const metadata=node('p','showcase-skill-meta');meta.forEach((part,index)=>metadata.append(node('span','ui-number-run',(index?'· ':'')+part)));
   row.append(head,node('p','showcase-skill-description',skill.description),metadata);return row;
  }));
  this.$('showcaseBackground').parentElement.open=false;this.state();
 }
 async confirm(){
  if(this.busy||this.closing||!this.isOpen||!this.options.unlocked().includes(this.previewCharacter)||this.previewCharacter===this.activeCharacter)return;
  const id=this.previewCharacter;this.busy=true;this.state();this.$('showcaseStatus').textContent='正在加载动作并保存登场角色…';
  let ok=false;
  try{ok=await this.options.select(id);}catch{}
  this.busy=false;this.state();
  if(ok){await this.close();return;}
  this.$('showcaseStatus').textContent=this.options.error()||'登场失败，已保留原角色，请重试。';
 }
}
root.CharacterShowcase={create:options=>(panel=new Panel(options)),isOpen:()=>!!panel?.isOpen};
})(window);
