/* Unified stadium video — two-deck, on-demand playback for mobile browsers. */
(()=>{
'use strict';
let shot=null,settings={},shotVideo=null,repairing=false,lastRepair=0,holdingForQueue=false;
const stage=document.createElement('div');stage.id='game3dStage';
const video=document.createElement('video');video.id='sceneWaitingVideo';
video.src='./assets/scene-v111/waiting.mp4';
video.autoplay=true;video.loop=true;video.muted=true;video.defaultMuted=true;
video.playsInline=true;video.preload='auto';video.setAttribute('playsinline','');
video.setAttribute('aria-label','Dört futbolcu ve kaleci bekleme videosu');
Object.assign(video.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'contain',zIndex:'1'});
stage.append(video);document.querySelector('.wrap').prepend(stage);
const sound=document.getElementById('soundEnable');
if(sound)document.getElementById('matchControls')?.append(sound);

const clips={
 A:{save:'./assets/scene-v112/fb-shot.mp4',goal:'./assets/scene-v110/fb-shot.mp4'},
 B:{save:'./assets/scene-v116/gs-shot.mp4',goal:'./assets/scene-v126/gs-goal.mp4'},
 C:{save:'./assets/scene-v125/bjk-save.mp4',goal:'./assets/scene-v132/bjk-goal.mp4'},
 D:{save:'./assets/scene-v123/ts-save.mp4',goal:'./assets/scene-v140/ts-goal.mp4'}
};
const keyFor=(team,result)=>team+'_'+(result==='goal'?'goal':'save');
const srcFor=key=>{const [team,result]=key.split('_');return clips[team]?.[result]||null;};
const allKeys=Object.keys(clips).flatMap(team=>['save','goal'].map(result=>team+'_'+result));
const mediaCache=window.AIFootballClipCache;
const durationByKey=new Map(Object.entries(mediaCache.manifest).map(([key,entry])=>[key,entry.seconds]));
const failedMetadata=new Set(),probes=[];
let lastFrameAt=performance.now(),lastMediaTime=-1,lastRecovery=0,recoveryCount=0,reloading=false;
function noteProgress(v){if(v!==shotVideo)return;if(Math.abs(v.currentTime-lastMediaTime)>.015){lastMediaTime=v.currentTime;lastFrameAt=performance.now();}}
function makeDeck(id){
 const v=document.createElement('video');v.id=id;v.playsInline=true;v.preload='none';v.muted=true;v.defaultMuted=true;v.setAttribute('playsinline','');
 Object.assign(v.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'contain',zIndex:'3',display:'block',opacity:'0'});
 stage.append(v);
 v.addEventListener('loadedmetadata',()=>{const key=v.dataset.clipKey;if(key&&Number.isFinite(v.duration)&&v.duration>0)durationByKey.set(key,v.duration);if(v===shotVideo&&shot&&reloading){reloading=false;playShot();}});
 v.addEventListener('ended',()=>{if(shot&&shotVideo===v)endShot(false,true);});
 v.addEventListener('timeupdate',()=>{if(shotVideo===v){checkGoalMoment(v,v.currentTime);checkSceneEffects(v,v.currentTime);revealCurrent(v);reportRealVideoFrame(v,false);}});
 v.addEventListener('seeked',()=>revealCurrent(v));
 v.addEventListener('loadeddata',()=>revealCurrent(v));
 v.addEventListener('canplay',()=>revealCurrent(v));
 if(typeof v.requestVideoFrameCallback==='function'){const frame=(_,meta)=>{if(shot&&shotVideo===v){noteProgress(v);checkGoalMoment(v,meta.mediaTime);checkSceneEffects(v,meta.mediaTime,meta.expectedDisplayTime);revealCurrent(v,true);reportRealVideoFrame(v,true,meta.mediaTime);}v.requestVideoFrameCallback(frame);};v.requestVideoFrameCallback(frame);}
 return v;
}
const decks=[makeDeck('sceneShotVideo'),makeDeck('sceneNextShotVideo')];
const showFrameTokens=new WeakMap();
function resetReadyFrame(deck){showFrameTokens.set(deck,0);}
function armFirstFrame(deck){
 const token=(showFrameTokens.get(deck)||0)+1;showFrameTokens.set(deck,token);
 if(typeof deck.requestVideoFrameCallback==='function'){
  deck.requestVideoFrameCallback(()=>{
   if(showFrameTokens.get(deck)!==token||deck!==shotVideo||!shot)return;
   revealCurrent(deck,true);
  });
 }
}

