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
const FADE=.4,LOOP_START=26/24,LOOP_END=15.4;
let standby=video.cloneNode(true),blending=false,blendStarted=0;
standby.id='sceneWaitingStandby';standby.autoplay=false;standby.removeAttribute('autoplay');
for(const v of [video,standby]){v.loop=true;v.muted=true;v.defaultMuted=true;v.playsInline=true;Object.assign(v.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'contain'});}
video.style.zIndex='1';standby.style.zIndex='2';standby.style.opacity='0';stage.append(standby);
const shotVideo=document.createElement('video');shotVideo.id='sceneShotVideo';shotVideo.src='./assets/scene-v110/fb-shot.mp4';shotVideo.preload='auto';shotVideo.muted=true;shotVideo.defaultMuted=true;shotVideo.playsInline=true;shotVideo.setAttribute('playsinline','');Object.assign(shotVideo.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'contain',zIndex:'3',display:'none'});stage.append(shotVideo);
function endShot(){shotVideo.pause();shotVideo.style.display='none';shot=null;resetStandby();video.currentTime=LOOP_START;play();}
function showShot(){if(!shot||shot.team!=='A'||shot.result!=='goal')return;const elapsed=Math.max(0,(Date.now()-shot.syncStartedAt)/1000);if(elapsed>=8){endShot();return;}video.pause();resetStandby();shotVideo.currentTime=elapsed;shotVideo.style.display='block';shotVideo.play().catch(()=>{});}
shotVideo.addEventListener('ended',endShot);
const play=()=>video.play().catch(()=>{});
function resetStandby(){standby.pause();standby.currentTime=LOOP_START;standby.style.opacity='0';standby.style.zIndex='2';video.style.opacity='1';video.style.zIndex='1';blending=false;}
function sync(){const epoch=window.AIFootballTikTok?.getClock?.()?.epoch;if(!Number.isFinite(epoch)||!video.duration||document.hidden)return;resetStandby();const period=LOOP_END-LOOP_START-FADE;video.currentTime=LOOP_START+((Date.now()-epoch)/1000%period+period)%period;}
video.addEventListener('loadedmetadata',()=>{video.currentTime=LOOP_START;sync();play();});
standby.addEventListener('loadedmetadata',()=>{standby.currentTime=LOOP_START;});
document.addEventListener('visibilitychange',()=>{if(document.hidden){video.pause();standby.pause();shotVideo.pause();}else if(shot?.result==='goal'&&shot.team==='A'){showShot();}else{resetStandby();sync();play();}});
window.addEventListener('pageshow',()=>{if(shot?.result==='goal'&&shot.team==='A')showShot();else{sync();play();}});
function frame(){
 if(shot&&Date.now()>=shot.endsAt)endShot();
 if(!document.hidden&&shotVideo.style.display==='none'&&video.readyState>=2&&video.duration){
  if(!blending&&video.currentTime>=LOOP_END-FADE&&standby.readyState>=2){blending=true;blendStarted=performance.now();standby.play().catch(()=>{blending=false;});}
  if(blending&&performance.now()-blendStarted>1500&&standby.currentTime<LOOP_START+FADE){resetStandby();}
  if(blending){
   const progress=Math.max(0,Math.min(1,(standby.currentTime-LOOP_START)/FADE));
   standby.style.opacity=String(progress*progress*(3-2*progress));
   if(progress>=1){const old=video;video=standby;standby=old;video.id='sceneWaitingVideo';standby.id='sceneWaitingStandby';resetStandby();}
  }else if(video.ended&&standby.readyState>=2){blending=true;blendStarted=performance.now();standby.play().catch(()=>{});}
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// No legacy character, ball or goalkeeper animation while shot clips are pending.
window.AIFootball3D={
getShotTiming:team=>({outcomeMs:team==='A'?3000:1850}),
beginShot(team,options={}){shot={team,syncStartedAt:options.startsAt||Date.now(),endsAt:(options.startsAt||Date.now())+(team==='A'?4155:1850)+1200};},
finishShot(team,result){if(shot?.team===team){shot.result=result;if(team==='A'&&result==='goal'){shot.endsAt=shot.syncStartedAt+8000;showShot();}}},
async waitForShot(){while(this.isAnimating)await new Promise(r=>setTimeout(r,60));},
finishSyncedShot(startsAt){if(shot?.syncStartedAt===startsAt)endShot();},
get isAnimating(){if(shot&&Date.now()>=shot.endsAt)endShot();return !!shot;},
get shotStatus(){return this.isAnimating?{...shot,phase:'waiting',returnComplete:false}:null;},
get videoStatus(){return {ready:video.readyState>=2,motionReady:video.readyState>=2&&shotVideo.readyState>=2,mode:'unified-video',shotClipsReady:true};},
get ready(){return video.readyState>=2;},applySettings(value){settings={...settings,...value};},get settings(){return {...settings};},reset(){endShot();},configureTeams(){},reloadModels(){},get modelStatus(){return [];}
};
window.addEventListener('ai-football-settings',e=>window.AIFootball3D.applySettings(e.detail||{}));play();
})();

