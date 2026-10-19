/* v220 interface enhancements. Purely visual, no game-rule or authentication writes. */
(()=>{
'use strict';
const id=x=>document.getElementById(x);
const root=id('broadcastViewport');
const panel=id('adminOverlay');
if(!root||!panel)return;
const slider=id('adminTextScale'),output=id('adminTextScaleValue');
const key='afl-admin-text-scale-v220';
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
let currentScale=110;
try{const v=Number(localStorage.getItem(key));if(Number.isFinite(v)&&v>=85&&v<=170)currentScale=v;}catch(_){}
function updateAdminScale(value,save){
 const p=clamp(Math.round(Number(value)||110),85,170);
 currentScale=p;
 panel.style.setProperty('--afl-admin-font',String(p/100));
 id('leagueDrawer')?.style.setProperty('--afl-admin-font',String(p/100));
 if(slider)slider.value=String(p);
 if(output)output.textContent=p+'%';
 if(save){try{localStorage.setItem(key,String(p));}catch(_){}}
 // Refit fixed-width navigation labels after any font-size change.
 for(const tab of document.querySelectorAll('#adminOverlay .drawerTab,#adminOverlay .closeBtn,#leagueDrawer .drawerTab,#leagueDrawer .closeBtn'))tab.style.removeProperty('font-size');
 requestAnimationFrame(()=>{fitHeaderTabs();requestResize();});
 const frame=id('leagueDrawerFrame');
 if(frame?.contentWindow){
  try{frame.contentWindow.postMessage({type:'AIFootballAdminFontScaleV1',percent:p},location.origin);}catch(_){}
 }
}
updateAdminScale(currentScale,false);
slider?.addEventListener('input',event=>{event.stopPropagation();updateAdminScale(slider.value,true)});
slider?.addEventListener('change',event=>{event.stopPropagation();updateAdminScale(slider.value,true)});
id('leagueDrawerFrame')?.addEventListener('load',()=>updateAdminScale(currentScale,false));

const cardNodes=[...root.querySelectorAll('.broadcastControls > .panel')];
let canvas=null,ctx=null;
try{canvas=document.createElement('canvas');ctx=canvas.getContext('2d');}catch(_){}
function fontWidth(text,px,weight='950',family='system-ui,Arial,sans-serif'){
 if(!ctx)return String(text||'').length*px*.67;
 ctx.font=weight+' '+px+'px '+family;
 return ctx.measureText(String(text||'')).width;
}
function fitTeamNames(){
 const titles=cardNodes.map(c=>c.querySelector('.teamTitle')).filter(Boolean);
 if(titles.length!==4)return;
 const available=Math.max(1,Math.min(...titles.map(n=>n.parentElement?.clientWidth||n.clientWidth||80))-4);
 const family=getComputedStyle(titles[0]).fontFamily||'system-ui,Arial,sans-serif';
 let px=18;
 while(px>9&&titles.some(n=>fontWidth(n.textContent,px,'950',family)>available*.97))px-=.25;
 root.style.setProperty('--afl-team-name-fit',px.toFixed(2)+'px');
}
function fitSingleLine(el,max,min){
 if(el?.matches('#leagueProfileHint,#matchClockHud .clockLabel'))return;
 if(!el||el.offsetWidth===0||!ctx)return;
 const w=Math.max(1,el.clientWidth-10),str=(el.textContent||'').trim();
 if(!str)return;
 const style=getComputedStyle(el),family=style.fontFamily||'system-ui,Arial,sans-serif';
 const weight=style.fontWeight==='normal'?'400':style.fontWeight||'900';
 const width=fontWidth(str,max,weight,family);
 let value=Math.min(max,max*w/Math.max(width,1));
 value=clamp(value,min,max);
 // Use authored font sizes for high resolution, downsize only when the real text needs it.
 el.style.setProperty('font-size',value.toFixed(2)+'px','important');
 el.style.setProperty('white-space','nowrap','important');
}
function fixAudioPlacement(){
 const button=id('soundEnable'),hud=id('matchClockHud'),start=id('liveStartButton');
 if(!button||!hud)return;
 if(button.parentNode!==root)root.append(button); // Preserve the existing button and its sound listener.
 const frame=root.getBoundingClientRect(),bar=hud.getBoundingClientRect(),action=start?.getBoundingClientRect();
 if(!frame.width||!bar.width)return;
 const actionVisible=action&&action.width>8&&action.height>8;
 const target=actionVisible?action:bar;
 const top=Math.max(0,Math.round(bar.bottom-frame.top+Math.max(4,frame.width*.009)));
 const buttonWidth=button.getBoundingClientRect().width||Math.max(65,frame.width*.16);
 const right=Math.max(3,Math.min(frame.width-buttonWidth-3,Math.round(frame.right-target.right)));
 button.style.setProperty('top',top+'px','important');
 button.style.setProperty('right',right+'px','important');
 button.style.setProperty('left','auto','important');
 button.style.setProperty('bottom','auto','important');
 button.style.setProperty('transform','none','important');
}
function fitHeaderTabs(){
 for(const tab of document.querySelectorAll('#adminOverlay .drawerTab,#adminOverlay .closeBtn,#leagueDrawer .drawerTab,#leagueDrawer .closeBtn')){
  if(tab.clientWidth<15)continue;
  const style=getComputedStyle(tab),size=parseFloat(style.fontSize)||15;
  const w=Math.max(1,tab.clientWidth-13),measured=fontWidth(tab.textContent.trim(),size,'900',style.fontFamily);
  if(measured>w)tab.style.setProperty('font-size',Math.max(10,size*w/measured*.96).toFixed(2)+'px','important');
 }
}
function alignDrawerTabs(){
 const showLeague=id('leagueDrawer')?.classList.contains('show')===true;
 const showSettings=id('adminOverlay')?.classList.contains('show')===true;
 for(const tab of [id('adminSettingsTab'),id('leagueSettingsTab')])if(tab)tab.setAttribute('aria-pressed',showSettings?'true':'false');
 for(const tab of [id('adminLeagueTab'),id('leagueTableTab')])if(tab)tab.setAttribute('aria-pressed',showLeague?'true':'false');
}
function resizeAll(){
 fixAudioPlacement();
 fitTeamNames();
 fitHeaderTabs();
 fitSingleLine(id('leagueProfileHint'),24,10);
 const clock=root.querySelector('#matchClockHud:not([data-phase="result"]) .clockLabel');
 if(clock)fitSingleLine(clock,25,11);
 alignDrawerTabs();
}
let raf=0;
function requestResize(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;resizeAll();});}
new ResizeObserver(requestResize).observe(root);
for(const node of cardNodes) new ResizeObserver(requestResize).observe(node);
const clockObserver=new MutationObserver(requestResize);
for(const node of [id('matchClockHud'),id('liveStartButton')])if(node)clockObserver.observe(node,{attributes:true,attributeFilter:['style','class','hidden','data-phase']});
const paneObserver=new MutationObserver(requestResize);
for(const node of [id('adminOverlay'),id('leagueDrawer')]){
 if(node)paneObserver.observe(node,{attributes:true,attributeFilter:['class']});
}
for(const team of ['A','B','C','D']){
 const count=id('frontQueue'+team),row=count?.closest('.adminTeamQueue');
 if(!count||!row)continue;
 let before=Math.max(0,Number(count.textContent)||0),timer=0;
 new MutationObserver(()=>{
  const now=Math.max(0,Number(count.textContent)||0);
  if(now>before){
   row.classList.remove('aflNewShot');
   void row.offsetWidth;
   row.classList.add('aflNewShot');
   clearTimeout(timer);
   timer=setTimeout(()=>row.classList.remove('aflNewShot'),3100);
  }
  before=now;
 }).observe(count,{childList:true,characterData:true,subtree:true});
}
window.addEventListener('resize',requestResize);
window.addEventListener('pageshow',requestResize);
setTimeout(requestResize,0);
setTimeout(requestResize,750);
})();
