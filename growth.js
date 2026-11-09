/* Growth configuration and run state. No DOM, renderer or campaign dependencies. */
(function(root){
'use strict';
const autoAttacks=typeof module!=='undefined'?require('./auto-attack.js'):root.AutoAttacks;
const config=Object.freeze({
 experience:Object.freeze({normal:10,elite:25,boss:80,firstThreshold:40,thresholdStep:20,healFraction:.25,speedBonus:.50,buffSeconds:5}),
 coins:Object.freeze({normal:{chance:.40,amount:5,icons:1},elite:{chance:.50,amount:10,icons:3},boss:{chance:1,base:100,perLevel:50,icons:5}}),
 upgrades:Object.freeze({maxLevel:10,firstCost:20,costStep:10,percentStep:.05,lifestealStep:.01}),
 pickup:Object.freeze({radius:.72,coinRangeMultiplier:1.5,settleTime:.16,retrySeconds:1})
});
const attributes=['hp','attack','defense','lifesteal'];
const record=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=v=>Number.isSafeInteger(v)&&v>=0?v:0;
const validItemId=id=>typeof id==='string'&&/^[\w-]{1,80}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
const round=v=>Math.round((v+Number.EPSILON)*10000)/10000;
function pickupRadius(game,kind='coins'){
 return kind==='coins'?autoAttacks.limits(game,game.fighters[0]).range*config.pickup.coinRangeMultiplier:config.pickup.radius;
}
function levels(value){return Object.fromEntries(attributes.map(k=>[k,Math.min(config.upgrades.maxLevel,integer(value?.[k]))]));}
function cost(level){return level>=config.upgrades.maxLevel?null:config.upgrades.firstCost+config.upgrades.costStep*level;}
function multipliers(value){const n=levels(value),u=config.upgrades;return {hp:1+n.hp*u.percentStep,attack:1+n.attack*u.percentStep,defense:1+n.defense*u.percentStep,lifesteal:n.lifesteal*u.lifestealStep};}
function normalizeAccount(value,characters){
 const source=record(value)?value:{},inventory={};
 for(const [id,item] of Object.entries(record(source.inventory)?source.inventory:{})){
  if(!validItemId(id)||!record(item)||!integer(item.quantity))continue;
  inventory[id]={quantity:integer(item.quantity),name:typeof item.name==='string'?item.name.slice(0,80):id,
   description:typeof item.description==='string'?item.description.slice(0,600):'',icon:typeof item.icon==='string'&&/^assets\/[\w\-./]+$/.test(item.icon)?item.icon:''};
 }
 return {coins:integer(source.coins),upgrades:Object.fromEntries(characters.map(id=>[id,levels(source.upgrades?.[id])])),inventory,
  claimed:Array.isArray(source.claimed)?[...new Set(source.claimed.filter(v=>typeof v==='string'&&/^[\w:-]{1,160}$/.test(v)))]:[]};
}
const items=new Map();
function registerItem(id,definition){
 if(!validItemId(id)||!definition?.name)throw new TypeError('Invalid item definition');
 items.set(id,{name:String(definition.name).slice(0,80),description:String(definition.description||'').slice(0,600),icon:/^assets\/[\w\-./]+$/.test(definition.icon||'')?definition.icon:''});
}
let serial=0;
function runId(){return root.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+(++serial)+'-'+Math.random().toString(36).slice(2);}
class Run{
 constructor({random=Math.random,id=runId()}={}){this.id=id;this.random=random;this.level=1;this.xp=0;this.boost=0;this.coins=0;this.items={};this.drops=[];this.defeated=new Set();this.serial=0;}
 get threshold(){return config.experience.firstThreshold+(this.level-1)*config.experience.thresholdStep;}
 gainXP(game,amount){
  if(!Number.isFinite(amount)||amount<=0||game.fighters[0].hp<=0)return;
  this.xp+=amount;
  while(this.xp>=this.threshold){
   this.xp-=this.threshold;this.level++;
   const player=game.fighters[0],before=player.hp;
   player.hp=Math.min(player.maxHP,round(player.hp+player.maxHP*config.experience.healFraction));
   this.boost=config.experience.buffSeconds;
   game.emit('experienceLevel',{id:player.id,level:this.level,healed:round(player.hp-before),seconds:this.boost,x:player.x,y:player.y,z:player.z});
  }
 }
 defeat(game,enemy,profile={}){
  if(game.mode==='training'||game.phase!=='fight'||this.defeated.has(enemy.id))return;
  this.defeated.add(enemy.id);
  const role=enemy.isBoss?'boss':profile.elite?'elite':'normal',rule=config.coins[role];
  this.gainXP(game,config.experience[role]);
  if(rule.chance===1||this.random()<rule.chance)this.addDrop({kind:'coins',amount:role==='boss'?rule.base+(game.level-1)*rule.perLevel:rule.amount,icons:rule.icons,x:enemy.x,z:enemy.z||0});
 }
 addDrop(data){const drop={...data,id:this.id+':'+(++this.serial),age:0,retry:0,collected:false};this.drops.push(drop);return drop;}
 addItem(id,quantity,x,z){
  const definition=items.get(id);
  if(!definition||!Number.isSafeInteger(quantity)||quantity<=0)throw new TypeError('Register the item before creating a drop');
  return this.addDrop({kind:'item',itemId:id,quantity,definition,icons:1,x,z});
 }
 resetTemporary(){this.level=1;this.xp=0;this.boost=0;}
 tick(game,dt){
  this.boost=Math.max(0,this.boost-dt);
  const player=game.fighters[0];
  const coinRadius=this.drops.length?pickupRadius(game):0;
  for(const drop of this.drops){
   drop.age+=dt;drop.retry=Math.max(0,drop.retry-dt);
   const radius=drop.kind==='coins'?coinRadius:config.pickup.radius;
   if(drop.collected||drop.age<config.pickup.settleTime||drop.retry>0||player.hp<=0||player.y>.8||Math.hypot(player.x-drop.x,(player.z||0)-drop.z)>radius)continue;
   const result=game.rewardSink?.(drop)||{ok:false,issue:'unavailable'};
   if(!result.ok){drop.retry=config.pickup.retrySeconds;if(!drop.reported){game.emit('lootSaveError',{issue:result.issue});drop.reported=true;}continue;}
   drop.collected=true;
   if(result.duplicate)continue;
   if(drop.kind==='coins')this.coins+=drop.amount;
   else this.items[drop.itemId]=(this.items[drop.itemId]||0)+drop.quantity;
   game.emit('lootCollected',{kind:drop.kind,amount:drop.amount,itemId:drop.itemId,quantity:drop.quantity,name:drop.definition?.name,x:drop.x,z:drop.z});
  }
 }
 snapshot(){return {level:this.level,xp:this.xp,threshold:this.threshold,boost:this.boost,coins:this.coins,items:{...this.items},uncollected:this.drops.filter(d=>!d.collected).length};}
}
const api={config,attributes,levels,cost,multipliers,normalizeAccount,round,pickupRadius,validItemId,registerItem,items,Run};
if(typeof module!=='undefined')module.exports=api;else root.Growth=api;
})(typeof window!=='undefined'?window:globalThis);
