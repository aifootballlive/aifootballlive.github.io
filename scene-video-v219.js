/* Unified stadium video — two-deck, on-demand playback for mobile browsers. */
(()=>{
'use strict';
const mediaCache=window.AIFootballClipCache;
const matchNow=()=>window.AIFootballTime?.now?.()??Date.now();
let shot=null,settings={},shotVideo=null,repairing=false,holdingForQueue=false;
const stage=document.createElement('div');stage.id='game3dStage';
const video=document.createElement('video');video.id='sceneWaitingVideo';
video.src=mediaCache.waitingSrc||'./assets/scene-v111/waiting.mp4';
video.autoplay=true;video.loop=true;video.muted=true;video.defaultMuted=true;
video.playsInline=true;video.preload='auto';video.setAttribute('playsinline','');
video.setAttribute('aria-label','Dört futbolcu ve kaleci bekleme videosu');
Object.assign(video.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'contain',zIndex:'1'});
stage.append(video);document.querySelector('.wrap').prepend(stage);
const idlePoster=document.createElement('canvas');idlePoster.id='sceneIdlePoster';
Object.assign(idlePoster.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'contain',zIndex:'2',display:'none',pointerEvents:'none'});stage.append(idlePoster);
function releaseWaitingDownload(){
 if(!mediaCache.mobile||!video.getAttribute('src'))return;
 if(video.readyState>=2&&video.videoWidth){try{idlePoster.width=video.videoWidth;idlePoster.height=video.videoHeight;idlePoster.getContext('2d').drawImage(video,0,0);idlePoster.style.transform=video.style.transform;idlePoster.style.transformOrigin=video.style.transformOrigin;idlePoster.style.display='block';}catch{}}
 video.pause();video.removeAttribute('src');video.load();
}
const sound=document.getElementById('soundEnable');
if(sound)document.getElementById('matchControls')?.append(sound);

