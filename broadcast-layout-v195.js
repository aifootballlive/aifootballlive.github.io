/* Anchor HUD to actual card dimensions. Reset legacy top+bottom stretching. */
(()=>{'use strict';let scheduled=false;
function place(){scheduled=false;const wrap=document.querySelector('.wrap'),cards=wrap?.querySelector('.broadcastControls'),hint=document.getElementById('leagueProfileHint'),clock=document.getElementById('matchClockHud');if(!wrap||!cards||!hint||!clock)return;const frame=wrap.getBoundingClientRect(),card=cards.getBoundingClientRect();
 const set=(e,key,value)=>{if(e.style.getPropertyValue(key)!==value)e.style.setProperty(key,value,'important');};
 for(const el of [hint,clock]){set(el,'bottom','auto');set(el,'height','auto');set(el,'min-height','0px');set(el,'transform','none');}
 for(const el of [hint,clock]){set(el,'left','3%');set(el,'right','3%');set(el,'width','auto');}
 const noticeBottom=Math.max(card.bottom,...[...cards.querySelectorAll('.teamGiftNotice:not([hidden])')].map(n=>n.getBoundingClientRect().bottom));
 set(hint,'top',Math.round(noticeBottom-frame.top+4)+'px');
 set(clock,'top',Math.round(hint.getBoundingClientRect().bottom-frame.top+6)+'px');
}
function request(){if(!scheduled){scheduled=true;requestAnimationFrame(place);}}
function bind(){const wrap=document.querySelector('.wrap');if(!wrap)return;const observer=new ResizeObserver(request);for(const e of [wrap,wrap.querySelector('.broadcastControls'),document.getElementById('leagueProfileHint'),document.getElementById('matchClockHud')])if(e)observer.observe(e);new MutationObserver(request).observe(wrap,{attributes:true,attributeFilter:['class']});window.addEventListener('resize',request);document.fonts?.ready.then(request);request();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();})();
