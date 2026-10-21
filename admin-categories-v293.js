/* Group the existing controls without recreating them or changing game state. */
(()=>{'use strict';
 const overlay=document.getElementById('adminOverlay'),body=overlay?.querySelector('.adminBody'),head=overlay?.querySelector('.adminHead'),scroll=overlay?.querySelector('.admin');if(!body||!head||!scroll)return;
 const groups=[['match','Maç'],['teams','Takımlar'],['likes','Beğeni'],['reports','İstatistik'],['appearance','Görünüm'],['audio','Ses'],['season','Sezon'],['security','Güvenlik']];
 const nav=document.createElement('div');nav.id='adminCategoryTabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Ayar kategorileri');
 const panels=new Map(),buttons=new Map(),original=[...body.children];
 for(const [id,label] of groups){const panel=document.createElement('section');panel.id='adminCategory-'+id;panel.className='adminCategoryPane';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','adminCategoryTab-'+id);panel.hidden=true;panels.set(id,panel);const button=document.createElement('button');button.id='adminCategoryTab-'+id;button.type='button';button.textContent=label;button.setAttribute('role','tab');button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-selected','false');button.tabIndex=-1;button.addEventListener('click',()=>activate(id));buttons.set(id,button);nav.append(button);}
 const savebar=document.createElement('div');savebar.id='adminCategorySavebar';
 const put=(id,node)=>{if(node)panels.get(id).append(node);};
 for(const node of original){
  if(node.id==='likeBonusSettings'){put('likes',node);continue;}
  if(node.id==='matchReportsSettings'){put('reports',node);continue;}
  if(node.id==='seasonResetSettings'){put('season',node);continue;}
  if(node.id==='broadcastTextSettings'||node.classList.contains('aflFontScalePanel')){put('appearance',node);continue;}
  if(node.classList.contains('adminStats')||node.id==='adminTeamQueueReset'||node.querySelector('#setScoreA')){put('teams',node);continue;}
  if(node.querySelector('#setSoundMaster')){put('audio',node);continue;}
  if(node.querySelector('#setCameraZoom')||node.querySelector('.adminSectionTitle')?.textContent==='GÖRÜNTÜ ÖNİZLEMESİ'){put('appearance',node);continue;}
  if(node.tagName==='A'){put('security',node);continue;}
  if(node.classList.contains('adminActions')){
   for(const child of [...node.children])if(child.id==='adminSaveStatus'||child.getAttribute('onclick')==='applyAdminSettings()')savebar.append(child);
   put('match',node);continue;
  }
  if(node.classList.contains('adminRoundControls')){put('security',node.querySelector('#guestTrialToggle'));for(const p of [...node.querySelectorAll('p')])put('security',p);put('match',node);continue;}
  if(node.classList.contains('adminSecondaryActions')){put('security',node.querySelector('[onclick="logoutAdmin()"]'));put('match',node);continue;}
  put('match',node);
 }
 body.append(...panels.values(),savebar);head.append(nav);
 const style=document.createElement('style');style.textContent='#adminOverlay .adminHead{flex-wrap:nowrap!important;flex-direction:column!important;align-items:stretch!important;height:auto!important;max-height:none!important}#adminOverlay .adminHead>strong{flex:0 0 auto!important}#adminOverlay .adminHead>.drawerHeaderActions{width:100%}#adminCategoryTabs{flex:0 0 auto;width:100%;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:9px}#adminCategoryTabs button{min-width:0;min-height:38px;border:1px solid #58728f;border-radius:8px;background:#102139;color:#d6e1f2;padding:7px 4px;font:800 14px/1.2 system-ui;cursor:pointer}#adminCategoryTabs button[aria-selected=true]{background:#287c70;border-color:#70d2b9;color:white;box-shadow:inset 0 -3px 0 #a5ffe3}#adminCategoryTabs button:focus-visible{outline:3px solid #ffd85b;outline-offset:1px}#adminOverlay .adminCategoryPane[hidden],#adminCategorySavebar[hidden]{display:none!important}#adminOverlay .adminCategoryPane{min-width:0}#adminOverlay .adminCategoryPane>.adminSection:first-child{margin-top:0}#adminCategorySavebar{position:sticky;bottom:-1px;z-index:4;margin-top:12px;padding:10px;background:#17263d;border:1px solid #4d6784;border-radius:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}#adminCategorySavebar>.applyBtn{flex:1;min-width:180px;min-height:42px}#adminCategory-security>.adminBtn,#adminCategory-security>#guestTrialToggle{display:block;width:100%;margin:10px 0;padding:12px;background:#263a55;color:#fff;border:1px solid #536c8c;border-radius:8px;font:inherit}#adminCategory-match .adminSecondaryActions{margin-top:10px}@media(max-width:520px){#adminCategoryTabs{gap:5px}#adminCategoryTabs button{font-size:13px;min-height:37px}#adminCategorySavebar>.applyBtn{min-width:150px}}';document.head.append(style);
 let active='',busy=false;const positions=new Map();
 function activate(id,focus=false){
  if(!panels.has(id)||busy)return;busy=true;if(active)positions.set(active,{body:body.scrollTop,outer:scroll.scrollTop});
  active=id;for(const [key,panel]of panels){panel.hidden=key!==id;const button=buttons.get(key);button.setAttribute('aria-selected',String(key===id));button.tabIndex=key===id?0:-1;}
  savebar.hidden=!['match','teams','appearance','audio'].includes(id);
  try{sessionStorage.setItem('afl.adminCategory.v293',id);}catch{}
  body.scrollTop=positions.get(id)?.body||0;scroll.scrollTop=positions.get(id)?.outer||0;if(focus)buttons.get(id).focus({preventScroll:true});busy=false;
 }
 nav.addEventListener('keydown',event=>{const ids=groups.map(g=>g[0]),index=ids.indexOf(active);let next;if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(index+1)%ids.length;else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(index+ids.length-1)%ids.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=ids.length-1;else return;event.preventDefault();activate(ids[next],true);});
 let remembered='match';try{remembered=sessionStorage.getItem('afl.adminCategory.v293')||remembered;}catch{}activate(panels.has(remembered)?remembered:'match');
})();