let warmedCueKey=null,queuedPreparation=null;
function reportRealVideoFrame(deck,frameConfirmed,mediaTime=deck.currentTime){
 if(!shot?.controller)return;
 if(typeof deck.requestVideoFrameCallback==='function'&&!frameConfirmed)return;
 // A buffered/loaded video or an invisible background tab does not spend a shot.
 if(!shot?.cueId||shotVideo!==deck||document.hidden||deck.paused||deck.readyState<2||deck.seeking||deck.style.opacity!=='1')return;
 if(deck.currentTime<0.08||window.AIFootballTikTok?.getMatchState?.().running!==true)return;
 // Progress requires video time to advance through decoded frames. A jump
 // caused by seeking or an invisible preload is not a completed shot.
 const last=shot.progressLastMediaTime;
 if(Number.isFinite(last)){
  const delta=mediaTime-last;
  // Count genuine advancing decoded frames, not a large seek jump.
  if(delta>0&&delta<0.3)shot.verifiedProgressSeconds=(shot.verifiedProgressSeconds||0)+delta;
 }
 shot.progressLastMediaTime=mediaTime;
 const now=Date.now();
 if(shot.lastFrameReportAt&&now-shot.lastFrameReportAt<1200)return;
 shot.lastFrameReportAt=now;
 window.AIFootballTikTok?.onShotVideoStarted?.({
  playbackOwner:shot.playbackOwner,cueId:shot.cueId,startsAt:shot.cueStartsAt,team:shot.team,mediaTime:deck.currentTime,clockStartedAt:window.AIFootballTikTok.getMatchClock()?.startedAt
 });
}
const goalMoments={A:3.4,B:3.8,C:4,D:3.35};
const celebratedShots=new Set();
function checkGoalMoment(v,time){
 if(!shot||v!==shotVideo||shot.result!=='goal')return;
 const moment=goalMoments[shot.team];if(!Number.isFinite(moment)||time<moment)return;
 const key=shot.cueStartsAt??shot.syncStartedAt;
 if(celebratedShots.has(key))return;
 celebratedShots.add(key);if(celebratedShots.size>256)celebratedShots.delete(celebratedShots.values().next().value);
 window.celebrateGoal?.(shot.team);
 if(!document.hidden&&v.style.opacity==='1'&&!v.paused&&time-moment<.5)window.AIFootballRoundCelebration?.announceShot?.(shot.team,'goal',key);
}
function checkSceneEffects(v,time,displayAt){
 if(!shot||v!==shotVideo||v.style.opacity!=='1'||document.hidden||v.paused||v.seeking||v.readyState<2)return;
 const events=window.AIFootballSceneAudioCues?.[v.dataset.clipKey];if(!events)return;
 shot.effectIndex||=0;
 while(shot.effectIndex<events.length&&events[shot.effectIndex][0]<=time+.012){
  const index=shot.effectIndex++,[at,kind,nativePresent]=events[index];
  // iOS sometimes reports frames 250-450ms apart. Accept the actual kick
  // crossing with tolerance, but never replay older sounds after a big seek.
  if(time-at>(kind==='kick'?.60:.18))continue;
  if(kind==='kick'){
   // The actual decoded foot-to-ball contact drives every visible countdown.
   window.AIFootballTikTok?.onShotBallKick?.({
    playbackOwner:shot.playbackOwner,team:shot.team,cueId:shot.cueId,
    startsAt:shot.cueStartsAt,clockStartedAt:window.AIFootballTikTok?.getMatchClock?.()?.startedAt,
    mediaTime:time,kickTime:at
   });
   window.AIFootballRoundCelebration?.announceKick?.(shot.team,shot.cueStartsAt);
  }
  if(kind==='catch'&&shot.result!=='goal')window.AIFootballRoundCelebration?.announceShot?.(shot.team,'save',shot.cueStartsAt);
  // Preserve recorded contacts; supplement only missing or blocked native audio.
  if(kind==='step')continue;
  if(nativePresent&&!v.muted&&v.volume>0&&!v.error)continue;
  window.AIFootballAudio?.sceneEffect?.(kind,index%3,displayAt);
 }
}
function syncShotAudio(){
 if(!shotVideo)return;
 const audio=window.AIFootballAudio;
 const cfg={...(window.__AI_FOOTBALL_SETTINGS||{}),...(audio?.settings||{})};
 shotVideo.volume=Math.max(0,Math.min(1,(Number(cfg.soundMaster??88)/100)*(Number(cfg.soundEffects??92)/100)));
 // Hidden/preloading decks stay silent; only the visible shot owns native audio.
 shotVideo.muted=!(audio?.enabled&&cfg.soundEnabled!==false&&shotVideo.style.opacity==='1'&&!shotVideo.dataset.autoplayMuted);
}
function assignClip(deck,key,forcedURL=null){
 const desired=forcedURL||mediaCache.getURL(key)||srcFor(key);
 if(deck.dataset.clipKey===key&&deck.getAttribute('src')===desired)return;
 deck.pause();deck.muted=true;deck.dataset.clipKey=key;
 resetReadyFrame(deck);
 deck.preload='auto';deck.src=desired;deck.load();
}
function spareDeck(){return decks.find(d=>d!==shotVideo)||decks[0];}
function prepareUpcomingShot(cue){
 if(!cue||cue.finishedAt||!clips[cue.team])return;
 const key=keyFor(cue.team,cue.result),identity=cue.id+':'+key;
 mediaCache.warm(key,{priority:100}).then(url=>{if(url&&warmedCueKey===identity){const spare=spareDeck();if(spare!==shotVideo&&spare.dataset.clipKey===key&&spare.style.opacity!=='1'&&spare.getAttribute('src')!==url){assignClip(spare,key,url);warmedCueKey=null;prepareUpcomingShot(cue);}}}).catch(()=>{});
 const spare=spareDeck();
 if(warmedCueKey===identity&&spare.dataset.clipKey===key)return;
 // Do not erase the outgoing frame before the new deck has rendered.
 if(spare.style.opacity==='1'&&shotVideo?.style.opacity!=='1'){queuedPreparation=cue;return;}
 // The second deck prebuffers the next team's clip while the current clip is on screen.
 if(spare.style.opacity==='1'&&spare!==shotVideo)spare.style.opacity='0';
 assignClip(spare,key);
 // Rewind a reused deck WHILE another team is playing, not at the transition.
 const prime=()=>{
  if(spare===shotVideo||spare.dataset.clipKey!==key||spare.readyState<1)return;
  if(spare.dataset.primingCue===identity)return;
  spare.dataset.primingCue=identity;
  if(spare.currentTime>.10){try{spare.currentTime=0;}catch{}}
  spare.muted=true;
  // Decode an actual frame before the boundary; preload alone is not enough on mobile.
  let finished=false;
  const stop=()=>{if(finished)return;finished=true;if(spare!==shotVideo&&spare.dataset.clipKey===key)spare.pause();};
  if(typeof spare.requestVideoFrameCallback==='function')spare.requestVideoFrameCallback(stop);
  spare.play().then(()=>setTimeout(stop,70)).catch(()=>{});
 };
 spare.addEventListener('loadedmetadata',prime,{once:true});
 prime();
 warmedCueKey=identity;
}
function revealCurrent(target,confirmedFrame=false){
 if(!shot||target!==shotVideo||target.readyState<2||target.seeking)return;
 // On mobile keep showing the previous final frame until the new video actually renders.
 if(!confirmedFrame&&typeof target.requestVideoFrameCallback==='function'&&target.style.opacity==='0')return;
 if(target.style.opacity!=='1'){
  // A cold/private tab can buffer before its first frame: align once before revealing it.
  if(!shot.controller&&!shot.initialFrameAligned){shot.initialFrameAligned=true;const expected=Math.max(0,(Date.now()-shot.syncStartedAt)/1000);if(expected-target.currentTime>.35&&Number.isFinite(target.duration)&&expected<target.duration-.1){try{target.currentTime=expected;armFirstFrame(target);return;}catch{}}}
  if(shot.controller){shot.syncStartedAt=Date.now()-target.currentTime*1000;shot.resumeAt=null;}shot.visibleSince??=performance.now();
  video.pause();
  target.style.zIndex='4';target.style.opacity='1';
  lastFrameAt=performance.now();lastMediaTime=target.currentTime;
  if(!shot.whistled){shot.whistled=true;window.AIFootballAudio?.whistle?.(shot.cueStartsAt);}
  for(const v of decks)if(v!==target){v.pause();v.style.opacity='0';v.muted=true;}
  syncShotAudio();
 }
 if(queuedPreparation){const cue=queuedPreparation;queuedPreparation=null;prepareUpcomingShot(cue);}
}
function playShot(){
 if(!shot||!shotVideo)return;
 const target=shotVideo,elapsed=shot.controller?(shot.resumeAt??(shot.visibleSince!=null?target.currentTime:0)):Math.max(0,(Date.now()-shot.syncStartedAt)/1000);
 const duration=Number.isFinite(target.duration)?target.duration:(durationByKey.get(target.dataset.clipKey)||0);
 if(duration>0&&elapsed>=duration&&target.ended){endShot(false,true);return;}
 // Keep the current visible stream moving until a decoded replacement frame is ready.
 lastRepair=Date.now();
 target.muted=true;
 // A fresh/prewarmed clip already sits on frame zero: avoid a costly initial seek.
 const needsSeek=elapsed>.30?Math.abs(target.currentTime-elapsed)>.55:target.currentTime>.20;
 if(needsSeek){try{target.currentTime=Math.min(elapsed,Math.max(0,duration-.04)||elapsed);}catch{}}
 if(target.style.opacity==='0'){
  armFirstFrame(target);
  // Some mobile browsers suppress callbacks on an off-screen or transparent video.
  const pendingShot=shot;
  setTimeout(()=>{if(shot===pendingShot&&shotVideo===target)revealCurrent(target,true);},180);
 }
 target.play().then(()=>revealCurrent(target)).catch(()=>{
   target.dataset.autoplayMuted='true';target.muted=true;target.play().then(()=>revealCurrent(target)).catch(()=>{});
 });
}
function endShot(force=false,naturalEnd=false){
 const previous=shot;
 if(!force&&naturalEnd&&previous?.controller&&previous?.cueId&&shotVideo&&!document.hidden){
  const mediaTime=Number(shotVideo.currentTime),duration=Number(shotVideo.duration);
  if(Number.isFinite(duration)&&duration>0.5&&Number.isFinite(mediaTime)&&
     mediaTime>=duration-0.3&&Number(previous.verifiedProgressSeconds||0)>=duration-.35)
   window.AIFootballTikTok?.onShotVideoFinished?.({
    playbackOwner:previous.playbackOwner,naturalEnd:true,playedSeconds:previous.verifiedProgressSeconds,elapsedMs:performance.now()-(previous.visibleSince??performance.now()),cueId:previous.cueId,team:previous.team,startsAt:previous.cueStartsAt,
    mediaTime,duration,clockStartedAt:window.AIFootballTikTok?.getMatchClock?.()?.startedAt
   });
 }
 if(!force&&previous)window.AIFootballTikTok?.onVideoEnded?.(previous.cueStartsAt??previous.syncStartedAt);
 if(shot!==previous)return;
 if(shotVideo)shotVideo.pause();
 shot=null;shotVideo=null;holdingForQueue=false;
 // A delayed next cue must never leave the last shot's frozen frame visible.
 // Resume stadium footage until the following team is genuinely ready.
 for(const deck of decks){deck.pause();deck.style.opacity='0';}
 try{video.currentTime=0;}catch{}
 video.play().catch(()=>{});
}
function beginShot(team,options={}){
 if(window.AIFootballTikTok?.getMatchState?.().running!==true)return false;
 if(!clips[team])return false;
 // Idempotent startup: a repeated network update must not rewind the
 // same shot or silently replace a previous team's unfinished footage.
 if(shot&&shot.cueId&&options.cueId===shot.cueId)return true;
 if(shot&&shot.cueId&&options.cueId&&shot.cueId!==options.cueId)return false;
 holdingForQueue=false;
 const old=shotVideo;
 const target=spareDeck();
 const key=keyFor(team,options.result);
 mediaCache.warm(key,{priority:200}).catch(()=>{});
 assignClip(target,key);
 if(old)old.playbackRate=1;
 target.playbackRate=1;target.style.opacity='0';
 shotVideo=target;lastFrameAt=performance.now();lastMediaTime=-1;recoveryCount=0;reloading=false;
 shot={controller:window.AIFootballTikTok?.getStatus?.().leader===true,playbackOwner:options.playbackOwner,team,result:options.result,cueId:options.cueId||null,cueStartsAt:options.cueStartsAt??options.startsAt??Date.now(),syncStartedAt:options.startsAt??Date.now()};
 warmedCueKey=null;
 playShot();
 return true;
}
function finishShot(team,result){
 if(!shot||shot.team!==team)return;
 shot.result=result;
 const desired=keyFor(team,result);
 if(shotVideo?.dataset.clipKey!==desired){
   const old=shotVideo,target=spareDeck();
   assignClip(target,desired);
   if(old)old.pause();
   target.style.opacity='0';
   shotVideo=target;
   playShot();
 }
}
function maintainShot(){
 if(shot&&window.AIFootballTikTok?.getMatchState?.().running===false){endShot(true);return;}
 if(!shot||!shotVideo||document.hidden||repairing)return;
 const v=shotVideo;
 const expected=shot.controller?v.currentTime:Math.max(0,(Date.now()-shot.syncStartedAt)/1000),duration=v.duration;
 const liveCue=window.AIFootballTikTok?.getCurrentCue?.();
 // On spectators, stale cue frames do not belong to the next match.
 // Recover visually without changing server-side shot/goal accounting.
 if(!shot.controller&&liveCue?.id&&shot.cueId&&liveCue.id!==shot.cueId){endShot(true);return;}
 if(!shot.controller&&Number.isFinite(duration)&&duration>0&&
    (Date.now()-shot.syncStartedAt)>duration*1000+6000&&
    performance.now()-lastFrameAt>3000){endShot(true);return;}
 if(Number.isFinite(duration)&&expected>=duration&&v.ended){endShot(false,true);return;}
 noteProgress(v);
 if(performance.now()-lastFrameAt>1500&&Date.now()-lastRecovery>1800&&!v.seeking){
  lastRecovery=Date.now();recoveryCount++;
  const cachedURL=mediaCache.getURL(v.dataset.clipKey);
  if(cachedURL&&v.getAttribute('src')!==cachedURL){if(shot.controller)shot.resumeAt=v.currentTime;const replacement=spareDeck();assignClip(replacement,v.dataset.clipKey,cachedURL);replacement.style.opacity='0';shotVideo=replacement;playShot();return;}
  mediaCache.warm(v.dataset.clipKey,{priority:200}).catch(()=>{});
  if(recoveryCount===2){if(shot.controller)shot.resumeAt=v.currentTime;reloading=true;v.pause();v.load();return;}
  try{if(v.readyState>=1)v.currentTime=Math.min(expected,Math.max(0,duration-.05));}catch{}
 }
 // Do not repeatedly seek a mobile decoder while it is buffering.
 const drift=expected-v.currentTime;
 if(!shot.controller&&v.readyState>=3&&!v.seeking){v.playbackRate=Math.abs(drift)>.15?(drift>0?1.03:.97):1;if(Math.abs(drift)>2.5&&(v.paused||Date.now()-lastRepair>4000)){lastRepair=Date.now();try{v.currentTime=Math.min(expected,Math.max(0,duration-.05));}catch{}}}
 if(v.paused){
   repairing=true;v.play().catch(()=>{v.dataset.autoplayMuted='true';v.muted=true;return v.play();}).catch(()=>{}).finally(()=>repairing=false);
 }
 revealCurrent(v);
}
setInterval(maintainShot,250);
setInterval(syncShotAudio,500);
// Auto-recover the muted looping waiting footage if Safari/Chrome pauses it
// after tab suspension, media pressure or an interrupted download.
let waitingLastTime=-1,waitingLastProgress=performance.now(),waitingRetries=0;
setInterval(()=>{
 if(document.hidden||shot||!video||!video.isConnected)return;
 if(Math.abs(video.currentTime-waitingLastTime)>.04){
  waitingLastTime=video.currentTime;waitingLastProgress=performance.now();waitingRetries=0;return;
 }
 if(performance.now()-waitingLastProgress<2600)return;
 waitingLastProgress=performance.now();waitingRetries++;
 video.muted=true;
 if(waitingRetries%4===0){try{video.load()}catch{}}
 video.play().catch(()=>{});
},1300);
document.addEventListener('pointerdown',()=>{for(const v of decks)delete v.dataset.autoplayMuted;syncShotAudio();if(shot&&shotVideo&&!document.hidden){const target=shotVideo;target.play().catch(()=>{target.dataset.autoplayMuted='true';target.muted=true;target.play().catch(()=>{});});}});
function sync(){
 const epoch=window.AIFootballTikTok?.getClock?.()?.epoch;
 if(!Number.isFinite(epoch)||!video.duration||document.hidden)return;
 video.currentTime=((Date.now()-epoch)/1000%video.duration+video.duration)%video.duration;
}
function startWaitingIfEmpty(){
 if(shot){playShot();return;}
 // The idle football video stays visible between pending shots.
 for(const deck of decks)if(deck.style.opacity!=='0')deck.style.opacity='0';
 sync();video.muted=true;video.play().catch(()=>{});
}
video.addEventListener('loadedmetadata',startWaitingIfEmpty);
video.addEventListener('loadeddata',()=>setTimeout(()=>mediaCache.warmAll(),700),{once:true});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){video.pause();if(shotVideo)shotVideo.pause();}
 else startWaitingIfEmpty();
});
window.addEventListener('pageshow',startWaitingIfEmpty);
function getShotTiming(team,result){
 const key=keyFor(team,result),duration=durationByKey.get(key);
 const fallback=result==='goal'?(team==='A'?8:10):(team==='B'?14:10);
 return {outcomeMs:result==='goal'?Math.round((goalMoments[team]||4)*1000):team==='A'?5000:5500,durationMs:Math.round((duration||fallback)*1000)};
}
window.AIFootball3D={
 getShotTiming,prepareUpcomingShot,
 syncCue(cue){if(shot&&!shot.controller&&cue?.id===shot.cueId&&cue.videoStartedAt)shot.syncStartedAt=cue.videoStartedAt;},
 beginShot,finishShot,
 playTestShot(){if(this.isAnimating||!video.readyState)return false;beginShot('A',{startsAt:Date.now(),result:'save'});return true;},
 async waitForShot(){while(this.isAnimating)await new Promise(r=>setTimeout(r,60));},
 finishSyncedShot(startsAt){if((!shot&&holdingForQueue)||(shot&&(shot.cueStartsAt??shot.syncStartedAt)===startsAt))endShot(true);},
 get isAnimating(){return !!shot;},
 get shotStatus(){return shot?{...shot,phase:'waiting',returnComplete:false}:null;},
 get videoStatus(){return {ready:video.readyState>=2,
   motionReady:video.readyState>=2,
   mode:'cached-two-deck-video',cache:mediaCache.stats,recoveryCount,shotClipsReady:allKeys.every(key=>durationByKey.has(key)||failedMetadata.has(key)),
   cachedShotClips:0,cacheFailures:failedMetadata.size,metadataProbes:probes.length,deckCount:decks.length};},
 get ready(){return video.readyState>=2;},
 applySettings(value){
  settings={...settings,...value};syncShotAudio();
  // Live preview for video-compatible settings only: all footage is pre-rendered.
  const exposure=Math.max(.65,Math.min(1.5,(Number(settings.stadiumExposure)||116)/116));
  const zoom=Math.max(.75,Math.min(1.4,(Number(settings.cameraZoom)||100)/100));
  stage.style.filter='brightness('+exposure+')';
  for(const clip of [video,...decks]){clip.style.transform='scale('+zoom+')';clip.style.transformOrigin='50% 50%';}
 },
 get settings(){return {...settings};},
 reset(){endShot(true);},configureTeams(){},reloadModels(){},get modelStatus(){return [];}
};
window.addEventListener('ai-football-settings',e=>window.AIFootball3D.applySettings(e.detail||{}));
video.play().catch(()=>{});
})();
