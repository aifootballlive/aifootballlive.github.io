/* Saved broadcast typography; admin edits preview locally until Apply. */
(()=>{'use strict';
const root=document.getElementById('broadcastViewport');if(!root)return;
const groups={headings:'.arenaTitle,#goalsHeading',teams:'.teamTitle',scores:'.panelHead.teamScore .num',shots:'.giftEffect',queues:'.queueLabel,.adminTeamQueue strong',info:'#leagueProfileHint,.clockLabel,.clockDigits,.keeperGroupTitle,.frontKeeperTop strong',buttons:'#adminOpen,#soundEnable,.startMatchAction'};
const keys=['all',...Object.keys(groups)],id=k=>document.getElementById('broadcastText-'+k);
function normalize(value){return Object.fromEntries(keys.map(k=>{const n=Number(value?.[k]);return[k,Number.isFinite(n)?Math.max(k==='info'?40:80,Math.min(k==='teams'||k==='scores'?200:130,n)):100];}));}
let config=normalize(window.__AI_FOOTBALL_SETTINGS?.broadcastText),signature='',raf=0,fullFit=true;
const dirtyText=new Set();
const originals=new WeakMap(),observedText=new WeakSet();
function watchText(node){if(observedText.has(node))return;observedText.add(node);let previous=node.textContent;new MutationObserver(()=>{if(node.textContent===previous)return;previous=node.textContent;schedule(node);}).observe(node,{childList:true,characterData:true,subtree:true});}
const measurable=node=>node.getClientRects().length>0&&node.clientWidth>0&&node.clientHeight>0;
function read(){return normalize(Object.fromEntries(keys.map(k=>[k,id(k)?.value??100])));}
function fill(value){const clean=normalize(value);for(const k of keys){if(id(k))id(k).value=clean[k];const out=document.getElementById('broadcastTextValue-'+k);if(out)out.textContent=clean[k]+'%';}}
const measure=document.createElement('canvas').getContext('2d');
const waitingLabel=node=>node.matches('.clockLabel')&&node.closest('#matchClockHud')?.dataset.phase==='manual';
const viewerWaitingLabel=node=>waitingLabel(node)&&(!root.classList.contains('adminView')||document.body.classList.contains('aflGuestPreview'));
const activeClockLabel=node=>node.matches('.clockLabel')&&!['manual','offline','result'].includes(node.closest('#matchClockHud')?.dataset.phase);
function baseline(node){
 const style=getComputedStyle(node);
 if(measure&&node.matches('#leagueProfileHint,.clockLabel')&&node.clientWidth){
  const reference=root.getBoundingClientRect().width/390;
  const max=(node.id==='leagueProfileHint'?24:viewerWaitingLabel(node)?22:25)*reference,min=(node.id==='leagueProfileHint'?10:viewerWaitingLabel(node)?10:11)*reference;
  measure.font=(style.fontWeight||'900')+' '+max+'px '+style.fontFamily;
  const available=node.matches('.clockLabel')&&node.closest('#matchClockHud')?.dataset.phase!=='result'&&!waitingLabel(node)?Math.min(node.clientWidth,root.getBoundingClientRect().width*.64):node.clientWidth;
  return Math.max(min,Math.min(max,max*Math.max(1,available-10*reference)/Math.max(1,measure.measureText((node.textContent||'').trim()).width)));
 }
 return parseFloat(style.fontSize);
}
function setSize(node,px){node.style.setProperty('font-size',Math.max(node.matches('.teamTitle,.panelHead.teamScore .num,.adminTeamQueue strong')?1:node.matches(groups.info)?3:7,px).toFixed(3)+'px','important');}
function fit(node,px){
 const padding=(style,axis)=>axis==='x'?parseFloat(style.paddingLeft)+parseFloat(style.paddingRight):parseFloat(style.paddingTop)+parseFloat(style.paddingBottom);
 const parent=node.parentElement,parentStyle=getComputedStyle(parent);
 const safe=Math.max(1,root.getBoundingClientRect().width*.003);
 let maxWidth=node.clientWidth;
 if(node.matches('.clockLabel'))maxWidth=Math.min(maxWidth,parent.clientWidth-padding(parentStyle,'x'));
 if(node.matches('.giftEffect'))maxWidth/=.85;
 if(node.matches('.clockLabel')&&node.closest('#matchClockHud')?.dataset.phase!=='result'&&!waitingLabel(node))maxWidth=Math.min(maxWidth,root.getBoundingClientRect().width*.64);
 if(node.matches('.arenaTitle,.startMatchAction')||!maxWidth)maxWidth=parent.clientWidth-padding(parentStyle,'x');
 if(node.matches('.frontKeeperTop strong')){const siblings=[...parent.children].filter(el=>el!==node).reduce((sum,el)=>sum+el.getBoundingClientRect().width,0);maxWidth=parent.clientWidth-padding(parentStyle,'x')-siblings-(parseFloat(parentStyle.columnGap)||0);}
 let maxHeight=Infinity;
 if(node.matches('.arenaTitle')){
  const heading=document.getElementById('goalsHeading'),scale=root.getBoundingClientRect().width/root.clientWidth;
  if(heading)maxHeight=Math.max(1,(heading.getBoundingClientRect().top-parent.getBoundingClientRect().top)/scale);
 }
 if(node.matches('.teamTitle,.num,#goalsHeading,.keeperGroupTitle'))maxHeight=node.clientHeight;
 if(node.matches('.queueLabel,.adminTeamQueue strong'))maxHeight=parent.clientHeight-padding(parentStyle,'y');
 if(node.matches('.frontKeeperTop strong')){
  node.style.setProperty('line-height','1','important');
  const card=node.closest('.frontKeeperCard'),bar=card.querySelector('.frontKeeperBar'),style=getComputedStyle(card);
  maxHeight=card.clientHeight-padding(style,'y')-bar.offsetHeight-(parseFloat(style.rowGap)||0)-(parseFloat(getComputedStyle(bar).marginTop)||0);
 }
 const lines=(node.innerText||node.textContent||'').trim().split(/\n/);
 for(let i=0;i<5;i++){
  setSize(node,px);const style=getComputedStyle(node);
  const available=Math.max(1,maxWidth-padding(style,'x')-safe*2);
  measure.font=(style.fontWeight||'900')+' '+px+'px '+style.fontFamily;
  const tracking=parseFloat(style.letterSpacing)||0,words=parseFloat(style.wordSpacing)||0;
  const textWidth=Math.max(...lines.map(text=>measure.measureText(text).width+Math.max(0,text.length-1)*tracking+(text.match(/\s/g)||[]).length*words),1);
  let ratio=Math.min(1,available/textWidth);
  if(Number.isFinite(maxHeight)){
   const lineHeight=parseFloat(style.lineHeight)||px*1.15;
   const metrics=measure.measureText(lines.join(' ')||'ŞAgj');const fontBox=(metrics.actualBoundingBoxAscent||px)+(metrics.actualBoundingBoxDescent||px*.3);
   const boundedBox=node.matches('.queueLabel,.adminTeamQueue strong')?(metrics.fontBoundingBoxAscent||metrics.actualBoundingBoxAscent||px)+(metrics.fontBoundingBoxDescent||metrics.actualBoundingBoxDescent||px*.3):fontBox;
   const textHeight=Math.max(lineHeight,boundedBox)+Math.max(0,lines.length-1)*lineHeight;
   ratio=Math.min(ratio,Math.max(1,maxHeight-padding(style,'y')-safe*2)/textHeight);
  }
  if(ratio>=.995)break;px*=ratio*.985;
 }
 setSize(node,px);
 if(node.matches('.frontKeeperTop strong'))for(let i=0;i<4;i++){
  const range=document.createRange();range.selectNodeContents(node);
  const actual=range.getBoundingClientRect(),card=node.closest('.frontKeeperCard').getBoundingClientRect(),bar=node.closest('.frontKeeperCard').querySelector('.frontKeeperBar').getBoundingClientRect();
  const available=Math.max(1,bar.top-card.top-safe*2);
  if(actual.height<=available&&actual.top>=card.top+safe&&actual.bottom<=bar.top-safe)break;
  px*=Math.min(.95,available/Math.max(1,actual.height))*.97;setSize(node,px);
 }
 // Browser-rendered text is the final authority (native buttons can differ from canvas metrics).
 if(node.matches('.teamTitle,.clockLabel,#adminOpen,#soundEnable,.startMatchAction'))for(let i=0;i<3;i++){
  const range=document.createRange();range.selectNodeContents(node);const actual=range.getBoundingClientRect().width;
  const available=Math.max(1,maxWidth-padding(getComputedStyle(node),'x')-safe*2);
  if(!actual||actual<=available)break;px*=available/actual*.985;setSize(node,px);
 }
 if(node.matches('.clockDigits'))for(let i=0;i<3;i++){
  const range=document.createRange();range.selectNodeContents(node);
  const actual=range.getBoundingClientRect(),bar=node.closest('#matchClockHud').getBoundingClientRect();
  const available=Math.max(1,bar.height-safe*4);
  if(!actual.height||actual.height<=available)break;
  px*=available/actual.height*.985;setSize(node,px);
 }
 return px;
}
function render(){raf=0;const width=root.getBoundingClientRect().width;if(!width)return;
 const full=fullFit,dirty=new Set(dirtyText);fullFit=false;dirtyText.clear();
 const teamsChanged=[...dirty].some(node=>node.matches(groups.teams));
 const needsFit=node=>full||dirty.has(node)||(teamsChanged&&node.matches(groups.teams));
 const entries=[];
 const scoreFactor=config.all*config.scores/10000;
 if(full){
 root.dataset.largeTeamType='false'; // Team names always use one bounded line.
 root.style.setProperty('--afl-name-cell','4.6cqw');
 root.style.setProperty('--afl-score-cell',Math.min(12.5,9.2+Math.max(0,scoreFactor-1)*2.1)+'cqw');
 }
 for(const [group,selector]of Object.entries(groups))for(const node of root.querySelectorAll(selector)){
  if(!needsFit(node)||!measurable(node))continue;
  watchText(node);
  if(!originals.has(node))originals.set(node,{value:node.style.getPropertyValue('font-size'),priority:node.style.getPropertyPriority('font-size')});
  const old=originals.get(node);if(old.value)node.style.setProperty('font-size',old.value,old.priority);else node.style.removeProperty('font-size');
 }
 // Read every baseline after restoring parents, before writing any scaled font.
 for(const [group,selector]of Object.entries(groups))for(const node of root.querySelectorAll(selector))if(needsFit(node)&&measurable(node))entries.push({node,group,px:waitingLabel(node)?width*.08:activeClockLabel(node)?width*.065*config.all*config.info/10000:node.matches('#leagueProfileHint')?Math.max(baseline(node)*config.all*config.info/10000,width*.0365):node.matches('.clockDigits')?width*.068*config.all/100:node.matches('.frontKeeperTop strong')?width*.047*config.all/100:node.matches('.keeperGroupTitle')?width*.036*config.all/100:baseline(node)*config.all*config[group]/10000});
 let teamSize=Infinity;
 for(const item of entries){const px=fit(item.node,item.px);if(item.group==='teams')teamSize=Math.min(teamSize,px);}
 if(Number.isFinite(teamSize))for(const node of root.querySelectorAll(groups.teams))setSize(node,teamSize);
 if(full)window.dispatchEvent(new Event('resize'));
}
function schedule(node){if(node instanceof Element)dirtyText.add(node);else fullFit=true;if(!raf)raf=requestAnimationFrame(render);}
function apply(value,force=false){const clean=normalize(value),next=JSON.stringify(clean);config=clean;if(force||next!==signature){signature=next;schedule();}}
document.getElementById('broadcastTextPreviewToggle')?.addEventListener('click',e=>{const open=document.body.classList.toggle('aflTextPreview');e.currentTarget.textContent=open?'Tam ekran ayarlara dön':'Telefonda canlı önizlemeyi aç';schedule();window.dispatchEvent(new Event('resize'));});
for(const k of keys)id(k)?.addEventListener('input',()=>{fill(read());apply(read());});
document.getElementById('broadcastTextDefaults')?.addEventListener('click',()=>{fill({});apply({});});
window.addEventListener('ai-football-settings',e=>{
 const editing=document.getElementById('adminOverlay')?.classList.contains('show')||document.getElementById('leagueDrawer')?.classList.contains('show');
 // Incoming shared updates must not erase an unsaved local slider draft.
 if(editing)return;fill(e.detail?.broadcastText);apply(e.detail?.broadcastText);
});
// Auth, hidden buttons and drawer changes alter available space without resizing the canvas.
const dimensions=new WeakMap(),geometryObserver=new ResizeObserver(entries=>{
 let changed=false;for(const {target}of entries){const size=[target.clientWidth,target.clientHeight],before=dimensions.get(target);dimensions.set(target,size);if(!before||size.some((n,i)=>Math.abs(n-before[i])>.5))changed=true;}
 if(changed)schedule();
});
for(const node of [root,root.querySelector('.clockStatus'),document.getElementById('liveStartButton'),root.querySelector('.headRight'),document.getElementById('adminFrontKeeper')])if(node)geometryObserver.observe(node);
const layoutObserver=new MutationObserver(records=>{if(records.some(r=>r.type==='childList'||r.oldValue!==r.target.getAttribute(r.attributeName)))schedule();});
for(const node of [root,document.body,document.documentElement,document.getElementById('matchClockHud'),document.getElementById('liveStartButton')])if(node)layoutObserver.observe(node,{attributes:true,attributeOldValue:true,attributeFilter:['class','hidden','data-phase'],childList:node===root});
document.fonts?.ready.then(schedule);document.fonts?.addEventListener('loadingdone',schedule);
for(const selector of Object.values(groups))for(const node of root.querySelectorAll(selector))watchText(node);
window.AIFootballBroadcastText={normalize,read,fill,apply};
fill(config);apply(config,true);
})();
