(function(){
'use strict';const $=id=>document.getElementById(id),show=(id,on)=>$(id).classList.toggle('hidden',!on);const game=new Combat.Game();let view;
try{view=new ArenaView($('arena'));}catch(e){$('errorText').textContent='图形启动失败：'+e.message+'。请开启浏览器硬件加速后重新打开。';show('loadError',true);return;}
const keys=new Set();let audioCtx,muted=false,last=performance.now(),acc=0,clock=0,announceTime=0,toastTime=0,savedPhase='fight',helpPhase=null;
function initAudio(){try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume();}catch{}}
function sound(type){if(muted||!audioCtx)return;const t=audioCtx.currentTime,volume=audioCtx.createGain();volume.connect(audioCtx.destination);volume.gain.setValueAtTime(type==='super'?.15:.085,t);volume.gain.exponentialRampToValueAtTime(.001,t+.18);
 const osc=audioCtx.createOscillator();osc.type=type==='sword'?'sawtooth':type==='hit'||type==='arrow'?'triangle':'sine';osc.frequency.setValueAtTime(type==='block'?850:type==='super'?90:type==='attack'?200:type==='sword'?550:type==='arrow'?1000:110,t);osc.frequency.exponentialRampToValueAtTime(type==='block'?250:42,t+.16);osc.connect(volume);osc.start(t);osc.stop(t+.2);
 if(type==='hit'||type==='block'){const buffer=audioCtx.createBuffer(1,audioCtx.sampleRate*.11,audioCtx.sampleRate),d=buffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const n=audioCtx.createBufferSource();n.buffer=buffer;n.connect(volume);n.start();}
}
function say(text,sec=1.2){$('announcement').innerHTML=text;announceTime=sec;}
const {waveNames,ultimateNames}=CharacterInfo;
const ultimateName=$('ultimateName');
let ultimateAnimation=null;
function clearUltimateName(){
 ultimateAnimation?.cancel();
 ultimateAnimation=null;
 ultimateName.textContent='';
}
function showUltimateName(event){
 clearUltimateName();
 const cpu=event.id!==0;
 const skin=FighterSkins.find(view.fighters[0].skinId);
 ultimateName.textContent=cpu?'赤刃':ultimateNames[event.weapon]||ultimateNames.fist;
 ultimateName.style.color=cpu?'#ff927e':skin.ultimateColor;
 const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?150:280;
 ultimateAnimation=ultimateName.animate([{opacity:1},{opacity:0}],{
  delay:1250,duration,easing:'ease-out',fill:'both'
 });
 ultimateAnimation.onfinish=clearUltimateName;
}
function toast(text){$('toast').textContent=text;toastTime=1.6;}
let victoryPanelOpen=false;
function syncVictoryControls(){
 const available=game.campaignWon;
 show('victoryPanel',available&&victoryPanelOpen);
 show('reopenVictory',available&&!victoryPanelOpen);
}
function setVictoryPanel(open){victoryPanelOpen=open;syncVictoryControls();}
function hasCampaignLevel(level){
 const entry=Encounters.levels[level];
 return !!entry&&Object.hasOwn(ARENA_STAGES,entry.stage);
}
const campaignLevels=Object.fromEntries(Object.entries(Encounters.levels).filter(([level])=>hasCampaignLevel(level)));
const save=new RiftSave.Store({
 storage:()=>window.localStorage,levels:campaignLevels,
 characters:FIGHTER_SKINS.map(skin=>skin.id),defaultCharacter:'original'
});
game.rewardSink=drop=>save.claimLoot(drop);
GrowthUI.init({game,save,issueMessage:saveMessage,
 suspend:()=>{const phase=game.phase;game.phase='paused';keys.clear();return phase;},
 restore:phase=>{game.phase=phase;keys.clear();last=performance.now();},
 accountChanged:()=>{const id=game.playerCharacter||save.data.selectedCharacter;game.setPlayerProgression(id,save.data.account.upgrades[id]);}
});
let menuLoading=false,skinReady=false,menuNotice='';
MainMenu.init({save,select:selectMenuCharacter});
const chapters=ChapterSelect.create({entries:chapterEntries,choose:startChapter,notice:()=>save.issue?saveMessage(save.issue):''});
function saveMessage(issue){
 return {
  corrupt:'存档已损坏，可在选择章节中从第一关重建。',
  version:'此版本无法读取现有存档。',
  unavailable:'浏览器未能保存进度。请检查本地存储设置后重试。',
  changed:'存档已在另一个页面更新，请刷新后继续。'
 }[issue]||'未能保存进度，请返回主界面后重试。';
}
function checkpointLabel({level,afterRegion}){
 const config=campaignLevels[level],index=config.regions.findIndex(region=>region.id===afterRegion);
 const place=index<0?'关卡起点':index===config.regions.length-1?'已通关':'第 '+(index+1)+' 区后';
 return '第 '+level+' 关 '+config.name+' · '+place;
}
function updateSaveMenu(){
 const point=save.continuePoint,busy=menuLoading||!skinReady;
 $('chapterMenu').disabled=$('training').disabled=busy;
 $('helpMenu').disabled=menuLoading;
 $('menuSaveStatus').textContent=menuNotice||(save.issue?saveMessage(save.issue):point?checkpointLabel(point):'尚无主线存档');
 MainMenu.sync(view.fighters[0].skinId||save.data.selectedCharacter,skinReady,menuLoading);
}
function menuMessage(message){menuNotice=message;updateSaveMenu();}
function showSaveIssue(issue){
 if(!issue)return;
 const message=saveMessage(issue);
 if(game.phase==='menu')menuMessage(message);
 else if(game.phase==='paused'&&!$('pauseScreen').classList.contains('hidden'))$('pauseSaveStatus').textContent=message;
 else toast(message);
}
function canAdvance(level){return save.data.unlockedLevels.includes(level);}
function presentVictory(level,restored=false){
 $('announcement').textContent='';
 $('victoryTitle').textContent=Encounters.levels[level].name+'通关';
 $('victoryChapter').textContent='第 '+level+' 关 · 拯救奶村';
 ResultUI.stats(['victoryCombo','victoryDamage'],game.stats,restored);
 const nextAvailable=canAdvance(level+1);
 $('victoryNext').disabled=!nextAvailable;
 $('victoryNextUnavailable').textContent=Encounters.levels[level].final?'主线已完结':'暂未开放';
 show('victoryNextUnavailable',!nextAvailable);
 setVictoryPanel(true);
}
function recordCheckpoint(regionId){
 const replay=save.data.clearedLevels.includes(game.level),issue=replay?null:save.saveCheckpoint(game.level,regionId);
 say('区域已清空<small>'+(issue||replay?'':'检查点已保存 · ')+'继续向右前进 →</small>',2.5);
 showSaveIssue(issue);
}
function recordVictory(level){
 const issue=save.data.clearedLevels.includes(level)?null:save.clearLevel(level);
 presentVictory(level);
 showSaveIssue(issue);
}
function weaponUI(weapon='fist'){
 const defs=CharacterInfo.weapons;
 const unlimited=game.fighters.length>0&&game.unlimited(game.fighters[0]),helpText=text=>unlimited?text.replace(/(?:20|100) 笑声值/g,'0 笑声值').replace(/冷却 3 秒/g,'冷却 0 秒'):text;
 const d=defs[weapon]||defs.fist;$('lightKeyName').textContent=d.light;$('heavyKeyName').textContent=d.heavy;$('waveKeyName').textContent=d.wave;$('ultimateKeyName').textContent=d.ultimate;
 for(const [i,key] of ['light','wave','super'].entries())document.querySelector('#touchControls [data-action="'+key+'"]').textContent=d.touch[i];
 $('helpLightText').textContent=d.lightHelp;$('helpHeavyText').textContent=helpText(d.heavyHelp);$('helpUltimateText').textContent=helpText(d.ultimateHelp);$('comboAdvice').textContent=d.advice;$('weaponHelp').textContent=d.tip;$('menuNote').textContent=d.note;
}
function begin(mode,level=1,afterRegion=null){
 clearUltimateName();initAudio();keys.clear();game.start(mode,level,Number($('difficulty').value),undefined,afterRegion);
 setVictoryPanel(false);helpPhase=null;weaponUI(game.fighters[0].weapon);
 ['menu','pauseScreen','help','result'].forEach(id=>show(id,false));
 ['hud','battleFooter','pause','touchControls'].forEach(id=>show(id,true));
 document.body.classList.add('playing');document.body.classList.remove('boss-battle','guard-target');
 $('enemyRole').textContent='电脑对手';document.body.classList.toggle('training',mode==='training');document.body.classList.toggle('skirmish',['skirmish','campaign'].includes(mode));
 $('enemyName').innerHTML=(mode==='training'?'木人':level===1?'烬':level===2?'疾风':'赤刃')+' <small>CPU</small>';
 $('stage').textContent=mode==='skirmish'?'剩余小怪':mode==='training'?'自由练习':`第 ${level} / 3 战`;
 if(game.campaignWon)presentVictory(level,true);
 else say(mode==='campaign'?Encounters.levels[level].name+`<small>第 ${level} 关 · ${afterRegion?'已从检查点恢复':'向右进入战斗区域'}</small>`:mode==='skirmish'?'小怪试战<small>击败场上的小怪</small>':mode==='training'?'自由练习<small>零消耗 · 零冷却 · 技能无限释放</small>':`第 ${level} 战<small>准备就绪</small>`,1.4);
}
function menu(){GrowthUI.close();game.progression?.resetTemporary();clearUltimateName();if(game.encounter)applySkinStage();game.phase='menu';setVictoryPanel(false);helpPhase=null;game.encounter=null;game.fighters=[];game.monsters=[];game.projectiles=[];game.groundSpells=[];keys.clear();weaponUI(game.playerWeapon);['hud','battleFooter','pause','touchControls','result','pauseScreen','help'].forEach(id=>show(id,false));show('menu',true);document.body.classList.remove('playing','training','skirmish','boss-battle','guard-target');$('announcement').textContent='';$('toast').textContent='';show('combo',false);menuMessage('');}
function pause(){
 if(game.acceptsInput||['intro','ko'].includes(game.phase)){
  savedPhase=game.phase;game.phase='paused';keys.clear();
  const campaign=game.mode==='campaign';
  const replay=campaign&&save.data.clearedLevels.includes(game.level);
  $('saveProgress').disabled=!campaign||replay;
  $('pauseSaveStatus').textContent=replay?'正在重玩已通关章节，原闯关检查点已保留。':campaign?'保存到最近的安全检查点。':'自由练习不会改变主线进度。';
  show('pauseScreen',true);
 }
}
function resume(){if(game.phase==='paused'){game.phase=savedPhase;show('pauseScreen',false);last=performance.now();}}
function openHelp(){if(game.acceptsInput)weaponUI(game.fighters[0].weapon);helpPhase=game.phase;if(!['menu','paused','result'].includes(game.phase)){game.phase='paused';keys.clear();}show('help',true);$('closeHelp').focus();}
function closeHelp(){show('help',false);if(helpPhase!==null){game.phase=helpPhase;helpPhase=null;}}
$('pause').onclick=pause;$('resume').onclick=resume;$('restart').onclick=()=>begin(game.mode,game.level);$('backMenu').onclick=$('resultMenu').onclick=menu;$('helpMenu').onclick=$('helpBattle').onclick=openHelp;$('closeHelp').onclick=closeHelp;
$('saveProgress').onclick=()=>{
 if(game.phase!=='paused'||!game.encounter||Wardrobe.isOpen()||save.data.clearedLevels.includes(game.level))return;
 const lastRegion=game.encounter.regions.findLast(region=>region.state==='cleared');
 const issue=save.saveCheckpoint(game.level,lastRegion?.id);
 $('pauseSaveStatus').textContent=issue?saveMessage(issue):'进度已保存 · '+checkpointLabel(save.data.location);
};
async function prepareCampaignStage(level){
 const config=Encounters.levels[level];
 const bossTypes=config.regions.flatMap(region=>region.boss?[region.boss.type]:[]);
 const [,stage]=await Promise.all([view.monsterViews.prepare(bossTypes),view.prepareStage(config.stage)]);
 return stage;
}
const newGameConfirm=$('newGameConfirm');
function canStartFromMenu(){
 return game.phase==='menu'&&skinReady&&!menuLoading&&!chapters.isOpen()&&!Wardrobe.isOpen()&&!newGameConfirm.open&&$('help').classList.contains('hidden');
}
function chapterEntries(){
 const point=save.continuePoint;
 return Object.entries(campaignLevels).map(([id,config])=>{
  const level=Number(id),cleared=save.data.clearedLevels.includes(level),available=canAdvance(level);
  const checkpoint=!cleared&&save.data.location?.level===level?save.data.location.afterRegion:null;
  const index=config.regions.findIndex(r=>r.id===checkpoint),art=ARENA_STAGES[config.stage];
  return {level,name:config.name,available,cleared,checkpoint,blocked:save.issue==='changed',current:!cleared&&(point?.level===level||!point&&level===save.firstLevel),
   image:art.src,fallback:art.fallbackSrc,detail:cleared?'从关卡起点重新挑战':available?(index>=0?'继续第 '+(index+2)+' 个战斗区域':'从关卡起点进入'):'通过前一关后解锁'};
 });
}
async function selectMenuCharacter(id){
 if(!canStartFromMenu()||!save.data.unlockedCharacters.includes(id))return false;
 const previous=FighterSkins.find(view.fighters[0].skinId),previousData=save.data;
 menuLoading=true;menuMessage('正在准备角色动作…');
 try{
  await Wardrobe.setSelection(FighterSkins.find(id));
  const issue=save.selectCharacter(id);
  if(issue){
   save.data=previousData;await Wardrobe.setSelection(previous);
   menuMessage(saveMessage(issue));return false;
  }
  menuNotice='';return true;
 }catch{
  await Wardrobe.setSelection(previous);menuMessage('角色动作加载失败，请重试。');return false;
 }finally{menuLoading=false;updateSaveMenu();}
}
async function startChapter(level,confirmed=false){
 if(game.phase!=='menu'||!skinReady||menuLoading||!chapters.isOpen()||newGameConfirm.open||!canAdvance(level)||save.issue==='changed')return;
 if(save.protectedSlot&&!confirmed){newGameConfirm.showModal();return;}
 const entry=chapterEntries().find(c=>c.level===level),afterRegion=entry.checkpoint,session=chapters.session;
 menuLoading=true;
 menuMessage('正在准备关卡…');chapters.busy(true,'正在准备「'+entry.name+'」…');
 try{
  const stage=await prepareCampaignStage(level);
  if(game.phase!=='menu'||!chapters.isOpen()||chapters.session!==session||Wardrobe.isOpen())return;
  let issue;
  if(save.protectedSlot){
   const result=save.newGame(view.fighters[0].skinId);
   if(!result.started){
    menuMessage(saveMessage(result.issue));chapters.error(saveMessage(result.issue));
    return;
   }
   issue=result.issue;
  }else if(!entry.cleared){
   const previous=save.data;issue=save.saveCheckpoint(level,afterRegion);
   if(issue&&issue!=='unavailable'){save.data=previous;menuMessage(saveMessage(issue));chapters.error(saveMessage(issue));return;}
  }
  chapters.close(true);
  view.applyStage(stage);
  begin('campaign',level,afterRegion);
  showSaveIssue(issue);
  menuNotice='';
 }
 catch{if(chapters.isOpen()&&chapters.session===session){menuMessage('关卡素材加载失败，请重试。');chapters.error('关卡素材加载失败，请重试。');}}
 finally{menuLoading=false;if(chapters.isOpen()&&chapters.session===session)chapters.busy(false,chapters.status.textContent);else if(game.phase==='menu')menuNotice='';updateSaveMenu();}
}
$('training').onclick=()=>{if(canStartFromMenu())begin('training');};
$('chapterMenu').onclick=()=>{if(canStartFromMenu())chapters.open($('chapterMenu'));};
$('cancelNewGame').onclick=()=>newGameConfirm.close();
$('confirmNewGame').onclick=()=>{newGameConfirm.close();startChapter(save.firstLevel,true);};
$('next').onclick=()=>begin(game.mode,game.mode==='campaign'?game.level:game.mode==='arcade'&&game.winner===0&&game.level<3?game.level+1:1);
$('victoryExplore').onclick=()=>{
 if(!game.exploreCampaign())return;
 weaponUI(game.fighters[0].weapon);
 setVictoryPanel(false);
};
$('reopenVictory').onclick=()=>{if(game.campaignWon)setVictoryPanel(true);};
$('victoryRetry').onclick=()=>{if(game.campaignWon)begin('campaign',game.level);};
$('victoryMenu').onclick=()=>{if(game.campaignWon)menu();};
$('victoryNext').onclick=async()=>{
 const button=$('victoryNext'),level=game.level+1;
 if(button.disabled||!game.campaignWon||!canAdvance(level))return;
 const run=game.fighters;
 button.disabled=true;
 try{
  const stage=await prepareCampaignStage(level);
  if(game.fighters!==run||!game.campaignWon)return;
  const afterRegion=chapterEntries().find(entry=>entry.level===level)?.checkpoint??null;
  view.applyStage(stage);
  begin('campaign',level,afterRegion);
  showSaveIssue(save.data.clearedLevels.includes(level)?null:save.saveCheckpoint(level,afterRegion));
 }catch{if(game.fighters===run)toast('下一关素材加载失败，请重试。');}
 finally{if(game.fighters===run)button.disabled=!canAdvance(level);}
};
$('sound').onclick=()=>{initAudio();muted=!muted;$('sound').textContent='声音 '+(muted?'关':'开');$('sound').setAttribute('aria-label',muted?'开启声音':'关闭声音');};
$('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('当前窗口不支持全屏，可在浏览器中打开');}};
const actions={KeyJ:'light',KeyK:'heavy',KeyU:'wave',KeyI:'super',Space:'jump',ShiftLeft:'dash',ShiftRight:'dash',KeyQ:'wave',KeyR:'super'};
window.addEventListener('keydown',e=>{if(GrowthUI.isOpen()){if(e.code==='Escape'){e.preventDefault();GrowthUI.close();}return;}if(newGameConfirm.open||chapters.isOpen())return;if(Wardrobe.isOpen()){if(e.code==='Escape'){e.preventDefault();Wardrobe.close();}return;}if(e.code==='Escape'){e.preventDefault();if(!$('help').classList.contains('hidden'))closeHelp();else if(game.phase==='paused')resume();else pause();return;}if(!game.acceptsInput)return;if(['KeyQ','KeyR'].includes(e.code)&&game.fighters[0].weapon!=='fan')return;if(['Space','KeyW','KeyA','KeyS','KeyD','KeyF','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',...Object.keys(actions)].includes(e.code))e.preventDefault();keys.add(e.code);if(!e.repeat&&actions[e.code])game.queue(0,actions[e.code]);});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();pause();}});
for(const b of document.querySelectorAll('#touchControls button')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(b.dataset.action)game.queue(0,b.dataset.action);else keys.add('touch-'+b.dataset.hold);};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>{if(b.dataset.hold)keys.delete('touch-'+b.dataset.hold);};}
function events(){for(const e of game.events){GrowthUI.effect(e);if(e.type==='lootCollected')toast(e.kind==='coins'?'+'+e.amount+' 奶币 · 已永久保存':'获得 '+e.name+' ×'+e.quantity+' · 已保存');if(e.type==='lootSaveError')toast(saveMessage(e.issue)+' 奶币仍留在地面，保存成功后才计入。');view.effect(e);if(e.type==='capitalBlast')sound('hit');if(e.type==='morrisImpact')sound(e.final?'super':'hit');if(['attack','hit','block','super'].includes(e.type)&&!(e.type==='attack'&&e.weapon==='bow'))sound(e.weapon==='sword'&&e.type==='attack'?'sword':e.type);if(e.type==='arrow')sound('arrow');if(e.type==='spellCast')sound('super');if(e.type==='spellBurst')sound('hit');if(e.type==='regionStart')say(e.name+`<small>每 ${e.interval} 秒增援 · 同时最多 ${e.maxAlive} 只</small>`,2);if(e.type==='bossApproach')toast(Monsters.types[e.typeId].name+'正在靠近');if(e.type==='bossEnter'){const name=Monsters.types[e.typeId].name;if($('toast').textContent===name+'正在靠近')$('toast').textContent='';say(name+(e.typeId===CapitalEnemies.bossType?'<small>关卡首领登场</small>':'<small>小首领登场</small>'),1.45);sound('super');}if(e.type==='bossDefeated')toast(Monsters.types[e.typeId].name+'已击败');if(e.type==='regionClear'&&!e.complete)recordCheckpoint(e.regionId);if(e.type==='campaignVictory')recordVictory(e.level);if(e.type==='fight')say('开 战',.65);if(e.type==='cooldown')toast((e.name==='wave'?waveNames[game.playerWeapon]:ultimateNames[game.playerWeapon])+'还需 '+Math.ceil(e.remaining)+' 秒');if(e.type==='energyLow')toast('笑声值不足，命中或防守可以积累笑声值');if(e.type==='guardBreak')toast(e.enemy?'对手破防 3 秒 · 承伤提高 30%':e.id?'对手破防！抓住机会':'架势耗尽 · 硬直 2 秒');if(e.type==='super')showUltimateName(e);if(e.type==='ko')say('K.O.',1.2);if(e.type==='result'){show('result',true);const win=e.winner===0;$('resultTitle').textContent=win?(game.level===3?'挑战完成':'胜 利'):'再来一局';$('resultLabel').textContent=`${view.backdrop.name} · 第 ${game.level} 战`;$('resultCopy').textContent=win?(game.level<3?'下一位对手会更主动。保持节奏，继续前进。':'三位对手全部击败。试试更高的电脑强度。'):'留意出招后的破绽。防住攻击，再靠近反击。';ResultUI.stats(['statCombo','statDamage'],game.stats);$('next').textContent=win&&game.level<3?'下一战 →':'重新挑战';if(game.mode==='skirmish'){$('resultTitle').textContent=win?'小怪已清除':'再来一局';$('resultLabel').textContent=view.backdrop.name+' · 小怪试战';$('resultCopy').textContent=win?'场上的小怪已全部击败。':'留意小怪攻击前的蓄力，换个方向拉开距离。';$('next').textContent='再战一次';}if(game.mode==='campaign'){$('resultTitle').textContent='再来一局';$('resultLabel').textContent=`第 ${game.level} 关 · ${Encounters.levels[game.level].name}`;$('resultCopy').textContent='走位避开包围，留意两侧增援。';$('next').textContent='重新挑战';}$('next').focus();}}game.events=[];}
function updatePillarHint(player){
 if(player.weapon!=='magic')return;
 const pillar=game.groundSpells.find(spell=>spell.owner===player.id&&spell.kind==='pillar'&&!spell.fired);
 if(pillar)$('energyHint').textContent=pillar.guiding?'光柱移动中 · 再按 I 落柱':'光柱即将爆发';
 const button=document.querySelector('#touchControls [data-action="super"]');
 const label=pillar?.guiding?'落柱':'光柱';
 if(button.textContent!==label)button.textContent=label;
}
function updateCampaignHud(){
 syncVictoryControls();
 const region=game.encounter.active;
 const small=game.monsters.filter(enemy=>enemy.hp>0&&!enemy.isBoss).length;
 const boss=game.monsters.find(enemy=>enemy.hp>0&&enemy.isBoss);
 const guardTarget=boss||game.monsters.filter(enemy=>enemy.hp>0&&enemy.guardMax).sort((a,b)=>Math.hypot(a.x-game.fighters[0].x,a.z-game.fighters[0].z)-Math.hypot(b.x-game.fighters[0].x,b.z-game.fighters[0].z))[0];
 document.body.classList.toggle('guard-target',!!guardTarget);
 document.body.classList.toggle('boss-battle',!!boss);
 if(guardTarget){
  const target=guardTarget,profile=Monsters.types[target.monsterType];
  const vulnerable=profile.damageTaken?.(target)>1;
  const role=target.guardBreakTime>0?'破防 · 承伤 +30%':vulnerable?'提线狂想曲 · 破绽':target.state==='attack'?profile.moves[target.bossMove].name:
   target.supportShield>0?'护盾生效':profile.elite?'精英怪':'关卡首领';
  if($('enemyName').textContent!==profile.name)$('enemyName').textContent=profile.name;
  if($('enemyRole').textContent!==role)$('enemyRole').textContent=role;
  $('hp1').style.width=target.hp/target.maxHP*100+'%';
  $('hpText1').textContent=target.hp+' / '+target.maxHP;
  $('guard1').style.width=target.guard/target.guardMax*100+'%';
 }
 const exploring=game.phase==='explore';
 $('timer').textContent=exploring?'∞':small;
 $('stage').textContent=region
  ? '区域 '+(game.encounter.regions.indexOf(region)+1)+'/'+game.encounter.regions.length+' · 已刷 '+region.spawned+'/'+region.total
  : exploring?'自由探索':game.encounter.cleared?Encounters.levels[game.level].name+' · 已通关':'向右进入第 '+(game.encounter.regions.findIndex(r=>r.state==='waiting')+1)+' 区 →';
 if(!region)return;
 let hint;
 if(boss?.bossMove==='finale'&&boss.state==='attack'){
  hint=boss.t>=Morris.finaleEnd?'破绽 · 受到伤害提高':boss.t>=3.1?'全场冲击波 · 跳跃躲避':'避开紫色落点';
 }else if(boss?.bossMove==='bombard'&&boss.state==='attack'&&boss.t<CapitalEnemies.boss.moves.bombard.impacts.at(-1)){
  hint='制裁轰炸 · 离开红色落点';
 }else if(region.spawned>=region.total)hint=boss?'击败首领与剩余敌人':region.boss&&!region.boss.entered&&!small?'首领即将登场':'清理剩余小怪';
 else if(region.boss&&!region.boss.entered&&region.spawned>=region.boss.after)hint='小首领即将登场';
 else if(small>=region.maxAlive)hint='增援暂停（满员）';
 else if(region.pending)hint='增援待入场';
 else hint='下次增援 '+Math.ceil(region.interval-region.elapsed)+' 秒';
 $('energyHint').textContent+=' · '+hint;
}
function hud(){
 GrowthUI.update();
 if(!game.fighters.length)return;
 for(let i=0;i<game.fighters.length;i++){
  const f=game.fighters[i];$('hp'+i).style.width=f.hp/f.maxHP*100+'%';$('hpText'+i).textContent=Number(f.hp.toFixed(2))+' / '+Number(f.maxHP.toFixed(2));
  $('guard'+i).style.width=f.guard/(f.guardMax||100)*100+'%';
 }
 const p=game.fighters[0],exploring=game.phase==='explore',unlimited=game.unlimited(p);
 $('energy').style.width=(unlimited?100:p.energy)+'%';$('energyValue').textContent=exploring?'∞':Math.floor(p.energy);show('energyCap',!exploring);
 const readiness=(name,cost)=>unlimited?'就绪':p.cooldowns[name]>0?Math.ceil(p.cooldowns[name])+' 秒':p.energy>=cost?'就绪':'需 '+cost+' 笑声值';
 $('energyHint').textContent='U '+waveNames[p.weapon]+' '+readiness('wave',20)+' · I '+ultimateNames[p.weapon]+' '+readiness('super',100);
 if(game.mode==='training')$('energyHint').textContent='自由练习 · 0 笑声值消耗 · 0 冷却 · 无限释放';
 if(exploring)$('energyHint').textContent='自由探索 · 0 笑声值消耗 · 0 冷却';
 updatePillarHint(p);
 $('timer').textContent=game.mode==='skirmish'?game.monsters.filter(m=>m.hp>0).length:game.mode==='training'?'∞':Math.ceil(game.remaining);
 if(game.mode==='campaign')updateCampaignHud();
 show('combo',p.combo>=2&&p.comboTTL>0);$('combo').querySelector('b').textContent=p.combo;$('combo').querySelector('small').textContent=p.comboDamage+' 点伤害';
}
function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;clock+=dt;acc+=dt;const active=game.phase!=='paused';while(acc>=1/60){game.tick(1/60,{move:(keys.has('KeyD')||keys.has('ArrowRight')||keys.has('touch-right')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')||keys.has('touch-left')?1:0),depth:(keys.has('KeyS')||keys.has('ArrowDown')||keys.has('touch-down')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')||keys.has('touch-up')?1:0),guard:keys.has('KeyF')||keys.has('touch-guard')});events();acc-=1/60;}if(active){if(announceTime>0){announceTime-=dt;if(announceTime<=0)$('announcement').textContent='';}if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').textContent='';}}hud();if(!MainMenu.render(clock))view.render(game,active?dt:0,clock);requestAnimationFrame(frame);}requestAnimationFrame(frame);
let skinPhase=null,skinStage=null;
function applySkinStage(){
 view.applyStage(skinStage);
 document.querySelector('.menu-right b').textContent=view.backdrop.name;
 document.querySelector('.menu-right>span').textContent=view.backdrop.label;
}
Wardrobe.init({initial:FighterSkins.find(save.data.selectedCharacter),apply:async skin=>{
 const stage=await view.prepareStage(skin.id);
 await view.fighters[0].setSkin(skin);
 skinStage=stage;
 if(!game.encounter)applySkinStage();
 game.setPlayerWeapon(skin.weapon);
 game.setPlayerProgression(skin.id,save.data.account.upgrades[skin.id]);
 weaponUI(skin.weapon);
},select:id=>{
 const issue=save.selectCharacter(id);
 menuMessage('');
 showSaveIssue(issue);
},open:()=>{skinPhase=game.phase;game.phase='paused';keys.clear();},close:()=>{if(skinPhase!==null){game.phase=skinPhase;skinPhase=null;}last=performance.now();},notice:menuMessage})
 .then(()=>{skinReady=true;updateSaveMenu();});
updateSaveMenu();
// Read-only diagnostics for development and future model integration.
window.gameDebug={snapshot:()=>JSON.parse(JSON.stringify({phase:game.phase,mode:game.mode,encounter:game.encounter,level:game.level,time:game.time,fighters:game.fighters,monsters:game.monsters,stats:game.stats,projectiles:game.projectiles,groundSpells:game.groundSpells,progression:game.progression?.snapshot()})),animation:()=>JSON.parse(JSON.stringify(view.fighters[0].animationState)),rendererInfo:()=>view.renderer.info.render,stage:()=>JSON.parse(JSON.stringify(view.stageDiagnostics)),combatVfx:()=>JSON.parse(JSON.stringify(view.lunarVfx.state||{ready:view.lunarVfx.ready})),vfx:()=>JSON.parse(JSON.stringify(view.mageVfx.state||{ready:view.mageVfx.ready}))};
})();
