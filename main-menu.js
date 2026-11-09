(function(){
'use strict';
let selection,showcase,vfx,options,lastVisible=false;
const $=id=>document.getElementById(id);
function icon(name){const image=new Image();image.src='assets/menu-hub/icons/'+name+'.svg';image.alt='';image.className='hub-icon';return image;}
function decorate(button,name){button.prepend(icon(name));}
function init(value){
 options=value;document.body.classList.add('adventure-menu');
 vfx=new MenuSelectionVFX($('menuSelectionFx'),$('menuComposition'));
 selection=new MenuCharacters.Selection($('menuCharacters'),{
  unlocked:()=>options.save.data.unlockedCharacters,selected:()=>options.save.data.selectedCharacter,
  select:options.select,notice:notice,preview:(id,trigger)=>showcase.open(id,trigger),changed:item=>{vfx.select(item);$('menu').dataset.character=item?.skin.id||'original';}
 });
 showcase=CharacterShowcase.create({active:()=>selection.model.selected,unlocked:()=>options.save.data.unlockedCharacters,
  account:()=>options.save.data.account,item:id=>selection.items.get(id),select:id=>selection.choose(id),
  ready:()=>selection.ready&&!$('menu').classList.contains('hidden'),error:()=>$('menuSaveStatus').textContent});
 const growth=document.querySelector('.growth-menu-entry');if(growth){$('menuWallet').append(growth.querySelector('.milk-wallet'));$('menuUtilitySlot').append(growth);}
 for(const [id,name] of [['openBackpack','backpack'],['openUpgrades','barbell'],['training','game-controller']]){
  const button=$(id);if(button){button.classList.add('hub-utility');decorate(button,name);}
 }
 $('menuSettings').onclick=()=>{const panel=$('menuSettingsPanel');panel.hidden=!panel.hidden;$('menuSettings').setAttribute('aria-expanded',String(!panel.hidden));};
 $('menuSettingsClose').onclick=()=>{ $('menuSettingsPanel').hidden=true;$('menuSettings').setAttribute('aria-expanded','false');$('menuSettings').focus();};
 $('menu').addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('menuSettingsPanel').hidden){e.preventDefault();e.stopPropagation();$('menuSettingsClose').click();}});
 for(const id of ['sound','full']){const b=$(id);if(b)$('menuSettingsPanel').append(b);}
 decorate($('menuSettings'),'gear-six');decorate($('helpMenu'),'question');
 const images=[...$('menu').querySelectorAll('.menu-layer-image')];
 Promise.all(images.map(image=>image.complete?Promise.resolve():new Promise(resolve=>{image.onload=resolve;image.onerror=resolve;}))).then(()=>document.body.classList.add('menu-art-ready'));
 const narrow=matchMedia('(max-aspect-ratio:4/3)'),hint=()=>{$('menuSelectionHint').textContent=narrow.matches?'左右滑动浏览 · 点击查看详情':'点击角色查看详情 · 左右方向键浏览';};
 narrow.addEventListener('change',hint);hint();
}
function notice(message){$('menuSelectionStatus').textContent=message;}
function sync(id,ready,busy){
 if(!selection)return;selection.setReady(ready&&!busy);if(!selection.busy)selection.sync(id);
 $('menu').setAttribute('aria-busy',String(busy||!ready));
 for(const id of ['openUpgrades','openBackpack','menuSettings'])if($(id))$(id).disabled=busy||!ready;
}
function render(time){
 const visible=!$('menu').classList.contains('hidden');
 if(visible!==lastVisible)for(const id of ['sound','full']){
  const button=$(id);(visible?$('menuSettingsPanel'):document.querySelector('.top-tools')).append(button);
 }
 document.body.classList.toggle('menu-visible',visible);
 if(visible&&!document.hidden){if(!lastVisible)vfx?.invalidate();vfx?.render(time);}
 lastVisible=visible;
 return visible&&document.body.classList.contains('menu-art-ready');
}
window.MainMenu={init,sync,render,notice,isSelecting:()=>!!selection?.busy};
})();
