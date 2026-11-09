/* World dimensions and framing shared by combat, encounters and rendering. */
(function(root){
'use strict';
const world=Object.freeze({halfWidth:24,halfDepth:3.4,projectileMargin:3});
const scale=Object.freeze({player:.92,npc:.92,monster:.90,boss:.96});
const camera=Object.freeze({
 battleHalfWidth:10.1,menuHalfWidth:10.8,minHalfHeight:5.6,maxHalfHeight:9.4,
 edgePadding:2.5,lockInset:1.45,followSpeed:8,legacyFloorY:.61
});
// Presentation only: no coordinate, speed, body or attack dimensions are changed.
const presentation=Object.freeze({
 illustratedDepthGain:1.75,illustratedRise:4.5,illustratedDistance:24,
 legacyRise:9.4,legacyDistance:19,actorOrderBase:-4,actorDepthStep:.01
});
function cameraPose(illustrated){
 const distance=illustrated?presentation.illustratedDistance:presentation.legacyDistance;
 const base=Math.atan2(illustrated?presentation.illustratedRise:presentation.legacyRise,distance);
 const angle=illustrated?Math.asin(Math.sin(base)*presentation.illustratedDepthGain):base;
 return {angle,distance,rise:Math.tan(angle)*distance};
}
function actorDepthOrder(unit){
 // Stable ties, independent of jumping height, sprite center and casting poses.
 return presentation.actorOrderBase+(unit.z||0)*presentation.actorDepthStep+((unit.id||0)%1024)*1e-9;
}
const bodyScale=f=>f.isBoss?scale.boss:f.monsterType?scale.monster:f.id===0?scale.player:scale.npc;
const cameraEdge=world.halfWidth+camera.edgePadding;
function cameraHalfWidth(aspect,battling){
 const preferred=battling?camera.battleHalfWidth:camera.menuHalfWidth;
 return Math.min(cameraEdge,Math.max(camera.minHalfHeight*aspect,Math.min(preferred,camera.maxHalfHeight*aspect)));
}
function clampCameraX(x,halfWidth){
 const pan=Math.max(0,cameraEdge-halfWidth);
 return Math.max(-pan,Math.min(pan,x));
}
const api={world,scale,camera,presentation,cameraPose,actorDepthOrder,bodyScale,cameraEdge,cameraHalfWidth,clampCameraX};
if(typeof module!=='undefined')module.exports=api;else root.ArenaConfig=api;
})(typeof window!=='undefined'?window:globalThis);
