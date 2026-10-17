/* One durable match for every viewer of the permanent broadcast URL. */
(()=>{
 'use strict';
 const KEY='tiktok_match_v2',API='ws://127.0.0.1:21213/',owner=crypto.randomUUID(),LEASE=10000;
 const MATCH_MS=25*60*1000,OVERTIME_MAX_MS=5*60*1000,WINNER_HOLD_MS=60000,RESULT_HOLD_MS=180000,END_QUIET_MS=1200,OFFLINE_GRACE_MS=20000;
 const TEAMS=['A','B','C','D'];
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
  // Opt-in v3: old cached clients/settings must never start the next game by default.
  return m?.autoMatches===true&&m?.autoStartV2===true&&m?.autoStartV3===true&&m?.manualMatchStart!==true;
 }
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
  if(!clock||!Number.isFinite(clock.startedAt))return {label:en?'Time Remaining':'Maçın Bitmesine Kalan Süre',digits:formatClock(timing.normalMinutes*60),phase:'normal'};
  if(Number.isFinite(clock.finishedAt)){
   const phaseEnd=breakDeadlines(m);
   const remaining=Math.max(0,Math.ceil((phaseEnd.summaryUntil-now)/1000));
   const automatic=autoMatchEnabled(m);
   if(now<phaseEnd.summaryUntil){
    return {label:en?'Results and Standings':'Kazanan ve Lig Sonuçları',
     digits:formatClock(remaining),phase:'result'};
   }
   return {label:automatic?(en?'Starting Next Match':'Yeni Maç Başlatılıyor'):
    (en?'Waiting for Host to Start':'Yöneticinin Maçı Başlatması Bekleniyor'),
    digits:automatic?'00:00':'--:--',phase:'waiting'};
  }
  if(admin()&&Number(m?.lease?.until)>0&&now-m.lease.until>OFFLINE_GRACE_MS)return {label:'Bağlantı Kontrol Ediliyor',digits:'--:--',phase:'offline'};
  const elapsed=Math.max(0,now-clock.startedAt),duration=normalMs(m);
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
  const arenaName=(draftArena||timing.arenaName)+' • MAÇ SKORU';
  if(arena&&arena.textContent!==arenaName)arena.textContent=arenaName;
  document.documentElement.lang=timing.language;
  const label=hud.querySelector('.clockLabel'),digits=hud.querySelector('.clockDigits');
  if(label&&label.textContent!==state.label)label.textContent=state.label;
  if(digits&&digits.textContent!==state.digits)digits.textContent=state.digits;
  hud.dataset.phase=state.phase;
  const ended=!!ends;
  const automatic=autoMatchEnabled(match);
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
  const summary=document.getElementById('roundSummary');
  const waiting=document.getElementById('roundWaiting');
  if(summary)summary.hidden=!showingSummary;
  if(waiting)waiting.hidden=!waitingForAdmin;
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
  if(m.cue?.id&&!m.cue.committed)m.jobs.unshift({id:'recovered:'+m.cue.id,team:m.cue.team,count:1,nextIndex:0});
  m.nextCue=null;m.cue=null;
  m.clock={...(m.clock||{startedAt:at,durationMs:MATCH_MS,round:1}),interrupted:true,winner:null};
  stampBreakDeadlines(m,at);
  m.lastResult={round:m.clock.round,finishedAt:at,scores:{...m.scores},winner:null,interrupted:true};
  // Interrupted rounds never earn league points. Wait through the full results screen.
  return true;
 }
 function ready(){try{return typeof db!=='undefined'&&typeof state!=='undefined'&&typeof render==='function';}catch{return false;}}
 function admin(){try{return adminAuthed===true;}catch{return false;}}
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
 
 function restore(){
  if(!ready()||!match)return;
  const counts={A:0,B:0,C:0,D:0};
  for(const job of match.jobs)if(job&&counts[job.team]!==undefined)counts[job.team]+=Math.max(1,Math.floor(Number(job.count)||1));
  if(match.nextCue?.team&&counts[match.nextCue.team]!==undefined)counts[match.nextCue.team]++;
  // Reserve/starting a clip must not make a queued shot vanish from the counter.
  // Keep that shot visible until the clip finishes, including after its goal/save is committed.
  if(match.cue?.team&&!match.cue.finishedAt&&counts[match.cue.team]!==undefined)counts[match.cue.team]++;
  // Optimistic UI: count unconfirmed requests and not-yet-flushed button bursts immediately.
  for(const r of pendingRequests.values()){
   const p=r.payload;
   if(!match.commandReceipts?.includes(p.id)&&counts[p.team]!==undefined)counts[p.team]+=p.count;
  }
  for(const [team,burst] of manualBursts)if(counts[team]!==undefined)counts[team]+=burst.count;
  for(const team of TEAMS){
   if(displayedQueues[team]!==null&&counts[team]>displayedQueues[team])queueShimmer(team);
   displayedQueues[team]=counts[team];
  }
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
  /* High-contrast vector stand-ins are stable until the original TikTok gift artwork is available. */
 function legend(){
  const wrap=(body)=>'<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+body+'</svg>';
  const art=[
   [wrap('<path d="M16 42L37 15Q45 8 54 10Q56 19 49 27L28 48Z" fill="#e8f4ff" stroke="#3daeff" stroke-width="3"/><circle cx="39" cy="25" r="7" fill="#5cc7fd"/><path d="M15 42L7 58L24 51L31 47" fill="#ffad41"/><path d="M22 49L14 61M12 45L4 47" stroke="#ff553e" stroke-width="5"/><path d="M19 32L8 35L12 45" fill="#6390ea"/>'),wrap('<path d="M15 20h34v33Q49 58 43 58H21Q15 58 15 53Z" fill="#cb3267" stroke="#ffd9ef" stroke-width="3"/><path d="M14 18h36v8H14Z" fill="#fff1a0"/><path d="M23 35q6-10 10 0q6-10 12 0l-11 14Z" fill="#fff0f7"/><path d="M25 16L20 7M35 16l2-10" stroke="#6bd260" stroke-width="4"/>')],
   [wrap('<path d="M23 26h19v29H23Z" fill="#ef8dbc" stroke="#ffe2f4" stroke-width="3"/><path d="M21 19h23v9H21Z" fill="#ffe0e7"/><path d="M30 16v-8h5v8" stroke="#ffd1d6" stroke-width="4"/><path d="M32 45c-13-8-8-18 0-13c8-5 13 5 0 13Z" fill="#fff"/><path d="M46 12q3-7 7 0" fill="none" stroke="#fff" stroke-width="3"/>'),wrap('<circle cx="32" cy="32" r="24" fill="#f6bc63" stroke="#ffefcf" stroke-width="3"/><circle cx="32" cy="32" r="13" fill="#263142"/><path d="M9 30Q15 6 34 9Q56 11 56 30Q42 17 34 20Q18 17 9 30Z" fill="#ff75ab"/><path d="M16 16l6 8M40 12l-3 9M51 24l-7 3" stroke="#fff5ad" stroke-width="4"/>')],
   [wrap('<circle cx="31" cy="31" r="23" fill="#ffdf79" stroke="#fff8cf" stroke-width="3"/><circle cx="22" cy="28" r="4" fill="#202f50"/><circle cx="42" cy="28" r="4" fill="#202f50"/><ellipse cx="32" cy="43" rx="9" ry="12" fill="#202f50"/><path d="M5 15l10 4M51 10l-5 8M6 50l10-6M56 49l-10-6" stroke="#fd658c" stroke-width="5"/>'),wrap('<path d="M9 35Q9 18 26 20Q37 11 49 23Q60 38 48 50Q39 58 22 53Q9 49 9 35Z" fill="#bd8d5a" stroke="#ffe6b3" stroke-width="3"/><circle cx="17" cy="22" r="8" fill="#b18455"/><circle cx="42" cy="20" r="8" fill="#b18455"/><circle cx="46" cy="35" r="3" fill="#171c2c"/><ellipse cx="53" cy="40" rx="5" ry="4" fill="#efc79b"/><path d="M15 49v7M41 50v6" stroke="#8d5d3d" stroke-width="6"/>')],
   [wrap('<path d="M13 50V28q0-5 5-5t5 5V17q0-5 5-5t5 5v9q0-4 5-4t5 5v-1q0-4 5-4t5 5v17q-2 16-20 16Q17 60 13 50Z" fill="#f5b58d" stroke="#fff0db" stroke-width="3"/><path d="M8 15l-4-5M49 13l5-5M57 37l6-1" stroke="#fbe06b" stroke-width="4"/>'),wrap('<circle cx="32" cy="32" r="23" fill="#9de6ee" stroke="#f1ffff" stroke-width="3"/><path d="M12 39c12-20 30-20 42-6" fill="none" stroke="#fd7baa" stroke-width="9" stroke-linecap="round"/><path d="M43 24l11 9-15 5" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M12 18h10M13 52h16" stroke="#315fbc" stroke-width="5"/>')]
  ];
  const namePairs=[['Roket','You Are My Jam'],['Aşk Kokusu','Donat'],['Aşırı Tepki','Kapibara'],['İsimle Selamlama','You Are On A Roll']];
  [...document.querySelectorAll('.broadcastControls .panel')].forEach((panel,i)=>{
   [...panel.querySelectorAll('.shot')].forEach((button,j)=>{
    if(j>1){button.hidden=true;return;}
    button.hidden=false;button.title=namePairs[i][j]+' — '+(j===0?'1':'5')+' şut';
    button.setAttribute('aria-label',button.title);
    const visual=button.querySelector('.giftVisual');
    if(visual)visual.innerHTML=art[i][j];
    const effect=button.querySelector('.giftEffect');
    if(effect)effect.textContent=j===0?'1 ŞUT':'5 ŞUT';
    const coin=button.querySelector('.coin');
    if(coin)coin.hidden=true;
   });
   const container=panel.querySelector('.buttons');if(container)container.style.gridTemplateColumns='repeat(2,minmax(0,1fr))';
   for(const button of panel.querySelectorAll('.def'))button.hidden=true;
   for(const label of panel.querySelectorAll('.sectionLabel'))label.hidden=true;
  });
 }
 function consider(cue){
  if(!cue||cue.finishedAt)return;
  const signature=cue.startsAt+':'+cue.result;
  if(cueTimings.has(cue.id)&&cueTimings.get(cue.id)!==signature){clearTimeout(timers.get(cue.id));timers.delete(cue.id);played.delete(cue.id);}
  cueTimings.set(cue.id,signature);if(cueTimings.size>1000)cueTimings.delete(cueTimings.keys().next().value);
  // A promoted cue must not wait for a previous video's ended event on a new/reconnected client.
  if(match?.cue?.id===cue.id&&Date.now()>=cue.endsAt&&!window.AIFootball3D?.isAnimating){played.add(cue.id);endedCues.add(cue.startsAt);return;}
  if(match?.clock?.finishedAt||played.has(cue.id)||timers.has(cue.id))return;
  const start=async(actualStart)=>{
   timers.delete(cue.id);if(match?.clock?.finishedAt)return;const liveCue=[match?.cue,match?.nextCue].find(c=>c?.id===cue.id&&!c.finishedAt);if(!liveCue)return;if(liveCue.startsAt!==cue.startsAt||liveCue.result!==cue.result){consider(liveCue);return;}
   if(!window.AIFootball3D?.videoStatus?.motionReady){if(Date.now()<cue.endsAt)timers.set(cue.id,setTimeout(start,100));return;}
   played.add(cue.id);if(Date.now()>=cue.endsAt){endedCues.add(cue.startsAt);return;} // Join an active shot at its current frame, even after reconnecting.
   window.AIFootball3D.beginShot(cue.team,{startsAt:cue.startsAt,variation:cue.variation,result:cue.result,cueStartsAt:cue.startsAt});
   window.AIFootball3D.finishShot(cue.team,cue.result);
   window.AIFootball3D.prepareUpcomingShot?.(match?.nextCue?.id===cue.id?null:match?.nextCue);
   log(nameOf(cue.team)+' şut çekiyor!');
   setTimeout(()=>{if(![match?.cue,match?.nextCue].some(c=>c?.id===cue.id))return;log(cue.result==='goal'?'GOL! '+nameOf(cue.team):(['C','D'].includes(cue.team)?'Kaleci':nameOf(cue.team==='A'?'B':'A')+' kalecisi')+' kurtardı!');window.AIFootballRoundCelebration?.announceShot?.(cue.team,cue.result);},Math.max(0,cue.outcomeAt-Date.now()));
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
  if(m?.version===2){match=m;acknowledgeRequests();restore();if(Number.isFinite(m.clock?.finishedAt)&&window.AIFootball3D?.isAnimating)window.AIFootball3D.reset();window.AIFootball3D?.prepareUpcomingShot?.(m.nextCue);consider(m.cue);consider(m.nextCue);if(m.cue?.finishedAt&&!m.nextCue&&!m.jobs.length)window.AIFootball3D?.finishSyncedShot?.(m.cue.startsAt);}else paint();
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
  const initial={version:2,revision:1,clock:{startedAt:Date.now(),durationMs:MATCH_MS,round:1,finishedAt:null},timing:{...DEFAULT_TIMING},scores:{A:0,B:0,C:0,D:0},keeper:Object.fromEntries(['A','B','C','D'].map(t=>[t,Number(state.startKeeper)||10])),jobs:[],cue:null,receipts:await Promise.all((legacy?.seen||[]).slice(-4000).map(digest)),accepted:Number(legacy?.accepted)||0,lastGift:null,shotSequence:0,idleEpoch:Date.now(),updatedAt:Date.now(),lease:{owner,until:Date.now()+LEASE}};
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
   {team:'C',shots:1,names:['asiri tepki','overreaction','extreme reaction']},
   {team:'C',shots:5,names:['kapibara','capybara']},
   {team:'D',shots:1,names:['isimle selamlama','name greeting','greeting by name']},
   {team:'D',shots:5,names:['you are on a roll','youre on a roll']}
  ];
  const selected=gifts.find(g=>g.names.includes(keyName));
  const repeats=Number(g.repeatCount??1),count=repeats*(selected?.shots||0);
  if(!selected||!Number.isSafeInteger(repeats)||repeats<1||!Number.isSafeInteger(count)||count>10000)return false;
  const key=await digest(JSON.stringify([String(id),String(g.uniqueId||g.user?.uniqueId||g.userId||g.user?.userId||''),String(giftId||name||'')]));
  if(match?.receipts.includes(key))return false;
  inbox.set(key,{team:selected.team,count,name:String(name||giftId)});saveGiftInbox();return true;
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
 function closeRound(m,now){
  if(m.clock?.finishedAt)return false;
  // The uncompleted active shot and prebooked next shot belong to the next match.
  if(m.nextCue?.id)m.jobs.unshift({id:'carry:'+m.nextCue.id,team:m.nextCue.team,count:1,nextIndex:0});
  if(m.cue?.id&&!m.cue.committed)m.jobs.unshift({id:'carry:'+m.cue.id,team:m.cue.team,count:1,nextIndex:0});
  m.cue=null;m.nextCue=null;
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
  m.clock={startedAt:now,durationMs:normalMs(m),round,finishedAt:null,leagueFinal:!!(m.league?.completedRounds>=m.league?.plannedRounds&&!m.league?.champion&&m.league?.finalists?.length>1)};
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
   await change(m=>{if(m.clock?.startedAt)return false;m.clock={startedAt:Date.now(),durationMs:normalMs(m),round:1,finishedAt:null};});
   return;
  }
  if(Number.isFinite(match.clock.finishedAt)){
   // Only an explicitly enabled automatic switch can start the next round.
   if(!autoMatchEnabled(match)||now<breakDeadlines(match).summaryUntil)return;
   await change(m=>{
    const deadline=breakDeadlines(m);
    if(!deadline||!autoMatchEnabled(m)||Date.now()<deadline.summaryUntil)return false;
    beginNextRound(m,Date.now());
   });
   return;
  }
  // Never run the round past 25+5 minutes, even if gifts arrive endlessly.
  if(now-match.clock.startedAt>=normalMs(match)+overtimeMs(match)){
   await change(m=>{if(m.clock?.finishedAt||Date.now()-m.clock.startedAt<normalMs(m)+overtimeMs(m))return false;return closeRound(m,Date.now());});
   return;
  }
  const cue=match.cue;
  if(cue&&!cue.finishedAt){
   if(!cue.committed&&now>=cue.outcomeAt)await change(m=>{if(m.cue?.id!==cue.id||m.cue.committed)return false;m.scores=m.cue.after.scores;m.keeper=m.cue.after.keeper;m.cue.committed=true;});
   // Publish the following cue early, so every viewer schedules the same gapless boundary.
   if(!match.processingPaused&&match.cue&&!match.nextCue&&match.jobs.length)await change(m=>{if(m.processingPaused||m.cue?.id!==cue.id||m.nextCue||!m.jobs.length)return false;m.nextCue=reserveNext(m,takeJob(m,m.cue.team),m.cue.endsAt);m.nextCue.previousStartsAt=m.cue.startsAt;});
   if(!match.processingPaused&&match.nextCue?.team===cue.team&&match.jobs.some(j=>j.team!==cue.team))await change(m=>{if(m.cue?.id!==cue.id||m.nextCue?.team!==cue.team||!m.jobs.some(j=>j.team!==cue.team))return false;m.jobs.unshift({id:m.nextCue.id,team:m.nextCue.team});m.nextCue=reserveNext(m,takeJob(m,cue.team),cue.endsAt);m.nextCue.previousStartsAt=cue.startsAt;});
   // Playback can pause in a hidden admin tab, or its ended event can be lost.
   // The authoritative clip deadline must still release the reserved shot.
   if(endedCues.has(cue.startsAt)||now>=cue.endsAt+750)await change(m=>{if(m.cue?.id!==cue.id||!m.cue.committed)return false;if(m.nextCue){const next=m.nextCue;if(Date.now()>=next.endsAt){const shift=Date.now()-next.startsAt;next.startsAt+=shift;next.endsAt+=shift;next.outcomeAt+=shift;delete next.previousStartsAt;}m.cue=next;m.nextCue=null;}else{m.cue.finishedAt=Date.now();m.cooldownUntil=0;}});
   return;
  }
  // Normal time is followed by the COMPLETE selected extra-time period,
  // even when no shots are pending. Do not finish the match early.
  if(match.processingPaused||!match.jobs.length||!window.AIFootball3D?.videoStatus?.motionReady)return;
  await change(m=>{if(m.clock?.finishedAt||m.cue&&!m.cue.finishedAt||!m.jobs.length)return false;m.cue=makeCue(m,takeJob(m,m.cue?.team),Date.now());m.nextCue=null;m.cooldownUntil=0;});
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
 window.AIFootballTikTok={get active(){return true;},get connected(){return connected;},getStatus(){return {autoMatches:autoMatchEnabled(match),manualMatchStart:!autoMatchEnabled(match),active:true,connected,shared:!!match,leader:owns(),revision:match?.revision,accepted:match?.accepted||0,lastGift:match?.lastGift||null,pending:totalJobs(match?.jobs||[])+(match?.nextCue?1:0),waitingRequests:pendingRequests.size,channelReady,adminAvailable:!!match?.lease&&match.lease.until>Date.now(),lastError:errorText};},getClock(){return match?{epoch:match.idleEpoch}:null;},getTimings(){return timingFor(match);},
  async setTimings(next){
   if(!admin())return false;
   const validated=timingFor({timing:next});
   return change(m=>{
    m.timing=validated;
    if(m.clock&&!Number.isFinite(m.clock.finishedAt))m.clock.durationMs=normalMs(m);
   },false);
  },getMatchClock(){return match?.clock?{...match.clock}:null;},getBreakDeadlines(){return breakDeadlines(match);},async finishCurrentRound(){
   if(!admin())return false;
   return change(m=>{
    if(!m.clock||Number.isFinite(m.clock.finishedAt))return false;
    // End the current match with the existing score; queued/uncommitted shots
    // stay available for the next round.
    return closeRound(m,Date.now());
   },false);
  },getRoundControls(){return {autoMatches:autoMatchEnabled(match)};},async setRoundControls(next){
   if(!admin()||!next||typeof next!=='object'||typeof next.autoMatches!=='boolean')return false;
   return change(m=>{
    m.autoMatches=next.autoMatches;
    // Explicit activation is required after migration; older default-on settings are ignored.
    m.autoStartV2=next.autoMatches;
    m.autoStartV3=next.autoMatches;
    // Legacy second toggle remains disabled when manual starts are required.
    m.manualMatchStart=!next.autoMatches;
   },false);
  },async startNextMatch(){
   if(!admin())return false;
   return change(m=>{
    const deadline=breakDeadlines(m);
    if(!deadline||Date.now()<deadline.summaryUntil)return false;
    beginNextRound(m,Date.now());
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
     queueShimmer(team);
    }
    let burst=manualBursts.get(team);
    if(burst&&burst.count+n>50){flushManualBurst(team);burst=null;}
    if(!burst){burst={count:0,resolvers:[],timer:null};manualBursts.set(team,burst);}
    burst.count+=n;
    clearTimeout(burst.timer);burst.timer=setTimeout(()=>flushManualBurst(team),75);
    return true;
   },
   manualKeeper(team,n){if(!admin()||!['A','B','C','D'].includes(team))return false;return change(m=>{m.keeper[team]+=Math.max(0,Number(n)||0);},false);},
  reset(){if(!admin())return false;return change(m=>{if(m.cue&&!m.cue.finishedAt)return false;const initial=Object.fromEntries(['A','B','C','D'].map(t=>[t,Number(m.initialKeeper?.[t]??state.startKeepers?.[t]??10)]));m.scores={A:0,B:0,C:0,D:0};m.keeper=initial;m.jobs=[];m.cue=null;m.nextCue=null;m.cooldownUntil=0;m.clock={startedAt:Date.now(),durationMs:normalMs(m),round:(Number(m.clock?.round)||1)+1,finishedAt:null};m.idleEpoch=m.clock.startedAt;stagedStarts.clear();timers.forEach(clearTimeout);timers.clear();window.AIFootball3D?.reset?.();},false);}
 };
 window.addEventListener('online',()=>{ensureChannel();sendRequests().catch(()=>{});});document.addEventListener('visibilitychange',()=>{if(!document.hidden){ensureChannel();read().then(()=>sendRequests()).catch(()=>{});}});
 install();connect();document.addEventListener('pointerdown',()=>{if(!connected)connect();});window.addEventListener('pagehide',()=>{
   clearTimeout(inboxSaveTimer);
   try{localStorage.setItem(GIFT_INBOX_STORE,JSON.stringify([...inbox.entries()].slice(-2500)));}catch{}
  });
  window.addEventListener('beforeunload',()=>{for(const team of manualBursts.keys())flushManualBurst(team);clearTimeout(retry);socket?.close();});
})();
