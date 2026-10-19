/* Anchor HUD to actual card dimensions. Reset legacy top+bottom stretching. */
(()=>{'use strict';let scheduled=false;
function place(){scheduled=false;const wrap=document.querySelector('.wrap'),cards=wrap?.querySelector('.broadcastControls'),hint=document.getElementById('leagueProfileHint'),clock=document.getElementById('matchClockHud');if(!wrap||!cards||!hint||!clock)return;const frame=wrap.getBoundingClientRect(),card=cards.getBoundingClientRect();
 const set=(e,key,value)=>{if(e.style.getPropertyValue(key)!==value)e.style.setProperty(key,value,'important');};
 for(const el of [hint,clock]){set(el,'bottom','auto');set(el,'height','auto');set(el,'min-height','0px');set(el,'transform','none');}
 for(const el of [hint,clock]){set(el,'left','3%');set(el,'right','3%');set(el,'width','auto');}
 if(wrap.classList.contains('adminView')&&!document.body.classList.contains('drawerMode')&&!document.body.classList.contains('settingsMode')){const head=wrap.querySelector('.head'),controls=head?.querySelector('.headRight');if(controls){const header=head.getBoundingClientRect();const brand=head.querySelector('.title');if(brand)set(brand,'top',Math.round(frame.top+1-header.top)+'px');const h=controls.getBoundingClientRect().height;const label=document.getElementById('goalsHeading'),labelTop=card.top-(label?.getBoundingClientRect().height||0)-Math.max(2,frame.width*.006);const targetTop=labelTop-h-Math.max(3,frame.width*.012);const action=document.getElementById('liveStartButton')?.getBoundingClientRect();set(controls,'right',Math.round(header.right-(action?.width? action.right:frame.right-frame.width*.03))+'px');const arena=document.getElementById('liveArenaName');if(arena)set(arena,'top',Math.round(targetTop-frame.top+(h-arena.getBoundingClientRect().height)/2)+'px');set(controls,'top',Math.round(targetTop-header.top)+'px');}}
 const label=document.getElementById('goalsHeading');if(label)set(label,'top',Math.round(card.top-frame.top-label.getBoundingClientRect().height-Math.max(2,frame.width*.006))+'px');
 const noticeBottom=card.bottom;
 set(hint,'top',Math.round(noticeBottom-frame.top+3)+'px');
 set(clock,'top',Math.round(hint.getBoundingClientRect().bottom-frame.top+4)+'px');
 const results=document.getElementById('roundSummary');if(results&&clock.dataset.phase==='result')set(results,'top',Math.round(clock.getBoundingClientRect().bottom-frame.top+8)+'px');
}
function request(){if(!scheduled){scheduled=true;requestAnimationFrame(place);}}
function bind(){const wrap=document.querySelector('.wrap');if(!wrap)return;const observer=new ResizeObserver(request);for(const e of [wrap,wrap.querySelector('.broadcastControls'),wrap.querySelector('.headRight'),document.getElementById('goalsHeading'),document.getElementById('leagueProfileHint'),document.getElementById('matchClockHud')])if(e)observer.observe(e);new MutationObserver(request).observe(wrap,{attributes:true,attributeFilter:['class'],childList:true});window.addEventListener('resize',request);document.fonts?.ready.then(request);request();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();})();
