/* Unified stadium video. Keeps the shared-match presentation contract. */
(()=>{
'use strict';
let shot=null,settings={};
const stage=document.createElement('div');stage.id='game3dStage';
let video=document.createElement('video');video.id='sceneWaitingVideo';
video.src='./assets/scene-v105/waiting.mp4';video.autoplay=true;video.loop=true;video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='auto';
video.setAttribute('playsinline','');video.setAttribute('aria-label','Dört futbolcu ve kaleci bekleme videosu');stage.append(video);
document.querySelector('.wrap').prepend(stage);
const sound=document.getElementById('soundEnable');if(sound)document.getElementById('matchControls')?.append(sound);
// Blend the original file in two layers; no transcoding or resolution changes.
const FADE=.18;
let standby=video.cloneNode(true),blending=false,blendStarted=0;
standby.id='sceneWaitingStandby';standby.autoplay=false;standby.removeAttribute('autoplay');
for(const v of [video,standby]){v.loop=true;v.muted=true;v.defaultMuted=true;v.playsInline=true;Object.assign(v.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'contain'});}
video.style.zIndex='1';standby.style.zIndex='2';standby.style.opacity='0';stage.append(standby);
const play=()=>video.play().catch(()=>{});
function resetStandby(){standby.pause();standby.currentTime=0;standby.style.opacity='0';standby.style.zIndex='2';video.style.opacity='1';video.style.zIndex='1';blending=false;}
function sync(){const epoch=window.AIFootballTikTok?.getClock?.()?.epoch;if(!Number.isFinite(epoch)||!video.duration||document.hidden)return;resetStandby();const period=video.duration-FADE;video.currentTime=((Date.now()-epoch)/1000%period+period)%period;}
video.addEventListener('loadedmetadata',()=>{sync();play();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){video.pause();standby.pause();}else{resetStandby();sync();play();}});
window.addEventListener('pageshow',()=>{sync();play();});
function frame(){
 if(!document.hidden&&video.readyState>=2&&video.duration){
  if(!blending&&video.currentTime>=video.duration-FADE&&standby.readyState>=2){blending=true;blendStarted=performance.now();standby.play().catch(()=>{blending=false;});}
  if(blending&&performance.now()-blendStarted>1500&&standby.currentTime<FADE){resetStandby();}
  if(blending){
   const progress=Math.min(1,standby.currentTime/FADE);
   standby.style.opacity=String(progress*progress*(3-2*progress));
   if(progress>=1){const old=video;video=standby;standby=old;video.id='sceneWaitingVideo';standby.id='sceneWaitingStandby';resetStandby();}
  }else if(video.ended&&standby.readyState>=2){blending=true;blendStarted=performance.now();standby.play().catch(()=>{});}
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
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