const clips={
 A:{save:'./assets/scene-v112/fb-shot.mp4',goal:'./assets/scene-v110/fb-shot.mp4'},
 B:{save:'./assets/scene-v116/gs-shot.mp4',goal:'./assets/scene-v126/gs-goal.mp4'},
 C:{save:'./assets/scene-v125/bjk-save.mp4',goal:'./assets/scene-v298/bjk-goal.mp4'},
 D:{save:'./assets/scene-v123/ts-save.mp4',goal:'./assets/scene-v140/ts-goal.mp4'}
};
for(const [team,outcomes]of Object.entries(clips))for(const result of Object.keys(outcomes)){const entry=mediaCache.manifest[team+'_'+result];if(entry?.src)outcomes[result]=entry.src;}
const keyFor=(team,result,mode)=>team+'_'+(result==='goal'?'goal':'save')+(mode==='fast'?'_fast':'');
const srcFor=key=>mediaCache.manifest[key]?.src||null;
const allKeys=Object.keys(mediaCache.manifest);
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
 v.addEventListener('timeupdate',()=>{if(shotVideo===v){revealCurrent(v);reportRealVideoFrame(v,false);if(typeof v.requestVideoFrameCallback!=='function'||performance.now()-(shot?.lastConfirmedFrameAt??0)>750)checkGoalMoment(v,v.currentTime);checkSceneEffects(v,v.currentTime);}});
 v.addEventListener('seeked',()=>revealCurrent(v));
 for(const event of ['seeking','seeked'])v.addEventListener(event,()=>{
  if(v===shotVideo&&shot&&shot.visibleSince!=null)shot.nativeContinuous=false;
  if(v===shotVideo&&shot)recordPlaybackProgress(shot,v.currentTime,performance.now(),v.playbackRate,true);
 });
 v.addEventListener('ratechange',()=>{if(v===shotVideo&&shot&&shot.visibleSince!=null&&Math.abs(v.playbackRate-1)>.04)shot.nativeContinuous=false;});
 v.addEventListener('loadeddata',()=>revealCurrent(v));
 v.addEventListener('canplay',()=>revealCurrent(v));
 // A transparent iOS deck may not deliver rVFC at all. The native playing
 // event also confirms a decoded first frame, including slow cold loads that
 // outlast the one-shot 180ms fallback.
 v.addEventListener('playing',()=>{if(v===shotVideo&&v.readyState>=2&&!v.seeking)revealCurrent(v,true);});
 if(typeof v.requestVideoFrameCallback==='function'){const frame=(_,meta)=>{if(shot&&shotVideo===v){noteProgress(v);revealCurrent(v,true);reportRealVideoFrame(v,true,meta.mediaTime);checkGoalMoment(v,meta.mediaTime);checkSceneEffects(v,meta.mediaTime,meta.expectedDisplayTime);}v.requestVideoFrameCallback(frame);};v.requestVideoFrameCallback(frame);}
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
// Count advancing media against elapsed monotonic time, not callback frequency.
// Safari may present callbacks hundreds of milliseconds apart while playing
// normally. Seeks explicitly re-anchor without counting the skipped segment.
// The authenticated broadcast owner keeps actual video playback running behind
// another window. Hidden spectators/preloads still cannot spend a shot.
function canRunShot(){return !document.hidden||!!(shot?.controller&&window.AIFootballTikTok?.getStatus?.().leader===true);}
function recordPlaybackProgress(state,mediaTime,mono,rate=1,reset=false){
 const last=state.progressLastMediaTime,at=state.progressLastMono;
 if(!reset&&Number.isFinite(last)&&Number.isFinite(at)){
  const delta=mediaTime-last,elapsed=Math.max(0,(mono-at)/1000);
  if(delta>0&&delta<=elapsed*Math.max(1,rate)+.12){
   const ranges=[...(state.playedRanges||[]),[last,mediaTime]].sort((a,b)=>a[0]-b[0]),merged=[];
   for(const range of ranges){const tail=merged.at(-1);if(tail&&range[0]<=tail[1])tail[1]=Math.max(tail[1],range[1]);else merged.push([...range]);}
   state.playedRanges=merged;
   state.verifiedProgressSeconds=merged.reduce((sum,[a,b])=>sum+b-a,0);
  }
 }
 state.progressLastMediaTime=mediaTime;state.progressLastMono=mono;
}
// Native played ranges survive sparse/throttled frame callbacks. Reused-deck
// history is accepted only with a fresh near-zero start, no seek/rate skip,
// actual current media time and enough monotonic playback time in this cue.
function provedPlaybackSeconds(state,v,mediaTime,mono){
 const sampled=Number(state.verifiedProgressSeconds)||0;
 if(!state.nativeContinuous||!Number.isFinite(state.visibleSince)||Math.abs(v.playbackRate-1)>.04)return sampled;
 const limit=Math.min(Number(mediaTime)||0,Number(v.currentTime)||0,Math.max(0,(mono-state.visibleSince)/1000)+.12);
 let native=0;
 for(let i=0;i<v.played.length;i++){const a=Math.max(0,v.played.start(i)),b=Math.min(limit,v.played.end(i));if(b>a)native+=b-a;}
 return Math.max(sampled,native);
}
function reportRealVideoFrame(deck,frameConfirmed,mediaTime=deck.currentTime){
 if(!shot?.controller)return;
 const mono=performance.now();
 if(frameConfirmed)shot.lastConfirmedFrameAt=mono;
 // Some iOS versions expose rVFC but stop delivering it reliably. Native
 // timeupdate remains usable when confirmed callbacks have been absent.
 if(typeof deck.requestVideoFrameCallback==='function'&&!frameConfirmed&&mono-(shot.lastConfirmedFrameAt??shot.visibleSince??mono)<750)return;
 // Buffered preloads and hidden spectators never spend a shot; the active
 // broadcast owner still needs real advancing native playback and natural end.
 if(!shot?.cueId||shotVideo!==deck||!canRunShot()||deck.paused||deck.readyState<2||deck.seeking||deck.style.opacity!=='1')return;
 if(deck.currentTime<0.08||window.AIFootballTikTok?.getMatchState?.().running!==true)return;
 // Progress requires video time to advance through decoded frames. A jump
 // caused by seeking or an invisible preload is not a completed shot.
 recordPlaybackProgress(shot,mediaTime,mono,deck.playbackRate);
 const now=matchNow();
 if(shot.lastFrameReportAt&&now-shot.lastFrameReportAt<1200)return;
 shot.lastFrameReportAt=now;
 window.AIFootballTikTok?.onShotVideoStarted?.({
  playbackOwner:shot.playbackOwner,cueId:shot.cueId,startsAt:shot.cueStartsAt,team:shot.team,mediaTime:deck.currentTime,clockStartedAt:window.AIFootballTikTok.getMatchClock()?.startedAt
 });
}
const goalMoments={A:3.4,B:3.8,C:4,D:3.35};
const celebratedShots=new Set();
function checkGoalMoment(v,time){
 if(!shot||v!==shotVideo||shot.result!=='goal'||!canRunShot()||v.style.opacity!=='1'||v.paused||v.seeking||v.readyState<2)return;
 const moment=mediaCache.manifest[shot.clipKey]?.goalSeconds??goalMoments[shot.team];if(!Number.isFinite(moment)||time<moment)return;
 window.AIFootballTikTok?.onShotGoal?.({playbackOwner:shot.playbackOwner,team:shot.team,cueId:shot.cueId,startsAt:shot.cueStartsAt,mediaTime:time,playedSeconds:provedPlaybackSeconds(shot,v,time,performance.now()),elapsedMs:performance.now()-(shot.visibleSince??performance.now()),clockStartedAt:window.AIFootballTikTok?.getMatchClock?.()?.startedAt});
 const key=shot.cueStartsAt??shot.syncStartedAt;
 if(celebratedShots.has(key))return;
 celebratedShots.add(key);if(celebratedShots.size>256)celebratedShots.delete(celebratedShots.values().next().value);
 window.celebrateGoal?.(shot.team);
 if(canRunShot()&&v.style.opacity==='1'&&!v.paused&&time-moment<.5)window.AIFootballRoundCelebration?.announceShot?.(shot.team,'goal',key);
}
function checkSceneEffects(v,time,displayAt){
 if(!shot||v!==shotVideo||v.style.opacity!=='1'||!canRunShot()||v.paused||v.seeking||v.readyState<2)return;
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
function spareDeck(){return decks.find(d=>d!==shotVideo&&d.style.opacity!=='1')||decks.find(d=>d!==shotVideo)||decks[0];}
function bufferedAt(v,time,headroom=.2){
 if(!Number.isFinite(time)||time<0)return false;
 const end=Number.isFinite(v.duration)?Math.min(v.duration,time+headroom):time+headroom;
 for(let i=0;i<v.buffered.length;i++)if(v.buffered.start(i)<=time+.05&&v.buffered.end(i)>=end)return true;
 return false;
}
function prepareUpcomingShot(cue){
 if(!cue||cue.finishedAt||!clips[cue.team])return;
 // Finish buffering the current original mobile clip before another full MP4
 // competes for bandwidth. The remaining playback time prebuffers the next.
 if(mediaCache.mobile&&shot&&shotVideo&&(shotVideo.style.opacity!=='1'||!Number.isFinite(shotVideo.duration)||!bufferedAt(shotVideo,shotVideo.currentTime,Math.max(0,shotVideo.duration-shotVideo.currentTime-.1)))){queuedPreparation=cue;return;}
 const key=keyFor(cue.team,cue.result,cue.playbackMode),identity=cue.id+':'+key;
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
function showShotBeacon(team=null){
 for(const t of ['A','B','C','D'])document.getElementById('frontQueue'+t)?.closest('.adminTeamQueue')?.classList.toggle('shotBeacon',t===team);
}
function revealCurrent(target,confirmedFrame=false){
 if(!shot||!canRunShot()||target!==shotVideo||target.readyState<2||target.seeking||target.paused)return;
 if(shot.resumePending)return;
 if(shot.bufferPending&&shot.visibleSince==null)return;
 // On mobile keep showing the previous final frame until the new video actually renders.
 if(!confirmedFrame&&typeof target.requestVideoFrameCallback==='function'&&target.style.opacity==='0')return;
 if(target.style.opacity!=='1'){
  // A cold/private tab can buffer before its first frame: align once before revealing it.
  if(!shot.controller&&shot.visibleSince==null&&!shot.initialFrameAligned){shot.initialFrameAligned=true;const expected=Math.max(0,(matchNow()-shot.syncStartedAt)/1000);if(expected-target.currentTime>.35&&Number.isFinite(target.duration)&&expected<target.duration-.1&&bufferedAt(target,expected)){try{target.currentTime=expected;armFirstFrame(target);return;}catch{}}}
  if(shot.controller)shot.syncStartedAt=matchNow()-target.currentTime*1000;
  shot.resumeAt=null;if(shot.visibleSince==null)shot.nativeContinuous=target.currentTime<=.1;shot.visibleSince??=performance.now();
  recordPlaybackProgress(shot,target.currentTime,performance.now(),target.playbackRate,true);
  video.pause();
  // Pausing alone leaves the large idle MP4 downloading in mobile browsers.
  // Release that request/decoder while the shot covers the background.
  releaseWaitingDownload();idlePoster.style.display='none';
  target.style.zIndex='4';target.style.opacity='1';
  showShotBeacon(shot.team);
  lastFrameAt=performance.now();lastMediaTime=target.currentTime;
  if(!shot.whistled){shot.whistled=true;window.AIFootballAudio?.whistle?.(shot.cueStartsAt);}
  for(const v of decks)if(v!==target){v.pause();v.style.opacity='0';v.muted=true;}
  syncShotAudio();
 }
 if(queuedPreparation){const cue=queuedPreparation;queuedPreparation=null;prepareUpcomingShot(cue);}
}
function playShot(){
 if(!shot||!shotVideo||!canRunShot())return;
 const target=shotVideo,preserving=Number.isFinite(shot.resumeAt),elapsed=preserving?shot.resumeAt:shot.visibleSince!=null?target.currentTime:shot.controller?0:Math.max(0,(matchNow()-shot.syncStartedAt)/1000);
 if(preserving&&target.readyState<1){
  if(!shot.resumePending){const current=shot;shot.resumePending=true;target.addEventListener('loadedmetadata',()=>{if(shot!==current||shotVideo!==target)return;shot.resumePending=false;playShot();},{once:true});}
  return;
 }
 const duration=Number.isFinite(target.duration)?target.duration:(durationByKey.get(target.dataset.clipKey)||0);
 if(duration>0&&elapsed>=duration&&target.ended){endShot(false,true);return;}
 // Start a cold mobile clip with a small amount of real downloaded footage,
 // instead of showing its first frame and immediately starving the decoder.
 // This is a readiness condition, never a delay/offset on the shared clock.
 const firstTime=Math.min(elapsed,Math.max(0,duration-.04)||elapsed);
 if(mediaCache.mobile&&shot.visibleSince==null&&!preserving&&!bufferedAt(target,firstTime,Math.min(2,Math.max(0,duration-firstTime-.1)))){
  if(!shot.bufferPending){const current=shot;shot.bufferPending=true;setTimeout(()=>{if(shot!==current)return;shot.bufferPending=false;if(canRunShot())playShot();},100);}
  return;
 }
 // Keep the current visible stream moving until a decoded replacement frame is ready.
 target.muted=true;
 // A fresh/prewarmed clip already sits on frame zero: avoid a costly initial seek.
 const needsSeek=preserving?Math.abs(target.currentTime-elapsed)>.04:elapsed>.30?Math.abs(target.currentTime-elapsed)>.55:target.currentTime>.20;
 const seekTo=Math.min(elapsed,Math.max(0,duration-.04)||elapsed);
 if(needsSeek&&(preserving?target.readyState>=1:bufferedAt(target,seekTo))){try{target.currentTime=seekTo;}catch{}}
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
 if(!force&&naturalEnd&&previous?.controller&&previous?.cueId&&shotVideo&&canRunShot()){
  const mediaTime=Number(shotVideo.currentTime),duration=Number(shotVideo.duration);
  // The ended event can follow the last displayed callback by >300ms. Count
  // that natural tail with the same time/seek guard, never a guessed timeout.
  if(!shotVideo.seeking)recordPlaybackProgress(previous,mediaTime,performance.now(),shotVideo.playbackRate);
  const playedSeconds=provedPlaybackSeconds(previous,shotVideo,mediaTime,performance.now());
  if(Number.isFinite(duration)&&mediaTime>=duration-.3&&playedSeconds<duration-.35)console.warn('Şut bitiş doğrulaması bekliyor',{team:previous.team,playedSeconds,sampledSeconds:previous.verifiedProgressSeconds||0,nativeContinuous:previous.nativeContinuous,elapsedMs:performance.now()-(previous.visibleSince??performance.now()),duration});
  if(Number.isFinite(duration)&&duration>0.5&&Number.isFinite(mediaTime)&&
     mediaTime>=duration-0.3&&playedSeconds>=duration-.35)
   window.AIFootballTikTok?.onShotVideoFinished?.({
    playbackOwner:previous.playbackOwner,naturalEnd:true,playedSeconds,elapsedMs:performance.now()-(previous.visibleSince??performance.now()),cueId:previous.cueId,team:previous.team,startsAt:previous.cueStartsAt,
    mediaTime,duration,clockStartedAt:window.AIFootballTikTok?.getMatchClock?.()?.startedAt
   });
 }
 const queued=!force&&previous&&window.AIFootballTikTok?.onVideoEnded?.(previous.cueStartsAt??previous.syncStartedAt)===true;
 if(shot!==previous)return;
 showShotBeacon();
 if(shotVideo)shotVideo.pause();
 shot=null;holdingForQueue=queued; // Accounting still waits for the completed-video proof.
 if(holdingForQueue&&shotVideo){
  shotVideo.muted=true;video.pause();return; // Keep the outgoing frame until the next deck renders.
 }
 shotVideo=null;
 for(const deck of decks)deck.pause();
 ensureWaitingSource();
 sync();
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
 const key=keyFor(team,options.result,options.playbackMode);
 releaseWaitingDownload();
 mediaCache.warm(key,{priority:200}).catch(()=>{});
 assignClip(target,key);
 target.pause(); // Stop any invisible priming before the real shot begins.
 if(old)old.playbackRate=1;
 target.playbackRate=1;target.style.opacity='0';
 shotVideo=target;lastFrameAt=performance.now();lastMediaTime=-1;recoveryCount=0;reloading=false;
 shot={clipKey:key,playbackMode:options.playbackMode||'normal',controller:window.AIFootballTikTok?.getStatus?.().leader===true,playbackOwner:options.playbackOwner,team,result:options.result,cueId:options.cueId||null,cueStartsAt:options.cueStartsAt??options.startsAt??matchNow(),syncStartedAt:options.startsAt??matchNow()};
 warmedCueKey=null;
 playShot();
 if(shot.result==='goal'){
  const current=shot;
  const watch=()=>{if(shot!==current||!canRunShot())return;const key=shot.cueStartsAt??shot.syncStartedAt;if(celebratedShots.has(key))return;
   if(typeof target.requestVideoFrameCallback!=='function'||performance.now()-(shot.lastConfirmedFrameAt??0)>100)checkGoalMoment(target,target.currentTime);
   requestAnimationFrame(watch);
  };requestAnimationFrame(watch);
 }
 return true;
}
function finishShot(team,result){
 if(!shot||shot.team!==team)return;
 shot.result=result;
 const desired=keyFor(team,result,shot.playbackMode);shot.clipKey=desired;
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
 if(!shot&&holdingForQueue){
  if(!window.AIFootballTikTok?.hasPendingShot?.()||window.AIFootballTikTok?.getMatchState?.().running===false||window.AIFootballTikTok?.getGiftProcessingPaused?.())endShot(true);
  return;
 }
 if(shot&&window.AIFootballTikTok?.getMatchState?.().running===false){endShot(true);return;}
 if(!shot||!shotVideo||!canRunShot()||repairing)return;
 const v=shotVideo;
 const expected=shot.controller?v.currentTime:Math.max(0,(matchNow()-shot.syncStartedAt)/1000),duration=v.duration;
 const liveCue=window.AIFootballTikTok?.getCurrentCue?.();
 // On spectators, stale cue frames do not belong to the next match.
 // Recover visually without changing server-side shot/goal accounting.
 if(!shot.controller&&liveCue?.id&&shot.cueId&&liveCue.id!==shot.cueId){endShot(true);return;}
 if(shot.resumePending||shot.bufferPending&&shot.visibleSince==null)return;
 if(!shot.controller&&Number.isFinite(duration)&&duration>0&&
    (matchNow()-shot.syncStartedAt)>duration*1000+6000&&
    performance.now()-lastFrameAt>3000){endShot(true);return;}
 if(Number.isFinite(duration)&&expected>=duration&&v.ended){endShot(false,true);return;}
 noteProgress(v);
 if(performance.now()-lastFrameAt>1500&&matchNow()-lastRecovery>1800&&!v.seeking){
  lastRecovery=matchNow();
  const cachedURL=mediaCache.getURL(v.dataset.clipKey);
  if(cachedURL&&v.getAttribute('src')!==cachedURL){shot.resumeAt=v.currentTime;const replacement=spareDeck();assignClip(replacement,v.dataset.clipKey,cachedURL);replacement.style.opacity='0';shotVideo=replacement;playShot();return;}
  // A slow but active download is not a failed decoder. Reloading after two
  // short retries discards its progress and creates a permanent buffering loop.
  if(v.networkState===2&&v.readyState<3&&!v.error&&performance.now()-lastFrameAt<12000){
   if(v.paused)v.play().catch(()=>{});
   return;
  }
  recoveryCount++;
  mediaCache.warm(v.dataset.clipKey,{priority:200,recovery:true}).catch(()=>{});
  if(recoveryCount===2){shot.resumeAt=v.currentTime;reloading=true;v.pause();v.load();return;}
 }
 // Once visible, never skip downloaded footage to chase wall time. A small
 // continuous speed correction keeps motion smooth; repairs keep media time.
 const drift=expected-v.currentTime;
 if(!shot.controller&&v.readyState>=3&&!v.seeking){const rate=Math.abs(drift)>.15&&bufferedAt(v,v.currentTime,.5)?(drift>0?1.03:.97):1;if(v.playbackRate!==rate)v.playbackRate=rate;}
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
 if(document.hidden||shot||holdingForQueue||!video||!video.isConnected)return;
 if(Math.abs(video.currentTime-waitingLastTime)>.04){
  waitingLastTime=video.currentTime;waitingLastProgress=performance.now();waitingRetries=0;return;
 }
 if(performance.now()-waitingLastProgress<2600)return;
 waitingLastProgress=performance.now();waitingRetries++;
 video.muted=true;
 if(waitingRetries%4===0){try{video.load()}catch{}}
 video.play().catch(()=>{});
},1300);
document.addEventListener('pointerdown',()=>{for(const v of decks)delete v.dataset.autoplayMuted;syncShotAudio();if(shot&&shotVideo&&canRunShot()){const target=shotVideo;target.play().catch(()=>{target.dataset.autoplayMuted='true';target.muted=true;target.play().catch(()=>{});});}});
function sync(){
 const epoch=window.AIFootballTikTok?.getClock?.()?.epoch;
 if(!Number.isFinite(epoch)||!video.duration||document.hidden)return;
 video.currentTime=((matchNow()-epoch)/1000%video.duration+video.duration)%video.duration;
}
function ensureWaitingSource(){
 if(!video.getAttribute('src')){video.src=mediaCache.waitingSrc||'./assets/scene-v111/waiting.mp4';video.load();}
}
video.addEventListener('playing',()=>{
 if(shot||holdingForQueue||video.readyState<2)return;
 idlePoster.style.display='none';
 for(const deck of decks){deck.pause();deck.style.opacity='0';}
});
function startWaitingIfEmpty(){
 if(shot){playShot();return;}
 if(holdingForQueue&&window.AIFootballTikTok?.hasPendingShot?.()&&window.AIFootballTikTok?.getMatchState?.().running!==false)return;
 holdingForQueue=false;shotVideo=null;
 // Idle footage returns only after the shot queue is empty or play has stopped.
 ensureWaitingSource();
 sync();video.muted=true;video.play().catch(()=>{});
}
video.addEventListener('loadedmetadata',startWaitingIfEmpty);
video.addEventListener('loadeddata',()=>setTimeout(()=>mediaCache.warmAll(),700),{once:true});
document.addEventListener('visibilitychange',()=>{
 if(shot&&shotVideo&&!(shot.controller&&window.AIFootballTikTok?.getStatus?.().leader===true))recordPlaybackProgress(shot,shotVideo.currentTime,performance.now(),shotVideo.playbackRate,true);
 if(document.hidden){video.pause();if(shotVideo){if(canRunShot()){if(shotVideo.paused)playShot();}else shotVideo.pause();}}
 else startWaitingIfEmpty();
});
window.addEventListener('pageshow',startWaitingIfEmpty);
function getShotTiming(team,result,mode='normal'){
 const key=keyFor(team,result,mode),duration=durationByKey.get(key),entry=mediaCache.manifest[key];
 const fallback=result==='goal'?(team==='A'?8:10):(team==='B'?14:10);
 return {goalSeconds:entry?.goalSeconds??goalMoments[team],outcomeMs:entry?.outcomeSeconds?Math.round(entry.outcomeSeconds*1000):result==='goal'?Math.round((goalMoments[team]||4)*1000):team==='A'?5000:5500,durationMs:Math.round((duration||fallback)*1000)};
}
window.AIFootball3D={
 getShotTiming,prepareUpcomingShot,
 syncCue(cue){if(shot&&!shot.controller&&cue?.id===shot.cueId&&cue.videoStartedAt)shot.syncStartedAt=cue.videoStartedAt;},
 beginShot,finishShot,
 playTestShot(){if(this.isAnimating||!video.readyState)return false;beginShot('A',{startsAt:matchNow(),result:'save'});return true;},
 async waitForShot(){while(this.isAnimating)await new Promise(r=>setTimeout(r,60));},
 finishSyncedShot(startsAt){if((!shot&&holdingForQueue)||(shot&&(shot.cueStartsAt??shot.syncStartedAt)===startsAt))endShot(true);},
 get isAnimating(){return !!shot;},
 get shotStatus(){return shot?{...shot,phase:'waiting',returnComplete:false}:null;},
 get videoStatus(){return {ready:video.readyState>=2,
   motionReady:video.readyState>=2,
   mode:'cached-two-deck-video',mediaProfile:'original',cache:mediaCache.stats,recoveryCount,shotClipsReady:allKeys.every(key=>durationByKey.has(key)||failedMetadata.has(key)),
   cachedShotClips:0,cacheFailures:failedMetadata.size,metadataProbes:probes.length,deckCount:decks.length};},
 get ready(){return video.readyState>=2;},
 applySettings(value){
  settings={...settings,...value};syncShotAudio();
  // Live preview for video-compatible settings only: all footage is pre-rendered.
  const exposure=Math.max(.65,Math.min(1.5,(Number(settings.stadiumExposure)||116)/116));
  const zoom=Math.max(.75,Math.min(1.4,(Number(settings.cameraZoom)||100)/100));
  stage.style.filter='brightness('+exposure+')';
  for(const clip of [video,...decks,idlePoster]){clip.style.transform='scale('+zoom+')';clip.style.transformOrigin='50% 50%';}
 },
 get settings(){return {...settings};},
 reset(){endShot(true);},configureTeams(){},reloadModels(){},get modelStatus(){return [];}
};
window.addEventListener('ai-football-settings',e=>window.AIFootball3D.applySettings(e.detail||{}));
video.play().catch(()=>{});
})();
