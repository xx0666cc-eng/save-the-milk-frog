/* Shared character UI labels; numerical values are read from Combat at display time. */
(function(root){
'use strict';
const waveNames={fist:'气流技',magic:'星月气流',sword:'樱影突斩',fan:'流光回旋',bow:'蓄力箭',president:'解雇印章'};
const ultimateNames={fist:'裂空气刃',magic:'星月天光',sword:'奥义·千樱断空',fan:'广寒天倾',bow:'四箭连射',president:'让奶蛙再次伟大！'};
const weapons={
  president:{light:'金星连射',heavy:'挑空',wave:'解雇印章',ultimate:'挥旗冲击波',touch:['金星','印章','挥旗'],lightHelp:'总统指指点点，朝当前面向快速连发金星',heavyHelp:'K 重击挑空；U 你被解雇了！投出红色印章，击退并眩晕（20 笑声值，冷却 3 秒）',ultimateHelp:'让奶蛙再次伟大！挥旗 3 秒，连续释放 5 道全屏冲击波，每道造成 12 点伤害并减速 3 秒（100 笑声值）',advice:'连续按 J 发射金星，等印章击中后可以跟进。',tip:'金星与印章沿当前面向发射，挥旗冲击波从脚下向四周扩散。',note:'特奶普 · 金星连射 · 红印击退 · 挥旗冲击波'},
  fist:{light:'连打',heavy:'挑空',wave:'气流',ultimate:'必杀',touch:['拳','气','必杀'],lightHelp:'普攻，可连续按三次接成连段',heavyHelp:'K 重击挑空；U 气流技（20 笑声值，冷却 3 秒）',ultimateHelp:'四连气刃必杀（100 笑声值）',advice:'靠近后连续按，命中后接下一招。',tip:'上下错位可以躲开拳脚和气流；靠近同一纵深再出招。',note:'四向走位 · 主线闯关 · 奶蛙参战'},
  magic:{light:'法球',heavy:'挑空',wave:'星月气流',ultimate:'星月天光',touch:['球','星','光柱'],lightHelp:'发射紫色法球，不耗气；连续按可衔接三发',heavyHelp:'K 重击挑空；U 星月气流（20 笑声值，冷却 3 秒）',ultimateHelp:'星月天光（100 笑声值），按 I 升柱，再按 I 落柱，命中造成 40 伤害',advice:'法球与目标保持同一纵深，发射后可接下一球。',tip:'首次按 I，光柱从脚下升起并贴地前移。再次按 I，光柱停在原地爆发。离开红圈或闪避可躲开。',note:'紫色法球 · 两段光柱 · 星月奶蛙'},
  bow:{light:'射箭',heavy:'挑空箭',wave:'蓄力箭',ultimate:'必杀',touch:['箭','蓄','必杀'],lightHelp:'射出普通箭，不耗气；连续按可衔接三箭',heavyHelp:'K 挑空箭；U 蓄力箭（20 笑声值，冷却 3 秒）',ultimateHelp:'四箭连射（100 笑声值）',advice:'与目标保持同一纵深，放箭后可接下一箭。',tip:'普通箭不耗气；箭矢需要飞行时间。与目标同一纵深才能命中。',note:'手持弓箭 · J 免费射箭 · 主线闯关'},
  sword:{light:'樱刃',heavy:'挑斩',wave:'突斩',ultimate:'千樱断空',touch:['斩','突','交叉斩'],lightHelp:'樱刃三连：横斩 → 斜斩 → 重劈，命中后衔接',heavyHelp:'K 上挑斩；U 樱影突斩，突进并发出贯穿剑气（20 笑声值，冷却 3 秒）',ultimateHelp:'奥义·千樱断空（100 笑声值），三次斩击，最后以巨大交叉剑气击退敌人',advice:'靠近后命中衔接三斩；U 突进可快速接近对手。',tip:'千樱断空覆盖角色四周，最后一斩范围更大。地面轮廓标出伤害边界。',note:'金纹奶士 · 樱刃三连 · 千樱断空'},
  fan:{light:'月刃',heavy:'挑月',wave:'回旋扇',ultimate:'广寒天倾',touch:['月刃','飞扇','满月'],lightHelp:'月华三段：清风拂月 → 月华斩（轻微减速） → 满月归墟（击退）',heavyHelp:'K 挑月；U / Q 流光回旋，飞扇往返均能命中（20 笑声值，冷却 3 秒）',ultimateHelp:'I / R 广寒天倾（100 笑声值），在自身周围召唤满月与持续月光领域',advice:'月刃发出后可接下一段；回旋扇返回途中仍能命中。',tip:'满月以自身施法位置为中心，持续降下六轮月光；离开领域或及时闪避可躲避。技能冷却在笑声值条下显示。',note:'月华奶尊 · 月华流光扇 · 广寒天倾'}
 };
function details(skin,account){
 const weapon=skin.weapon||'fist',labels=weapons[weapon]||weapons.fist;
 const base=Combat.PLAYER_STATS[weapon],moves=Object.fromEntries(['jab','cross','finisher','heavy','wave','super'].map(name=>[name,Combat.moveFor({weapon},name)]));
 const ranks=Growth.levels(account?.upgrades?.[skin.id]);
 const waveEffects={fist:'向前释放气流，命中敌人造成伤害。',magic:'朝当前方向发射紫色魔法弹。',bow:'蓄力射出箭矢，命中后击退敌人。',sword:'向前突进并释放贯穿剑气。',fan:'将折扇抛出，去程和返程均可命中。',president:'投出红色印章，命中后击退敌人并造成硬直。'};
 const ultimateEffects={fist:'连续挥出气刃，打击角色前方的敌人。',magic:'首次施放升起贴地移动的光柱，再次施放使光柱在当前位置落下并造成伤害。',bow:'朝当前方向连续射出箭矢。',sword:'连续斩击后释放巨大交叉剑气，对周围敌人造成伤害与击退。',fan:'在自身周围召唤满月，降下持续月光领域，伤害范围内的敌人。',president:'挥旗 '+moves.super.duration+' 秒，发出 '+moves.super.pulses+' 次冲击波；每次伤害 '+moves.super.damage+'，并减速 '+moves.super.slow+' 秒。'};
 return {id:skin.id,name:skin.name,summary:labels.note,
  background:skin.background||skin.lore||'尚未配置独立背景故事。',
  growth:{total:Object.values(ranks).reduce((a,b)=>a+b,0),max:Growth.attributes.length*Growth.config.upgrades.maxLevel},
  base:{hp:base.hp,attack:moves.jab.damage,speed:base.speed,relativeSpeed:base.speed/Combat.PLAYER_STATS.fist.speed},
  skills:[
   {key:'J',name:labels.light,description:labels.lightHelp,damage:[moves.jab.damage,moves.cross.damage,moves.finisher.damage],move:moves.jab},
   {key:'K',name:labels.heavy,description:moves.heavy.lift?'命中后将敌人挑空。':'重击目标并造成硬直。',damage:[moves.heavy.damage],move:moves.heavy},
   {key:weapon==='fan'?'U / Q':'U',name:waveNames[weapon],description:waveEffects[weapon],damage:[moves.wave.damage],move:moves.wave},
   {key:weapon==='fan'?'I / R':'I',name:ultimateNames[weapon],description:ultimateEffects[weapon],move:moves.super}
  ]};
}
root.CharacterInfo={weapons,waveNames,ultimateNames,details};
})(typeof window!=='undefined'?window:globalThis);
