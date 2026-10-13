/* Unified stadium video. Keeps the shared-match presentation contract. */
(()=>{
'use strict';
let shot=null,settings={};
const stage=document.createElement('div');stage.id='game3dStage';
const video=document.createElement('video');video.id='sceneWaitingVideo';
video.src='./assets/scene-v105/waiting.mp4';video.autoplay=true;video.loop=true;video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='auto';
video.setAttribute('playsinline','');video.setAttribute('aria-label','Dört futbolcu ve kaleci bekleme videosu');stage.append(video);
document.querySelector('.wrap').prepend(stage);
const sound=document.getElementById('soundEnable');if(sound)document.getElementById('matchControls')?.append(sound);
const play=()=>video.play().catch(()=>{});
function sync(){const epoch=window.AIFootballTikTok?.getClock?.()?.epoch;if(!Number.isFinite(epoch)||!video.duration||document.hidden)return;const target=((Date.now()-epoch)/1000%video.duration+video.duration)%video.duration;const delta=Math.abs(video.currentTime-target);if(Math.min(delta,video.duration-delta)>.3)video.currentTime=target;}
video.addEventListener('loadedmetadata',()=>{sync();play();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){sync();play();}});
window.addEventListener('pageshow',()=>{sync();play();});// Align only on load/resume. Never seek during uninterrupted playback.
// No legacy character, ball or goalkeeper animation while shot clips are pending.
window.AIFootball3D={
getShotTiming:team=>({outcomeMs:team==='A'?4155:1850}),
beginShot(team,options={}){shot={team,syncStartedAt:options.startsAt||Date.now(),endsAt:(options.startsAt||Date.now())+(team==='A'?4155:1850)+1200};},
finishShot(team,result){if(shot?.team===team)shot.result=result;},
async waitForShot(){while(this.isAnimating)await new Promise(r=>setTimeout(r,60));},
finishSyncedShot(startsAt){if(shot?.syncStartedAt===startsAt)shot=null;},
get isAnimating(){if(shot&&Date.now()>=shot.endsAt)shot=null;return !!shot;},
get shotStatus(){return this.isAnimating?{...shot,phase:'waiting',returnComplete:false}:null;},
get videoStatus(){return {ready:video.readyState>=2,motionReady:video.readyState>=2,mode:'unified-idle',shotClipsReady:false};},
get ready(){return video.readyState>=2;},applySettings(value){settings={...settings,...value};},get settings(){return {...settings};},reset(){shot=null;},configureTeams(){},reloadModels(){},get modelStatus(){return [];}
};
window.addEventListener('ai-football-settings',e=>window.AIFootball3D.applySettings(e.detail||{}));play();
})();
