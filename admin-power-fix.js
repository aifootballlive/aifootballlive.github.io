(()=>{
'use strict';
function applySteps(){
  const start=document.getElementById('setStartKeeper');
  const cost=document.getElementById('setKeeperCost');
  if(start){start.type='number';start.min='0';start.step='10';}
  if(cost){cost.type='number';cost.min='0';cost.step='10';}
}
function install(){
  applySteps();
  const overlay=document.getElementById('adminOverlay');
  if(overlay)new MutationObserver(applySteps).observe(overlay,{attributes:true,attributeFilter:['class']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
