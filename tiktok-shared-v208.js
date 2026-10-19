/* One durable match for every viewer of the permanent broadcast URL. */
(()=>{
 'use strict';
 const KEY='tiktok_match_v2',CLIENT_BUILD=208,API='ws://127.0.0.1:21213/',owner=crypto.randomUUID(),LEASE=10000;
 const MATCH_MS=25*60*1000,OVERTIME_MAX_MS=5*60*1000,WINNER_HOLD_MS=60000,RESULT_HOLD_MS=180000,END_QUIET_MS=1200,OFFLINE_GRACE_MS=20000;
 const TEAMS=['A','B','C','D'],KICKOFF_COUNTDOWN_MS=30000;
 // A hidden overlay must never become a phantom dark sheet through stale CSS.
 const summaryBoard=document.getElementById('roundSummary');
 summaryBoard?.remove();
 const DEFAULT_TIMING={normalMinutes:25,overtimeMinutes:5,resultSeconds:60,arenaName:'Doruk Arenası',language:'tr'};
 const clipInt=(v,min,max,fallback)=>{const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;};
 function timingFor(m){
  const t=m?.timing||{};
  return {
   normalMinutes:clipInt(t.normalMinutes,1,120,25),
   overtimeMinutes:clipInt(t.overtimeMinutes,0,30,5),
   resultSeconds:clipInt(t.resultSeconds,10,900,60),
   arenaName:typeof t.arenaName==='string'&&t.arenaName.trim()?t.arenaName.trim().slice(0,48):'Doruk Arenası',
   language:t.language==='en'?'en':'tr'
  };
 }
 const normalMs=m=>timingFor(m).normalMinutes*60000;
 const overtimeMs=m=>timingFor(m).overtimeMinutes*60000;
 // Automatic start is opt-in. Missing/legacy flags always require an admin.
 function autoMatchEnabled(m){
  return m?.autoMatches===true&&m?.autoStartV2===true&&m?.autoStartV3===true&&m?.manualMatchStart!==true;
 }
 // Only an admin-started or confirmed auto-started match is running.
 // Legacy default clocks do not count as having been started by the referee.
 function matchRunning(m,now=Date.now()){
  const c=m?.clock;
  if(!c||Number.isFinite(c.finishedAt)||!Number.isFinite(Number(c.startedAt))||Number(c.startedAt)<=0)return false;
  return (c.manualStarted===true||c.autoStarted===true)&&now>=Number(c.startedAt);
 }
 function hasVideoProof(m,cue){
  return !!cue&&Number.isFinite(cue.videoStartedAt)&&Number.isFinite(cue.startsAt)&&cue.videoStartedAt>=cue.startsAt&&cue.startsAt>=Number(m.clock?.startedAt)&& (m.clock?.manualStarted===true||m.clock?.autoStarted===true);
 }
 function hasVideoCompletionProof(m,cue){
  if(!hasVideoProof(m,cue)||!Number.isFinite(cue.videoFinishedAt)||cue.videoFinishedAt<cue.videoStartedAt)return false;
  if(cue.playbackProtocol!==204)return !!cue.finishedAt&&cue.committed===true;
  return cue.videoPlaybackOwner===cue.playbackOwner&&Number.isFinite(cue.videoPlayedSeconds)&&cue.videoPlayedSeconds>=cue.durationMs/1000-.35&&cue.videoElapsedMs>=cue.durationMs-500;
 }
 function returnUnplayedCues(m){
  for(const cue of [m.cue,m.nextCue])if(cue&&!hasVideoCompletionProof(m,cue))
   m.jobs.unshift({id:'unplayed:'+cue.id,team:cue.team,count:1,nextIndex:0});
  m.cue=null;m.nextCue=null;
 }
 function matchStarting(m,now=Date.now()){
  const c=m?.clock;return !!c&&!Number.isFinite(c.finishedAt)&&(c.manualStarted===true||c.autoStarted===true)&&Number.isFinite(c.startedAt)&&c.startedAt>now;
 }
 function seasonComplete(m){return !!m?.league?.champion&&Number(m.league.completedRounds)>=Number(m.league.plannedRounds);}
 function canContinueAutomatically(m){return autoMatchEnabled(m)&&!m.autoContinuationPaused&&!seasonComplete(m);}
 // The combined winner + league screen is one uninterrupted duration.
 // An in-progress result keeps its deadline even if future settings change.
 function breakDeadlines(m){
  const end=Number(m?.clock?.finishedAt);
  if(!Number.isFinite(end)||end<=0)return null;
  const explicit=Number(m.clock.summaryUntil);
  const summaryUntil=explicit>end?explicit:end+timingFor(m).resultSeconds*1000;
  return {summaryUntil,leagueUntil:summaryUntil};
 }
 function stampBreakDeadlines(m,finishedAt){
  m.clock.finishedAt=finishedAt;
  m.clock.summaryUntil=finishedAt+timingFor(m).resultSeconds*1000;
  // Discard former two-stage deadlines after converting to a combined display.
  delete m.clock.winnerUntil;
  delete m.clock.leagueUntil;
 }
 const formatClock=seconds=>{const s=Math.max(0,Math.floor(seconds));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
 const roundWinner=scores=>{
  const max=Math.max(...TEAMS.map(t=>Number(scores?.[t])||0));
  const winners=TEAMS.filter(t=>(Number(scores?.[t])||0)===max);
  return winners.length===1?winners[0]:null;
 };

 const teamShort={A:'Altın Pusula',B:'Kızıl Kıvılcım',C:'Gece Yıldızı',D:'Bordo Dalga'};
 const badgePaths={A:'altin-pusula.svg',B:'kizil-kivilcim.svg',C:'gece-yildizi.svg',D:'bordo-dalga.svg'};
 function matchClockView(m,now=Date.now()){
  const clock=m?.clock,timing=timingFor(m),en=timing.language==='en';
  const automatic=canContinueAutomatically(m);
  if(matchStarting(m,now))return {label:en?'Match Starting':'Maç Başlıyor',digits:formatClock(Math.ceil((clock.startedAt-now)/1000)),phase:'countdown'};
  const refereeWaiting={label:en?'Waiting for Referee to Start the Match':'Hakemin Maçı Başlatması Bekleniyor',digits:'',phase:'manual'};
  // The timer begins ONLY after an actual referee/admin start, not when the
  // page loads or when automatic continuation is toggled.
  if(!matchRunning(m,now)&&!breakDeadlines(m))return refereeWaiting;
  const ends=breakDeadlines(m);
  if(ends){
   const remaining=Math.max(0,Math.ceil((ends.summaryUntil-now)/1000));
   if(now<ends.summaryUntil){
    // The combined winners + league display uses its own configured result duration.
    return {label:en?'Results and Standings':'Kazanan ve Lig Sonuçları',digits:formatClock(remaining),phase:'result'};
   }
   if(seasonComplete(m))return {label:en?'Season Complete • Start a New Season':'Sezon Tamamlandı • Yeni Sezonu Başlat',digits:'',phase:'manual'};
   return automatic?{label:en?'Starting Next Match':'Yeni Maç Başlatılıyor',digits:'00:00',phase:'waiting'}:refereeWaiting;
  }
  if(!matchRunning(m,now))return refereeWaiting;
  // Every started match, including a manually started one, gets a visible
  // time-remaining countdown. Automatic mode controls NEXT match only.
  if(admin()&&Number(m?.lease?.until)>0&&now-m.lease.until>OFFLINE_GRACE_MS)return {label:'Bağlantı Kontrol Ediliyor',digits:'--:--',phase:'offline'};
  const elapsed=Math.max(0,now-Number(clock.startedAt)),duration=normalMs(m);
  if(elapsed<duration)return {label:clock.leagueFinal?(en?'Championship Final':'Şampiyonluk Finaline Kalan Süre'):(en?'Time Remaining':'Maçın Bitmesine Kalan Süre'),digits:formatClock(Math.ceil((duration-elapsed)/1000)),phase:'normal'};
  return {label:en?'Extra Time Remaining':'Uzatmanın Bitmesine Kalan Süre',digits:formatClock(Math.ceil(Math.max(0,duration+overtimeMs(m)-elapsed)/1000)),phase:'overtime'};
 }
 let lastRoundAnnouncement=null,leagueBreakSignature='';
 function drawLeagueBreak(m){
  const area=document.getElementById('leagueBreakRows');
  if(!area)return;
  const league=m?.league||{},signature=JSON.stringify([league.season,league.teams,league.trophies]);
  if(signature===leagueBreakSignature)return;
  leagueBreakSignature=signature;
  const rows=TEAMS.slice().sort((a,b)=>Number(league.teams?.[b]?.points||0)-Number(league.teams?.[a]?.points||0)||Number(league.teams?.[b]?.wins||0)-Number(league.teams?.[a]?.wins||0)||Number(league.teams?.[b]?.goals||0)-Number(league.teams?.[a]?.goals||0));
  area.replaceChildren();
  for(const team of rows){
   const tr=document.createElement('tr'),first=document.createElement('td');
   const icon=document.createElement('img');icon.src='./assets/team-logos/'+badgePaths[team];icon.alt='';icon.className='breakLogo';
   first.append(icon,document.createTextNode(teamShort[team]));tr.append(first);
   const row=league.teams?.[team]||{};
   for(const n of [row.played,row.wins,row.draws,row.losses,row.goals,row.points,league.trophies?.[team]]){
    const td=document.createElement('td');td.textContent=String(Number(n)||0);tr.append(td);
   }
   area.append(tr);
  }
  const label=document.getElementById('leagueBreakSeason');if(label)label.textContent=timingFor(m).arenaName.toLocaleUpperCase('tr-TR')+' • SEZON '+(Number(league.season)||1)+(m?.clock?.leagueFinal?' • ŞAMPİYONLUK FİNALİ':'');
 }
 function announceMatchResult(m){
  if(!m?.clock?.finishedAt||lastRoundAnnouncement===m.clock.finishedAt)return;
  lastRoundAnnouncement=m.clock.finishedAt;
  if(!m.clock.interrupted){
   window.AIFootballRoundCelebration?.start?.(m.clock.winner, m.lastResult?.scores);
  }
 }
 function showMatchClock(){
  const hud=document.getElementById('matchClockHud');if(!hud)return;
  const now=Date.now(),state=matchClockView(match,now),timing=timingFor(match),ends=breakDeadlines(match);
  const arena=document.getElementById('liveArenaName');
  const draftArena=window.AIFootballAdminPreviewArena?.();
  const arenaName=draftArena||timing.arenaName;
  const arenaTitle=arena?.querySelector('.arenaTitle');
  if(arenaTitle&&arenaTitle.textContent!==arenaName)arenaTitle.textContent=arenaName;
  document.documentElement.lang=timing.language;
  const label=hud.querySelector('.clockLabel'),digits=hud.querySelector('.clockDigits');
  if(label&&label.textContent!==state.label)label.textContent=state.label;
  if(digits&&digits.textContent!==state.digits)digits.textContent=state.digits;
  hud.dataset.phase=state.phase;
  hud.setAttribute('aria-label',state.label);
  const clockHidden=state.digits==='';
  if(digits)digits.hidden=clockHidden;
  const ended=!!ends;
  const automatic=canContinueAutomatically(match);
  const showingSummary=ended&&now<ends.summaryUntil;
  const waitingForAdmin=ended&&!automatic&&now>=ends.summaryUntil;
  // Keep the start control visible on the main admin screen at all times.
  // Its enabled/disabled status follows the combined results deadline.
  window.AIFootballUpdateMainMatchLaunch?.();
  const autoButton=document.getElementById('autoMatchesToggle');
  if(autoButton){
   const text='MAÇLAR OTOMATİK DEVAM ETSİN: '+(automatic?'AÇIK':'KAPALI');
   autoButton.dataset.enabled=String(automatic);
   if(autoButton.textContent!==text)autoButton.textContent=text;
  }
  const summary=summaryBoard;
  if(summary){if(showingSummary&&!summary.isConnected)document.querySelector('.wrap')?.append(summary);else if(!showingSummary&&summary.isConnected)summary.remove();}
  const waiting=document.getElementById('roundWaiting');
  if(summary){
   // Explicit view flag blocks stale CSS from exposing an empty dark overlay.
   // Hidden state is synchronized with the same clock phase used for the HUD.
   summary.dataset.showing=showingSummary?'true':'false';
   summary.hidden=!showingSummary;
   summary.setAttribute('aria-hidden',String(!showingSummary));
   // Keep the physical panel and HUD phase in lockstep, even if an old CSS
   // declaration tries to force display:flex in the signed-in admin view.
   summary.style.setProperty('display',showingSummary?'flex':'none','important');
   summary.style.setProperty('visibility',showingSummary?'visible':'hidden','important');
  }
  // The old large waiting overlay is retired; the status is in the referee HUD.
  if(waiting)waiting.hidden=true;
  const result=document.getElementById('matchResultBanner'),league=document.getElementById('leagueBreakPanel');
  if(result)result.hidden=!showingSummary;
  if(league)league.hidden=!showingSummary;
  if(showingSummary){
   announceMatchResult(match);
   const winner=match.clock.interrupted?'MAÇ TEKNİK NEDENLE DURDU':
    match.clock.winner?teamShort[match.clock.winner]+' KAZANDI':'BERABERE';
   const score=TEAMS.map(t=>teamShort[t]+' '+(Number(match.lastResult?.scores?.[t])||0)).join(' • ');
   const nextText=automatic?'SONUÇLARDAN SONRA YENİ MAÇ OTOMATİK BAŞLAYACAK':
    'OTOMATİK MAÇ KAPALI';
   for(const [selector,value] of [['.resultWinner',winner],['.resultScores',score],['.resultNext',nextText]]){
    const element=result?.querySelector(selector);
    if(element&&element.textContent!==value)element.textContent=value;
   }
   drawLeagueBreak(match);
   const remaining=Math.ceil(Math.max(0,ends.summaryUntil-now)/1000);
   const leagueText=automatic?'YENİ MAÇ '+formatClock(remaining)+' SONRA':
    'SONUÇ EKRANI KALAN '+formatClock(remaining);
   const textNode=league?.querySelector('.leagueNext');
   if(textNode&&textNode.textContent!==leagueText)textNode.textContent=leagueText;
  }
 }

 let row=null,match=null,installed=false,connected=false,socket=null,retry=null,reading=null,chain=Promise.resolve(),channel=null,channelReady=false,lastRead=0,lastRules='',errorText='';
 let sendingRequests=false,guestSending=false,requestBatchInFlight=null,giftBatchInFlight=null;
 const guestRequestClient=crypto.randomUUID(),guestTrialSeen=new Map(),guestTrialWindow=[];
 let lastGuestClickAt=0,lastGuestSendAt=0;
 const GUEST_SEND_COOLDOWN_MS=2000,GUEST_RETRY_MS=5000;
 // Guest button controls are isolated from settings, reset, or admin match control.
 function validGuestRequest(p){
  return validRequest(p)&&p.guestTrial===true&&typeof p.clientId==='string'&&
   /^[0-9a-f-]{36}$/i.test(p.clientId)&&(p.count===1||p.count===5);
 }
 function guestBudget(p,now=Date.now()){
  if(!validGuestRequest(p))return false;
  const clientHistory=guestTrialSeen.get(p.clientId)||[];
  const recent=clientHistory.filter(x=>now-x.at<60000);
  if(recent.some(x=>x.id===p.id))return false;
  // Per client and across all guests, enforce a basic trial limit.
  // Full anti-abuse would need authenticated users and server-side rate limits.
  if(recent.reduce((sum,x)=>sum+x.count,0)+p.count>30)return false;
  while(guestTrialWindow.length&&now-guestTrialWindow[0].at>=60000)guestTrialWindow.shift();
  if(guestTrialWindow.reduce((sum,x)=>sum+x.count,0)+p.count>150)return false;
  recent.push({id:p.id,at:now,count:p.count});guestTrialSeen.set(p.clientId,recent);
  guestTrialWindow.push({at:now,count:p.count});return true;
 }
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
 const videoAckInFlight=new Set();
 let lastGiftNoticeCount=null;const seenTeamNotices=new Map();const giftNoticeTimers=new Map(),giftNoticeKeys=new Map();
 function showQueuedGiftNotice(id,team){
  if(!TEAMS.includes(team)||matchRunning(match))return;
  if(id&&giftNoticeKeys.get(team)===id)return;
  giftNoticeKeys.set(team,id);
  let node=document.getElementById('pendingGiftNotice'+team);
  if(!node){const card=document.querySelector('.broadcastControls>.team'+team);if(!card)return;node=document.createElement('div');node.id='pendingGiftNotice'+team;node.className='teamGiftNotice';node.setAttribute('role','status');node.setAttribute('aria-live','polite');card.append(node);}
  node.textContent='Şutlar maç başlayınca otomatik başlayacaktır.';
  node.hidden=false;
  clearTimeout(giftNoticeTimers.get(team));
  giftNoticeTimers.set(team,setTimeout(()=>{node.hidden=true;window.dispatchEvent(new Event('resize'));},3000));
  window.dispatchEvent(new Event('resize'));
 }
 function detectStoredGiftNotice(){
  if(!match)return;
  for(const [team,notice]of Object.entries(match.giftNotices||{}))if(notice?.id&&seenTeamNotices.get(team)!==notice.id){seenTeamNotices.set(team,notice.id);if(Date.now()-notice.at<3000)showQueuedGiftNotice(notice.id,team);}
  const n=Math.max(0,Number(match.accepted)||0);
  if(lastGiftNoticeCount!==null&&n>lastGiftNoticeCount&&!matchRunning(match))
   showQueuedGiftNotice(match.lastGift?.id||String(n),match.lastGift?.team);
  lastGiftNoticeCount=n;
 }
 function acknowledgeVideoStart(payload){
  if(!owns()||!payload||payload.playbackOwner!==owner||typeof payload.cueId!=='string'||!Number.isFinite(payload.mediaTime)||payload.mediaTime<.08||payload.clockStartedAt!==match?.clock?.startedAt)return;
  const cue=[match?.cue,match?.nextCue].find(c=>c?.id===payload.cueId);
  if(cue===match?.nextCue&&match.cue&&!hasVideoProof(match,match.cue))return;
  if(!cue||cue.startsAt<match.clock.startedAt||cue.playbackOwner!==owner||Date.now()<cue.startsAt||cue.id!==payload.cueId||cue.startsAt!==payload.startsAt||hasVideoProof(match,cue)||!matchRunning(match)||videoAckInFlight.has(payload.cueId))return;
  videoAckInFlight.add(payload.cueId);
  change(m=>{
   const target=[m.cue,m.nextCue].find(c=>c?.id===payload.cueId);
   if(target===m.nextCue&&m.cue&&!hasVideoProof(m,m.cue))return false;
   if(!owns(m)||!matchRunning(m)||!target||target.startsAt!==payload.startsAt||Date.now()<target.startsAt||hasVideoProof(m,target))return false;
   target.videoStartedAt=Date.now();
   target.outcomeAt=Math.max(target.outcomeAt,target.videoStartedAt+750);
   target.endsAt=Math.max(target.endsAt,target.videoStartedAt+1500);
  },false).catch(error=>console.warn('Video başlangıcı onaylanamadı',error)).finally(()=>videoAckInFlight.delete(payload.cueId));
 }
 function acknowledgeVideoFinish(payload){
  if(!owns()||!payload||payload.playbackOwner!==owner||typeof payload.cueId!=='string'||!Number.isFinite(payload.mediaTime)||
   !Number.isFinite(payload.duration)||payload.duration<0.5||
   payload.mediaTime<Math.max(0.4,payload.duration-0.3)||
   payload.clockStartedAt!==match?.clock?.startedAt||
   !matchRunning(match)||videoAckInFlight.has('finish:'+payload.cueId))return;
  const cue=[match?.cue,match?.nextCue].find(c=>c?.id===payload.cueId);
  if(!cue||cue.startsAt<match.clock.startedAt||cue.playbackOwner!==owner||cue.startsAt!==payload.startsAt||hasVideoCompletionProof(match,cue)||payload.naturalEnd!==true||Math.abs(payload.duration-cue.durationMs/1000)>.5||!Number.isFinite(payload.playedSeconds)||payload.playedSeconds<cue.durationMs/1000-.35||!Number.isFinite(payload.elapsedMs)||payload.elapsedMs<cue.durationMs-500)return;
  videoAckInFlight.add('finish:'+payload.cueId);
  change(m=>{
   const target=[m.cue,m.nextCue].find(c=>c?.id===payload.cueId);
   if(!owns(m)||!matchRunning(m)||!target||target.startsAt!==payload.startsAt||hasVideoCompletionProof(m,target))return false;
   // The HTMLVideoElement 'ended' event plus actual end mediaTime is the
   // authoritative proof of spending a shot, not a guessed timeout.
   target.videoStartedAt||=Math.max(target.startsAt,Date.now()-Math.min(payload.duration*1000,60000));
   target.videoFinishedAt=Date.now();target.videoPlayedSeconds=payload.playedSeconds;target.videoElapsedMs=payload.elapsedMs;target.videoPlaybackOwner=owner;
  },false).catch(e=>console.warn('Video bitiş onayı yazılamadı',e))
   .finally(()=>videoAckInFlight.delete('finish:'+payload.cueId));
 }
 function reportVideoFinish(payload){
  if(!payload)return;
  if(admin())acknowledgeVideoFinish(payload);
  // Never send publicly forgeable privileged completion messages.
 }
 function reportVideoStart(payload){
  if(!payload)return;const cue=[match?.cue,match?.nextCue].find(c=>c?.id===payload.cueId);
  if(!cue||cue.startsAt!==payload.startsAt||hasVideoProof(match,cue)||!matchRunning(match))return;
  if(admin())acknowledgeVideoStart(payload);
  // The public viewer is not a trusted source of video accounting.
  // An authenticated server relay can be added once its identity is configured.
 }
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
  const scores={...m.scores};
  if(m.clock?.leagueFinal){
   const finalists=league.finalists||[];
   const top=Math.max(...finalists.map(t=>Number(scores[t])||0));
   const winners=finalists.filter(t=>(Number(scores[t])||0)===top);
   league.history.push({round:m.clock.round,at:m.clock.finishedAt,scores,winner:winners.length===1?winners[0]:null,final:true});
   league.history=league.history.slice(-100);
   if(winners.length===1){league.champion=winners[0];league.trophies[winners[0]]=(Number(league.trophies[winners[0]])||0)+1;league.finalists=[];}
   else{league.finalAttempts=(Number(league.finalAttempts)||0)+1;}
   return;
  }
  if(league.completedRounds>=league.plannedRounds)return;
  const topScore=Math.max(...TEAMS.map(t=>Number(scores[t])||0));
  const winners=TEAMS.filter(t=>(Number(scores[t])||0)===topScore);
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
   const sorted=TEAMS.slice().sort((a,b)=>league.teams[b].points-league.teams[a].points||league.teams[b].wins-league.teams[a].wins||league.teams[b].goals-league.teams[a].goals);
   const lead=league.teams[sorted[0]];
   const equals=sorted.filter(t=>league.teams[t].points===lead.points&&league.teams[t].wins===lead.wins&&league.teams[t].goals===lead.goals);
   if(equals.length>1){league.finalists=equals;league.champion=null;league.finalAttempts=0;}
   else{league.champion=sorted[0];league.trophies[sorted[0]]=(Number(league.trophies[sorted[0]])||0)+1;}
  }
 }
 function interruptOfflineMatch(m,at){
  if(m.clock?.finishedAt)return false;
  // Keep queued gifts; requeue a shot not yet committed before the disconnect.
  if(m.nextCue?.id)m.jobs.unshift({id:'recovered:'+m.nextCue.id,team:m.nextCue.team,count:1,nextIndex:0});
  if(m.cue?.id&&(!m.cue.committed||!m.cue.finishedAt&&!hasVideoProof(m,m.cue)))m.jobs.unshift({id:'recovered:'+m.cue.id,team:m.cue.team,count:1,nextIndex:0});
  m.nextCue=null;m.cue=null;
  m.clock={...(m.clock||{startedAt:at,durationMs:MATCH_MS,round:1}),interrupted:true,winner:null};
  stampBreakDeadlines(m,at);
  m.lastResult={round:m.clock.round,finishedAt:at,scores:{...m.scores},winner:null,interrupted:true};
  // Interrupted rounds never earn league points. Wait through the full results screen.
  return true;
 }
 function ready(){try{return typeof db!=='undefined'&&typeof state!=='undefined'&&typeof render==='function';}catch{return false;}}
 function needsRefresh(){return !!match&&Number(match.minClientBuild||0)>CLIENT_BUILD;}
 function admin(){try{return adminAuthed===true&&!needsRefresh();}catch{return false;}}
 function enforceRefreshOnOldBuild(){
  const stale=needsRefresh()&&typeof adminAuthed!=='undefined'&&adminAuthed===true;
  let panel=document.getElementById('aiFootballUpdateRequired');
  if(!stale){if(panel)panel.hidden=true;return;}
  if(!panel){
   panel=document.createElement('div');panel.id='aiFootballUpdateRequired';
   Object.assign(panel.style,{position:'fixed',inset:'0',zIndex:'2147483647',
    background:'rgba(4,13,28,.96)',color:'#fff',display:'flex',flexDirection:'column',
    alignItems:'center',justifyContent:'center',gap:'18px',padding:'24px',
    textAlign:'center',font:'700 18px/1.5 system-ui,sans-serif'});
   const title=document.createElement('div');
   title.textContent='Yeni sürüm yüklendi. Bu yönetici sekmesi eski kaldı; işlem yapabilmek için sayfayı yenileyin.';
   const button=document.createElement('button');button.type='button';button.textContent='SAYFAYI YENİLE';
   Object.assign(button.style,{background:'#148b70',border:'0',borderRadius:'10px',
     font:'700 16px system-ui,sans-serif',padding:'14px 26px',color:'#fff',cursor:'pointer'});
   button.addEventListener('click',()=>location.reload());
   panel.append(title,button);document.body.append(panel);
  }
  panel.hidden=false;
 }
 function owns(m=match){return admin()&&m?.lease?.owner===owner&&m.lease.until>Date.now();}
 function paint(){document.documentElement.dataset.tiktokConnection=connected?'connected':'waiting';showMatchClock();if(!ready())return;const el=document.getElementById('connectionStatus');if(el&&admin())el.textContent=errorText||(!match?'Ortak maç bekleniyor':owns()?(connected?'TikFinity bağlı • Yönetici':'Yönetici açık • TikFinity bekleniyor'):'Yönetici açık • Ortak maç');}
 let lastPaintedMatch='';
 const displayedQueues={A:null,B:null,C:null,D:null};
 function queueShimmer(team){
  const number=document.getElementById('frontQueue'+team);
  if(!number)return;
  // Only the changing numeral flashes; the team card and caption remain steady.
  number.classList.remove('queueSpark');
  void number.offsetWidth;
  number.classList.add('queueSpark');
 }

 const localKickedCues=new Set();
 function pendingShotCounts(m){
  const counts={A:0,B:0,C:0,D:0};if(!m)return counts;
  for(const job of m.jobs||[])if(job&&counts[job.team]!==undefined)counts[job.team]+=Math.max(1,Math.floor(Number(job.count)||1));
  if(m.nextCue?.team&&!hasVideoCompletionProof(m,m.nextCue)&&counts[m.nextCue.team]!==undefined)counts[m.nextCue.team]++;
  // The active shot remains counted only until the footballer's boot hits
  // the ball. Completion/goal accounting still needs real video-end proof.
  if(m.cue?.team&&!hasVideoCompletionProof(m,m.cue)&&!Number.isFinite(m.cue.kickedAt)&&!localKickedCues.has(m.cue.id)&&counts[m.cue.team]!==undefined)counts[m.cue.team]++;
  return counts;
 }
 function registerLocalBallKick(payload){
  if(!payload||typeof payload.cueId!=='string'||!matchRunning(match))return false;
  const cue=match?.cue;
  if(!cue||cue.finishedAt||cue.id!==payload.cueId||cue.team!==payload.team||
     cue.startsAt!==payload.startsAt||!Number.isFinite(payload.mediaTime)||payload.mediaTime<.2)return false;
  if(localKickedCues.has(cue.id)||Number.isFinite(cue.kickedAt))return true;
  localKickedCues.add(cue.id);
  if(localKickedCues.size>300)localKickedCues.delete(localKickedCues.values().next().value);
  lastPaintedMatch='';restore();return true;
 }
 const ballKickAckInFlight=new Set();
 function acknowledgeBallKick(payload){
  if(!admin()||!owns()||!payload||payload.playbackOwner!==owner||payload.clockStartedAt!==match?.clock?.startedAt)return;
  const cue=match?.cue;
  if(!cue||cue.id!==payload.cueId||cue.team!==payload.team||cue.startsAt!==payload.startsAt||cue.playbackOwner!==owner||
     !matchRunning(match)||cue.finishedAt||Number.isFinite(cue.kickedAt)||ballKickAckInFlight.has(cue.id))return;
  if(!Number.isFinite(payload.mediaTime)||payload.mediaTime<Number(payload.kickTime||0)||payload.mediaTime>cue.durationMs/1000+.25)return;
  ballKickAckInFlight.add(cue.id);
  change(m=>{
   const target=m.cue;
   if(!owns(m)||!matchRunning(m)||!target||target.id!==payload.cueId||target.startsAt!==payload.startsAt||
      target.team!==payload.team||target.playbackOwner!==owner||Number.isFinite(target.kickedAt))return false;
   target.kickedAt=Date.now();
  },false).catch(error=>console.warn('Şut temas onayı bekleniyor',error)).finally(()=>ballKickAckInFlight.delete(cue.id));
 }
 function restore(){
  if(!ready()||!match)return;
  const counts=pendingShotCounts(match);
  // Incoming TikTok gifts are visible immediately, even before the admin leader
  // commits the gift receipt to the shared database. Once acknowledged, do not
  // double-count the same gift alongside its persisted job.
  for(const [giftKey,gift] of inbox){
   if(!match.receipts?.includes(giftKey)&&Number(gift.receivedAt||0)>Number(match.queueClearAt?.[gift.team]||0)&&counts[gift.team]!==undefined)
    counts[gift.team]+=Math.max(1,Math.floor(Number(gift.count)||1));
  }
  // Optimistic UI: count unconfirmed requests and not-yet-flushed button bursts immediately.
  for(const r of pendingRequests.values()){
   const p=r.payload;
   if(!match.commandReceipts?.includes(p.id)&&Number(p.sentAt||0)>Number(match.queueClearAt?.[p.team]||0)&&counts[p.team]!==undefined)counts[p.team]+=p.count;
  }
  for(const [team,burst] of manualBursts)if(counts[team]!==undefined)counts[team]+=burst.count;
  for(const team of TEAMS){
   if(displayedQueues[team]!==null&&counts[team]>displayedQueues[team])queueShimmer(team);
   displayedQueues[team]=counts[team];
  }
  detectStoredGiftNotice();
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
 function legend(){
 const icons=[['rocket','jam'],['perfume','donut'],['overreact','capybara'],['name-greeting','roll']];
 for(const [i,panel]of [...document.querySelectorAll('.broadcastControls .panel')].entries())for(const [j,button]of [...panel.querySelectorAll('.shot')].entries()){
  if(j>1){button.hidden=true;continue;}
  const image=document.createElement('img');image.src='./assets/gifts-v193/'+icons[i][j]+'.png';image.alt='';image.width=112;image.height=112;button.querySelector('.giftVisual').replaceChildren(image);
 }
 }

 function consider(cue){
  // Queue data is not permission to play: no shots before the referee's kickoff.
  if(!cue||cue.finishedAt||!matchRunning(match))return;
  const signature=cue.startsAt+':'+cue.result;
  if(cueTimings.has(cue.id)&&cueTimings.get(cue.id)!==signature){clearTimeout(timers.get(cue.id));timers.delete(cue.id);played.delete(cue.id);}
  cueTimings.set(cue.id,signature);if(cueTimings.size>1000)cueTimings.delete(cueTimings.keys().next().value);
  // A promoted cue must not wait for a previous video's ended event on a new/reconnected client.
  // Do not mark an expired cue as played without a video. The leader will
  // return it to the queue and give it a fresh real playback window.
  if(match?.cue?.id===cue.id&&Date.now()>=cue.endsAt&&!window.AIFootball3D?.isAnimating)return;
  if(match?.clock?.finishedAt||played.has(cue.id)||timers.has(cue.id))return;
  const start=async(actualStart)=>{
   timers.delete(cue.id);if(!matchRunning(match))return;const liveCue=[match?.cue,match?.nextCue].find(c=>c?.id===cue.id&&!c.finishedAt);if(!liveCue)return;if(liveCue.startsAt!==cue.startsAt||liveCue.result!==cue.result){consider(liveCue);return;}if(liveCue===match.nextCue&&match.cue&&!hasVideoProof(match,match.cue)){timers.set(cue.id,setTimeout(start,150));return;}
   // Shot clips can load even if the idle/waiting video never loads on iOS.
   // A clip is booked only after its player has actually accepted playback.
   if(!window.AIFootball3D?.beginShot){
    timers.set(cue.id,setTimeout(start,200));return;
   }
   if(Date.now()>=cue.endsAt)return; // Never consume an expired slot.
   const accepted=window.AIFootball3D.beginShot(cue.team,{startsAt:cue.videoStartedAt||cue.startsAt,playbackOwner:cue.playbackOwner,variation:cue.variation,result:cue.result,cueStartsAt:cue.startsAt,cueId:cue.id});
   if(accepted!==true){
    timers.set(cue.id,setTimeout(start,240));return;
   }
   played.add(cue.id);
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
   else if(Number(r.payload?.sentAt||0)<=Number(match?.queueClearAt?.[r.payload?.team]||0)){pendingRequests.delete(id);r.resolve?.(false);changed=true;}
   else if(!validRequest(r.payload)){pendingRequests.delete(id);r.resolve?.(false);changed=true;console.warn('Shot request expired:',id);}
  }
  if(changed){rememberRequests();restore();}
}
 function receiveRequest(payload){
  // Only the authenticated match leader may turn a guest trial into a queued job.
  // Public messages never execute admin actions or touch any other game setting.
  if(!admin()||!owns()||!match||match.guestTrialEnabled!==true||!validGuestRequest(payload)||Number(payload.sentAt||0)<=Number(match.queueClearAt?.[payload.team]||0))return false;
  if(match.commandReceipts?.includes(payload.id)||requestInbox.has(payload.id))return false;
  if(!guestBudget(payload))return false;
  requestInbox.set(payload.id,{...payload});
  return true;
 }
 async function sendGuestRequests(){
  if(admin()||guestSending||!match||!pendingRequests.size)return;
  const now=Date.now();
  if(now-lastGuestSendAt<1200)return;
  const batch=[...pendingRequests.values()].filter(r=>r.payload?.guestTrial===true&&validGuestRequest(r.payload)
   &&now-(r.lastSent||0)>=GUEST_RETRY_MS).slice(0,12);
  if(!batch.length)return;
  guestSending=true;lastGuestSendAt=now;
  const requests=batch.map(r=>r.payload);
  try{
   if(channelReady&&channel){
    await channel.send({type:'broadcast',event:'shot_request_batch',payload:{requests}});
   }else await sendRequestBatchHTTP(requests);
   for(const item of batch)item.lastSent=now;
  }catch(error){
   console.warn('Misafir deneme şutu yeniden gönderilecek',error);
  }finally{guestSending=false;}
 }

 async function flushRequestInbox(){
  if(requestBatchInFlight)return requestBatchInFlight;
  if(!admin()||!owns()||!requestInbox.size)return;
  if(match?.guestTrialEnabled!==true){requestInbox.clear();return;}
  for(const [id,p]of requestInbox)if(!validGuestRequest(p))requestInbox.delete(id);
  const batch=[...requestInbox].slice(0,80);
  if(!batch.length)return;
  requestBatchInFlight=(async()=>{
   await change(m=>{
    if(m.guestTrialEnabled!==true)return false;
    m.commandReceipts ||= [];
    const seen=new Set(m.commandReceipts);
    let changed=false;
    for(const [id,p] of batch){
     if(!validGuestRequest(p)||seen.has(id))continue;
     if(Number(p.sentAt||0)<=Number(m.queueClearAt?.[p.team]||0)){seen.add(id);m.commandReceipts.push(id);changed=true;continue;}
     seen.add(id);m.commandReceipts.push(id);
     m.jobs.push({id:'guest-test:'+id,team:p.team,count:p.count,nextIndex:0});
     m.giftNotices||={};m.giftNotices[p.team]={id,at:Date.now()};
     changed=true;
    }
    if(!changed)return false;
    m.lastShotQueuedAt=Date.now();primeQueuedShots(m,Date.now());
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
  if(!admin()){await sendGuestRequests();return;}
  if(sendingRequests||!pendingRequests.size||!match)return;
  sendingRequests=true;
  try{const requests=[...pendingRequests.values()].map(r=>r.payload).filter(validRequest).slice(0,80);
   if(!requests.length)return;
   // Supabase's authenticated write/RLS path also works from a non-leader admin phone.
   await change(m=>{m.commandReceipts||=[];const seen=new Set(m.commandReceipts);let added=false;for(const p of requests){if(seen.has(p.id))continue;seen.add(p.id);m.commandReceipts.push(p.id);added=true;if(Number(p.sentAt||0)<=Number(m.queueClearAt?.[p.team]||0))continue;m.jobs.push({id:'button:'+p.id,team:p.team,count:p.count,nextIndex:0});m.giftNotices||={};m.giftNotices[p.team]={id:p.id,at:Date.now()};added=true;}if(!added)return false;m.lastShotQueuedAt=Date.now();primeQueuedShots(m,Date.now());m.commandReceipts=m.commandReceipts.slice(-4000);},false);
   for(const p of requests)if(match.commandReceipts?.includes(p.id)&&!matchRunning(match))showQueuedGiftNotice(p.id,p.team);
   acknowledgeRequests();
  }finally{sendingRequests=false;}
 }
  function ensureChannel(){
  if(channel||!row)return;
  const subscribed=db.channel('tiktok-match-v2-'+row.id,{config:{broadcast:{ack:true,self:true}}});channel=subscribed;
  subscribed.on('postgres_changes',{event:'UPDATE',schema:'public',table:'games',filter:'id=eq.'+row.id},p=>apply(p.new))
   .on('broadcast',{event:'shot_request'},({payload})=>receiveRequest(payload))
   .on('broadcast',{event:'shot_request_batch'},({payload})=>{for(const p of payload?.requests||[])receiveRequest(p);})
   // Never accept privileged video accounting from the public broadcast channel.
   // Public viewers can follow the match, but cannot forge the score/shot receipts.
   .subscribe(status=>{
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
  if(m?.version===2){
   match=m;enforceRefreshOnOldBuild();acknowledgeRequests();restore();
   const running=matchRunning(m);
   if(!running&&window.AIFootball3D?.isAnimating)window.AIFootball3D.reset();
   if(running){
    if(!m.cue&&window.AIFootball3D?.isAnimating)window.AIFootball3D.reset?.();
    window.AIFootball3D?.prepareUpcomingShot?.(m.nextCue);
    consider(m.cue);consider(m.nextCue);window.AIFootball3D?.syncCue?.(m.cue);
    if(m.cue?.finishedAt&&!m.nextCue&&!m.jobs.length)
     window.AIFootball3D?.finishSyncedShot?.(m.cue.startsAt);
   }
  }else paint();
 }
 async function read(){if(reading)return reading;reading=(async()=>{const {data,error}=await db.from('games').select('id,rules').eq('name','AI Football Live').limit(1).abortSignal(requestSignal()).single();if(error)throw error;apply(data);lastRead=Date.now();return data;})().finally(()=>reading=null);return reading;}
 function change(edit,leaseRequired=true,patch=null){const run=async()=>{
  if(!admin())return false;
  for(let attempt=0;attempt<6;attempt++){
   const base=await read(),existing=base.rules?.[KEY];if(!existing)return false;
   if(leaseRequired&&!owns(existing))return false;
   const next=clone(existing);if(edit(next)===false)return false;
   next.revision=existing.revision+1;next.updatedAt=Date.now();next.clientBuild=CLIENT_BUILD;next.clientRevision=next.revision;
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
  const initial={version:2,revision:1,clock:{startedAt:null,manualStarted:false,autoStarted:false,durationMs:MATCH_MS,round:1,finishedAt:null},timing:{...DEFAULT_TIMING},scores:{A:0,B:0,C:0,D:0},keeper:Object.fromEntries(['A','B','C','D'].map(t=>[t,Number(state.startKeeper)||10])),jobs:[],cue:null,receipts:await Promise.all((legacy?.seen||[]).slice(-4000).map(digest)),accepted:Number(legacy?.accepted)||0,lastGift:null,shotSequence:0,idleEpoch:Date.now(),updatedAt:Date.now(),lease:{owner,until:Date.now()+LEASE}};
  initial.clientBuild=CLIENT_BUILD;initial.clientRevision=initial.revision;initial.minClientBuild=CLIENT_BUILD;
  const rules={...base.rules,[KEY]:initial};const {data,error}=await db.from('games').update({rules}).eq('id',base.id).eq('rules',JSON.stringify(base.rules)).select('id,rules');
  if(error)throw error;if(data?.length)apply(data[0]);else await read();
 }
 async function receive(raw){
  if(raw?.event!=='gift'&&raw?.type!=='gift')return false;
  const g=raw.data||{},id=g.transactionId||g.msgId||g.id,name=g.giftName??g.giftDetails?.giftName,giftId=g.giftId??g.giftDetails?.giftId,type=g.giftType??g.giftDetails?.giftType;
  if(!id||Number(type)===1&&g.repeatEnd!==true)return false;
  const keyName=String(name||'').trim().toLowerCase().normalize('NFD')
   .replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/\s+/g,' ');
  const gifts=[
   {team:'A',shots:1,names:['roket','rocket']},
   {team:'A',shots:5,names:['you are my jam','youre my jam']},
   {team:'B',shots:1,names:['ask kokusu','love scent','scent of love']},
   {team:'B',shots:5,names:['donat','donut','doughnut']},
   {team:'C',shots:1,names:['asiri tepki','overreaction','overreact','over react','extreme reaction']},
   {team:'C',shots:5,names:['kapibara','capybara']},
   {team:'D',shots:1,names:['isimle selamlama','name greeting','greeting by name']},
   {team:'D',shots:5,names:['you are on a roll','youre on a roll']}
  ];
  const selected=gifts.find(g=>g.names.includes(keyName));
  const repeats=Number(g.repeatCount??1),count=repeats*(selected?.shots||0);
  if(!selected||!Number.isSafeInteger(repeats)||repeats<1||!Number.isSafeInteger(count)||count>10000)return false;
  const key=await digest(JSON.stringify([String(id),String(g.uniqueId||g.user?.uniqueId||g.userId||g.user?.userId||''),String(giftId||name||'')]));
  if(match?.receipts.includes(key))return false;
  inbox.set(key,{team:selected.team,count,name:String(name||giftId),receivedAt:Date.now()});
  saveGiftInbox();
  if(!matchRunning(match))showQueuedGiftNotice(key,selected.team);
  // Update the team's pending-shot number immediately without starting any clip.
  restore();
  return true;
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
     seen.add(key);m.receipts.push(key);changed=true;
     if(Number(g.receivedAt||0)<=Number(m.queueClearAt?.[g.team]||0))continue;
     m.accepted++;
     m.lastGift={id:key,team:g.team,count:g.count,name:g.name};m.giftNotices||={};m.giftNotices[g.team]={id:key,at:Date.now()};
     m.jobs.push({id:key,team:g.team,count:g.count,nextIndex:0});
     changed=true;
    }
    if(!changed)return false;
    m.lastShotQueuedAt=Date.now();primeQueuedShots(m,Date.now());
    m.receipts=m.receipts.slice(-4000);
   });
   for(const [key] of batch)if(match?.receipts.includes(key))inbox.delete(key);
   saveGiftInbox();
  })().finally(()=>{giftBatchInFlight=null;});
  return giftBatchInFlight;
 }
  function totalJobs(jobs){return jobs.reduce((sum,j)=>sum+Math.max(1,Math.floor(Number(j.count)||1)),0);}
 const eligibleJob=(m,j)=>!m.clock?.leagueFinal||m.league?.finalists?.includes(j.team);
 const hasPlayableJobs=m=>!!m?.jobs?.some(j=>eligibleJob(m,j));
 function takeJob(m,lastTeam){
  const order=['A','B','C','D'],start=order.indexOf(lastTeam);
  let at=-1;
  for(let n=1;n<=order.length;n++){
   const team=order[(start+n+order.length)%order.length];
   at=m.jobs.findIndex(j=>j.team===team&&eligibleJob(m,j));
   if(at>=0)break;
  }
  if(at<0)return null;
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
  return {playbackProtocol:204,playbackOwner:m.lease?.owner||owner,durationMs:timing.durationMs||14000,id:j.id,team:j.team,result:goal?'goal':'save',variation:m.shotSequence++,startsAt,outcomeAt:startsAt+(timing.outcomeMs||1850),endsAt:startsAt+(timing.durationMs||14000),after,committed:false,finishedAt:null};
 }
 function reserveNext(m,job,startsAt){const projected=m.cue&&!m.cue.committed?{...m,scores:m.cue.after.scores,keeper:m.cue.after.keeper}:m;const cue=makeCue(projected,job,startsAt);m.shotSequence=projected.shotSequence;return cue;}
 // Queue acceptance and cue scheduling share one authenticated CAS write.
 function primeQueuedShots(m,now){
  if(!window.AIFootball3D?.getShotTiming)return;
  if(!matchRunning(m,now)||m.processingPaused||now>=m.clock.startedAt+normalMs(m)+overtimeMs(m))return;
  if(!m.cue||m.cue.finishedAt){
   const job=takeJob(m,m.cue?.team);if(!job)return;
   m.cue=makeCue(m,job,now+100);m.nextCue=null;m.cooldownUntil=0;
  }
  // Never remove the following job from the queue before this video finishes.
  // Pre-reservation caused premature queue deductions on slow phone streams.
 }
 function closeRound(m,now){
  if(m.clock?.finishedAt)return false;
  // Settle contacts already reached at the deadline, then preserve unplayed shots.
  // Only a fully rendered and ended clip may settle a shot/goal.
  for(const cue of [m.cue,m.nextCue]){
   if(cue&&!cue.committed&&hasVideoCompletionProof(m,cue)){
    m.scores=clone(cue.after.scores);m.keeper=clone(cue.after.keeper);cue.committed=true;
   }
  }
  returnUnplayedCues(m);
  stampBreakDeadlines(m,now);
  const contenders=m.clock.leagueFinal&&m.league?.finalists?.length?m.league.finalists:TEAMS;
  const highest=Math.max(...contenders.map(t=>Number(m.scores?.[t])||0));
  const winners=contenders.filter(t=>(Number(m.scores?.[t])||0)===highest);
  m.clock.winner=winners.length===1?winners[0]:null;
  m.lastResult={round:m.clock.round,finishedAt:now,scores:{...m.scores},winner:m.clock.winner,leagueFinal:!!m.clock.leagueFinal};
  recordLeagueRound(m);
  return true;
 }
 function beginNextRound(m,now){
  const round=(Number(m.clock?.round)||1)+1;
  if(m.league?.completedRounds>=m.league?.plannedRounds&&m.league.champion){
   m.leagueArchive ||= [];
   m.leagueArchive.push({season:m.league.season,completedAt:now,champion:m.league.champion,
    trophies:{...m.league.trophies},teams:clone(m.league.teams)});
   m.leagueArchive=m.leagueArchive.slice(-12);
   m.league=newLeague((Number(m.league.season)||1)+1,m.league.trophies);
  }
  m.clock={startedAt:now+KICKOFF_COUNTDOWN_MS,countdownStartedAt:now,manualStarted:false,autoStarted:autoMatchEnabled(m),durationMs:normalMs(m),round,finishedAt:null,leagueFinal:!!(m.league?.completedRounds>=m.league?.plannedRounds&&!m.league?.champion&&m.league?.finalists?.length>1)};
  m.scores={A:0,B:0,C:0,D:0};
  m.keeper=Object.fromEntries(TEAMS.map(t=>[t,Number(m.initialKeeper?.[t]??state.startKeepers?.[t]??10)]));
  m.cue=null;m.nextCue=null;m.cooldownUntil=0;m.idleEpoch=now;
  // All queued gifts remain pending for the newly started round.
 }
 async function advance(){
  if(!owns())return;
  const now=Date.now();
  // A dead local TikTok gift bridge must not allow an invisible match to keep running.
  if(bridgeEverConnected&&(!connected||bridgeWasOffline)){
   if(bridgeWasOffline||connectionLostAt!==null&&now-connectionLostAt>OFFLINE_GRACE_MS){
    if(matchRunning(match)){
     await change(m=>matchRunning(m)?interruptOfflineMatch(m,Date.now()):false);
    }
    bridgeWasOffline=false;
   }
   if(!connected)return;
  }
  if(match.processingPaused){ /* Finish an already active shot; do not start another while paused. */ }
  // Migrate an existing live match in place; do not reset its scores or queued shots.
  if(!match.clock){
   await change(m=>{if(m.clock)return false;m.clock={startedAt:null,manualStarted:false,autoStarted:false,durationMs:normalMs(m),round:1,finishedAt:null};});
   return;
  }
  if(Number.isFinite(match.clock.finishedAt)){
   // Only an explicitly enabled automatic switch can start the next round.
   if(!canContinueAutomatically(match)||now<breakDeadlines(match).summaryUntil)return;
   await change(m=>{
    const deadline=breakDeadlines(m);
    if(!deadline||!canContinueAutomatically(m)||Date.now()<deadline.summaryUntil)return false;
    beginNextRound(m,Date.now());
   });
   return;
  }
  // Idle/manual referee wait is not an active match, never tick its timer or shoot.
  if(!matchRunning(match))return;
  // Never run the round past 25+5 minutes, even if gifts arrive endlessly.
  if(now-match.clock.startedAt>=normalMs(match)+overtimeMs(match)){
   await change(m=>{if(m.clock?.finishedAt||Date.now()-m.clock.startedAt<normalMs(m)+overtimeMs(m))return false;return closeRound(m,m.clock.startedAt+normalMs(m)+overtimeMs(m));});
   return;
  }
  const cue=match.cue;
  if(cue&&!cue.finishedAt&&(cue.playbackProtocol!==204||cue.startsAt<match.clock.startedAt)){
   await change(m=>{
    if(!m.cue||m.cue.finishedAt||m.cue.playbackProtocol===204&&m.cue.startsAt>=m.clock.startedAt)return false;
    // Legacy clients may leave old, pre-kickoff cues in the active slot.
    // Preserve those shots (and any next reservation) for this match.
    returnUnplayedCues(m);m.cooldownUntil=0;
   });return;
  }
  if(cue&&!cue.finishedAt&&cue.playbackOwner!==owner){await change(m=>{if(!m.cue||m.cue.playbackOwner===owner)return false;returnUnplayedCues(m);});return;}
  if(cue&&!cue.finishedAt){
   if(!hasVideoCompletionProof(match,cue)){
    // A started or preloaded clip is NOT yet a spent shot. If it never fully
    // plays, requeue it intact; a video timer is never enough to spend a gift.
    const clipDuration=Math.max(1500,cue.endsAt-cue.startsAt);
    const expires=Math.max(cue.endsAt+8000,(cue.videoStartedAt||0)+clipDuration+9000);
    if(now>=expires){
     await change(m=>{
      if(m.cue?.id!==cue.id||hasVideoCompletionProof(m,m.cue))return false;
      returnUnplayedCues(m);m.cooldownUntil=0;
     });
    }
    return;
   }
   await change(m=>{
    if(m.cue?.id!==cue.id||!hasVideoCompletionProof(m,m.cue)||m.cue.finishedAt)return false;
    if(!m.cue.committed){
     m.scores=clone(m.cue.after.scores);
     m.keeper=clone(m.cue.after.keeper);
     m.cue.committed=true;
    }
    // Existing old-version reservations are returned to jobs, then processed
    // after the current completed shot (never silently swallowed).
    if(m.nextCue){
     if(!hasVideoCompletionProof(m,m.nextCue))
      m.jobs.unshift({id:'return-next:'+m.nextCue.id,team:m.nextCue.team,count:1,nextIndex:0});
     m.nextCue=null;
    }
    m.cue.finishedAt=Date.now();m.cooldownUntil=0;
   });
   return;
  }
  // Recover a clip flagged finished by older engines before real
  // end-of-video accounting was introduced. Never silently erase it.
  if(match.cue?.finishedAt&&!hasVideoCompletionProof(match,match.cue)){
   await change(m=>{
    if(!m.cue?.finishedAt||hasVideoCompletionProof(m,m.cue))return false;
    returnUnplayedCues(m);return true;
   });
   return;
  }
  // Normal time is followed by the COMPLETE selected extra-time period,
  // even when no shots are pending. Do not finish the match early.
  // The waiting video is decoration; on mobile it can be unready even
  // while the dedicated shot MP4s are perfectly playable.
  if(match.processingPaused||!hasPlayableJobs(match)||!window.AIFootball3D?.beginShot||!window.AIFootball3D?.getShotTiming)return;
  await change(m=>{
   if(m.clock?.finishedAt||!matchRunning(m)||m.cue&&!m.cue.finishedAt||!m.jobs.length)return false;
   const job=takeJob(m,m.cue?.team);if(!job)return false;
   // The cue gets a fresh published start time after kickoff. No shot is
   // consumed unless the real video reaches its natural end.
   m.cue=makeCue(m,job,Date.now()+280);m.nextCue=null;m.cooldownUntil=0;
  });
 }
 async function tick(){
  try{
   if(Date.now()-lastRead>(channelReady?3000:1000))await read();ensureChannel();sendRequests().catch(e=>console.warn(e.message));if(admin()&&!connected&&!retry)connect();
   if(admin()){
    // Upgrade old match settings to a one-time MANUAL default. This is saved
    // in the database before any countdown/auto transition can run.
    if(match&&!Object.prototype.hasOwnProperty.call(match,'autoStartV3')){
     await change(m=>{
      if(Object.prototype.hasOwnProperty.call(m,'autoStartV3'))return false;
      m.autoMatches=false;m.autoStartV2=false;m.autoStartV3=false;
      m.manualMatchStart=true;
     },false);
    }
    if(!match&&connected)await seed();if(match&&!owns()&&(!match.lease||match.lease.protocol!==125||match.lease.until<Date.now()))await change(m=>{
    if(m.lease?.protocol===125&&m.lease.until>Date.now())return false;
    const gap=Date.now()-Number(m.lease?.until||0);
    if(Number(m.lease?.until)>0&&gap>OFFLINE_GRACE_MS&&matchRunning(m)){
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
 window.AIFootballTikTok={get active(){return true;},get connected(){return connected;},getStatus(){return {clientBuild:CLIENT_BUILD,updateRequired:needsRefresh(),autoMatches:autoMatchEnabled(match),guestTrialEnabled:match?.guestTrialEnabled===true,manualMatchStart:!autoMatchEnabled(match),active:true,connected,shared:!!match,leader:owns(),revision:match?.revision,accepted:match?.accepted||0,lastGift:match?.lastGift||null,lastShotQueuedAt:match?.lastShotQueuedAt||0,pending:Object.values(pendingShotCounts(match)).reduce((a,b)=>a+b,0),waitingRequests:pendingRequests.size,channelReady,adminAvailable:!!match?.lease&&match.lease.until>Date.now(),lastError:errorText};},getClock(){return match?{epoch:match.idleEpoch}:null;},getTimings(){return timingFor(match);},
  async setTimings(next){
   if(!admin())return false;
   const validated=timingFor({timing:next});
   return change(m=>{
    m.timing=validated;
    if(m.clock&&!Number.isFinite(m.clock.finishedAt))m.clock.durationMs=normalMs(m);
   },false);
  },getMatchClock(){return match?.clock?{...match.clock}:null;},getBreakDeadlines(){return breakDeadlines(match);},getMatchState(){
   const deadline=breakDeadlines(match);
   const now=Date.now();
   return {ready:!!match,running:matchRunning(match),starting:matchStarting(match),seasonComplete:seasonComplete(match),results:!!deadline&&now<deadline.summaryUntil,
    waiting:!matchRunning(match)&&!matchStarting(match)&&(!deadline||now>=deadline.summaryUntil),
    canStart:!!match&&!matchRunning(match)&&!matchStarting(match)&&(!deadline||now>=deadline.summaryUntil),
    auto: autoMatchEnabled(match),resultUntil:deadline?.summaryUntil||null};
  },async finishCurrentRound(){
   if(!admin())return false;
   return change(m=>{
    if(matchStarting(m)){
     // A cancelled kickoff does not play/consume shots or record a league result.
     returnUnplayedCues(m);m.clock={...m.clock,startedAt:null,countdownStartedAt:null,manualStarted:false,autoStarted:false,finishedAt:null,summaryUntil:null};m.autoContinuationPaused=true;return true;
    }
    if(!matchRunning(m))return false;
    m.autoContinuationPaused=true;
    // End the current match with the existing score; queued/uncommitted shots
    // stay available for the next round.
    return closeRound(m,Date.now());
   },false);
  },getGuestTrialEnabled(){return match?.guestTrialEnabled===true;},
  async setGuestTrialEnabled(enabled){
   if(!admin()||typeof enabled!=='boolean')return false;
   const changed=await change(m=>{
    if(m.guestTrialEnabled===enabled)return false;
    m.guestTrialEnabled=enabled;
   },false);
   if(!enabled)requestInbox.clear();
   return changed;
  },getRoundControls(){return {autoMatches:autoMatchEnabled(match)};},async setRoundControls(next){
   if(!admin()||!next||typeof next!=='object'||typeof next.autoMatches!=='boolean')return false;
   return change(m=>{
    m.autoMatches=next.autoMatches;
    if(next.autoMatches)m.autoContinuationPaused=false;
    // Explicit activation is required after migration; older default-on settings are ignored.
    m.autoStartV2=next.autoMatches;
    m.autoStartV3=next.autoMatches;
    // Legacy second toggle remains disabled when manual starts are required.
    m.manualMatchStart=!next.autoMatches;
   },false);
  },async startNextMatch(){
   if(!admin())return false;
   return change(m=>{
    if(matchRunning(m)||matchStarting(m))return false;
    const deadline=breakDeadlines(m);
    if(deadline&&Date.now()<deadline.summaryUntil)return false;
    const now=Date.now();
    m.autoContinuationPaused=false;
    if(deadline){
     beginNextRound(m,now);
    }else{
     // Starting the first waiting round must NOT skip it or award league points.
     returnUnplayedCues(m);
     m.clock=m.clock||{round:1};
     m.clock.startedAt=now+KICKOFF_COUNTDOWN_MS;
     m.clock.countdownStartedAt=now;
     m.clock.durationMs=normalMs(m);
     m.clock.finishedAt=null;
     m.clock.interrupted=false;
     m.clock.summaryUntil=null;
    }
    m.clock.manualStarted=true;
    m.clock.autoStarted=false;
    m.idleEpoch=now;
   },false);
  },getLeague(){return match?.league?clone(match.league):newLeague(1);},getGiftProcessingPaused(){return !!match?.processingPaused;},
  async setGiftProcessingPaused(paused){
   if(!admin())return false;
   return change(m=>{
    if(m.processingPaused===!!paused)return false;
    m.processingPaused=!!paused;
    if(paused&&m.nextCue){
     m.jobs.unshift({id:'paused:'+m.nextCue.id,team:m.nextCue.team,count:1,nextIndex:0});
     m.nextCue=null;
    }
   },false);
  },
  async clearTeamPendingShots(team){
   if(!admin()||!TEAMS.includes(team)||!match)return false;
   const cutoff=Date.now();
   const saved=await change(m=>{
    m.queueClearAt||={};
    m.queueClearAt[team]=Math.max(Number(m.queueClearAt[team]||0),cutoff);
    m.jobs=(m.jobs||[]).filter(job=>job.team!==team);
    // The already-playing clip is NOT interrupted. A reserved, unstarted
    // clip for this team may be cancelled safely before first playback.
    if(m.nextCue?.team===team)m.nextCue=null;
    if(m.cue?.team===team&&!hasVideoProof(m,m.cue)){
     m.cue=null;m.cooldownUntil=0;
    }
    m.queueEdit={id:crypto.randomUUID(),kind:'clearTeam',teams:[team]};
   },false);
   if(!saved)return false;
   const burst=manualBursts.get(team);
   if(burst){clearTimeout(burst.timer);manualBursts.delete(team);burst.resolvers.forEach(done=>done(false));}
   for(const [id,r]of pendingRequests)if(r.payload?.team===team&&Number(r.payload.sentAt||0)<=cutoff){pendingRequests.delete(id);r.resolve?.(false);}
   for(const [id,p]of requestInbox)if(p.team===team&&Number(p.sentAt||0)<=cutoff)requestInbox.delete(id);
   for(const [id,g]of inbox)if(g.team===team&&Number(g.receivedAt||0)<=cutoff)inbox.delete(id);
   rememberRequests();saveGiftInbox();restore();
   // Returns the count still on-screen (possibly the single in-progress clip).
   return {team,pending:pendingShotCounts(match)[team],playing:match?.cue?.team===team&&hasVideoProof(match,match.cue)&&!hasVideoCompletionProof(match,match.cue)};
  },
  hasPendingShot(){return matchRunning(match)&&!!(match?.nextCue||hasPlayableJobs(match));},
  onShotVideoStarted(payload){reportVideoStart(payload);},
  onShotVideoFinished(payload){reportVideoFinish(payload);},
  onShotBallKick(payload){
   if(!registerLocalBallKick(payload))return false;
   // Viewers only update their visual counter. The signed-in current leader
   // persistently acknowledges the same media-frame contact in Supabase.
   if(admin()&&owns())acknowledgeBallKick(payload);
   return true;
  },
  getPendingQueue(){return pendingShotCounts(match);},
  activate:install,restore,onVideoEnded(startsAt){
   if(!matchRunning(match))return false;
   endedCues.add(startsAt);
   const next=stagedStarts.get(startsAt);
   if(next){stagedStarts.delete(startsAt);next();return true;}
   return !!(match?.nextCue||hasPlayableJobs(match));
  },onShotStarted(){},onShotResolved(){},reconnect:connect,
  async saveRules(patch,keeperValues,queueValues,scoreValues){const clean={...patch};delete clean[KEY];try{if(!await change(m=>{if(scoreValues)for(const [t,v]of Object.entries(scoreValues)){if(!['A','B','C','D'].includes(t)||!Number.isSafeInteger(v)||v<0||v>1000000)continue;const delta=v-(Number(m.scores[t])||0);m.scores[t]=v;for(const cue of [m.cue,m.nextCue])if(cue&&!cue.committed&&cue.after?.scores)cue.after.scores[t]=Math.max(0,(Number(cue.after.scores[t])||0)+delta);}if(clean.goalkeeper_initial_by_team)m.initialKeeper=clone(clean.goalkeeper_initial_by_team);if(keeperValues)for(const t of ['A','B','C','D']){const v=Number(keeperValues[t]);if(Number.isFinite(v)&&v>=0){m.keeper[t]=v;if(m.cue&&!m.cue.committed)m.cue.after.keeper[t]=v;}}
      if(queueValues&&Object.keys(queueValues).length&&m.nextCue){m.jobs.unshift({id:m.nextCue.id,team:m.nextCue.team});m.nextCue=null;}
      if(queueValues&&Object.keys(queueValues).length)m.queueEdit={id:crypto.randomUUID(),kind:'resize',teams:Object.keys(queueValues)};
      if(queueValues)for(const [t,n]of Object.entries(queueValues)){if(!['A','B','C','D'].includes(t)||!Number.isSafeInteger(n)||n<0||n>10000)continue;if(n===0&&m.cue?.team===t&&!hasVideoCompletionProof(m,m.cue))m.cue=null;
       const active=m.cue?.team===t&&!hasVideoCompletionProof(m,m.cue)?1:0;resizeTeamJobs(m,t,Math.max(0,n-active));}
      if(m.nextCue&&keeperValues&&Object.keys(keeperValues).length){const old=m.nextCue,base=m.cue&&!m.cue.committed?{...m,scores:m.cue.after.scores,keeper:m.cue.after.keeper}:m;m.nextCue=makeCue(base,{id:old.id,team:old.team},old.startsAt);m.shotSequence=base.shotSequence;m.nextCue.previousStartsAt=old.previousStartsAt;}
},false,clean))throw Error("Ortak maç henüz hazır değil");return {error:null};}catch(error){return {error};}},
  guestShot(team,n){
    if(admin())return this.manualShot(team,n);
    n=Number(n);
    if(!match||match.guestTrialEnabled!==true||!TEAMS.includes(team)||!(n===1||n===5))return false;
    if(Date.now()-lastGuestClickAt<GUEST_SEND_COOLDOWN_MS)return false;
    const pendingCount=[...pendingRequests.values()].filter(x=>x.payload?.guestTrial).length;
    if(pendingCount>=12)return false;
    lastGuestClickAt=Date.now();
    const payload={id:crypto.randomUUID(),team,count:n,sentAt:Date.now(),guestTrial:true,clientId:guestRequestClient};
    pendingRequests.set(payload.id,{payload,lastSent:0,resolve:null});
    rememberRequests();
    // Same optimistic queue as host; shared state supersedes when leader confirms.
    restore();
    if(!matchRunning(match))showQueuedGiftNotice(payload.id,team);
    sendGuestRequests().catch(e=>console.warn('Misafir şutu gönderimi',e));
    return true;
   },
   manualShot(team,n){
    if(!admin())return false;
    n=Math.floor(Number(n)||1);
    if(!['A','B','C','D'].includes(team)||n<1||n>50)return false;
    // Update the visible waiting shots on the same tap, never after the network round-trip.
    if(state[team]){
     state[team].queue=(Number(state[team].queue)||0)+n;
     const counter=document.getElementById('frontQueue'+team);
     if(counter)counter.textContent=String(state[team].queue);
     queueShimmer(team);
    }
    let burst=manualBursts.get(team);
    if(burst&&burst.count+n>50){flushManualBurst(team);burst=null;}
    if(!burst){burst={count:0,resolvers:[],timer:null};manualBursts.set(team,burst);}
    burst.count+=n;
    clearTimeout(burst.timer);burst.timer=setTimeout(()=>flushManualBurst(team),25);
    return true;
   },
   manualKeeper(team,n){if(!admin()||!['A','B','C','D'].includes(team))return false;return change(m=>{m.keeper[team]+=Math.max(0,Number(n)||0);},false);},
  reset(){if(!admin())return false;return change(m=>{if(m.cue&&!m.cue.finishedAt)return false;const initial=Object.fromEntries(['A','B','C','D'].map(t=>[t,Number(m.initialKeeper?.[t]??state.startKeepers?.[t]??10)]));m.queueEdit={id:crypto.randomUUID(),kind:'reset'};m.scores={A:0,B:0,C:0,D:0};m.keeper=initial;m.jobs=[];m.cue=null;m.nextCue=null;m.cooldownUntil=0;m.clock={startedAt:Date.now(),durationMs:normalMs(m),round:(Number(m.clock?.round)||1)+1,finishedAt:null};m.idleEpoch=m.clock.startedAt;stagedStarts.clear();timers.forEach(clearTimeout);timers.clear();window.AIFootball3D?.reset?.();},false);}
 };
 window.addEventListener('online',()=>{ensureChannel();sendRequests().catch(()=>{});});document.addEventListener('visibilitychange',()=>{if(!document.hidden){ensureChannel();read().then(()=>sendRequests()).catch(()=>{});}});
 install();connect();document.addEventListener('pointerdown',()=>{if(!connected)connect();});window.addEventListener('pagehide',()=>{
   clearTimeout(inboxSaveTimer);
   try{localStorage.setItem(GIFT_INBOX_STORE,JSON.stringify([...inbox.entries()].slice(-2500)));}catch{}
  });
  window.addEventListener('beforeunload',()=>{for(const team of manualBursts.keys())flushManualBurst(team);clearTimeout(retry);socket?.close();});
})();
