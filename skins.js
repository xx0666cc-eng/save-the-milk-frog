/* Register complete reference-image outfits here: idle, actions and walk atlases. */
(function(){
'use strict';
const original={id:'original',name:'原版奶蛙',description:'J 三段连打，K 挑空，U 释放扇形欢笑声波。I 变身圣辉奶蛙，J 改为三连圣羽，U 升级为圣音震鸣。',preview:'assets/character/standing-cutout.png',assets:CHARACTER_ASSETS,ultimateColor:'#ffe074'};
const outfits=[
 {id:'outfit-1',name:'星月奶蛙',weapon:'magic',ultimateColor:'#d5adff',atlas:'data'},
 {id:'outfit-4',name:'金纹奶士',weapon:'sword',ultimateColor:'#f4ce77',atlas:'data-weapons-v2'},
 {id:'outfit-8',name:'月华奶尊',weapon:'fan',ultimateColor:'#c2d3ff',atlas:'data-moon-v3',portrait:'reference-moon-v3.png'},
 {id:'outfit-9',name:'林间游蛙',weapon:'bow',ultimateColor:'#b8d88a',atlas:'data-weapons-v2'}
];
const president={id:'president',name:'特奶普',weapon:'president',artFacing:1,ultimateColor:'#ff9582',
 description:'J 总统指指点点，连发金色星星；U 你被解雇了！投出红色印章，命中后击退并眩晕；I 让奶蛙再次伟大！挥旗 3 秒，连续发出 5 道冲击波，每道造成 12 点伤害并减速 3 秒。',
 selectionPreview:{src:'assets/portraits/president-selection.jpg',fit:'cover'},
 preview:'assets/outfits/president/reference.jpg',assetFile:'assets/outfits/president/data.js'};
window.FIGHTER_SKINS=[original,...outfits.map(({atlas,portrait='reference.jpg',...skin})=>({
 ...skin,preview:`assets/outfits/${skin.id}/${portrait}`,assetFile:`assets/outfits/${skin.id}/${atlas}.js`
})),president];
FIGHTER_SKINS.find(s=>s.id==='outfit-1').description='J 发射紫色法球，不耗气；U 星月气流（20 笑声值）；I 大招星月天光（100 笑声值），首次按 I 升起光柱，再按 I 落柱，命中造成 40 伤害。';
FIGHTER_SKINS.find(s=>s.id==='outfit-4').description='金纹奶士手持长剑：J 樱刃三连（横斩、斜斩、重劈），K 挑斩，U 樱影突斩，I 奥义·千樱断空（三斩与巨大交叉剑气）。';
FIGHTER_SKINS.find(s=>s.id==='outfit-8').description='月华奶尊手持月华流光扇：J 月华三段连击，U 流光回旋（往返均命中，冷却 3 秒），I 广寒天倾（自身周围的满月与持续月光领域）。';
FIGHTER_SKINS.find(s=>s.id==='outfit-9').description='手持弓箭。J 射箭不耗气，K 挑空箭，U 蓄力箭，I 四箭连射。';
// Use exact regions of the supplied six-picture collage in the chooser.
[['outfit-1',0],['outfit-4',3],['outfit-8',5]].forEach(([id,i])=>{
 FIGHTER_SKINS.find(s=>s.id===id).selectionPreview={src:'assets/portraits/selection-six-v1.jpg',column:i%3,row:Math.floor(i/3)};
});
FIGHTER_SKINS.find(s=>s.id==='outfit-9').selectionPreview={src:'assets/portraits/ranger-selection-v1.png',fit:'cover',position:'37% 50%'};
window.OUTFIT_ASSETS=window.OUTFIT_ASSETS||{};const pending=new Map();
window.FighterSkins={
 find(id){return window.FIGHTER_SKINS.find(s=>s.id===id)||original;},
 async resolve(skin){
  if(skin.assets)return skin;
  if(OUTFIT_ASSETS[skin.id]){skin.assets=OUTFIT_ASSETS[skin.id];return skin;}
  if(!pending.has(skin.id))pending.set(skin.id,new Promise((resolve,reject)=>{
   const script=document.createElement('script');let timer;
   const done=error=>{clearTimeout(timer);script.remove();pending.delete(skin.id);if(error)reject(error);else if(OUTFIT_ASSETS[skin.id]){skin.assets=OUTFIT_ASSETS[skin.id];resolve(skin);}else reject(new Error('未找到这套服装的动作素材'));};
   script.src=skin.assetFile;script.onload=()=>done();script.onerror=()=>done(new Error('动作文件加载失败'));timer=setTimeout(()=>done(new Error('动作文件加载超时，请重试')),12000);document.head.append(script);
  }));
  return pending.get(skin.id);
 },
 validate(skin){
  if(!skin||!skin.id||!skin.name||!skin.assets)throw new Error('形象资料不完整');
  const required=[['idle',1],['actions',9],['walk',24]];
  if(skin.weapon==='president')required.push(['rally',1],['sideWalk',8]);
  for(const [name,count] of required){
   const a=skin.assets[name];if(!a||!a.uri||!Number.isFinite(a.width)||a.width<=0||!Number.isFinite(a.height)||a.height<=0||!Array.isArray(a.frames)||a.frames.length<count)throw new Error('形象缺少完整动作：'+name);
   for(const f of a.frames){const b=f.box;if(!Array.isArray(b)||b.length!==4||!b.every(Number.isFinite)||b[0]<0||b[1]<0||b[2]<=b[0]||b[3]<=b[1]||b[2]>a.width||b[3]>a.height||!Number.isFinite(f.anchor))throw new Error('形象动作范围无效');}
  }
  return skin;
 }
};
})();
