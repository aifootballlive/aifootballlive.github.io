/* One durable match for every viewer of the permanent broadcast URL. */
(()=>{
 'use strict';
 const KEY='tiktok_match_v2',API='ws://127.0.0.1:21213/',owner=crypto.randomUUID(),LEASE=10000;
 let row=null,match=null,installed=false,connected=false,socket=null,retry=null,reading=null,chain=Promise.resolve(),channel=null,channelReady=false,lastRead=0,lastRules='',errorText='';
 const pendingRequests=new Map(),requestInbox=new Map(),REQUEST_STORE='aiFootballSharedShotRequests.v1';
 try{for(const p of JSON.parse(sessionStorage.getItem(REQUEST_STORE)||'[]'))if(validRequest(p))pendingRequests.set(p.id,{payload:p,lastSent:0,resolve:null});}catch{}
 const inbox=new Map(),played=new Set(),timers=new Map(),clone=v=>JSON.parse(JSON.stringify(v));
 function ready(){try{return typeof db!=='undefined'&&typeof state!=='undefined'&&typeof render==='function';}catch{return false;}}
 function admin(){try{return adminAuthed===true;}catch{return false;}}
 function owns(m=match){return connected&&admin()&&m?.lease?.owner===owner&&m.lease.until>Date.now();}
 function paint(){document.documentElement.dataset.tiktokConnection=connected?'connected':'waiting';if(!ready())return;const el=document.getElementById('connectionStatus');if(el&&admin())el.textContent=errorText||(!match?'Ortak maç bekleniyor':owns()?'TikFinity bağlı • Ortak maç':'Ortak maça bağlı');}
 function restore(){if(!ready()||!match)return;for(const t of ['A','B']){state[t].score=Number(match.scores[t])||0;state.keeper[t]=Number(match.keeper[t])||0;state[t].queue=match.jobs.filter(j=>j.team===t).length;}render();paint();}
 function legend(){for(const [i,panel]of [...document.querySelectorAll('.broadcastControls .panel')].entries()){for(const [j,b]of [...panel.querySelectorAll('.shot')].entries()){b.hidden=!!j;if(j)continue;b.querySelector('.giftVisual').textContent=i?'🎁':'🌹';b.querySelector('.giftEffect').textContent='1 şut';b.querySelector('.coin').textContent=i?'TikTok':'Gül';b.parentElement.style.gridTemplateColumns='1fr';}for(const b of panel.querySelectorAll('.def'))b.parentElement.hidden=true;for(const [j,label]of [...panel.querySelectorAll('.sectionLabel')].entries()){label.hidden=!!j;if(!j)label.textContent='BAĞLI HEDİYE';}}}
 function consider(cue){
  if(!cue||cue.finishedAt||played.has(cue.id)||timers.has(cue.id))return;
  const start=async()=>{
   timers.delete(cue.id);if(match?.cue?.id!==cue.id||match.cue.finishedAt)return;
   if(!window.AIFootball3D?.videoStatus?.motionReady){if(Date.now()-cue.startsAt<2500)timers.set(cue.id,setTimeout(start,100));return;}
   played.add(cue.id);if(Date.now()-cue.startsAt>2500)return; // Never replay an old shot on a newly opened page.
   window.AIFootball3D.beginShot(cue.team,{startsAt:cue.startsAt,variation:cue.variation});
   window.AIFootball3D.finishShot(cue.team,cue.result);
   log(nameOf(cue.team)+' şut çekiyor!');
   setTimeout(()=>{if(match?.cue?.id!==cue.id)return;log(cue.result==='goal'?'GOL! '+nameOf(cue.team):nameOf(cue.team==='A'?'B':'A')+' kalecisi kurtardı!');if(cue.result==='goal')celebrateGoal(cue.team);},Math.max(0,cue.outcomeAt-Date.now()));
  };
  timers.set(cue.id,setTimeout(start,Math.max(0,cue.startsAt-Date.now())));
 }
 function validRequest(p){return p&&typeof p.id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id)&&['A','B'].includes(p.team)&&Number.isSafeInteger(p.count)&&p.count>=1&&p.count<=50&&Number.isFinite(p.sentAt)&&Math.abs(Date.now()-p.sentAt)<600000;}
 function rememberRequests(){try{sessionStorage.setItem(REQUEST_STORE,JSON.stringify([...pendingRequests.values()].map(r=>r.payload)));}catch{}}
 function acknowledgeRequests(){for(const [id,r]of pendingRequests){if(match?.commandReceipts?.includes(id)){pendingRequests.delete(id);r.resolve?.(true);}else if(!validRequest(r.payload)){pendingRequests.delete(id);r.resolve?.(false);log('Şut isteği zaman aşımına uğradı; tekrar dene');}}rememberRequests();}
 function receiveRequest(p){if(admin()&&validRequest(p)&&!match?.commandReceipts?.includes(p.id))requestInbox.set(p.id,p);}
 async function flushRequestInbox(){for(const [id,p]of requestInbox){if(!owns())return;if(!validRequest(p)){requestInbox.delete(id);continue;}await change(m=>{m.commandReceipts ||= [];if(m.commandReceipts.includes(id))return false;m.commandReceipts.push(id);m.commandReceipts=m.commandReceipts.slice(-2000);for(let i=0;i<p.count;i++)m.jobs.push({id:'button:'+id+':'+i,team:p.team});});if(match?.commandReceipts?.includes(id))requestInbox.delete(id);}}
 async function sendRequests(){acknowledgeRequests();for(const r of pendingRequests.values()){if(Date.now()-r.lastSent<2000)continue;r.lastSent=Date.now();if(owns())receiveRequest(r.payload);else if(channelReady)await channel.send({type:'broadcast',event:'shot_request',payload:r.payload});}}
 function ensureChannel(){if(channel||!row)return;channel=db.channel('tiktok-match-v2-'+row.id,{config:{broadcast:{ack:true,self:true}}}).on('postgres_changes',{event:'UPDATE',schema:'public',table:'games',filter:'id=eq.'+row.id},p=>apply(p.new)).on('broadcast',{event:'shot_request'},({payload})=>receiveRequest(payload)).subscribe(status=>{channelReady=status==='SUBSCRIBED';});}
 function apply(r){
  if(!r?.id)return;const m=r.rules?.[KEY];
  if(match&&m&&m.revision<match.revision)return;
  row=r;ids.game=r.id;
  const presentation={...r.rules};delete presentation[KEY];const text=JSON.stringify(presentation);
  if(text!==lastRules){lastRules=text;applyRules(presentation);}
  if(m?.version===2){match=m;restore();acknowledgeRequests();consider(m.cue);if(m.cue?.finishedAt)window.AIFootball3D?.finishSyncedShot?.(m.cue.startsAt);}else paint();
 }
 async function read(){if(reading)return reading;reading=(async()=>{const {data,error}=await db.from('games').select('id,rules').eq('name','AI Football Live').limit(1).single();if(error)throw error;apply(data);lastRead=Date.now();return data;})().finally(()=>reading=null);return reading;}
 function change(edit,leaseRequired=true,patch=null){const run=async()=>{
  if(!admin())return false;
  for(let attempt=0;attempt<6;attempt++){
   const base=await read(),existing=base.rules?.[KEY];if(!existing)return false;
   if(leaseRequired&&!owns(existing))return false;
   const next=clone(existing);if(edit(next)===false)return false;
   next.revision=existing.revision+1;next.updatedAt=Date.now();
   if(next.lease?.owner===owner)next.lease.until=Date.now()+LEASE;
   const rules={...base.rules,...(patch||{}),[KEY]:next};
   const {data,error}=await db.from('games').update({rules}).eq('id',base.id).eq('rules->tiktok_match_v2->>revision',existing.revision).select('id,rules');
   if(error)throw error;if(data?.length){apply(data[0]);errorText='';return true;}
  }
  throw Error('Ortak maç güncellemesi yeniden denenecek');
 };const job=chain.then(run);chain=job.catch(e=>{errorText='Maç bağlantısı bekleniyor';paint();console.warn(e.message);});return job;}
 async function digest(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
 async function seed(){
  if(!admin()||!connected||match)return;
  const base=await read();if(base.rules?.[KEY])return;
  let legacy=null;try{legacy=JSON.parse(localStorage.getItem('aiFootballTikTokMatch.v1'));}catch{}
  // The user explicitly chose the current broadcast's 0–0, rather than the old cloud's 17–9.
  const initial={version:2,revision:1,scores:{A:0,B:0},keeper:{A:Number(legacy?.match?.keeper?.A??state.keeper.A)||0,B:Number(legacy?.match?.keeper?.B??state.keeper.B)||0},jobs:[],cue:null,receipts:await Promise.all((legacy?.seen||[]).slice(-4000).map(digest)),accepted:Number(legacy?.accepted)||0,lastGift:null,shotSequence:0,idleEpoch:Date.now(),updatedAt:Date.now(),lease:{owner,until:Date.now()+LEASE}};
  const rules={...base.rules,[KEY]:initial};const {data,error}=await db.from('games').update({rules}).eq('id',base.id).eq('rules',JSON.stringify(base.rules)).select('id,rules');
  if(error)throw error;if(data?.length)apply(data[0]);else await read();
 }
 async function receive(raw){
  if(raw?.event!=='gift'&&raw?.type!=='gift')return false;
  const g=raw.data||{},id=g.transactionId||g.msgId||g.id,name=g.giftName??g.giftDetails?.giftName,giftId=g.giftId??g.giftDetails?.giftId,type=g.giftType??g.giftDetails?.giftType;
  if(!id||Number(type)===1&&g.repeatEnd!==true)return false;
  const n=String(name||'').trim().toLocaleLowerCase('tr-TR'),team=['rose','gül'].includes(n)?'A':n==='tiktok'?'B':null,count=Number(g.repeatCount??1);
  if(!team||!Number.isSafeInteger(count)||count<1||count>10000)return false;
  const key=await digest(JSON.stringify([String(id),String(g.uniqueId||g.user?.uniqueId||g.userId||g.user?.userId||''),String(giftId||name||'')]));
  if(match?.receipts.includes(key))return false;
  inbox.set(key,{team,count,name:String(name||giftId)});return true;
 }
 async function flush(){for(const [key,g]of inbox){if(!owns())return;await change(m=>{if(m.receipts.includes(key))return false;m.receipts.push(key);m.receipts=m.receipts.slice(-4000);m.accepted++;m.lastGift={team:g.team,count:g.count,name:g.name};for(let i=0;i<g.count;i++)m.jobs.push({id:key+':'+i,team:g.team});});if(match?.receipts.includes(key))inbox.delete(key);}}
 async function advance(){
  if(!owns())return;const cue=match.cue,now=Date.now();
  if(cue&&!cue.finishedAt){
   if(!cue.committed&&now>=cue.outcomeAt){await change(m=>{if(m.cue?.id!==cue.id||m.cue.committed)return false;m.scores=m.cue.after.scores;m.keeper=m.cue.after.keeper;m.cue.committed=true;});}
   const completed=played.has(cue.id)&&now>cue.startsAt+2200&&!window.AIFootball3D?.isAnimating;
   if(now>=cue.endsAt||completed)await change(m=>{if(m.cue?.id!==cue.id||!m.cue.committed||m.cue.finishedAt)return false;m.cue.finishedAt=Date.now();m.cooldownUntil=Date.now()+Math.max(900,Number(state.shotDelay)||3000);});
   return;
  }
  if(!match.jobs.length||now<(match.cooldownUntil||0)||!window.AIFootball3D?.videoStatus?.motionReady)return;
  await change(m=>{
   if(m.cue&&!m.cue.finishedAt||!m.jobs.length||Date.now()<(m.cooldownUntil||0))return false;
   const j=m.jobs.shift(),def=j.team==='A'?'B':'A',after={scores:{...m.scores},keeper:{...m.keeper}},goal=after.keeper[def]<=0;
   if(goal){after.scores[j.team]++;after.keeper[def]=Number(state.startKeeper)||100;}else after.keeper[def]=Math.max(0,after.keeper[def]-(Number(state.keeperCost)||10));
   const startsAt=Date.now()+1200;
   m.cue={id:j.id,team:j.team,result:goal?'goal':'save',variation:m.shotSequence++,startsAt,outcomeAt:startsAt+(window.AIFootball3D?.getShotTiming?.(j.team)?.outcomeMs||1850),endsAt:startsAt+30000,after,committed:false,finishedAt:null};
  });
 }
 async function tick(){
  try{
   if(Date.now()-lastRead>1000)await read();ensureChannel();await sendRequests();if(admin()&&!connected&&!retry)connect();
   if(admin()&&connected){if(!match)await seed();if(match&&!owns()&&(!match.lease||match.lease.until<Date.now()))await change(m=>{if(m.lease?.until>Date.now())return false;m.lease={owner,until:Date.now()+LEASE};},false);
    if(owns()){if(match.lease.until<Date.now()+6000)await change(()=>{});await flush();await flushRequestInbox();await advance();}}
   errorText='';paint();
  }catch(e){errorText='Maç bağlantısı bekleniyor';paint();console.warn(e.message);}finally{setTimeout(tick,350);}
 }
 function connect(){if(!admin())return;if(socket&&[WebSocket.CONNECTING,WebSocket.OPEN].includes(socket.readyState))return;clearTimeout(retry);retry=null;try{const w=socket=new WebSocket(API);w.onopen=()=>{connected=true;paint();};w.onmessage=e=>{try{receive(JSON.parse(e.data)).catch(console.warn);}catch{}};w.onerror=()=>{};w.onclose=()=>{connected=false;paint();retry=setTimeout(connect,5000);};}catch{retry=setTimeout(connect,5000);}}
 function install(){if(installed)return;if(!ready()){setTimeout(install,50);return;}installed=true;legend();read().then(ensureChannel).catch(e=>console.warn(e.message));tick();}
 window.AIFootballTikTok={get active(){return true;},get connected(){return connected;},getStatus(){return {active:true,connected,shared:!!match,leader:owns(),revision:match?.revision,accepted:match?.accepted||0,lastGift:match?.lastGift||null,pending:match?.jobs.length||0,waitingRequests:pendingRequests.size,channelReady};},getClock(){return match?{epoch:match.idleEpoch}:null;},activate:install,restore,onShotStarted(){},onShotResolved(){},reconnect:connect,
  async saveRules(patch){const clean={...patch};delete clean[KEY];try{if(!await change(()=>{},false,clean))throw Error("Ortak maç henüz hazır değil");return {error:null};}catch(error){return {error};}},
  manualShot(team,n){n=Math.floor(Number(n)||1);if(!['A','B'].includes(team)||n<1||n>50)return Promise.resolve(false);const payload={id:crypto.randomUUID(),team,count:n,sentAt:Date.now()};return new Promise(resolve=>{pendingRequests.set(payload.id,{payload,lastSent:0,resolve});rememberRequests();log(nameOf(team)+' için şut isteği gönderildi');sendRequests().catch(e=>console.warn(e.message));});},
  manualKeeper(team,n){if(!admin()||!['A','B'].includes(team))return false;return change(m=>{m.keeper[team]+=Math.max(0,Number(n)||0);},false);},
  reset(){if(!admin())return false;return change(m=>{if(m.cue&&!m.cue.finishedAt)return false;m.scores={A:0,B:0};m.keeper={A:Number(state.startKeeper)||100,B:Number(state.startKeeper)||100};m.jobs=[];m.cue=null;},false);}
 };
 install();connect();document.addEventListener('pointerdown',()=>{if(!connected)connect();});window.addEventListener('beforeunload',()=>{clearTimeout(retry);socket?.close();});
})();
