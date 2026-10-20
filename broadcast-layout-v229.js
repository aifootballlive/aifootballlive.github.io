/* Anchor HUD to actual card dimensions. Reset legacy top+bottom stretching. */
(()=>{'use strict';let scheduled=false;
function place(){scheduled=false;
 const mobileApp=matchMedia('(max-width:600px) and (pointer:coarse)').matches&&(navigator.standalone===true||matchMedia('(display-mode:standalone)').matches)&&!document.documentElement.classList.contains('aflTikTokPortraitSource');
 document.documentElement.classList.toggle('aflMobileApp',mobileApp);
 const wrap=document.querySelector('.wrap'),cards=wrap?.querySelector('.broadcastControls'),hint=document.getElementById('leagueProfileHint'),clock=document.getElementById('matchClockHud');if(!wrap||!cards||!hint||!clock)return;const frame=wrap.getBoundingClientRect(),card=cards.getBoundingClientRect();
 const appGap=parseFloat(getComputedStyle(wrap).getPropertyValue('--afl-app-control-gap'))||0;
 const set=(e,key,value)=>{if(e.style.getPropertyValue(key)!==value)e.style.setProperty(key,value,'important');};
 for(const el of [hint,clock]){set(el,'bottom','auto');set(el,'height','auto');set(el,'min-height',(el===hint?frame.width*.046:clock.dataset.phase==='result'?0:frame.width*.085).toFixed(2)+'px');set(el,'transform','none');}
 for(const el of [hint,clock]){set(el,'left','3%');set(el,'right','3%');set(el,'width','auto');}
 if(wrap.classList.contains('adminView')){const head=wrap.querySelector('.head'),controls=head?.querySelector('.headRight');if(controls){const header=head.getBoundingClientRect();set(controls,'right',Math.max(0,header.right-frame.right+frame.width*.02).toFixed(2)+'px');set(controls,'top',(frame.top-header.top+frame.width*.003+appGap).toFixed(2)+'px');}}
 const label=document.getElementById('goalsHeading');if(label)set(label,'top',Math.round(card.top-frame.top-label.getBoundingClientRect().height-Math.max(2,frame.width*.006))+'px');
 const noticeBottom=card.bottom;
 set(hint,'top',Math.round(noticeBottom-frame.top+frame.width*3/390)+'px');
 set(clock,'top',Math.round(hint.getBoundingClientRect().bottom-frame.top+frame.width*4/390)+'px');
 const results=document.getElementById('roundSummary');if(results&&clock.dataset.phase==='result'){
  set(results,'top',Math.round(card.bottom-frame.top+frame.width*.008)+'px');
  set(clock,'top',Math.round(results.getBoundingClientRect().bottom-frame.top+frame.width*.008)+'px');
 }
}
function request(){if(!scheduled){scheduled=true;requestAnimationFrame(place);}}
function bind(){const wrap=document.querySelector('.wrap');if(!wrap)return;const observer=new ResizeObserver(request);for(const e of [wrap,wrap.querySelector('.broadcastControls'),wrap.querySelector('.headRight'),document.getElementById('goalsHeading'),document.getElementById('leagueProfileHint'),document.getElementById('matchClockHud')])if(e)observer.observe(e);new MutationObserver(request).observe(wrap,{attributes:true,attributeFilter:['class'],childList:true});window.addEventListener('resize',request);document.fonts?.ready.then(request);request();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();})();
