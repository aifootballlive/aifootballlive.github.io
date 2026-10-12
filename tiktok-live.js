/* TikFinity Desktop receiver for the permanent public broadcast URL. */
(()=>{
 'use strict';
 const STORE='aiFootballTikTokMatch.v1',URL='ws://127.0.0.1:21213/';
 let saved=null;
 try{const v=JSON.parse(localStorage.getItem(STORE)||'null');if(v?.version===1)saved=v;}catch{}
 let active=!!saved,connected=false,installed=false,socket=null,retry=null,current=null,accepted=0,lastGift=null;
 const waitingGifts=[];
 const seen=new Set(Array.isArray(saved?.seen)?saved.seen.slice(-4000):[]);
 const clean=v=>String(v??'').trim().toLocaleLowerCase('tr-TR');
 const mappings={A:['rose','gül'],B:['tiktok']};
 function ready(){try{return typeof state!=='undefined'&&typeof localShotQueue!=='undefined'&&typeof render==='function';}catch{return false;}}
 function status(){return {active,connected,accepted,lastGift,pending:ready()?localShotQueue.length:0};}
 function paintStatus(){document.documentElement.dataset.tiktokConnection=connected?'connected':'waiting';if(ready()&&active&&typeof adminAuthed!=='undefined'&&adminAuthed){const el=document.getElementById('connectionStatus');if(el)el.textContent=connected?'TikFinity bağlı':'TikFinity bekleniyor';}}
 function capture(){if(!ready()||!active)return;const match={A:{score:Number(state.A.score)||0},B:{score:Number(state.B.score)||0},keeper:{A:Number(state.keeper.A)||0,B:Number(state.keeper.B)||0},startKeeper:Number(state.startKeeper)||100,keeperCost:Number(state.keeperCost)||10,shotDelay:Number(state.shotDelay)||3000};saved={version:1,match,jobs:localShotQueue.slice(),current,seen:[...seen].slice(-4000),lastGift,accepted};try{localStorage.setItem(STORE,JSON.stringify(saved));}catch{}paintStatus();}
 function restore(){if(!ready()||!active||!saved?.match)return;const m=saved.match;for(const t of ['A','B']){state[t].score=Math.max(0,Number(m[t]?.score)||0);state.keeper[t]=Math.max(0,Number(m.keeper?.[t])||0);}for(const k of ['startKeeper','keeperCost','shotDelay'])if(Number.isFinite(Number(m[k])))state[k]=Number(m[k]);state.A.queue=localShotQueue.filter(t=>t==='A').length;state.B.queue=localShotQueue.filter(t=>t==='B').length;render();paintStatus();}
 function truthfulLegend(){
  document.body.classList.add('tiktokHost');
  for(const [i,panel]of [...document.querySelectorAll('.broadcastControls .panel')].entries()){
   for(const [j,b]of [...panel.querySelectorAll('.shot')].entries()){if(j){b.style.display='none';continue;}const visual=b.querySelector('.giftVisual'),effect=b.querySelector('.giftEffect'),coin=b.querySelector('.coin');if(visual)visual.textContent=i?'🎁':'🌹';if(effect)effect.textContent='1 şut';if(coin)coin.textContent=i?'TikTok':'Gül';if(b.parentElement)b.parentElement.style.gridTemplateColumns='1fr';}
   for(const b of panel.querySelectorAll('.def')){b.style.display='none';if(b.parentElement)b.parentElement.style.display='none';}
   for(const [j,label]of [...panel.querySelectorAll('.sectionLabel')].entries()){if(j)label.style.display='none';else label.textContent='BAĞLI HEDİYE';}
  }
 }
 function processWhenReady(){if(!active||!ready())return;if(!window.AIFootball3D?.videoStatus?.motionReady){setTimeout(processWhenReady,200);return;}runLocalShotQueue();}
 function install(){if(!active||installed)return;if(!ready()){setTimeout(install,50);return;}installed=true;
  accepted=Number(saved?.accepted)||0;lastGift=saved?.lastGift||null;
  if(saved){localShotQueue.length=0;if(['A','B'].includes(saved.current))localShotQueue.push(saved.current);for(const t of saved.jobs||[])if(['A','B'].includes(t))localShotQueue.push(t);current=null;restore();}
  truthfulLegend();capture();for(const raw of waitingGifts.splice(0))receive(raw);processWhenReady();
 }
 function enqueue(team,count){if(!['A','B'].includes(team)||!Number.isSafeInteger(count)||count<1||count>10000)return false;install();if(!installed)return false;for(let i=0;i<count;i++)localShotQueue.push(team);state[team].queue+=count;render();capture();processWhenReady();return true;}
 function receive(raw){
  if(raw?.event!=='gift'&&raw?.type!=='gift')return false;
  const g=raw.data||{};if(g.repeatEnd===false||(Number(g.giftType)===1&&g.repeatEnd!==true))return false;
  const keys=[g.giftId,g.giftName].filter(v=>v!=null).map(clean),teams=['A','B'].filter(t=>mappings[t].some(k=>keys.includes(k)));
  if(teams.length!==1)return false;
  const id=g.transactionId||g.msgId||g.id;if(!id)return false;
  const key=JSON.stringify([String(id),String(g.uniqueId||g.userId||''),String(g.giftId||g.giftName||'')]);if(seen.has(key))return false;
  const count=Number(g.repeatCount??1);if(!Number.isSafeInteger(count)||count<1||count>10000)return false;
  if(!active)return false;install();if(!installed){waitingGifts.push(raw);return false;}
  seen.add(key);if(seen.size>4000)seen.delete(seen.values().next().value);
  accepted++;lastGift={name:String(g.giftName||g.giftId),team:teams[0],count};
  return enqueue(teams[0],count);
 }
 function connect(){
  if(socket&&[WebSocket.CONNECTING,WebSocket.OPEN].includes(socket.readyState))return;
  clearTimeout(retry);
  try{const w=socket=new WebSocket(URL);w.onopen=()=>{if(socket!==w)return;connected=true;active=true;install();paintStatus();};
   w.onmessage=e=>{if(socket!==w)return;try{receive(JSON.parse(e.data));}catch{}};
   w.onerror=()=>{};w.onclose=()=>{if(socket!==w)return;connected=false;paintStatus();retry=setTimeout(connect,5000);};
  }catch{connected=false;paintStatus();retry=setTimeout(connect,5000);}
 }
 window.AIFootballTikTok={get active(){return active;},get connected(){return connected;},getStatus:status,activate:install,restore,
  onShotStarted(team){if(active){current=team;capture();}},onShotResolved(){if(active){current=null;capture();}},
  manualShot(team,count){return enqueue(team,Math.floor(Number(count)||1));},
  manualKeeper(team,amount){if(!active||!ready()||!['A','B'].includes(team))return;state.keeper[team]+=Math.max(0,Number(amount)||0);render();capture();},
  reset(){if(!active||!ready()||localShotBusy)return false;localShotQueue.length=0;current=null;for(const t of ['A','B']){state[t].score=0;state[t].queue=0;state.keeper[t]=Number(state.startKeeper)||100;}render();capture();return true;},reconnect:connect
 };
 if(active)install();connect();
 document.addEventListener('pointerdown',()=>{if(!connected)connect();});
 window.addEventListener('beforeunload',()=>{clearTimeout(retry);capture();socket?.close();});
})();
