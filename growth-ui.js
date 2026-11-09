/* Permanent account screens and the paused in-run character card. */
(function(){
'use strict';
const $=id=>document.getElementById(id),num=n=>Number(n.toFixed(2)).toLocaleString('zh-CN'),pct=n=>num(n*100)+'%';
const names={hp:'最大生命',attack:'攻击力',defense:'防御系数',lifesteal:'攻击吸血'};
let options,dialog,selected,tab='upgrade',previousPhase,notice='',lastFocus;
const config=Growth.config,maxLevel=config.upgrades.maxLevel;
const coin='<img class="milkcoin-icon" src="assets/economy/milkcoin.png" alt="">';
const cutouts=new Map();
const iconPaths={hp:'M12 21C9 18 2 13 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 5-7 10-10 13Z',attack:'m4 20 5-5m-3-2 5 5m-2-5L19 3l2 1-1 3-9 9M2 22l2-2',defense:'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6L12 2Zm0 2v15',speed:'M3 19c8-2 16-8 17-16-8 0-14 6-14 13m-3 6 12-13m-4 8H6m9-5h-5',lifesteal:'M12 2C10 7 4 11 4 16a8 8 0 0 0 16 0c0-5-6-9-8-14Zm0 11c-4 4-4 6 0 6s4-2 0-6Z',bag:'M5 9h14l3 12H2L5 9Zm2 0L5 3h14l-2 6m-5 4v4',time:'M5 2h14M5 22h14M7 2v5l5 5-5 5v5M17 2v5l-5 5 5 5v5'};
const icon=key=>'<svg class="info-icon info-icon-'+key+'" viewBox="0 0 24 24" aria-hidden="true"><path d="'+iconPaths[key]+'"/></svg>';
function characterCutout(skin,container){
 if(!skin.assets?.idle){container.append(portrait(skin));return;}
 if(!cutouts.has(skin.id))cutouts.set(skin.id,new Promise(resolve=>{
  const atlas=skin.assets.idle,image=new Image();image.onload=()=>{
   const b=atlas.frames[0].box,canvas=document.createElement('canvas');canvas.width=b[2]-b[0];canvas.height=b[3]-b[1];
   canvas.getContext('2d').drawImage(image,b[0],b[1],canvas.width,canvas.height,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/png'));
  };image.onerror=()=>resolve(skin.preview);image.src=atlas.uri;
 }));
 cutouts.get(skin.id).then(src=>{if(!container.isConnected)return;const image=new Image();image.src=src;image.alt=skin.name;container.append(image);});
}
function text(id,value){if($(id)?.textContent!==String(value))$(id).textContent=value;}
function portrait(skin,className=''){
 const frame=document.createElement('span'),image=new Image(),preview=skin.selectionPreview;
 frame.className='growth-portrait '+className;image.alt=skin.name;
 image.src=preview?.src||skin.preview;
 if(preview&&Number.isInteger(preview.column)){
  frame.classList.add('growth-collage');frame.style.setProperty('--col',preview.column);frame.style.setProperty('--row',preview.row);
 }else if(preview?.fit==='cover'){frame.classList.add('growth-cover');image.style.objectPosition=preview.position||'center';}
 frame.append(image);return frame;
}
function playerSkin(){return FighterSkins.find(options.game.playerCharacter||options.save.data.selectedCharacter);}
function attributes(skin,levelData){
 const weapon=skin.weapon||'fist',base=Combat.PLAYER_STATS[weapon],m=Growth.multipliers(levelData),jab=Combat.moveFor({weapon},'jab');
 return {hp:Growth.round(base.hp*m.hp),attack:Growth.round(jab.damage*m.attack),defense:m.defense,lifesteal:m.lifesteal};
}
function value(key,n){return key==='lifesteal'?pct(n):num(n);}
function topBar(){return '<header class="growth-heading"><h2 id="growthTitle">角色强化</h2><div class="growth-heading-actions"><span class="milk-wallet">'+coin+'<b data-wallet>0</b><span>奶币</span></span><button id="growthClose" type="button" aria-label="关闭面板">关闭 <kbd>Esc</kbd></button></div></header>';}
function open(kind){
 if(dialog.open||kind!=='info'&&options.game.phase!=='menu'||kind==='info'&&!options.game.fighters.length)return;
 tab=kind;notice='';selected=options.save.data.selectedCharacter;lastFocus=document.activeElement;
 if(kind==='info')previousPhase=options.suspend();
 else previousPhase=null;
 dialog.classList.toggle('growth-info',kind==='info');render();dialog.showModal();$('growthClose').focus();
}
function close(){
 if(!dialog.open)return;dialog.close();
 if(previousPhase!==null){options.restore(previousPhase);previousPhase=null;}
 lastFocus?.focus();
}
function shell(){dialog.innerHTML=topBar()+'<div id="growthContent"></div><p id="growthStatus" role="status" aria-live="polite"></p>';$('growthClose').onclick=close;}
function render(){
 shell();
 if(tab==='info')renderInfo();
 else{
  const nav=document.createElement('nav');nav.className='growth-tabs';nav.setAttribute('aria-label','局外成长');
  for(const [id,label] of [['upgrade','角色强化'],['bag','我的背包']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-pressed',tab===id);b.onclick=()=>{tab=id;notice='';render();};nav.append(b);}
  $('growthContent').append(nav);tab==='upgrade'?renderUpgrade():renderBag();
 }
 update();
}
function renderUpgrade(){
 $('growthTitle').textContent='角色强化';
 const skin=FighterSkins.find(selected),levels=options.save.data.account.upgrades[selected],current=attributes(skin,levels);
 const body=document.createElement('div');body.className='growth-upgrade-layout';
 const art=document.createElement('div');art.className='growth-character-art';art.append(portrait(skin,'growth-hero-portrait'));
 const title=document.createElement('h3');title.textContent=skin.name;art.append(title);
 const caption=document.createElement('p');caption.textContent='强化跟随这个角色，永久保留';art.append(caption);
 const choices=document.createElement('div');choices.className='growth-character-choices';choices.setAttribute('aria-label','选择强化角色');
 for(const entry of FIGHTER_SKINS){const button=document.createElement('button');button.type='button';button.title=entry.name;button.setAttribute('aria-label',entry.name);button.setAttribute('aria-pressed',selected===entry.id);button.append(portrait(entry));button.onclick=()=>{selected=entry.id;notice='';render();};choices.append(button);}
 art.append(choices);body.append(art);
 const list=document.createElement('div');list.className='growth-upgrade-list';
 const intro=document.createElement('p');intro.className='growth-section-copy';intro.textContent='奶币全角色共享 · 各角色独立强化';list.append(intro);
 for(const key of Growth.attributes){
  const row=document.createElement('section'),level=levels[key],price=Growth.cost(level),next=attributes(skin,{...levels,[key]:Math.min(maxLevel,level+1)});
  row.className='growth-upgrade-row';row.dataset.attribute=key;
  row.innerHTML='<div class="growth-attribute-title"><h3>'+names[key]+'</h3><span>'+level+' <small>/ '+maxLevel+'</small></span></div><div class="growth-attribute-values"><b>'+value(key,current[key])+'</b><span>→</span><b>'+value(key,next[key])+'</b><button type="button"'+(price===null||options.save.data.account.coins<price?' disabled':'')+'>'+'<span class="ui-number-row">'+(price===null?'MAX':coin+'<span>'+price+'</span><strong>升级</strong>')+'</span>'+'</button></div><div class="growth-ranks" aria-hidden="true">'+Array.from({length:maxLevel},(_,i)=>'<i'+(i<level?' class="earned"':'')+'></i>').join('')+'</div>';
  row.querySelector('button').setAttribute('aria-label',price===null?names[key]+'已满级':'升级'+names[key]+'，消耗'+price+'奶币');
  row.querySelector('button').onclick=()=>{
   const result=options.save.upgrade(selected,key);
   if(!result.ok){notice=result.issue==='funds'?'奶币不足，击败敌人并拾取奶币后再来。':result.issue==='max'?'此属性已满级。':options.issueMessage(result.issue);update();return;}
   options.accountChanged();notice=skin.name+'的'+names[key]+'已提升至 '+(level+1)+' 级';render();
   const upgraded=dialog.querySelector('[data-attribute="'+key+'"]');
   upgraded?.classList.add('growth-upgraded');upgraded?.querySelector('button').focus();
  };
  list.append(row);
 }
 const foot=document.createElement('p');foot.className='growth-rules';foot.textContent='生命、攻击、防御每级 +'+pct(config.upgrades.percentStep)+'，基于原值累加。吸血每级 +'+num(config.upgrades.lifestealStep*100)+' 个百分点；防御通过系数降低承伤。';list.append(foot);body.append(list);$('growthContent').append(body);
}
function renderBag(){
 $('growthTitle').textContent='我的背包';
 const entries=Object.entries(options.save.data.account.inventory),layout=document.createElement('div');layout.className='growth-bag-layout';
 const grid=document.createElement('div');grid.className='growth-item-grid';grid.setAttribute('aria-label','永久物品');
 const detail=document.createElement('div');detail.className='growth-item-detail';
 function select(id,item,button){
  for(const b of grid.querySelectorAll('button'))b.setAttribute('aria-pressed',b===button);
  detail.replaceChildren();
  if(item.icon){const img=new Image();img.src=item.icon;img.alt='';detail.append(img);}
  const h=document.createElement('h3');h.textContent=item.name;detail.append(h);
  const count=document.createElement('b');count.textContent='持有 '+item.quantity;detail.append(count);
  const p=document.createElement('p');p.textContent=item.description||'永久保存的战利品。';detail.append(p);
 }
 for(const [id,item] of entries){const b=document.createElement('button');b.className='growth-item';b.type='button';b.setAttribute('aria-label',item.name+'，数量 '+item.quantity);
  if(item.icon){const img=new Image();img.src=item.icon;img.alt='';b.append(img);}else{const label=document.createElement('span');label.textContent=item.name.slice(0,2);b.append(label);}
  const n=document.createElement('b');n.textContent=item.quantity;b.append(n);b.onclick=()=>select(id,item,b);grid.append(b);
 }
 for(let i=entries.length;i<Math.max(12,entries.length);i++){const slot=document.createElement('span');slot.className='growth-empty-slot';slot.setAttribute('aria-hidden','true');grid.append(slot);}
 if(!entries.length)detail.innerHTML='<svg viewBox="0 0 80 72" aria-hidden="true"><path d="M12 27h56v33H12zM20 27V13h40v14M31 27v13h18V27M31 13V7h18v6"/></svg><h3>背包还空着</h3><p>之后拾取的特殊战利品会保存在这里。<br>已拾取奶币已直接存入账户。</p>';
 layout.append(grid,detail);$('growthContent').append(layout);
 if(entries.length)grid.querySelector('button').click();
}
function renderInfo(){
 const skin=playerSkin(),p=options.game.fighters[0],run=options.game.progression;
 const account=options.save.data.account,lv=Growth.levels(options.game.playerUpgrades),stats=attributes(skin,lv),speed=options.game.playerSpeed(p);
 $('growthTitle').textContent='角色信息';$('growthClose').innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 16M20 4 4 20"/></svg>';
 const wrap=document.createElement('div');wrap.className='info-sheet';
 wrap.innerHTML='<div class="info-top"><figure class="info-hero"><div class="info-character-cutout" id="infoCharacter"></div><figcaption id="infoCharacterName"></figcaption></figure><section class="info-main-stats"><div class="info-experience"><b>Lv.'+(run?.level||1)+'</b><div><span>EXP '+(run?.xp||0)+' / '+(run?.threshold||config.experience.firstThreshold)+'</span><div class="info-exp-track"><i style="width:'+(run?run.xp/run.threshold*100:0)+'%"></i></div></div></div><div class="info-health"><div>'+icon('hp')+'<b>生命值</b><span>'+num(p.hp)+' / '+num(p.maxHP)+'</span></div><div class="info-hp-track"><i style="width:'+p.hp/p.maxHP*100+'%"></i></div></div><dl class="info-attribute-list"><div>'+icon('attack')+'<dt>攻击力</dt><dd>'+num(stats.attack)+'</dd></div><div>'+icon('defense')+'<dt>防御系数</dt><dd>'+num(stats.defense)+'</dd></div><div>'+icon('speed')+'<dt>移动速度</dt><dd>'+num(speed)+'</dd></div><div>'+icon('lifesteal')+'<dt>攻击吸血</dt><dd>'+pct(stats.lifesteal)+'</dd></div></dl><p class="info-stat-note">攻击力显示普攻首段 · 当前减伤 '+pct(1-1/stats.defense)+'</p></section><aside class="info-aside"><section class="info-subpanel"><h3>'+icon('time')+'当前增益</h3><div id="infoBuffs"></div></section><section class="info-subpanel info-harvest"><h3>'+icon('bag')+'本局收获</h3><div><span>'+coin+'奶币 <b>'+(run?.coins||0)+'</b></span><span>'+icon('bag')+'物品 <b>'+Object.values(run?.items||{}).reduce((a,b)=>a+b,0)+'</b></span></div></section></aside></div><div class="info-bottom"><section class="info-subpanel info-permanent"><h3>'+icon('attack')+'属性强化 <small>（永久生效）</small><span class="info-account">'+coin+'<b>'+account.coins+'</b></span></h3><div id="infoUpgradeRows"></div><p>请在主界面的「角色强化」中购买升级</p></section><section class="info-subpanel info-inventory"><h3>'+icon('bag')+'背包 <small>（本局获得 / 永久持有）</small></h3><div id="infoInventoryGrid"></div><p id="infoItemDescription">暂无物品 · 拾取的奶币直接存入永久账户</p></section></div><button id="growthReturn" class="info-resume" type="button">返回战斗</button>';
 $('growthContent').append(wrap);$('infoCharacterName').textContent=skin.name;characterCutout(skin,$('infoCharacter'));
 const buffs=[];
 if(run?.boost>0)buffs.push({label:'移动速度提升',detail:'移动速度 +'+pct(config.experience.speedBonus),time:run.boost,type:'speed'});
 if(p.slow>0)buffs.push({label:'减速状态',detail:'移动速度 -30%',time:p.slow,type:'time'});
 if(p.inv>0)buffs.push({label:'短暂无敌',detail:'当前免疫伤害',time:p.inv,type:'defense'});
 for(const buff of buffs){const div=document.createElement('div');div.className='info-buff';div.innerHTML=icon(buff.type)+'<div><b>'+buff.label+'</b><span>'+buff.detail+'</span></div><time>00:'+String(Math.ceil(buff.time)).padStart(2,'0')+'</time>';$('infoBuffs').append(div);}
 const blank=document.createElement('p');blank.className='info-no-buffs';blank.textContent=buffs.length?'暂无其他增益':'暂无临时增益';$('infoBuffs').append(blank);
 for(const key of Growth.attributes){const row=document.createElement('div'),n=lv[key],price=Growth.cost(n);row.className='info-upgrade-row';row.innerHTML=icon(key)+'<b>'+names[key]+'</b><span><em>Lv.'+n+'</em> / '+maxLevel+'</span><div class="info-rank-blocks">'+Array.from({length:maxLevel},(_,i)=>'<i'+(i<n?' class="earned"':'')+'></i>').join('')+'</div><button type="button" disabled aria-label="'+names[key]+'，'+n+'级，请在主界面升级">'+(price===null?'MAX':coin+price+' 升级')+'</button>';$('infoUpgradeRows').append(row);}
 const inventory=Object.entries(account.inventory),grid=$('infoInventoryGrid');
 for(const [id,item] of inventory){const b=document.createElement('button');b.type='button';b.className='info-item-slot';b.setAttribute('aria-label',item.name+'，本局 '+(run?.items[id]||0)+'，永久 '+item.quantity);
  if(item.icon){const img=new Image();img.src=item.icon;img.alt='';b.append(img);}else{const name=document.createElement('span');name.textContent=item.name.slice(0,2);b.append(name);}
  const n=document.createElement('b');n.textContent=(run?.items[id]||0)+' / '+item.quantity;b.append(n);
  b.onclick=()=>{for(const child of grid.querySelectorAll('button'))child.setAttribute('aria-pressed',child===b);$('infoItemDescription').textContent=item.name+' · '+(item.description||'永久保存的战利品');};grid.append(b);
 }
 for(let i=inventory.length;i<Math.max(18,inventory.length);i++){const slot=document.createElement('span');slot.className='info-empty-slot';slot.setAttribute('aria-hidden','true');grid.append(slot);}
 if(inventory.length)grid.querySelector('button').click();$('growthReturn').onclick=close;
}
function update(){
 const account=options.save.data.account;
 for(const e of document.querySelectorAll('[data-wallet]'))if(e.textContent!==String(account.coins))e.textContent=account.coins;
 const run=options.game.progression,skin=playerSkin(),avatar=$('playerPortrait');
 if(avatar.dataset.skin!==skin.id){avatar.replaceChildren(portrait(skin));avatar.dataset.skin=skin.id;}
 if(run){text('experienceLevel','Lv.'+run.level);text('experienceText',run.xp+' / '+run.threshold);$('experienceFill').style.width=run.xp/run.threshold*100+'%';
  $('experienceTrack').setAttribute('aria-valuenow',run.xp);$('experienceTrack').setAttribute('aria-valuemax',run.threshold);
  text('growthBuff',run.boost>0?'疾行 +'+pct(config.experience.speedBonus)+' · '+Math.ceil(run.boost)+'s':options.game.mode==='training'?'练习无奖励':'击杀获得经验');$('growthBuff').classList.toggle('buff-active',run.boost>0);
  text('runCoins',run.coins);
 }
 if(dialog.open)text('growthStatus',notice|| (tab==='upgrade'?'每次升级消耗 '+config.upgrades.firstCost+' 起，每级递增 '+config.upgrades.costStep+' 奶币。':tab==='bag'?'物品和奶币属于永久账户，死亡或退出均保留。':'暂停期间，战斗与增益计时均已冻结。'));
}
function effect(event){
 if(event.type==='experienceLevel'){
  $('experienceHud').classList.remove('growth-level-up');void $('experienceHud').offsetWidth;$('experienceHud').classList.add('growth-level-up');
 }
 if(event.type==='lootCollected'){
  const wallet=$('battleWallet');wallet.classList.remove('growth-wallet-gain');void wallet.offsetWidth;wallet.classList.add('growth-wallet-gain');
 }
}
function init(value){
 options=value;
 const menu=document.createElement('div');menu.className='growth-menu-entry';
 menu.innerHTML='<button id="openUpgrades" type="button">角色强化</button><button id="openBackpack" type="button">背包</button><span class="milk-wallet">'+coin+'<b data-wallet>0</b></span>';
 $('menuNote').before(menu);
 const playerHud=document.querySelector('#hud .fighter-hud');playerHud.classList.add('has-avatar');
 const avatar=document.createElement('button');avatar.id='playerPortrait';avatar.type='button';avatar.setAttribute('aria-label','查看当前角色信息并暂停');playerHud.prepend(avatar);
 const xp=document.createElement('div');xp.id='experienceHud';xp.innerHTML='<div class="experience-caption"><b id="experienceLevel">Lv.1</b><span id="growthBuff">击杀获得经验</span><span id="experienceText">0 / '+config.experience.firstThreshold+'</span></div><div id="experienceTrack" role="progressbar" aria-label="本局经验" aria-valuemin="0" aria-valuenow="0" aria-valuemax="'+config.experience.firstThreshold+'"><i id="experienceFill"></i></div>';playerHud.append(xp);
 const wallet=document.createElement('div');wallet.id='battleWallet';wallet.innerHTML=coin+'<b data-wallet>0</b><span>奶币</span><small>本局 +<b id="runCoins">0</b></small>';$('battleFooter').append(wallet);
 dialog=document.createElement('dialog');dialog.id='growthDialog';dialog.setAttribute('aria-labelledby','growthTitle');dialog.setAttribute('aria-describedby','growthStatus');document.body.append(dialog);
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 $('openUpgrades').onclick=()=>open('upgrade');$('openBackpack').onclick=()=>open('bag');avatar.onclick=()=>open('info');update();
}
window.GrowthUI={init,open,close,isOpen:()=>!!dialog?.open,update,effect};
})();
