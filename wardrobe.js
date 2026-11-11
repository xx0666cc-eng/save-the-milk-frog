/* Selection UI; sword and bow outfits also select their corresponding moveset. */
(function(){
'use strict';
const $=id=>document.getElementById(id),panel=$('wardrobe');let selected='original',pending=selected,busy=false,returnFocus=null,hooks=null;
function portrait(frame,img,skin){const region=skin.selectionPreview;frame.classList.toggle('collage',Number.isInteger(region?.column)&&Number.isInteger(region?.row));frame.classList.toggle('cover',region?.fit==='cover');frame.style.setProperty('--portrait-position',region?.position||'center');frame.style.setProperty('--portrait-col',region?.column||0);frame.style.setProperty('--portrait-row',region?.row||0);img.src=region?.src||skin.preview;}
function describe(){
 const s=FighterSkins.find(pending),unlocked=hooks.unlocked(pending),button=$('useSkin');
 portrait($('skinPreviewFrame'),$('skinPreview'),s);$('skinPreview').alt=s.name;$('skinTitle').textContent=s.name;
 $('skinDescription').textContent=unlocked?s.description||'':hooks.unlockCondition(pending);
 for(const b of $('skinList').querySelectorAll('button')){
  const chosen=b.dataset.skin===pending;b.setAttribute('aria-pressed',String(chosen));b.classList.toggle('selected',chosen);
 }
 button.disabled=!unlocked;
 button.textContent=!unlocked?'未解锁':pending===selected?'使用此形象':'换上此形象';
}
function label(){const s=FighterSkins.find(selected);$('playerName').textContent=s.name;}
function render(){
 $('skinList').replaceChildren();for(const skin of FIGHTER_SKINS){const b=document.createElement('button');b.type='button';b.className='skin-choice';b.dataset.skin=skin.id;const frame=document.createElement('span');frame.className='skin-image-frame';const img=document.createElement('img');img.alt='';portrait(frame,img,skin);frame.append(img);const name=document.createElement('span');name.textContent=skin.name;b.append(frame,name);b.onclick=()=>{if(busy)return;pending=skin.id;$('skinStatus').textContent='';describe();};$('skinList').append(b);}
 const unlocked=FIGHTER_SKINS.filter(skin=>hooks.unlocked(skin.id)).length;
 $('skinAvailability').textContent=`已解锁 ${unlocked} / ${FIGHTER_SKINS.length} 种形象`;describe();
}
function close(){if(busy)return;panel.classList.add('hidden');hooks.close();returnFocus?.focus();}
function open(){if(!hooks||busy)return;returnFocus=document.activeElement;pending=selected;hooks.open();render();$('skinStatus').textContent='';panel.classList.remove('hidden');$('skinList').querySelector('button[aria-pressed="true"]')?.focus();}
async function setSelection(skin){
 if(!hooks.unlocked(skin.id))throw new Error('形象未解锁');
 await hooks.apply(skin);pending=selected=skin.id;label();
}
async function use(){if(busy||!hooks.unlocked(pending))return;busy=true;$('useSkin').disabled=true;$('cancelSkin').disabled=true;panel.setAttribute('aria-busy','true');$('skinStatus').textContent='正在准备动作…';
 try{await setSelection(FighterSkins.find(pending));busy=false;close();hooks.select(selected);}
 catch(error){$('skinStatus').textContent='切换失败，已保留原形象。'+error.message;}
 finally{busy=false;$('useSkin').disabled=!hooks.unlocked(pending);$('cancelSkin').disabled=false;panel.removeAttribute('aria-busy');}
}
panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}if(e.key==='Tab'){const all=[...panel.querySelectorAll('button:not(:disabled)')],first=all[0],last=all[all.length-1];if(!all.length){e.preventDefault();return;}if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
$('chooseSkinPaused').onclick=open;$('cancelSkin').onclick=close;$('useSkin').onclick=use;
window.Wardrobe={isOpen:()=>!panel.classList.contains('hidden'),close,setSelection,async init(options){
 hooks=options;busy=true;$('chooseSkinPaused').disabled=true;
 try{await setSelection(options.initial);}catch{label();hooks.notice('保存的形象无法加载，已使用原版奶蛙');}
 busy=false;$('chooseSkinPaused').disabled=false;
}};
})();
