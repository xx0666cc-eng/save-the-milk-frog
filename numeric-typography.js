/* Visual-only number fitting shared by result, character, wallet and HUD components. */
(function(root){
'use strict';
const rules=[
 ['.result-stats','.result-stat__value','parent'],
 ['.showcase-attributes',':scope>div>b','parent'],
 ['.growth-attribute-values',':scope>b','self'],
 ['.milk-wallet',':scope>b','row'],
 ['#battleWallet',':scope>b','row'],
 ['.info-account',':scope>b','row'],
 ['.info-harvest>div>span',':scope>b','row'],
 ['.info-attribute-list',':scope>div>dd','row'],
 ['.info-health',':scope>div>span','row'],
 ['.info-experience',':scope>div>span','self'],
 ['.info-item-slot',':scope>b','parent'],
 ['.growth-item',':scope>b','parent'],
 ['.underbar',':scope>span[id]','row'],
 ['.experience-caption',':scope>#experienceText','row']
 ];
const selectors=rules.map(rule=>rule[0]).join(','),tracked=new Map(),pending=new Set();
const context=document.createElement('canvas').getContext('2d');
let scheduled=false,observer;
const inner=node=>{const s=getComputedStyle(node);return node.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight);};
const canvasFont=s=>[s.fontStyle,s.fontWeight,s.fontSize,s.fontFamily].join(' ');
function textWidth(node){
 const s=getComputedStyle(node);context.font=canvasFont(s);
 const spaced=(node.textContent.length-1)*(parseFloat(s.letterSpacing)||0);
 // The DOM width includes the actual OpenType lining/tabular features.
 const range=document.createRange();range.selectNodeContents(node);
 const rects=[...range.getClientRects()];
 if(rects.length===1)return rects[0].width;
 return context.measureText(node.textContent).width+Math.max(0,spaced);
}
function room(node,group,mode){
 const parent=node.parentElement;
 if(mode==='self')return inner(node);
 if(mode==='parent')return inner(parent)-(getComputedStyle(node).position==='absolute'?8:0);
 const s=getComputedStyle(parent);
 let available=inner(parent),items=0;
 for(const child of parent.childNodes){
  if(child===node){items++;continue;}
  if(child.nodeType===Node.TEXT_NODE){
   if(!child.textContent.trim())continue;
   context.font=canvasFont(s);available-=context.measureText(child.textContent).width;items++;
  }else if(child.nodeType===Node.ELEMENT_NODE){
   const cs=getComputedStyle(child);
   if(cs.display==='none'||cs.position==='absolute'||cs.position==='fixed')continue;
   available-=child.getBoundingClientRect().width+(parseFloat(cs.marginLeft)||0)+(parseFloat(cs.marginRight)||0);items++;
  }
 }
 return available-Math.max(0,items-1)*(parseFloat(s.columnGap)||0);
}
function fit(group){
 const entry=tracked.get(group);if(!entry||!group.isConnected||!group.getClientRects().length)return;
 const values=[...group.querySelectorAll(entry.rule[1])];if(!values.length)return;
 for(const node of entry.values||[])if(!values.includes(node))observer?.unobserve(node);
 // Recover each responsive component's own nominal font before measuring.
 values.forEach(node=>node.style.removeProperty('font-size'));
 const sizes=values.map(node=>parseFloat(getComputedStyle(node).fontSize));
 let scale=1;
 values.forEach(node=>{
  const width=textWidth(node),space=room(node,group,entry.rule[2]);
  if(width>0&&space>0)scale=Math.min(scale,space/width);
 });
 scale=Math.min(1,scale);
 values.forEach((node,index)=>{
  const next=scale<.999?(sizes[index]*scale).toFixed(3)+'px':'';
  if(next)node.style.fontSize=next;
  else node.style.removeProperty('font-size');
  observer?.observe(node);
 });
 entry.signature=values.map(node=>node.textContent).join('|');entry.first=values[0];entry.values=values;
}
function queue(group,force=false){
 const entry=tracked.get(group);if(!entry)return;
 if(!force){const values=[...group.querySelectorAll(entry.rule[1])];if(values[0]===entry.first&&values.map(n=>n.textContent).join('|')===entry.signature)return;}
 pending.add(group);
 if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;for(const group of pending)fit(group);pending.clear();});}
}
function track(group){
 if(tracked.has(group))return;
 const rule=rules.find(rule=>group.matches(rule[0]));if(!rule)return;
 tracked.set(group,{rule});observer?.observe(group);queue(group,true);
}
function scan(node){
 if(node.nodeType!==Node.ELEMENT_NODE)return;
 if(node.matches(selectors))track(node);
 node.querySelectorAll(selectors).forEach(track);
}
function start(){
 if(typeof ResizeObserver==='function')observer=new ResizeObserver(entries=>{
  for(const entry of entries){const group=entry.target.closest(selectors);if(group)queue(group,true);}
 });
 scan(document.body);
 new MutationObserver(records=>{
  for(const record of records){
   const target=record.target.nodeType===Node.ELEMENT_NODE?record.target:record.target.parentElement;
   const group=target?.closest(selectors);if(group)queue(group);
   for(const node of record.addedNodes)scan(node);
  }
  for(const [group,entry] of tracked)if(!group.isConnected){observer?.unobserve(group);for(const node of entry.values||[])observer?.unobserve(node);tracked.delete(group);}
 }).observe(document.body,{childList:true,subtree:true,characterData:true});
 window.addEventListener('resize',()=>{for(const group of tracked.keys())queue(group,true);});
 document.fonts?.ready.then(()=>{for(const group of tracked.keys())queue(group,true);});
}
root.NumericTypography={refresh(group){if(group){track(group);queue(group,true);}}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
