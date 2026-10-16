/* Unified stadium video. Keeps the shared-match presentation contract. */
(()=>{
'use strict';
let shot=null,settings={};
const stage=document.createElement('div');stage.id='game3dStage';
let video=document.createElement('video');video.id='sceneWaitingVideo';
video.src='./assets/scene-v111/waiting.mp4';video.autoplay=true;video.loop=true;video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='auto';
video.setAttribute('playsinline','');video.setAttribute('aria-label','Dört futbolcu ve kaleci bekleme videosu');stage.append(video);
document.querySelector('.wrap').prepend(stage);
const sound=document.getElementById('soundEnable');if(sound)document.getElementById('matchControls')?.append(sound);
const LOOP_START=0;
Object.assign(video.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'contain',zIndex:'1'});
let shotVideo=document.createElement('video');shotVideo.id='sceneShotVideo';shotVideo.src='./assets/scene-v112/fb-shot.mp4';shotVideo.preload='auto';shotVideo.muted=true;shotVideo.defaultMuted=true;shotVideo.playsInline=true;shotVideo.setAttribute('playsinline','');Object.assign(shotVideo.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'contain',zIndex:'3',display:'none'});stage.append(shotVideo);
const fbShotVideo=shotVideo,gsShotVideo=shotVideo.cloneNode(true);gsShotVideo.id='sceneGSShotVideo';gsShotVideo.src='./assets/scene-v116/gs-shot.mp4';gsShotVideo.muted=true;gsShotVideo.defaultMuted=true;stage.append(gsShotVideo);
const shotVideos={A:fbShotVideo,B:gsShotVideo};
const fbGoalVideo=fbShotVideo.cloneNode(true);fbGoalVideo.id='sceneFBGoalVideo';fbGoalVideo.src='./assets/scene-v110/fb-shot.mp4';fbGoalVideo.muted=true;fbGoalVideo.defaultMuted=true;stage.append(fbGoalVideo);
const tsShotVideo=fbShotVideo.cloneNode(true);tsShotVideo.id='sceneTSShotVideo';tsShotVideo.src='./assets/scene-v123/ts-save.mp4';tsShotVideo.muted=true;tsShotVideo.defaultMuted=true;stage.append(tsShotVideo);shotVideos.D=tsShotVideo;
const bjkShotVideo=fbShotVideo.cloneNode(true);bjkShotVideo.id='sceneBJKShotVideo';bjkShotVideo.src='./assets/scene-v125/bjk-save.mp4';bjkShotVideo.muted=true;bjkShotVideo.defaultMuted=true;stage.append(bjkShotVideo);shotVideos.C=bjkShotVideo;
const gsGoalVideo=gsShotVideo.cloneNode(true);gsGoalVideo.id='sceneGSGoalVideo';gsGoalVideo.src='./assets/scene-v126/gs-goal.mp4';gsGoalVideo.muted=true;gsGoalVideo.defaultMuted=true;stage.append(gsGoalVideo);
const bjkGoalVideo=bjkShotVideo.cloneNode(true);bjkGoalVideo.id='sceneBJKGoalVideo';bjkGoalVideo.src='./assets/scene-v132/bjk-goal.mp4';bjkGoalVideo.muted=true;bjkGoalVideo.defaultMuted=true;stage.append(bjkGoalVideo);
const tsGoalVideo=tsShotVideo.cloneNode(true);tsGoalVideo.id='sceneTSGoalVideo';tsGoalVideo.src='./assets/scene-v140/ts-goal.mp4';tsGoalVideo.muted=true;tsGoalVideo.defaultMuted=true;stage.append(tsGoalVideo);
const allShotVideos=[fbShotVideo,gsShotVideo,fbGoalVideo,tsShotVideo,bjkShotVideo,gsGoalVideo,bjkGoalVideo,tsGoalVideo];
// Mobile browsers may ignore preload=auto and keep only metadata for hidden clips.
// Cache the four BJK/TS clips fully before making the shot player available.
for(const clip of [bjkShotVideo,tsShotVideo,bjkGoalVideo,tsGoalVideo])clip.preload='metadata';
const cachedClips=new Set(),cacheFailures=new Set(),clipCacheURLs=[];
const cacheQueue=[bjkShotVideo,tsShotVideo,bjkGoalVideo,tsGoalVideo];
async function cacheWorker(){while(cacheQueue.length){const clip=cacheQueue.shift();try{const response=await fetch(clip.src,{cache:'force-cache',signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error('Video HTTP '+response.status);const blob=await response.blob();if(!blob.size)throw Error('Empty video');const url=URL.createObjectURL(blob.type==='video/mp4'?blob:new Blob([blob],{type:'video/mp4'}));clipCacheURLs.push(url);clip.src=url;clip.load();cachedClips.add(clip);}catch(error){cacheFailures.add(clip);console.warn('Video cache fallback:',clip.id,error.message);}}}
cacheWorker();cacheWorker();
const protectedClips=[bjkShotVideo,tsShotVideo,bjkGoalVideo,tsGoalVideo];
const selectClip=(team,result)=>team==='A'&&result==='goal'?fbGoalVideo:team==='B'&&result==='goal'?gsGoalVideo:team==='C'&&result==='goal'?bjkGoalVideo:team==='D'&&result==='goal'?tsGoalVideo:shotVideos[team];
// Trigger celebration from the displayed video frame, never from wall-clock timers.
const goalMoments={A:3.4,B:3.8,C:4.0,D:3.35};
const celebratedShots=new Set();
function checkGoalMoment(v,time){if(!shot||v!==shotVideo||shot.result!=='goal')return;const moment=goalMoments[shot.team];if(!Number.isFinite(moment)||time<moment)return;const key=shot.cueStartsAt??shot.syncStartedAt;if(celebratedShots.has(key))return;celebratedShots.add(key);if(celebratedShots.size>256)celebratedShots.delete(celebratedShots.values().next().value);window.celebrateGoal?.(shot.team);}
for(const v of allShotVideos){if(v.requestVideoFrameCallback){const frame=(_,meta)=>{checkGoalMoment(v,meta.mediaTime);v.requestVideoFrameCallback(frame);};v.requestVideoFrameCallback(frame);}else v.addEventListener('timeupdate',()=>checkGoalMoment(v,v.currentTime));}
// Use the clip's original audio and the existing admin mute/master/effects controls.
function syncShotAudio(){const audio=window.AIFootballAudio;const cfg={...(window.__AI_FOOTBALL_SETTINGS||{}),...(audio?.settings||{})};shotVideo.volume=Math.max(0,Math.min(1,(Number(cfg.soundMaster??88)/100)*(Number(cfg.soundEffects??92)/100)));shotVideo.muted=!(audio?.enabled&&cfg.soundEnabled!==false);}
setInterval(syncShotAudio,100);
function endShot(force=false){if(!force&&shot&&window.AIFootballTikTok?.onVideoEnded?.(shot.cueStartsAt??shot.syncStartedAt))return;shotVideo.pause();shotVideo.style.display='none';shot=null;resetStandby();video.currentTime=LOOP_START;play();}
function showShot(){if(!shot)return;const elapsed=Math.max(0,(Date.now()-shot.syncStartedAt)/1000);if(elapsed>=(shotVideo.duration||10)){endShot();return;}video.pause();resetStandby();lastRepair=Date.now();shotVideo.currentTime=elapsed;shotVideo.style.display='block';syncShotAudio();shotVideo.play().catch(()=>{shotVideo.muted=true;shotVideo.play().catch(()=>{});});}
// Recover a suspended mobile decoder and keep the displayed frame on the shared clock.
let repairing=false,lastRepair=0;
function maintainShot(){
 if(!shot||document.hidden||repairing||shotVideo.ended)return;
 const v=shotVideo,expected=Math.max(0,(Date.now()-shot.syncStartedAt)/1000),duration=v.duration;
 if(!Number.isFinite(duration)||expected>=duration)return;
 if(v.readyState>=2&&!v.seeking&&Math.abs(v.currentTime-expected)>.6&&Date.now()-lastRepair>1000){lastRepair=Date.now();v.currentTime=Math.min(expected,Math.max(0,duration-.05));}
 if(v.paused){repairing=true;v.play().catch(()=>{v.muted=true;return v.play();}).catch(()=>{}).finally(()=>repairing=false);}
}
setInterval(maintainShot,250);
for(const v of allShotVideos)for(const event of ['canplay','loadeddata'])v.addEventListener(event,()=>{if(v===shotVideo)maintainShot();});
for(const v of allShotVideos)v.addEventListener('ended',()=>{if(v===shotVideo)endShot();});
const play=()=>video.play().catch(()=>{});
function resetStandby(){} // Legacy shot return hook; the full 40-second clip loops natively.
function sync(){const epoch=window.AIFootballTikTok?.getClock?.()?.epoch;if(!Number.isFinite(epoch)||!video.duration||document.hidden)return;video.currentTime=((Date.now()-epoch)/1000%video.duration+video.duration)%video.duration;}
video.addEventListener('loadedmetadata',()=>{sync();play();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){video.pause();shotVideo.pause();}else if(shot){showShot();}else{resetStandby();sync();play();}});
window.addEventListener('pageshow',()=>{if(shot)showShot();else{sync();play();}});

// No legacy character, ball or goalkeeper animation while shot clips are pending.
window.AIFootball3D={
getShotTiming(team,result){const clip=selectClip(team,result);return {outcomeMs:result==='goal'&&goalMoments[team]?Math.round(goalMoments[team]*1000):team==='A'?5000:5500,durationMs:Math.round((clip?.duration||(team==='B'?14:result==='goal'?8:10))*1000)};},
beginShot(team,options={}){if(!shotVideos[team])return;shotVideo.pause();shotVideo.style.display='none';shotVideo=selectClip(team,options.result);shot={team,result:options.result,cueStartsAt:options.cueStartsAt??options.startsAt??Date.now(),syncStartedAt:options.startsAt||Date.now(),endsAt:(options.startsAt||Date.now())+Math.round((shotVideo.duration||10)*1000)};showShot();},
finishShot(team,result){if(shot?.team===team){shot.result=result;const clip=selectClip(team,result);if(clip!==shotVideo){shotVideo.pause();shotVideo.style.display='none';shotVideo=clip;shot.endsAt=shot.syncStartedAt+Math.round((clip.duration||8)*1000);showShot();}}},
playTestShot(){if(this.isAnimating||shotVideo.readyState<2)return false;this.beginShot('A',{startsAt:Date.now()});return true;},
async waitForShot(){while(this.isAnimating)await new Promise(r=>setTimeout(r,60));},
finishSyncedShot(startsAt){if((shot?.cueStartsAt??shot?.syncStartedAt)===startsAt)endShot(true);},
get isAnimating(){return !!shot;},
get shotStatus(){return this.isAnimating?{...shot,phase:'waiting',returnComplete:false}:null;},
get videoStatus(){return {ready:video.readyState>=2,motionReady:video.readyState>=2&&allShotVideos.every(v=>v.readyState>=1)&&protectedClips.every(v=>cachedClips.has(v)||cacheFailures.has(v)),mode:'unified-video',shotClipsReady:protectedClips.every(v=>cachedClips.has(v)),cachedShotClips:cachedClips.size,cacheFailures:cacheFailures.size};},
get ready(){return video.readyState>=2;},applySettings(value){settings={...settings,...value};},get settings(){return {...settings};},reset(){endShot(true);},configureTeams(){},reloadModels(){},get modelStatus(){return [];}
};
window.addEventListener('ai-football-settings',e=>window.AIFootball3D.applySettings(e.detail||{}));play();
})();

