/* One durable match for every viewer of the permanent broadcast URL. */
(()=>{
 'use strict';
 const KEY='tiktok_match_v2',API='ws://127.0.0.1:21213/',owner=crypto.randomUUID(),LEASE=10000;
 let row=null,match=null,installed=false,connected=false,socket=null,retry=null,reading=null,chain=Promise.resolve(),channel=null,channelReady=false,lastRead=0,lastRules='',errorText='';
 const pendingRequests=new Map(),requestInbox=new Map(),REQUEST_STORE='aiFootballSharedShotRequests.v1';
 try{for(const p of JSON.parse(sessionStorage.getItem(REQUEST_STORE)||'[]'))if(validRequest(p))pendingRequests.set(p.id,{payload:p,lastSent:0,resolve:null});}catch{}
 const endedCues=new Set(),stagedStarts=new Map();
 const inbox=new Map(),played=new Set(),timers=new Map(),clone=v=>JSON.parse(JSON.stringify(v));
 function ready(){try{return typeof db!=='undefined'&&typeof state!=='undefined'&&typeof render==='function';}catch{return false;}}
 function admin(){try{return adminAuthed===true;}catch{return false;}}
 function owns(m=match){return admin()&&m?.lease?.owner===owner&&m.lease.until>Date.now();}
 function paint(){document.documentElement.dataset.tiktokConnection=connected?'connected':'waiting';if(!ready())return;const el=document.getElementById('connectionStatus');if(el&&admin())el.textContent=errorText||(!match?'Ortak maç bekleniyor':owns()?'TikFinity bağlı • Ortak maç':'Ortak maça bağlı');}
 function restore(){if(!ready()||!match)return;for(const t of ['A','B','C','D']){state[t].score=Number(match.scores[t])||0;state.keeper[t]=Number(match.keeper[t]??state.startKeeper)||0;state[t].queue=match.jobs.filter(j=>j.team===t).length+(match.nextCue?.team===t?1:0);}render();paint();}
 function legend(){const icons=['rose','tiktok','balloon','mirwas'];for(const [i,panel]of [...document.querySelectorAll('.broadcastControls .panel')].entries()){for(const [j,b]of [...panel.querySelectorAll('.shot')].entries()){b.hidden=!!j;if(j)continue;const image=document.createElement('img');image.src='./assets/gifts-v137/'+icons[i]+'.png';image.alt='';b.querySelector('.giftVisual').replaceChildren(image);b.querySelector('.giftEffect').textContent='1 şut';b.querySelector('.coin').textContent='1 jeton';b.parentElement.style.gridTemplateColumns='1fr';}for(const b of panel.querySelectorAll('.def'))b.parentElement.hidden=true;for(const [j,label]of [...panel.querySelectorAll('.sectionLabel')].entries()){label.hidden=!!j;if(!j)label.textContent='BAĞLI HEDİYE';}}}
 function consider(cue){
  if(!cue||cue.finishedAt)return;
  // A promoted cue must not wait for a previous video's ended event on a new/reconnected client.
  if(match?.cue?.id===cue.id&&Date.now()>=cue.endsAt&&!window.AIFootball3D?.isAnimating){played.add(cue.id);endedCues.add(cue.startsAt);return;}
  if(played.has(cue.id)||timers.has(cue.id))return;
  const start=async(actualStart)=>{
   timers.delete(cue.id);if(![match?.cue,match?.nextCue].some(c=>c?.id===cue.id&&!c.finishedAt))return;
   if(!window.AIFootball3D?.videoStatus?.motionReady){if(Date.now()-cue.startsAt<2500)timers.set(cue.id,setTimeout(start,100));return;}
   played.add(cue.id);if(cue.previousStartsAt==null&&Date.now()-cue.startsAt>2500){endedCues.add(cue.startsAt);return;} // Never replay an old shot on a newly opened page.
   window.AIFootball3D.beginShot(cue.team,{startsAt:typeof actualStart==='number'?actualStart:cue.startsAt,variation:cue.variation,result:cue.result,cueStartsAt:cue.startsAt});
   window.AIFootball3D.finishShot(cue.team,cue.result);
   log(nameOf(cue.team)+' şut çekiyor!');
   setTimeout(()=>{if(![match?.cue,match?.nextCue].some(c=>c?.id===cue.id))return;log(cue.result==='goal'?'GOL! '+nameOf(cue.team):(['C','D'].includes(cue.team)?'Kaleci':nameOf(cue.team==='A'?'B':'A')+' kalecisi')+' kurtardı!');if(cue.result==='goal')celebrateGoal(cue.team);},Math.max(0,cue.outcomeAt-Date.now()));
  };
  if(cue.previousStartsAt!=null&&match?.nextCue?.id===cue.id){if(endedCues.has(cue.previousStartsAt))start(Date.now());else stagedStarts.set(cue.previousStartsAt,()=>start(Date.now()));}else timers.set(cue.id,setTimeout(start,Math.max(0,cue.startsAt-Date.now())));
 }
 function validRequest(p){return p&&typeof p.id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id)&&['A','B','C','D'].includes(p.team)&&Number.isSafeInteger(p.count)&&p.count>=1&&p.count<=50&&Number.isFinite(p.sentAt)&&Math.abs(Date.now()-p.sentAt)<600000;}
 function rememberRequests(){try{sessionStorage.setItem(REQUEST_STORE,JSON.stringify([...pendingRequests.values()].map(r=>r.payload)));}catch{}}
 function acknowledgeRequests(){for(const [id,r]of pendingRequests){if(match?.commandReceipts?.includes(id)){pendingRequests.delete(id);r.resolve?.(true);}else if(!validRequest(r.payload)){pendingRequests.delete(id);r.resolve?.(false);log('Şut isteği zaman aşımına uğradı; tekrar dene');}}rememberRequests();}
 function receiveRequest(p){if(admin()&&validRequest(p)&&!match?.commandReceipts?.includes(p.id)){requestInbox.set(p.id,p);if(owns())flushRequestInbox().catch(e=>console.warn(e.message));}}
 async function flushRequestInbox(){for(const [id,p]of requestInbox){if(!admin())return;if(!validRequest(p)){requestInbox.delete(id);continue;}await change(m=>{m.commandReceipts ||= [];if(m.commandReceipts.includes(id))return false;m.commandReceipts.push(id);m.commandReceipts=m.commandReceipts.slice(-2000);for(let i=0;i<p.count;i++)m.jobs.push({id:'button:'+id+':'+i,team:p.team});},false);if(match?.commandReceipts?.includes(id))requestInbox.delete(id);}}
 async function sendRequests(){acknowledgeRequests();for(const r of pendingRequests.values()){if(Date.now()-r.lastSent<2000)continue;r.lastSent=Date.now();if(admin()){requestInbox.set(r.payload.id,r.payload);await flushRequestInbox();acknowledgeRequests();}else if(channelReady)await channel.send({type:'broadcast',event:'shot_request',payload:r.payload});}}
 function ensureChannel(){
  if(channel||!row)return;
  const subscribed=db.channel('tiktok-match-v2-'+row.id,{config:{broadcast:{ack:true,self:true}}});channel=subscribed;
  subscribed.on('postgres_changes',{event:'UPDATE',schema:'public',table:'games',filter:'id=eq.'+row.id},p=>apply(p.new)).on('broadcast',{event:'shot_request'},({payload})=>receiveRequest(payload)).subscribe(status=>{
   if(channel!==subscribed)return;
   channelReady=status==='SUBSCRIBED';
   if(channelReady)sendRequests().catch(()=>{});
   else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){channel=null;db.removeChannel(subscribed).catch(()=>{});setTimeout(ensureChannel,1500);}
  });
 }
 function apply(r){
  if(!r?.id)return;const m=r.rules?.[KEY];
  if(match&&m&&m.revision<match.revision)return;
  row=r;ids.game=r.id;
  const presentation={...r.rules};delete presentation[KEY];const text=JSON.stringify(presentation);
  if(text!==lastRules){lastRules=text;applyRules(presentation);}
  if(m?.version===2){match=m;restore();acknowledgeRequests();consider(m.cue);consider(m.nextCue);if(m.cue?.finishedAt)window.AIFootball3D?.finishSyncedShot?.(m.cue.startsAt);}else paint();
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
  const initial={version:2,revision:1,scores:{A:0,B:0,C:0,D:0},keeper:Object.fromEntries(['A','B','C','D'].map(t=>[t,Number(state.startKeeper)||10])),jobs:[],cue:null,receipts:await Promise.all((legacy?.seen||[]).slice(-4000).map(digest)),accepted:Number(legacy?.accepted)||0,lastGift:null,shotSequence:0,idleEpoch:Date.now(),updatedAt:Date.now(),lease:{owner,until:Date.now()+LEASE}};
  const rules={...base.rules,[KEY]:initial};const {data,error}=await db.from('games').update({rules}).eq('id',base.id).eq('rules',JSON.stringify(base.rules)).select('id,rules');
  if(error)throw error;if(data?.length)apply(data[0]);else await read();
 }
 async function receive(raw){
  if(raw?.event!=='gift'&&raw?.type!=='gift')return false;
  const g=raw.data||{},id=g.transactionId||g.msgId||g.id,name=g.giftName??g.giftDetails?.giftName,giftId=g.giftId??g.giftDetails?.giftId,type=g.giftType??g.giftDetails?.giftType;
  if(!id||Number(type)===1&&g.repeatEnd!==true)return false;
  const n=String(name||'').trim().toLocaleLowerCase('tr-TR'),team=['rose','gül'].includes(n)?'A':n==='tiktok'?'B':['hot air balloon','sıcak hava balonu','sicak hava balonu'].includes(n)?'C':['mirwas','mirwas rhythm','mirwas ritmi','mirvas ritmi','mirvas ritmı'].includes(n)?'D':null,count=Number(g.repeatCount??1);
  if(!team||!Number.isSafeInteger(count)||count<1||count>10000)return false;
  const key=await digest(JSON.stringify([String(id),String(g.uniqueId||g.user?.uniqueId||g.userId||g.user?.userId||''),String(giftId||name||'')]));
  if(match?.receipts.includes(key))return false;
  inbox.set(key,{team,count,name:String(name||giftId)});return true;
 }
 async function flush(){for(const [key,g]of inbox){if(!owns())return;await change(m=>{if(m.receipts.includes(key))return false;m.receipts.push(key);m.receipts=m.receipts.slice(-4000);m.accepted++;m.lastGift={team:g.team,count:g.count,name:g.name};for(let i=0;i<g.count;i++)m.jobs.push({id:key+':'+i,team:g.team});});if(match?.receipts.includes(key))inbox.delete(key);}}
 function takeJob(m,lastTeam){const order=['A','B','C','D'],start=order.indexOf(lastTeam);for(let n=1;n<=order.length;n++){const t=order[(start+n+order.length)%order.length],i=m.jobs.findIndex(j=>j.team===t);if(i>=0)return m.jobs.splice(i,1)[0];}return m.jobs.shift();}
 function makeCue(m,j,startsAt){
  const def=['C','D'].includes(j.team)?j.team:j.team==='A'?'B':'A',after={scores:{...m.scores,C:m.scores.C||0,D:m.scores.D||0},keeper:{...m.keeper,C:m.keeper.C??state.startKeeper,D:m.keeper.D??state.startKeeper}},goal=j.team!=='D'&&after.keeper[def]<=0;
  if(goal){after.scores[j.team]++;after.keeper[def]=Number(state.startKeeper)||100;}else after.keeper[def]=Math.max(0,after.keeper[def]-(Number(state.keeperCost)||10));
  const timing=window.AIFootball3D?.getShotTiming?.(j.team,goal?'goal':'save')||{outcomeMs:1850,durationMs:14000};
  return {id:j.id,team:j.team,result:goal?'goal':'save',variation:m.shotSequence++,startsAt,outcomeAt:startsAt+(timing.outcomeMs||1850),endsAt:startsAt+(timing.durationMs||14000),after,committed:false,finishedAt:null};
 }
 async function advance(){
  if(!owns())return;const cue=match.cue,now=Date.now();
  if(cue&&!cue.finishedAt){
   if(!cue.committed&&now>=cue.outcomeAt)await change(m=>{if(m.cue?.id!==cue.id||m.cue.committed)return false;m.scores=m.cue.after.scores;m.keeper=m.cue.after.keeper;m.cue.committed=true;});
   // Publish the following cue early, so every viewer schedules the same gapless boundary.
   if(match.cue?.committed&&!match.nextCue&&match.jobs.length)await change(m=>{if(m.cue?.id!==cue.id||!m.cue.committed||m.nextCue||!m.jobs.length)return false;m.nextCue=makeCue(m,takeJob(m,m.cue.team),m.cue.endsAt);m.nextCue.previousStartsAt=m.cue.startsAt;});
   if(match.nextCue?.team===cue.team&&match.jobs.some(j=>j.team!==cue.team))await change(m=>{if(m.cue?.id!==cue.id||m.nextCue?.team!==cue.team||!m.jobs.some(j=>j.team!==cue.team))return false;m.jobs.unshift({id:m.nextCue.id,team:m.nextCue.team});m.nextCue=makeCue(m,takeJob(m,cue.team),cue.endsAt);m.nextCue.previousStartsAt=cue.startsAt;});
   if(endedCues.has(cue.startsAt))await change(m=>{if(m.cue?.id!==cue.id||!m.cue.committed)return false;if(m.nextCue){const next=m.nextCue;if(Date.now()>=next.endsAt){const shift=Date.now()-next.startsAt;next.startsAt+=shift;next.endsAt+=shift;next.outcomeAt+=shift;delete next.previousStartsAt;}m.cue=next;m.nextCue=null;}else{m.cue.finishedAt=Date.now();m.cooldownUntil=0;}});
   return;
  }
  if(!match.jobs.length||!window.AIFootball3D?.videoStatus?.motionReady)return;
  await change(m=>{if(m.cue&&!m.cue.finishedAt||!m.jobs.length)return false;m.cue=makeCue(m,takeJob(m,m.cue?.team),Date.now());m.nextCue=null;m.cooldownUntil=0;});
 }
 async function tick(){
  try{
   if(Date.now()-lastRead>1000)await read();ensureChannel();await sendRequests();if(admin()&&!connected&&!retry)connect();
   if(admin()){if(!match&&connected)await seed();if(match&&!owns()&&(!match.lease||match.lease.protocol!==125||match.lease.until<Date.now()))await change(m=>{if(m.lease?.protocol===125&&m.lease.until>Date.now())return false;m.lease={owner,until:Date.now()+LEASE,protocol:125};},false);
    if(owns()){if(match.lease.until<Date.now()+6000)await change(()=>{});await flush();await flushRequestInbox();await advance();}}
   errorText='';paint();
  }catch(e){errorText='Maç bağlantısı bekleniyor';paint();console.warn(e.message);}finally{setTimeout(tick,350);}
 }
 function connect(){if(!admin())return;if(socket&&[WebSocket.CONNECTING,WebSocket.OPEN].includes(socket.readyState))return;clearTimeout(retry);retry=null;try{const w=socket=new WebSocket(API);w.onopen=()=>{connected=true;paint();};w.onmessage=e=>{try{receive(JSON.parse(e.data)).catch(console.warn);}catch{}};w.onerror=()=>{};w.onclose=()=>{connected=false;paint();retry=setTimeout(connect,5000);};}catch{retry=setTimeout(connect,5000);}}
 function install(){if(installed)return;if(!ready()){setTimeout(install,50);return;}installed=true;legend();read().then(ensureChannel).catch(e=>console.warn(e.message));tick();}
 window.AIFootballTikTok={get active(){return true;},get connected(){return connected;},getStatus(){return {active:true,connected,shared:!!match,leader:owns(),revision:match?.revision,accepted:match?.accepted||0,lastGift:match?.lastGift||null,pending:match?.jobs.length||0,waitingRequests:pendingRequests.size,channelReady};},getClock(){return match?{epoch:match.idleEpoch}:null;},activate:install,restore,onVideoEnded(startsAt){endedCues.add(startsAt);const next=stagedStarts.get(startsAt);if(next){stagedStarts.delete(startsAt);next();return true;}return false;},onShotStarted(){},onShotResolved(){},reconnect:connect,
  async saveRules(patch,keeperValues){const clean={...patch};delete clean[KEY];try{if(!await change(m=>{if(keeperValues)for(const t of ['A','B','C','D']){const v=Number(keeperValues[t]);if(Number.isFinite(v)&&v>=0)m.keeper[t]=v;}},false,clean))throw Error("Ortak maç henüz hazır değil");return {error:null};}catch(error){return {error};}},
  manualShot(team,n){n=Math.floor(Number(n)||1);if(!['A','B','C','D'].includes(team)||n<1||n>50)return Promise.resolve(false);const payload={id:crypto.randomUUID(),team,count:n,sentAt:Date.now()};return new Promise(resolve=>{pendingRequests.set(payload.id,{payload,lastSent:0,resolve});rememberRequests();log(nameOf(team)+' için şut isteği gönderildi');sendRequests().catch(e=>console.warn(e.message));});},
  manualKeeper(team,n){if(!admin()||!['A','B','C','D'].includes(team))return false;return change(m=>{m.keeper[team]+=Math.max(0,Number(n)||0);},false);},
  reset(){if(!admin())return false;return change(m=>{if(m.cue&&!m.cue.finishedAt)return false;const initial=10;m.scores={A:0,B:0,C:0,D:0};m.keeper={A:initial,B:initial,C:initial,D:initial};m.jobs=[];m.cue=null;m.nextCue=null;m.cooldownUntil=0;stagedStarts.clear();timers.forEach(clearTimeout);timers.clear();window.AIFootball3D?.reset?.();},false);}
 };
 window.addEventListener('online',()=>{ensureChannel();sendRequests().catch(()=>{});});document.addEventListener('visibilitychange',()=>{if(!document.hidden){ensureChannel();read().then(()=>sendRequests()).catch(()=>{});}});
 install();connect();document.addEventListener('pointerdown',()=>{if(!connected)connect();});window.addEventListener('beforeunload',()=>{clearTimeout(retry);socket?.close();});
})();
