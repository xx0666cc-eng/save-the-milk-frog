/* Campaign milestones and permanent account; transient run state is never serialized. */
(function(root){
'use strict';
const key='rift-save',version=2;
const legacyLevel='rift-campaign-cleared-v1:',legacyCharacter='rift-fighter-skin-v1';
const isRecord=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const growth=typeof module!=='undefined'?require('./growth.js'):root.Growth;

class Store{
 constructor({storage,levels,characters,defaultCharacter}){
  this.storage=storage;
  this.levels=levels;
  this.levelIds=Object.keys(levels).map(Number).sort((a,b)=>a-b);
  this.characters=[...characters];
  this.defaultCharacter=defaultCharacter;
  this.characterUnlockLevels=new Map(this.characters.filter(id=>id!==defaultCharacter).map((id,index)=>[id,this.levelIds[index]]));
  this.firstLevel=this.levelIds[0];
  this.raw=null;
  this.issue=null;
  this.protectedSlot=false;
  this.legacyFound=false;
  this.data=this.initial();
  this.load();
 }
 initial(){
  return {version,clearedLevels:[],legacyAccess:[],unlockedLevels:[this.firstLevel],location:null,
   unlockedCharacters:this.unlockedCharacters([]),selectedCharacter:this.defaultCharacter,account:growth.normalizeAccount(null,this.characters)};
 }
 characterUnlockLevel(id){return this.characterUnlockLevels.get(id);}
 unlockedCharacters(cleared){
  return this.characters.filter(id=>id===this.defaultCharacter||cleared.includes(this.characterUnlockLevel(id)));
 }
 unlocked(cleared,legacyAccess=[]){
  return this.levelIds.filter(level=>level===this.firstLevel||cleared.includes(level)||cleared.includes(level-1)||legacyAccess.includes(level));
 }
 migrateV1(value){
  if(!this.levels[5]?.regions.some(r=>r.id==='plaza-1'))return {...value,version};
  const access=value.clearedLevels.includes(3)||value.clearedLevels.includes(4)||(Array.isArray(value.unlockedLevels)&&value.unlockedLevels.includes(4))||value.location?.level===4;
  return {...value,version,legacyAccess:access?[5]:[],
   clearedLevels:value.clearedLevels.map(level=>level===4?5:level),
   location:value.location?.level===4?{...value.location,level:5}:value.location};
 }
 checkpoint(level,afterRegion,cleared){
  const regions=this.levels[level].regions;
  const index=regions.findIndex(region=>region.id===afterRegion);
  if(index<0||index===regions.length-1&&!cleared.includes(level))afterRegion=null;
  return {level,afterRegion};
 }
 lastClear(cleared){
  const level=cleared.at(-1);
  return level===undefined?null:{level,afterRegion:this.levels[level].regions.at(-1)?.id??null};
 }
 normalize(value){
  const clearedLevels=this.levelIds.filter(level=>value.clearedLevels.includes(level));
  const legacyAccess=Array.isArray(value.legacyAccess)&&value.legacyAccess.includes(5)&&this.levels[5]?[5]:[];
  const unlockedLevels=this.unlocked(clearedLevels,legacyAccess);
  const saved=value.location;
  const location=isRecord(saved)&&unlockedLevels.includes(saved.level)
   ?this.checkpoint(saved.level,saved.afterRegion,clearedLevels)
   :this.lastClear(clearedLevels);
  const unlockedCharacters=this.unlockedCharacters(clearedLevels);
  return {version,clearedLevels,legacyAccess,unlockedLevels,location,unlockedCharacters,
   selectedCharacter:unlockedCharacters.includes(value.selectedCharacter)?value.selectedCharacter:this.defaultCharacter,
   account:growth.normalizeAccount(value.account,this.characters)};
 }
 load(){
  try{
   const storage=this.storage();
   this.raw=storage.getItem(key);
   if(this.raw===null){
    const clearedLevels=this.levelIds.filter(level=>storage.getItem(legacyLevel+level)==='1');
    const selectedCharacter=storage.getItem(legacyCharacter);
    if(clearedLevels.length||this.characters.includes(selectedCharacter)){
     this.legacyFound=true;
     this.data=this.normalize(this.migrateV1({clearedLevels,selectedCharacter}));
     this.persist(this.data);
    }
    return;
   }
   let value;
   try{value=JSON.parse(this.raw);}catch{}
   const migrating=isRecord(value)&&value.version===1&&Array.isArray(value.clearedLevels);
   if(migrating)value=this.migrateV1(value);
   if(isRecord(value)&&Number.isInteger(value.version)&&value.version!==version){
    this.protectedSlot=true;
    this.issue='version';
   }else if(!isRecord(value)||value.version!==version||!Array.isArray(value.clearedLevels)){
    this.protectedSlot=true;
    this.issue='corrupt';
   }else{
    this.data=this.normalize(value);
    if(migrating)this.persist(this.data);
   }
  }catch{
   this.issue='unavailable';
  }
 }
 get needsConfirmation(){return this.protectedSlot||this.data.location!==null;}
 get continuePoint(){
  const location=this.data.location;
  if(!location)return null;
  const {level,afterRegion}=location,final=this.levels[level].regions.at(-1);
  // Completed legacy plaza saves can play the newly inserted chapter without losing chapter 5.
  if(level===5&&afterRegion===final?.id&&this.data.legacyAccess.includes(5)&&this.data.clearedLevels.includes(5)&&!this.data.clearedLevels.includes(4))return {level:4,afterRegion:null};
  if(final&&afterRegion===final.id&&this.data.unlockedLevels.includes(level+1)){
   return {level:level+1,afterRegion:null};
  }
  return {...location};
 }
 persist(next,replace=false){
  if(this.protectedSlot&&!replace)return this.issue;
  const json=JSON.stringify(next);
  try{
   const storage=this.storage();
   if(storage.getItem(key)!==this.raw){
    this.issue='changed';
    return this.issue;
   }
   if(json!==this.raw)storage.setItem(key,json);
   this.raw=json;
   this.protectedSlot=false;
   this.issue=null;
   return null;
  }catch{
   if(!this.protectedSlot)this.issue='unavailable';
   return 'unavailable';
  }
 }
 update(next){
  this.data=next;
  return this.persist(next);
 }
 newGame(selectedCharacter=null){
  const reset=this.needsConfirmation;
  const base=reset?this.initial():this.data;
  // Starting another campaign never spends or resets the permanent account.
  const next={...base,selectedCharacter:base.unlockedCharacters.includes(selectedCharacter)?selectedCharacter:base.selectedCharacter,account:this.data.account,location:{level:this.firstLevel,afterRegion:null}};
  const issue=this.persist(next,true);
  const started=!issue||issue==='unavailable'&&(!reset||this.raw===null&&!this.legacyFound);
  if(started)this.data=next;
  return {started,issue};
 }
 selectCharacter(id){
  if(!this.data.unlockedCharacters.includes(id))return 'invalid';
  return this.update({...this.data,selectedCharacter:id});
 }
 saveCheckpoint(level,afterRegion=null){
  if(!this.data.unlockedLevels.includes(level))return 'invalid';
  const location=this.checkpoint(level,afterRegion,this.data.clearedLevels);
  return this.update({...this.data,location});
 }
 clearLevel(level){
  if(!this.data.unlockedLevels.includes(level))return 'invalid';
  const clearedLevels=this.levelIds.filter(id=>id===level||this.data.clearedLevels.includes(id));
  const afterRegion=this.levels[level].regions.at(-1)?.id??null;
  return this.update({...this.data,clearedLevels,unlockedLevels:this.unlocked(clearedLevels,this.data.legacyAccess),
   unlockedCharacters:this.unlockedCharacters(clearedLevels),location:{level,afterRegion}});
 }
 commitAccount(account){
  const next={...this.data,account},issue=this.persist(next);
  if(issue)return {ok:false,issue};
  this.data=next;return {ok:true};
 }
 claimLoot(drop){
  const account=this.data.account;
  if(typeof drop?.id!=='string'||!/^[\w:-]{1,160}$/.test(drop.id))return {ok:false,issue:'invalid'};
  if(account.claimed.includes(drop.id))return {ok:true,duplicate:true};
  const next={...account,claimed:[...account.claimed,drop.id]};
  if(drop.kind==='coins'){
   if(!Number.isSafeInteger(drop.amount)||drop.amount<=0||!Number.isSafeInteger(account.coins+drop.amount))return {ok:false,issue:'invalid'};
   next.coins+=drop.amount;
  }else if(drop.kind==='item'){
   if(!growth.validItemId(drop.itemId)||!Number.isSafeInteger(drop.quantity)||drop.quantity<=0||!drop.definition?.name)return {ok:false,issue:'invalid'};
   const quantity=(account.inventory[drop.itemId]?.quantity||0)+drop.quantity;
   if(!Number.isSafeInteger(quantity))return {ok:false,issue:'invalid'};
   next.inventory={...account.inventory,[drop.itemId]:{...drop.definition,quantity}};
  }else return {ok:false,issue:'invalid'};
  return this.commitAccount(next);
 }
 upgrade(character,attribute){
  if(!this.characters.includes(character)||!growth.attributes.includes(attribute))return {ok:false,issue:'invalid'};
  const account=this.data.account,current=account.upgrades[character],cost=growth.cost(current[attribute]);
  if(cost===null)return {ok:false,issue:'max'};
  if(account.coins<cost)return {ok:false,issue:'funds'};
  return this.commitAccount({...account,coins:account.coins-cost,
   upgrades:{...account.upgrades,[character]:{...current,[attribute]:current[attribute]+1}}});
 }
}
const api={Store,key};
if(typeof module!=='undefined')module.exports=api;else root.RiftSave=api;
})(typeof window!=='undefined'?window:globalThis);
