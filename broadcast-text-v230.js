/* Saved broadcast typography; admin edits preview locally until Apply. */
(()=>{'use strict';
const root=document.getElementById('broadcastViewport');if(!root)return;
const groups={headings:'.arenaTitle,#goalsHeading',teams:'.teamTitle',scores:'.panelHead.teamScore .num',shots:'.giftEffect',queues:'.adminTeamQueue,.adminTeamQueue strong',info:'#leagueProfileHint,.clockLabel,.clockDigits,.keeperGroupTitle,.frontKeeperTop strong',buttons:'#adminOpen,#soundEnable,.startMatchAction'};
const keys=['all',...Object.keys(groups)],id=k=>document.getElementById('broadcastText-'+k);
function normalize(value){return Object.fromEntries(keys.map(k=>{const n=Number(value?.[k]);return[k,Number.isFinite(n)?Math.max(80,Math.min(130,n)):100];}));}
let config=normalize(window.__AI_FOOTBALL_SETTINGS?.broadcastText),signature='',raf=0,lastWidth=0;
const originals=new WeakMap();
function read(){return normalize(Object.fromEntries(keys.map(k=>[k,id(k)?.value??100])));}
function fill(value){const clean=normalize(value);for(const k of keys){if(id(k))id(k).value=clean[k];const out=document.getElementById('broadcastTextValue-'+k);if(out)out.textContent=clean[k]+'%';}}
const measure=document.createElement('canvas').getContext('2d');
function baseline(node){
 const style=getComputedStyle(node);
 if(measure&&node.matches('#leagueProfileHint,.clockLabel')&&node.clientWidth){
  const max=node.id==='leagueProfileHint'?24:25,min=node.id==='leagueProfileHint'?10:11;
  measure.font=(style.fontWeight||'900')+' '+max+'px '+style.fontFamily;
  return Math.max(min,Math.min(max,max*Math.max(1,node.clientWidth-10)/Math.max(1,measure.measureText((node.textContent||'').trim()).width)));
 }
 return parseFloat(style.fontSize);
}
function setSize(node,px){node.style.setProperty('font-size',Math.max(7,px).toFixed(3)+'px','important');}
function fit(node,px){
 setSize(node,px);
 // Measure against the actual reserved cell; sliders never let text escape it.
 const box=node.matches('.teamTitle')?node.parentElement:node;
 const cellHeight=node.matches('.teamTitle')?parseFloat(getComputedStyle(box).gridTemplateRows.split(' ')[1]):null;
 if(cellHeight&&Number.isFinite(cellHeight)){const line=parseFloat(getComputedStyle(node).lineHeight)/px;px=Math.min(px,cellHeight/Math.max(1,line));setSize(node,px);}
 for(let i=0;i<4;i++){
  let ratio=1;
  if(node.clientWidth>0&&node.scrollWidth>node.clientWidth+1)ratio=Math.min(ratio,node.clientWidth/node.scrollWidth);
  if(node.matches('.adminTeamQueue')){const label=node.querySelector('.queueLabel');if(label&&label.scrollHeight>node.clientHeight-2)ratio=Math.min(ratio,(node.clientHeight-2)/label.scrollHeight);}
  if(ratio>=.995)break;px*=ratio*.98;setSize(node,px);
 }
 return px;
}
function render(){raf=0;const width=root.getBoundingClientRect().width;if(!width)return;
 lastWidth=width;const entries=[];
 for(const [group,selector]of Object.entries(groups))for(const node of root.querySelectorAll(selector)){
  if(!originals.has(node))originals.set(node,{value:node.style.getPropertyValue('font-size'),priority:node.style.getPropertyPriority('font-size')});
  const old=originals.get(node);if(old.value)node.style.setProperty('font-size',old.value,old.priority);else node.style.removeProperty('font-size');
 }
 // Read every baseline after restoring parents, before writing any scaled font.
 for(const [group,selector]of Object.entries(groups))for(const node of root.querySelectorAll(selector))entries.push({node,group,px:baseline(node)*config.all*config[group]/10000});
 let teamSize=Infinity;
 for(const item of entries){if(config.all===100&&config[item.group]===100&&item.group!=='info')continue;const px=fit(item.node,item.px);if(item.group==='teams')teamSize=Math.min(teamSize,px);}
 if(Number.isFinite(teamSize))for(const node of root.querySelectorAll(groups.teams))setSize(node,teamSize);
 window.dispatchEvent(new Event('resize'));
}
function schedule(){if(!raf)raf=requestAnimationFrame(render);}
function apply(value,force=false){const clean=normalize(value),next=JSON.stringify(clean);config=clean;if(force||next!==signature){signature=next;schedule();}}
document.getElementById('broadcastTextPreviewToggle')?.addEventListener('click',e=>{const open=document.body.classList.toggle('aflTextPreview');e.currentTarget.textContent=open?'Tam ekran ayarlara dön':'Telefonda canlı önizlemeyi aç';schedule();window.dispatchEvent(new Event('resize'));});
for(const k of keys)id(k)?.addEventListener('input',()=>{fill(read());apply(read());});
document.getElementById('broadcastTextDefaults')?.addEventListener('click',()=>{fill({});apply({});});
window.addEventListener('ai-football-settings',e=>{
 const editing=document.getElementById('adminOverlay')?.classList.contains('show')||document.getElementById('leagueDrawer')?.classList.contains('show');
 // Incoming shared updates must not erase an unsaved local slider draft.
 if(editing)return;fill(e.detail?.broadcastText);apply(e.detail?.broadcastText);
});
new ResizeObserver(()=>{const width=root.getBoundingClientRect().width;if(Math.abs(width-lastWidth)>.5)schedule();}).observe(root);
for(const node of root.querySelectorAll('.panelHead.teamScore .num,.arenaTitle,.clockLabel,.clockDigits,.frontKeeperTop strong')){let previous=node.textContent;new MutationObserver(()=>{if(node.textContent===previous)return;previous=node.textContent;schedule();}).observe(node,{childList:true,characterData:true,subtree:true});}
window.AIFootballBroadcastText={normalize,read,fill,apply};
fill(config);apply(config,true);
})();
