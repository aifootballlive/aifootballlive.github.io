/* One durable match for every viewer of the permanent broadcast URL. */
(()=>{
 'use strict';
 const KEY='tiktok_match_v2',API='ws://127.0.0.1:21213/',owner=crypto.randomUUID(),LEASE=10000;
 const MATCH_MS=25*60*1000,RESULT_HOLD_MS=60000,END_QUIET_MS=1200,OFFLINE_GRACE_MS=20000;
 const TEAMS=['A','B','C','D'];
 const formatClock=seconds=>{const s=Math.max(0,Math.floor(seconds));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
 const roundWinner=scores=>{
  const max=Math.max(...TEAMS.map(t=>Number(scores?.[t])||0));
  const winners=TEAMS.filter(t=>(Number(scores?.[t])||0)===max);
  return winners.length===1?winners[0]:null;
 };
 function matchClockView(m,now=Date.now()){
  const clock=m?.clock;
  if(!clock||!Number.isFinite(clock.startedAt))return 'MAÇ 25:00';
  if(Number.isFinite(clock.finishedAt)){
   const secondsLeft=Math.max(0,Math.ceil((RESULT_HOLD_MS-(now-clock.finishedAt))/1000));
   const label=clock.interrupted?'BAĞLANTI KOPTU • MAÇ DURDURULDU':clock.winner?nameOf(clock.winner)+' KAZANDI':'BERABERE';
   return label+' • YENİ MAÇ '+secondsLeft+' sn';
  }
  if(Number(m?.lease?.until)>0&&now-m.lease.until>OFFLINE_GRACE_MS)return 'YAYIN BAĞLANTISI KOPTU';
  const elapsed=Math.max(0,now-clock.startedAt),duration=Number(clock.durationMs)||MATCH_MS;
  return elapsed<duration?'MAÇ '+formatClock(Math.ceil((duration-elapsed)/1000)):'UZATMA +'+formatClock((elapsed-duration)/1000);
 }
 function showMatchClock(){
  const el=document.getElementById('matchClockHud');
  if(!el)return;
  const label=matchClockView(match);
  if(el.textContent!==label)el.textContent=label;
  el.dataset.phase=Number.isFinite(match?.clock?.finishedAt)?'result':match?.clock&&Date.now()-match.clock.startedAt>=MATCH_MS?'overtime':'normal';
 }

 let row=null,match=null,installed=false,connected=false,socket=null,retry=null,reading=null,chain=Promise.resolve(),channel=null,channelReady=false,lastRead=0,lastRules='',errorText='';
 let sendingRequests=false,requestBatchInFlight=null,giftBatchInFlight=null;
 let bridgeEverConnected=false,connectionLostAt=null,bridgeWasOffline=false;
 const manualBursts=new Map();
 function flushManualBurst(team){
  const burst=manualBursts.get(team);if(!burst)return;
  manualBursts.delete(team);clearTimeout(burst.timer);
  const payload={id:crypto.randomUUID(),team,count:burst.count,sentAt:Date.now()};
  pendingRequests.set(payload.id,{payload,lastSent:0,resolve:ok=>burst.resolvers.forEach(done=>done(ok))});
  rememberRequests();sendRequests().catch(e=>console.warn(e.message));
 }
 const pendingRequests=new Map(),requestInbox=new Map(),REQUEST_STORE='aiFootballSharedShotRequests.v1';
 try{for(const p of JSON.parse(sessionStorage.getItem(REQUEST_STORE)||'[]'))if(validRequest(p))pendingRequests.set(p.id,{payload:p,lastSent:0,resolve:null});}catch{}
 const endedCues=new Set(),stagedStarts=new Map(),cueTimings=new Map();
 const inbox=new Map(),played=new Set(),timers=new Map(),clone=v=>JSON.parse(JSON.stringify(v));
 const GIFT_INBOX_STORE='aiFootballPendingTikTokGifts.v1';
 let inboxSaveTimer=null;
 function saveGiftInbox(){
  clearTimeout(inboxSaveTimer);
  inboxSaveTimer=setTimeout(()=>{
   try{localStorage.setItem(GIFT_INBOX_STORE,JSON.stringify([...inbox.entries()].slice(-2500)));}catch(e){console.warn('Gift buffer storage not available',e);}
  },250);
 }
 try{
  const backup=JSON.parse(localStorage.getItem(GIFT_INBOX_STORE)||'[]');
  if(Array.isArray(backup))for(const [key,g] of backup)if(typeof key==='string'&&g&&TEAMS.includes(g.team)&&Number.isSafeInteger(g.count)&&g.count>0)inbox.set(key,g);
 }catch{}
 const LEAGUE_ROUNDS=20;
 function newLeague(season=1,trophies={}){
  return {season,plannedRounds:LEAGUE_ROUNDS,completedRounds:0,
   trophies:Object.fromEntries(TEAMS.map(t=>[t,Number(trophies?.[t])||0])),
   teams:Object.fromEntries(TEAMS.map(t=>[t,{played:0,wins:0,draws:0,losses:0,goals:0,points:0}])),
   history:[],champion:null};
 }
 function recordLeagueRound(m){
  if(m.lastResult?.interrupted)return;
  m.league ||= newLeague(1);
  const league=m.league;
  if(league.completedRounds>=league.plannedRounds)return;
  const scores={...m.scores},winners=TEAMS.filter(t=>(Number(scores[t])||0)===Math.max(...TEAMS.map(x=>Number(scores[x])||0)));
  for(const team of TEAMS){
   const row=league.teams[team]||{played:0,wins:0,draws:0,losses:0,goals:0,points:0};
   row.played++;row.goals+=Number(scores[team])||0;
   if(winners.length===1&&winners.includes(team)){row.wins++;row.points+=3;}
   else if(winners.includes(team)){row.draws++;row.points++;}
   else row.losses++;
   league.teams[team]=row;
  }
  league.completedRounds++;
  league.history.push({round:m.clock.round,at:m.clock.finishedAt,scores,winner:winners.length===1?winners[0]:null});
  league.history=league.history.slice(-100);
  if(league.completedRounds>=league.plannedRounds){
   const order=TEAMS.slice().sort((a,b)=>league.teams[b].points-league.teams[a].points||league.teams[b].wins-league.teams[a].wins||league.teams[b].goals-league.teams[a].goals);
   league.champion=order[0];
   league.trophies[order[0]]=(Number(league.trophies[order[0]])||0)+1;
  }
 }
 function interruptOfflineMatch(m,at){
  if(m.clock?.finishedAt)return false;
  // Keep queued gifts; requeue a shot not yet committed before the disconnect.
  if(m.nextCue?.id)m.jobs.unshift({id:'recovered:'+m.nextCue.id,team:m.nextCue.team,count:1,nextIndex:0});
  if(m.cue?.id&&!m.cue.committed)m.jobs.unshift({id:'recovered:'+m.cue.id,team:m.cue.team,count:1,nextIndex:0});
  m.nextCue=null;m.cue=null;
  m.clock={...(m.clock||{startedAt:at,durationMs:MATCH_MS,round:1}),finishedAt:at,interrupted:true,winner:null};
  m.lastResult={round:m.clock.round,finishedAt:at,scores:{...m.scores},winner:null,interrupted:true};
  // Interrupted rounds never earn league points. Wait through the full results screen.
  return true;
 }
 function ready(){try{return typeof db!=='undefined'&&typeof state!=='undefined'&&typeof render==='function';}catch{return false;}}
 function admin(){try{return adminAuthed===true;}catch{return false;}}
 function owns(m=match){return admin()&&m?.lease?.owner===owner&&m.lease.until>Date.now();}
 function paint(){document.documentElement.dataset.tiktokConnection=connected?'connected':'waiting';showMatchClock();if(!ready())return;const el=document.getElementById('connectionStatus');if(el&&admin())el.textContent=errorText||(!match?'Ortak maç bekleniyor':owns()?'TikFinity bağlı • Ortak maç':'Ortak maça bağlı');}
 let lastPaintedMatch='';
 function restore(){
  if(!ready()||!match)return;
  const counts={A:0,B:0,C:0,D:0};
  for(const job of match.jobs)if(job&&counts[job.team]!==undefined)counts[job.team]+=Math.max(1,Math.floor(Number(job.count)||1));
  if(match.nextCue?.team&&counts[match.nextCue.team]!==undefined)counts[match.nextCue.team]++;
  // Optimistic UI: count unconfirmed requests and not-yet-flushed button bursts immediately.
  for(const r of pendingRequests.values()){
   const p=r.payload;
   if(!match.commandReceipts?.includes(p.id)&&counts[p.team]!==undefined)counts[p.team]+=p.count;
  }
  for(const [team,burst] of manualBursts)if(counts[team]!==undefined)counts[team]+=burst.count;
  const snapshot=JSON.stringify([match.scores,match.keeper,counts]);
  if(snapshot===lastPaintedMatch){paint();return;}
  lastPaintedMatch=snapshot;
  for(const team of ['A','B','C','D']){
   state[team].score=Number(match.scores[team])||0;
   state.keeper[team]=Number(match.keeper[team]??state.startKeeper)||0;
   state[team].queue=counts[team];
  }
  render();paint();
 }
  function legend(){const icons=['rose','tiktok','balloon','mirwas'];for(const [i,panel]of [...document.querySelectorAll('.broadcastControls .panel')].entries()){for(const [j,b]of [...panel.querySelectorAll('.shot')].entries()){b.hidden=!!j;if(j)continue;const image=document.createElement('img');image.src='./assets/gifts-v137/'+icons[i]+'.png';image.alt='';b.querySelector('.giftVisual').replaceChildren(image);b.querySelector('.giftEffect').textContent='1 şut';b.querySelector('.coin').textContent='1 jeton';b.parentElement.style.gridTemplateColumns='1fr';}for(const b of panel.querySelectorAll('.def'))b.parentElement.hidden=true;for(const [j,label]of [...panel.querySelectorAll('.sectionLabel')].entries()){label.hidden=!!j;if(!j)label.textContent='BAĞLI HEDİYE';}}}
 function consider(cue){
  if(!cue||cue.finishedAt)return;
  const signature=cue.startsAt+':'+cue.result;
  if(cueTimings.has(cue.id)&&cueTimings.get(cue.id)!==signature){clearTimeout(timers.get(cue.id));timers.delete(cue.id);played.delete(cue.id);}
  cueTimings.set(cue.id,signature);if(cueTimings.size>1000)cueTimings.delete(cueTimings.keys().next().value);
  // A promoted cue must not wait for a previous video's ended event on a new/reconnected client.
  if(match?.cue?.id===cue.id&&Date.now()>=cue.endsAt&&!window.AIFootball3D?.isAnimating){played.add(cue.id);endedCues.add(cue.startsAt);return;}
  if(played.has(cue.id)||timers.has(cue.id))return;
  const start=async(actualStart)=>{
   timers.delete(cue.id);const liveCue=[match?.cue,match?.nextCue].find(c=>c?.id===cue.id&&!c.finishedAt);if(!liveCue)return;if(liveCue.startsAt!==cue.startsAt||liveCue.result!==cue.result){consider(liveCue);return;}
   if(!window.AIFootball3D?.videoStatus?.motionReady){if(Date.now()<cue.endsAt)timers.set(cue.id,setTimeout(start,100));return;}
   played.add(cue.id);if(Date.now()>=cue.endsAt){endedCues.add(cue.startsAt);return;} // Join an active shot at its current frame, even after reconnecting.
   window.AIFootball3D.beginShot(cue.team,{startsAt:cue.startsAt,variation:cue.variation,result:cue.result,cueStartsAt:cue.startsAt});
   window.AIFootball3D.finishShot(cue.team,cue.result);
   window.AIFootball3D.prepareUpcomingShot?.(match?.nextCue?.id===cue.id?null:match?.nextCue);
   log(nameOf(cue.team)+' şut çekiyor!');
   setTimeout(()=>{if(![match?.cue,match?.nextCue].some(c=>c?.id===cue.id))return;log(cue.result==='goal'?'GOL! '+nameOf(cue.team):(['C','D'].includes(cue.team)?'Kaleci':nameOf(cue.team==='A'?'B':'A')+' kalecisi')+' kurtardı!');},Math.max(0,cue.outcomeAt-Date.now()));
  };
  // Every viewer uses the published boundary, including private tabs and late joiners.
  // Local ended events must never give the next clip a different start time.
  timers.set(cue.id,setTimeout(start,Math.max(0,cue.startsAt-Date.now())));
 }
 function validRequest(p){return p&&typeof p.id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id)&&['A','B','C','D'].includes(p.team)&&Number.isSafeInteger(p.count)&&p.count>=1&&p.count<=50&&Number.isFinite(p.sentAt)&&Math.abs(Date.now()-p.sentAt)<600000;}
 function rememberRequests(){try{sessionStorage.setItem(REQUEST_STORE,JSON.stringify([...pendingRequests.values()].map(r=>r.payload)));}catch{}}
 function acknowledgeRequests(){
  let changed=false;
  for(const [id,r]of pendingRequests){
   if(match?.commandReceipts?.includes(id)){pendingRequests.delete(id);r.resolve?.(true);changed=true;}
   else if(!validRequest(r.payload)){pendingRequests.delete(id);r.resolve?.(false);changed=true;console.warn('Shot request expired:',id);}
  }
  if(changed){rememberRequests();restore();}
}
 function receiveRequest(p){if(admin()&&validRequest(p)&&!match?.commandReceipts?.includes(p.id))requestInbox.set(p.id,p);}
 async function flushRequestInbox(){
  if(requestBatchInFlight)return requestBatchInFlight;
  if(!admin()||!owns()||!requestInbox.size)return;
  for(const [id,p]of requestInbox)if(!validRequest(p))requestInbox.delete(id);
  const batch=[...requestInbox].slice(0,80);
  if(!batch.length)return;
  requestBatchInFlight=(async()=>{
   await change(m=>{
    m.commandReceipts ||= [];
    const seen=new Set(m.commandReceipts);
    let changed=false;
    for(const [id,p] of batch){
     if(seen.has(id))continue;
     seen.add(id);m.commandReceipts.push(id);
     m.jobs.push({id:'button:'+id,team:p.team,count:p.count,nextIndex:0});
     changed=true;
    }
    if(!changed)return false;
    m.lastShotQueuedAt=Date.now();
    m.commandReceipts=m.commandReceipts.slice(-2000);
   },false);
   for(const [id] of batch)if(match?.commandReceipts?.includes(id))requestInbox.delete(id);
  })().finally(()=>{requestBatchInFlight=null;});
  return requestBatchInFlight;
 }
  function requestSignal(){const controller=new AbortController();setTimeout(()=>controller.abort(),8000);return controller.signal;}
 async function sendRequestHTTP(payload){
  if(!row)return;
  const response=await fetch(SUPABASE_URL+'/realtime/v1/api/broadcast',{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({messages:[{topic:'tiktok-match-v2-'+row.id,event:'shot_request',payload,private:false}]}),signal:requestSignal()});
  if(!response.ok)throw Error('Şut iletimi yeniden denenecek ('+response.status+')');
 }
 async function sendRequestBatchHTTP(requests){
  if(!row||!requests.length)throw Error('Waiting for match connection');
  const response=await fetch(SUPABASE_URL+'/realtime/v1/api/broadcast',{
   method:'POST',
   headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},
   body:JSON.stringify({messages:[{topic:'tiktok-match-v2-'+row.id,event:'shot_request_batch',payload:{requests},private:false}]}),
   signal:requestSignal()
  });
  if(!response.ok)throw Error('Shot broadcast retry ('+response.status+')');
 }
 async function sendRequests(){
  if(sendingRequests)return;sendingRequests=true;
  try{
   acknowledgeRequests();
   if(admin()&&owns()){
    for(const r of pendingRequests.values())requestInbox.set(r.payload.id,r.payload);
    await flushRequestInbox();acknowledgeRequests();return;
   }
   // One broadcast for a burst across multiple teams, instead of one network wait per click.
   const now=Date.now(),unsent=[...pendingRequests.values()].filter(r=>now-r.lastSent>=2000);
   for(let i=0;i<unsent.length;i+=40){
    const batch=unsent.slice(i,i+40);
    const requests=batch.map(r=>r.payload);
    for(const r of batch){r.lastSent=now;r.attempts=(r.attempts||0)+1;}
    try{
     if(channelReady&&channel){
      const outcome=await channel.send({type:'broadcast',event:'shot_request_batch',payload:{requests}},{timeout:2500});
      if(outcome!=='ok')await sendRequestBatchHTTP(requests);
     }else await sendRequestBatchHTTP(requests);
    }catch(error){console.warn(error.message);}
   }
  }finally{sendingRequests=false;}
 }
  function ensureChannel(){
  if(channel||!row)return;
  const subscribed=db.channel('tiktok-match-v2-'+row.id,{config:{broadcast:{ack:true,self:true}}});channel=subscribed;
  subscribed.on('postgres_changes',{event:'UPDATE',schema:'public',table:'games',filter:'id=eq.'+row.id},p=>apply(p.new)).on('broadcast',{event:'shot_request'},({payload})=>receiveRequest(payload)).on('broadcast',{event:'shot_request_batch'},({payload})=>{for(const p of payload?.requests||[])receiveRequest(p);}).subscribe(status=>{
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
  if(m?.version===2){match=m;acknowledgeRequests();restore();window.AIFootball3D?.prepareUpcomingShot?.(m.nextCue);consider(m.cue);consider(m.nextCue);if(m.cue?.finishedAt&&!m.nextCue&&!m.jobs.length)window.AIFootball3D?.finishSyncedShot?.(m.cue.startsAt);}else paint();
 }
 async function read(){if(reading)return reading;reading=(async()=>{const {data,error}=await db.from('games').select('id,rules').eq('name','AI Football Live').limit(1).abortSignal(requestSignal()).single();if(error)throw error;apply(data);lastRead=Date.now();return data;})().finally(()=>reading=null);return reading;}
 function change(edit,leaseRequired=true,patch=null){const run=async()=>{
  if(!admin())return false;
  for(let attempt=0;attempt<6;attempt++){
   const base=await read(),existing=base.rules?.[KEY];if(!existing)return false;
   if(leaseRequired&&!owns(existing))return false;
   const next=clone(existing);if(edit(next)===false)return false;
   next.revision=existing.revision+1;next.updatedAt=Date.now();
   if(next.lease?.owner===owner)next.lease.until=Date.now()+LEASE;
   const rules={...base.rules,...(patch||{}),[KEY]:next};
   const {data,error}=await db.from('games').update({rules}).eq('id',base.id).eq('rules->tiktok_match_v2->>revision',existing.revision).select('id,rules').abortSignal(requestSignal());
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
  const initial={version:2,revision:1,clock:{startedAt:Date.now(),durationMs:MATCH_MS,round:1,finishedAt:null},scores:{A:0,B:0,C:0,D:0},keeper:Object.fromEntries(['A','B','C','D'].map(t=>[t,Number(state.startKeeper)||10])),jobs:[],cue:null,receipts:await Promise.all((legacy?.seen||[]).slice(-4000).map(digest)),accepted:Number(legacy?.accepted)||0,lastGift:null,shotSequence:0,idleEpoch:Date.now(),updatedAt:Date.now(),lease:{owner,until:Date.now()+LEASE}};
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
  inbox.set(key,{team,count,name:String(name||giftId)});saveGiftInbox();return true;
 }
 async function flush(){
  if(giftBatchInFlight)return giftBatchInFlight;
  if(!owns()||!inbox.size)return;
  const batch=[...inbox].slice(0,80);
  giftBatchInFlight=(async()=>{
   await change(m=>{
    const seen=new Set(m.receipts);
    let changed=false;
    for(const [key,g] of batch){
     if(seen.has(key))continue;
     seen.add(key);m.receipts.push(key);m.accepted++;
     m.lastGift={team:g.team,count:g.count,name:g.name};
     m.jobs.push({id:key,team:g.team,count:g.count,nextIndex:0});
     changed=true;
    }
    if(!changed)return false;
    m.lastShotQueuedAt=Date.now();
    m.receipts=m.receipts.slice(-4000);
   });
   for(const [key] of batch)if(match?.receipts.includes(key))inbox.delete(key);
   saveGiftInbox();
  })().finally(()=>{giftBatchInFlight=null;});
  return giftBatchInFlight;
 }
  function totalJobs(jobs){return jobs.reduce((sum,j)=>sum+Math.max(1,Math.floor(Number(j.count)||1)),0);}
 function takeJob(m,lastTeam){
  const order=['A','B','C','D'],start=order.indexOf(lastTeam);
  let at=-1;
  for(let n=1;n<=order.length;n++){
   const team=order[(start+n+order.length)%order.length];
   at=m.jobs.findIndex(j=>j.team===team);
   if(at>=0)break;
  }
  if(at<0)return m.jobs.shift();
  const job=m.jobs[at],remaining=Math.max(1,Math.floor(Number(job.count)||1));
  if(remaining===1){
   m.jobs.splice(at,1);
   return {id:job.nextIndex!=null?job.id+':'+job.nextIndex:job.id,team:job.team};
  }
  const index=Math.max(0,Math.floor(Number(job.nextIndex)||0));
  job.count=remaining-1;job.nextIndex=index+1;
  return {id:job.id+':'+index,team:job.team};
 }
 function resizeTeamJobs(m,team,requested){
  let remaining=requested;
  const result=[];
  for(const job of m.jobs){
   if(job.team!==team){result.push(job);continue;}
   if(!remaining)continue;
   const size=Math.max(1,Math.floor(Number(job.count)||1));
   const keep=Math.min(size,remaining);
   result.push(keep<size?{...job,count:keep}:job);
   remaining-=keep;
  }
  while(remaining>0){
   const size=Math.min(remaining,50);
   result.push({id:'admin:'+crypto.randomUUID(),team,count:size,nextIndex:0});
   remaining-=size;
  }
  m.jobs=result;
 }
 function makeCue(m,j,startsAt){
  const def=j.team,after={scores:{...m.scores,C:m.scores.C||0,D:m.scores.D||0},keeper:{...m.keeper,C:m.keeper.C??state.startKeeper,D:m.keeper.D??state.startKeeper}},goal=after.keeper[def]<=0;
  if(goal){after.scores[j.team]++;after.keeper[def]=Number(m.initialKeeper?.[def]??state.startKeepers?.[def]??10);}else after.keeper[def]=Math.max(0,after.keeper[def]-(Number(state.keeperCost)||10));
  const timing=window.AIFootball3D?.getShotTiming?.(j.team,goal?'goal':'save')||{outcomeMs:1850,durationMs:14000};
  return {id:j.id,team:j.team,result:goal?'goal':'save',variation:m.shotSequence++,startsAt,outcomeAt:startsAt+(timing.outcomeMs||1850),endsAt:startsAt+(timing.durationMs||14000),after,committed:false,finishedAt:null};
 }
 function reserveNext(m,job,startsAt){const projected=m.cue&&!m.cue.committed?{...m,scores:m.cue.after.scores,keeper:m.cue.after.keeper}:m;const cue=makeCue(projected,job,startsAt);m.shotSequence=projected.shotSequence;return cue;}
 async function advance(){
  if(!owns())return;
  const now=Date.now();
  // A dead local TikTok gift bridge must not allow an invisible match to keep running.
  if(bridgeEverConnected&&(!connected||bridgeWasOffline)){
   if(bridgeWasOffline||connectionLostAt!==null&&now-connectionLostAt>OFFLINE_GRACE_MS){
    if(match.clock&&!Number.isFinite(match.clock.finishedAt)){
     await change(m=>interruptOfflineMatch(m,Date.now()));
    }
    bridgeWasOffline=false;
   }
   if(!connected)return;
  }
  if(match.processingPaused){ /* Finish an already active shot; do not start another while paused. */ }
  // Migrate an existing live match in place; do not reset its scores or queued shots.
  if(!match.clock||!Number.isFinite(match.clock.startedAt)){
   await change(m=>{if(m.clock?.startedAt)return false;m.clock={startedAt:Date.now(),durationMs:MATCH_MS,round:1,finishedAt:null};});
   return;
  }
  if(Number.isFinite(match.clock.finishedAt)){
   if(now-match.clock.finishedAt<RESULT_HOLD_MS)return;
   await change(m=>{
    if(!Number.isFinite(m.clock?.finishedAt)||Date.now()-m.clock.finishedAt<RESULT_HOLD_MS)return false;
    const startedAt=Date.now(),round=(Number(m.clock.round)||1)+1;
    if(m.league?.completedRounds>=m.league?.plannedRounds){
     m.leagueArchive ||= [];
     m.leagueArchive.push({season:m.league.season,completedAt:startedAt,champion:m.league.champion,
      trophies:{...m.league.trophies},teams:clone(m.league.teams)});
     m.leagueArchive=m.leagueArchive.slice(-12);
     m.league=newLeague((Number(m.league.season)||1)+1,m.league.trophies);
    }
    m.clock={startedAt,durationMs:MATCH_MS,round,finishedAt:null};
    m.scores={A:0,B:0,C:0,D:0};
    m.keeper=Object.fromEntries(TEAMS.map(t=>[t,Number(m.initialKeeper?.[t]??state.startKeepers?.[t]??10)]));
    m.cue=null;m.nextCue=null;m.cooldownUntil=0;m.idleEpoch=startedAt;
    // New gifts received during the result screen remain in m.jobs.
   });
   return;
  }
  const cue=match.cue;
  if(cue&&!cue.finishedAt){
   if(!cue.committed&&now>=cue.outcomeAt)await change(m=>{if(m.cue?.id!==cue.id||m.cue.committed)return false;m.scores=m.cue.after.scores;m.keeper=m.cue.after.keeper;m.cue.committed=true;});
   // Publish the following cue early, so every viewer schedules the same gapless boundary.
   if(match.cue&&!match.nextCue&&match.jobs.length)await change(m=>{if(m.cue?.id!==cue.id||m.nextCue||!m.jobs.length)return false;m.nextCue=reserveNext(m,takeJob(m,m.cue.team),m.cue.endsAt);m.nextCue.previousStartsAt=m.cue.startsAt;});
   if(match.nextCue?.team===cue.team&&match.jobs.some(j=>j.team!==cue.team))await change(m=>{if(m.cue?.id!==cue.id||m.nextCue?.team!==cue.team||!m.jobs.some(j=>j.team!==cue.team))return false;m.jobs.unshift({id:m.nextCue.id,team:m.nextCue.team});m.nextCue=reserveNext(m,takeJob(m,cue.team),cue.endsAt);m.nextCue.previousStartsAt=cue.startsAt;});
   // Playback can pause in a hidden admin tab, or its ended event can be lost.
   // The authoritative clip deadline must still release the reserved shot.
   if(endedCues.has(cue.startsAt)||now>=cue.endsAt+750)await change(m=>{if(m.cue?.id!==cue.id||!m.cue.committed)return false;if(m.nextCue){const next=m.nextCue;if(Date.now()>=next.endsAt){const shift=Date.now()-next.startsAt;next.startsAt+=shift;next.endsAt+=shift;next.outcomeAt+=shift;delete next.previousStartsAt;}m.cue=next;m.nextCue=null;}else{m.cue.finishedAt=Date.now();m.cooldownUntil=0;}});
   return;
  }
  const elapsed=now-match.clock.startedAt;
  const activeCue=!!(match.cue&&!match.cue.finishedAt);
  const jobsPending=!!(match.jobs.length||match.nextCue||activeCue);
  const stillReceiving=!!(inbox.size||requestInbox.size||giftBatchInFlight||requestBatchInFlight||manualBursts.size||pendingRequests.size);
  const lastActivity=Math.max(Number(match.lastShotQueuedAt)||0,Number(match.cue?.finishedAt)||0);
  // Keep adding overtime while gifts keep coming. Finish only after the whole shot queue clears.
  if(elapsed>=MATCH_MS&&!jobsPending&&!stillReceiving&&now-lastActivity>=END_QUIET_MS){
   await change(m=>{
    if(m.clock?.finishedAt||Date.now()-m.clock.startedAt<MATCH_MS||m.jobs.length||m.nextCue||(m.cue&&!m.cue.finishedAt))return false;
    m.clock.finishedAt=Date.now();
    m.clock.winner=roundWinner(m.scores);
    m.lastResult={round:m.clock.round,finishedAt:m.clock.finishedAt,scores:{...m.scores},winner:m.clock.winner};
    recordLeagueRound(m);
   });
   return;
  }
  if(match.processingPaused||!match.jobs.length||!window.AIFootball3D?.videoStatus?.motionReady)return;
  await change(m=>{if(m.clock?.finishedAt||m.cue&&!m.cue.finishedAt||!m.jobs.length)return false;m.cue=makeCue(m,takeJob(m,m.cue?.team),Date.now());m.nextCue=null;m.cooldownUntil=0;});
 }
 async function tick(){
  try{
   if(Date.now()-lastRead>(channelReady?3000:1000))await read();ensureChannel();sendRequests().catch(e=>console.warn(e.message));if(admin()&&!connected&&!retry)connect();
   if(admin()){if(!match&&connected)await seed();if(match&&!owns()&&(!match.lease||match.lease.protocol!==125||match.lease.until<Date.now()))await change(m=>{
    if(m.lease?.protocol===125&&m.lease.until>Date.now())return false;
    const gap=Date.now()-Number(m.lease?.until||0);
    if(Number(m.lease?.until)>0&&gap>OFFLINE_GRACE_MS&&m.clock&&!Number.isFinite(m.clock.finishedAt)){
     interruptOfflineMatch(m,Date.now());
    }
    m.lease={owner,until:Date.now()+LEASE,protocol:125};
   },false);
    if(owns()){if(match.lease.until<Date.now()+6000)await change(()=>{});await flush();await flushRequestInbox();await advance();}}
   errorText='';paint();
  }catch(e){errorText='Maç bağlantısı bekleniyor';paint();console.warn(e.message);}finally{setTimeout(tick,350);}
 }
 function connect(){if(!admin())return;if(socket&&[WebSocket.CONNECTING,WebSocket.OPEN].includes(socket.readyState))return;clearTimeout(retry);retry=null;try{const w=socket=new WebSocket(API);w.onopen=()=>{
    if(connectionLostAt!==null&&Date.now()-connectionLostAt>OFFLINE_GRACE_MS)bridgeWasOffline=true;
    connectionLostAt=null;bridgeEverConnected=true;connected=true;paint();
   };w.onmessage=e=>{try{receive(JSON.parse(e.data)).catch(console.warn);}catch{}};w.onerror=()=>{};w.onclose=()=>{
    connected=false;
    if(bridgeEverConnected&&connectionLostAt===null)connectionLostAt=Date.now();
    paint();retry=setTimeout(connect,5000);
   };}catch{retry=setTimeout(connect,5000);}}
 function install(){if(installed)return;if(!ready()){setTimeout(install,50);return;}installed=true;setInterval(showMatchClock,1000);showMatchClock();legend();read().then(ensureChannel).catch(e=>console.warn(e.message));tick();}
 window.AIFootballTikTok={get active(){return true;},get connected(){return connected;},getStatus(){return {active:true,connected,shared:!!match,leader:owns(),revision:match?.revision,accepted:match?.accepted||0,lastGift:match?.lastGift||null,pending:totalJobs(match?.jobs||[])+(match?.nextCue?1:0),waitingRequests:pendingRequests.size,channelReady,adminAvailable:!!match?.lease&&match.lease.until>Date.now(),lastError:errorText};},getClock(){return match?{epoch:match.idleEpoch}:null;},getMatchClock(){return match?.clock?{...match.clock}:null;},getLeague(){return match?.league?clone(match.league):newLeague(1);},getGiftProcessingPaused(){return !!match?.processingPaused;},
  async setGiftProcessingPaused(paused){
   if(!admin())return false;
   return change(m=>{if(m.processingPaused===!!paused)return false;m.processingPaused=!!paused;},false);
  },hasPendingShot(){return !!(match?.nextCue||match?.jobs?.length);},activate:install,restore,onVideoEnded(startsAt){endedCues.add(startsAt);const next=stagedStarts.get(startsAt);if(next){stagedStarts.delete(startsAt);next();return true;}return !!(match?.nextCue||match?.jobs?.length);},onShotStarted(){},onShotResolved(){},reconnect:connect,
  async saveRules(patch,keeperValues,queueValues,scoreValues){const clean={...patch};delete clean[KEY];try{if(!await change(m=>{if(scoreValues)for(const [t,v]of Object.entries(scoreValues)){if(!['A','B','C','D'].includes(t)||!Number.isSafeInteger(v)||v<0||v>1000000)continue;const delta=v-(Number(m.scores[t])||0);m.scores[t]=v;for(const cue of [m.cue,m.nextCue])if(cue&&!cue.committed&&cue.after?.scores)cue.after.scores[t]=Math.max(0,(Number(cue.after.scores[t])||0)+delta);}if(clean.goalkeeper_initial_by_team)m.initialKeeper=clone(clean.goalkeeper_initial_by_team);if(keeperValues)for(const t of ['A','B','C','D']){const v=Number(keeperValues[t]);if(Number.isFinite(v)&&v>=0){m.keeper[t]=v;if(m.cue&&!m.cue.committed)m.cue.after.keeper[t]=v;}}
      if(queueValues&&Object.keys(queueValues).length&&m.nextCue){m.jobs.unshift({id:m.nextCue.id,team:m.nextCue.team});m.nextCue=null;}
      if(queueValues)for(const [t,n]of Object.entries(queueValues)){if(!['A','B','C','D'].includes(t)||!Number.isSafeInteger(n)||n<0||n>10000)continue;resizeTeamJobs(m,t,n);}
      if(m.nextCue&&keeperValues&&Object.keys(keeperValues).length){const old=m.nextCue,base=m.cue&&!m.cue.committed?{...m,scores:m.cue.after.scores,keeper:m.cue.after.keeper}:m;m.nextCue=makeCue(base,{id:old.id,team:old.team},old.startsAt);m.shotSequence=base.shotSequence;m.nextCue.previousStartsAt=old.previousStartsAt;}
},false,clean))throw Error("Ortak maç henüz hazır değil");return {error:null};}catch(error){return {error};}},
  manualShot(team,n){
    n=Math.floor(Number(n)||1);
    if(!['A','B','C','D'].includes(team)||n<1||n>50)return false;
    // Update the visible waiting shots on the same tap, never after the network round-trip.
    if(state[team]){
     state[team].queue=(Number(state[team].queue)||0)+n;
     const counter=document.getElementById('frontQueue'+team);
     if(counter)counter.textContent=String(state[team].queue);
    }
    let burst=manualBursts.get(team);
    if(burst&&burst.count+n>50){flushManualBurst(team);burst=null;}
    if(!burst){burst={count:0,resolvers:[],timer:null};manualBursts.set(team,burst);}
    burst.count+=n;
    clearTimeout(burst.timer);burst.timer=setTimeout(()=>flushManualBurst(team),75);
    return true;
   },
   manualKeeper(team,n){if(!admin()||!['A','B','C','D'].includes(team))return false;return change(m=>{m.keeper[team]+=Math.max(0,Number(n)||0);},false);},
  reset(){if(!admin())return false;return change(m=>{if(m.cue&&!m.cue.finishedAt)return false;const initial=Object.fromEntries(['A','B','C','D'].map(t=>[t,Number(m.initialKeeper?.[t]??state.startKeepers?.[t]??10)]));m.scores={A:0,B:0,C:0,D:0};m.keeper=initial;m.jobs=[];m.cue=null;m.nextCue=null;m.cooldownUntil=0;m.clock={startedAt:Date.now(),durationMs:MATCH_MS,round:(Number(m.clock?.round)||1)+1,finishedAt:null};m.idleEpoch=m.clock.startedAt;stagedStarts.clear();timers.forEach(clearTimeout);timers.clear();window.AIFootball3D?.reset?.();},false);}
 };
 window.addEventListener('online',()=>{ensureChannel();sendRequests().catch(()=>{});});document.addEventListener('visibilitychange',()=>{if(!document.hidden){ensureChannel();read().then(()=>sendRequests()).catch(()=>{});}});
 install();connect();document.addEventListener('pointerdown',()=>{if(!connected)connect();});window.addEventListener('pagehide',()=>{
   clearTimeout(inboxSaveTimer);
   try{localStorage.setItem(GIFT_INBOX_STORE,JSON.stringify([...inbox.entries()].slice(-2500)));}catch{}
  });
  window.addEventListener('beforeunload',()=>{for(const team of manualBursts.keys())flushManualBurst(team);clearTimeout(retry);socket?.close();});
})();
