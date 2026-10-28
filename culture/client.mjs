import {countries,byId} from './countries.mjs';
import {CultureAudio} from './audio.mjs';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),mode=params.get('mode')==='test'?'test':'live';
let state=null,offset=0,sort='points',lastRanks='',lastLeader=undefined,otherStamp='',ws,retry,polling=false;
const flags=id=>`./assets/culture-v1/flags/${id.toLowerCase()}.svg`,audio=new CultureAudio();
const number=n=>Math.max(0,Number(n)||0).toLocaleString('tr-TR'),format=n=>{const sec=Math.max(0,Math.floor((Number(n)||0)/1000));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');};
function put(id,value){if($(id).textContent!==String(value))$(id).textContent=String(value);}
function leadTime(id,now){return Number(state?.leaderTimes[id]||0)+(state?.status==='running'&&id===state.leader?Math.max(0,now-state.serverTime):0);}
function receive(next){if(!next||next.version!==2)return;state=next;offset=location.hostname.endsWith('github.io')?0:next.serverTime-Date.now();render();window.dispatchEvent(new CustomEvent('culture-state',{detail:next}));}
function render(){if(!state)return;const now=Date.now()+offset,leader=byId[state.leader];
 put('seasonNum',state.season);put('roundNum',state.round);$('modeBadge').hidden=mode!=='test';
 put('leadName',leader?leader.name.toLocaleUpperCase('tr-TR'):'LİDER BEKLENİYOR');put('leadScore',number(leader?state.scores[leader.id]:0));put('leadTime',format(leader?leadTime(leader.id,now):0));
 put('remaining',format(state.status==='running'?state.endsAt-now:state.status==='paused'?state.remaining:state.status==='completed'?0:state.config.durationMinutes*60000));
 put('likesText',state.config.likesEnabled?state.config.likeThreshold+' beğeni = herkese +1':'Puanlama kapalı');put('likesCount',number(state.likes));
 if(lastLeader!==state.leader){lastLeader=state.leader;const shown=leader||byId.ID;for(const id of ['leadFlag','flagWave']){$(id).src=flags(shown.id);$(id).alt=leader?leader.name+' bayrağı':'';}
  const image=$('countryPortrait');$('portraitMissing').hidden=!!shown.image;if(shown.image){image.style.opacity='0';image.onload=()=>image.style.opacity='1';image.src=shown.image;}else image.style.opacity='0';
  if(leader)audio.setLeader(leader.id,state.config);else audio.setLeader(null,state.config);
 }
 audio.configure(state.config);
 const ids=state.order.slice();if(sort==='time'){const positions=new Map(ids.map((id,i)=>[id,i]));ids.sort((a,b)=>leadTime(b,now)-leadTime(a,now)||positions.get(a)-positions.get(b));}
 const top=ids.slice(0,10),fingerprint=top.map(id=>id+':'+(state.scores[id]||0)).join(',')+sort;
 if(fingerprint!==lastRanks){const parent=$('ranks'),previous=new Map([...parent.children].map(el=>[el.dataset.id,el.getBoundingClientRect().top])),old=new Map([...parent.children].map(el=>[el.dataset.id,el]));
  for(const [i,id]of top.entries()){const c=byId[id],row=old.get(id)||document.createElement('div');row.dataset.id=id;row.className='rank'+(state.leader===id?' first':'');row.replaceChildren();const pos=document.createElement('span');pos.className='pos';pos.textContent=i+1;const who=document.createElement('span');who.className='who';const flag=document.createElement('img');flag.src=flags(id);flag.alt='';const name=document.createElement('span');name.textContent=c.name;who.append(flag,name);const pts=document.createElement('span');pts.className='pts';pts.textContent=number(state.scores[id]);const time=document.createElement('span');time.className='time';time.textContent=format(leadTime(id,now));row.append(pos,who,pts,time);parent.append(row);}
  for(const row of [...parent.children])if(!top.includes(row.dataset.id))row.remove();
  if(!matchMedia('(prefers-reduced-motion:reduce)').matches)for(const row of parent.children){const y=previous.get(row.dataset.id);if(y!==undefined){const delta=y-row.getBoundingClientRect().top;if(Math.abs(delta)>2)row.animate([{transform:`translateY(${delta}px)`},{transform:'translateY(0)'}],{duration:500,easing:'ease-in-out'});}}
  lastRanks=fingerprint;
 }else for(const row of $('ranks').children)row.querySelector('.time').textContent=format(leadTime(row.dataset.id,now));
 const count=state.config.rotateCount,rest=state.order.slice(10),page=Math.floor(now/(state.config.rotateSeconds*1000))%Math.max(1,Math.ceil(rest.length/count)),stamp=rest.join(',')+':'+page+':'+count;
 if(stamp!==otherStamp){otherStamp=stamp;const parent=$('otherNames');parent.replaceChildren();parent.dataset.count=count;for(const id of rest.slice(page*count,page*count+count)){const box=document.createElement('div');box.className='other';const image=document.createElement('img');image.src=flags(id);image.alt='';const name=document.createElement('span');name.textContent=byId[id].name;box.append(image,name);parent.append(box);}}
 put('rotationLabel',state.config.rotateSeconds+' sn');$('announcement').hidden=state.status!=='completed';$('winnerFlag').hidden=!state.winner;if(state.winner)$('winnerFlag').src=flags(state.winner);put('winnerTitle',state.winner?byId[state.winner].name.toLocaleUpperCase('tr-TR')+' KAZANDI!':'TUR BİTTİ · EŞİTLİK');put('winnerDetail',state.advanceAt?'Yeni tur '+format(Math.max(0,state.advanceAt-now))+' sonra başlayacak.':'Yeni tur yönetici tarafından başlatılacak.');
}
function connection(text){put('connectionBadge',text);}
function connect(){if(location.hostname.endsWith('github.io')){connection('YEREL YAYIN VERİLERİ BEKLENİYOR');return;}const url=new URL('./culture-api/live',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';url.searchParams.set('mode',mode);ws=new WebSocket(url);ws.onopen=()=>connection(mode==='test'?'DENEME BAĞLANTISI':'ORTAK YAYIN EKRANI');ws.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.type==='state')receive(m.state);}catch{}};ws.onclose=()=>{connection('YENİDEN BAĞLANILIYOR');clearTimeout(retry);retry=setTimeout(connect,2500);};ws.onerror=()=>ws.close();}
async function refresh(){if(polling)return;polling=true;try{const remote=location.hostname.endsWith('github.io'),url=remote?'https://raw.githubusercontent.com/aifootballlive/aifootballlive.github.io/culture-live-data/culture-public.json?check='+Date.now():'./culture-api/state?mode='+mode;const r=await fetch(url,{cache:'no-store',credentials:remote?'omit':'same-origin'});if(r.ok){const data=await r.json();receive(data.state);if(remote)connection(Date.now()-Date.parse(data.publishedAt)>90000?'SON KAYIT · YAYIN BAĞLANTISI YOK':'YAYIN TABLOSU · ~15–60 SN GECİKME');}}catch{}finally{polling=false;}}
$('sortPoints').onclick=()=>{sort='points';$('sortPoints').setAttribute('aria-pressed','true');$('sortTime').setAttribute('aria-pressed','false');lastRanks='';render();};$('sortTime').onclick=()=>{sort='time';$('sortPoints').setAttribute('aria-pressed','false');$('sortTime').setAttribute('aria-pressed','true');lastRanks='';render();};
$('soundStart').onclick=async()=>{try{await audio.start();$('soundStart').hidden=true;}catch{put('soundStart','SESİ TEKRAR BAŞLAT');}};
window.CultureAPI={getState:()=>state,countries,readOnly:true};
// Static Pages is explicitly a read-only visual preview; never a second game engine.
if(location.hostname.endsWith('github.io')){const {fresh,publicState}=await import('./engine.mjs');receive(publicState(fresh('live'),Date.now()));}
connect();refresh();setInterval(refresh,5000);setInterval(render,250);
