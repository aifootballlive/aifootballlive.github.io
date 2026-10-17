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
const durationByKey=new Map(),failedMetadata=new Set(),probes=[];
const startup=Date.now();
// Probe at most two headers at a time, then release every detached media resource.
const metadataQueue=allKeys.slice();
function probeNext(){
 const key=metadataQueue.shift();if(!key)return;
 const probe=document.createElement('video');let done=false;
 probes.push(probe);probe.preload='metadata';probe.muted=true;
 const finish=ok=>{if(done)return;done=true;clearTimeout(timeout);if(!ok)failedMetadata.add(key);probe.removeAttribute('src');probe.load();const index=probes.indexOf(probe);if(index>=0)probes.splice(index,1);probeNext();};
 const timeout=setTimeout(()=>finish(false),8000);
 probe.addEventListener('loadedmetadata',()=>{if(Number.isFinite(probe.duration)&&probe.duration>0){durationByKey.set(key,probe.duration);finish(true);}else finish(false);},{once:true});
 probe.addEventListener('error',()=>finish(false),{once:true});probe.src=srcFor(key);
}
probeNext();probeNext();
function makeDeck(id){
 const v=document.createElement('video');v.id=id;v.playsInline=true;v.preload='none';v.muted=true;v.defaultMuted=true;v.setAttribute('playsinline','');
 Object.assign(v.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'contain',zIndex:'3',display:'block',opacity:'0'});
 stage.append(v);
 v.addEventListener('loadedmetadata',()=>{const key=v.dataset.clipKey;if(key&&Number.isFinite(v.duration)&&v.duration>0)durationByKey.set(key,v.duration);});
 v.addEventListener('ended',()=>{if(shot&&shotVideo===v)endShot();});
 v.addEventListener('timeupdate',()=>{if(shotVideo===v){checkGoalMoment(v,v.currentTime);checkSceneEffects(v,v.currentTime);revealCurrent(v);}});
 v.addEventListener('seeked',()=>revealCurrent(v));
 v.addEventListener('loadeddata',()=>revealCurrent(v));
 v.addEventListener('canplay',()=>revealCurrent(v));
 if(typeof v.requestVideoFrameCallback==='function'){const frame=(_,meta)=>{if(shot&&shotVideo===v){checkGoalMoment(v,meta.mediaTime);checkSceneEffects(v,meta.mediaTime,meta.expectedDisplayTime);revealCurrent(v,true);}v.requestVideoFrameCallback(frame);};v.requestVideoFrameCallback(frame);}
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
const goalMoments={A:3.4,B:3.8,C:4,D:3.35};
const celebratedShots=new Set();
function checkGoalMoment(v,time){
 if(!shot||v!==shotVideo||shot.result!=='goal')return;
 const moment=goalMoments[shot.team];if(!Number.isFinite(moment)||time<moment)return;
 const key=shot.cueStartsAt??shot.syncStartedAt;
 if(celebratedShots.has(key))return;
 celebratedShots.add(key);if(celebratedShots.size>256)celebratedShots.delete(celebratedShots.values().next().value);
 window.celebrateGoal?.(shot.team);
}
function checkSceneEffects(v,time,displayAt){
 if(!shot||v!==shotVideo||v.style.opacity!=='1'||document.hidden)return;
 const events=window.AIFootballSceneAudioCues?.[v.dataset.clipKey];if(!events)return;
 shot.effectIndex||=0;
 while(shot.effectIndex<events.length&&events[shot.effectIndex][0]<=time+.012){
  const index=shot.effectIndex++,[at,kind,nativePresent]=events[index];
  if(time-at>.12)continue; // Never replay a backlog after seeking/reconnecting.
  if(nativePresent&&!v.muted&&v.volume>0&&!v.error)continue;
  window.AIFootballAudio?.sceneEffect?.(kind,index%3,displayAt);
 }
}
function syncShotAudio(){
 if(!shotVideo)return;
 const audio=window.AIFootballAudio;
 const cfg={...(window.__AI_FOOTBALL_SETTINGS||{}),...(audio?.settings||{})};
 shotVideo.volume=Math.max(0,Math.min(1,(Number(cfg.soundMaster??88)/100)*(Number(cfg.soundEffects??92)/100)));
 shotVideo.muted=shotVideo.dataset.autoplayMuted==='true'||!(audio?.enabled&&cfg.soundEnabled!==false);
}
function assignClip(deck,key){
 if(deck.dataset.clipKey===key)return;
 deck.pause();deck.muted=true;deck.dataset.clipKey=key;
 resetReadyFrame(deck);
 deck.preload='auto';deck.src=srcFor(key);deck.load();
}
function spareDeck(){return decks.find(d=>d!==shotVideo)||decks[0];}
function prepareUpcomingShot(cue){
 if(!cue||cue.finishedAt||!clips[cue.team])return;
 const key=keyFor(cue.team,cue.result),identity=cue.id+':'+key;
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
  if(!shot.initialFrameAligned){shot.initialFrameAligned=true;const expected=Math.max(0,(Date.now()-shot.syncStartedAt)/1000);if(expected-target.currentTime>.35&&Number.isFinite(target.duration)&&expected<target.duration-.1){try{target.currentTime=expected;armFirstFrame(target);return;}catch{}}}
  target.style.zIndex='4';target.style.opacity='1';
  if(!shot.whistled){shot.whistled=true;if(Date.now()-shot.syncStartedAt<1200)window.AIFootballAudio?.whistle?.(shot.cueStartsAt);}
  for(const v of decks)if(v!==target){v.style.opacity='0';v.muted=true;}
  syncShotAudio();
 }
 if(queuedPreparation){const cue=queuedPreparation;queuedPreparation=null;prepareUpcomingShot(cue);}
}
function playShot(){
 if(!shot||!shotVideo)return;
 const target=shotVideo,elapsed=Math.max(0,(Date.now()-shot.syncStartedAt)/1000);
 const duration=Number.isFinite(target.duration)?target.duration:(durationByKey.get(target.dataset.clipKey)||0);
 if(duration>0&&elapsed>=duration){endShot();return;}
 video.pause();
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
function endShot(force=false){
 const previous=shot;
 const sharedPending=!force&&previous&&window.AIFootballTikTok?.onVideoEnded?.(previous.cueStartsAt??previous.syncStartedAt)===true;
 const localPending=!force&&window.AIFootballLocalShotsPending?.()===true;
 if(shot!==previous)return;
 if(shotVideo)shotVideo.pause();shot=null;
 if(sharedPending||localPending){holdingForQueue=true;video.pause();return;}
 holdingForQueue=false;
 for(const deck of decks){deck.pause();deck.style.opacity='0';}
 video.currentTime=0;video.play().catch(()=>{});
}
function beginShot(team,options={}){
 if(!clips[team])return;
 holdingForQueue=false;
 const old=shotVideo;
 const target=spareDeck();
 const key=keyFor(team,options.result);
 assignClip(target,key);
 if(old){old.pause();old.playbackRate=1;}
 target.playbackRate=1;target.style.opacity='0';
 shotVideo=target;
 shot={team,result:options.result,cueStartsAt:options.cueStartsAt??options.startsAt??Date.now(),syncStartedAt:options.startsAt??Date.now()};
 warmedCueKey=null;
 playShot();
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
 if(!shot||!shotVideo||document.hidden||repairing)return;
 const v=shotVideo;
 const expected=Math.max(0,(Date.now()-shot.syncStartedAt)/1000),duration=v.duration;
 if(Number.isFinite(duration)&&expected>=duration)return;
 // Do not repeatedly seek a mobile decoder while it is buffering.
 const drift=expected-v.currentTime;
 if(v.readyState>=3&&!v.seeking){v.playbackRate=Math.abs(drift)>.15?(drift>0?1.03:.97):1;if(Math.abs(drift)>2.5&&(v.paused||Date.now()-lastRepair>4000)){lastRepair=Date.now();try{v.currentTime=Math.min(expected,Math.max(0,duration-.05));}catch{}}}
 if(v.paused){
   repairing=true;v.play().catch(()=>{v.dataset.autoplayMuted='true';v.muted=true;return v.play();}).catch(()=>{}).finally(()=>repairing=false);
 }
 revealCurrent(v);
}
setInterval(maintainShot,500);
setInterval(syncShotAudio,500);
document.addEventListener('pointerdown',()=>{for(const v of decks)delete v.dataset.autoplayMuted;syncShotAudio();if(shot&&shotVideo&&!document.hidden){const target=shotVideo;target.play().catch(()=>{target.dataset.autoplayMuted='true';target.muted=true;target.play().catch(()=>{});});}});
function sync(){
 const epoch=window.AIFootballTikTok?.getClock?.()?.epoch;
 if(!Number.isFinite(epoch)||!video.duration||document.hidden)return;
 video.currentTime=((Date.now()-epoch)/1000%video.duration+video.duration)%video.duration;
}
function startWaitingIfEmpty(){
 if(shot){playShot();return;}
 if(window.AIFootballTikTok?.hasPendingShot?.()||window.AIFootballLocalShotsPending?.()){video.pause();return;}
 sync();video.play().catch(()=>{});
}
video.addEventListener('loadedmetadata',startWaitingIfEmpty);
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
 beginShot,finishShot,
 playTestShot(){if(this.isAnimating||!video.readyState)return false;beginShot('A',{startsAt:Date.now(),result:'save'});return true;},
 async waitForShot(){while(this.isAnimating)await new Promise(r=>setTimeout(r,60));},
 finishSyncedShot(startsAt){if((!shot&&holdingForQueue)||(shot&&(shot.cueStartsAt??shot.syncStartedAt)===startsAt))endShot(true);},
 get isAnimating(){return !!shot;},
 get shotStatus(){return shot?{...shot,phase:'waiting',returnComplete:false}:null;},
 get videoStatus(){return {ready:video.readyState>=2,
   motionReady:video.readyState>=2&&(allKeys.every(key=>durationByKey.has(key)||failedMetadata.has(key))||Date.now()-startup>8000),
   mode:'two-deck-video',shotClipsReady:allKeys.every(key=>durationByKey.has(key)||failedMetadata.has(key)),
   cachedShotClips:0,cacheFailures:failedMetadata.size,metadataProbes:probes.length,deckCount:decks.length};},
 get ready(){return video.readyState>=2;},
 applySettings(value){settings={...settings,...value};syncShotAudio();},
 get settings(){return {...settings};},
 reset(){endShot(true);},configureTeams(){},reloadModels(){},get modelStatus(){return [];}
};
window.addEventListener('ai-football-settings',e=>window.AIFootball3D.applySettings(e.detail||{}));
video.play().catch(()=>{});
})();
