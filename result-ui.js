/* Result presentation only: format copied values without changing combat or saves. */
(function(root){
'use strict';
const decimal=new Intl.NumberFormat('en-US',{useGrouping:false,maximumFractionDigits:1});
const whole=new Intl.NumberFormat('en-US',{useGrouping:false,maximumFractionDigits:0});
const valid=value=>typeof value==='number'&&Number.isFinite(value);
function damage(value){return valid(value)?decimal.format(value>=1000?value/10000:value)+(value>=1000?'w':''):'—';}
function count(value){return valid(value)?whole.format(value):'—';}
function stats(ids,data,restored=false){
 const values=[data.maxCombo,data.damage],formats=[count,damage];
 ids.forEach((id,index)=>{
  const node=document.getElementById(id),value=restored?null:values[index];
  node.textContent=formats[index](value);
  // The title exposes the full rounded amount while the visible damage uses w.
  node.title=valid(value)?(index?'造成伤害：'+decimal.format(value):'最高连击：'+whole.format(value)):'';
 });
 root.NumericTypography?.refresh(document.getElementById(ids[0]).closest('.result-stats'));
}
const api={damage,count,stats};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.ResultUI=api;
})(typeof window!=='undefined'?window:globalThis);
