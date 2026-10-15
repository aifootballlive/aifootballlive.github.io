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
// Use the clip's original audio and the existing admin mute/master/effects controls.
function syncShotAudio(){const audio=window.AIFootballAudio;const cfg={...(window.__AI_FOOTBALL_SETTINGS||{}),...(audio?.settings||{})};shotVideo.volume=Math.max(0,Math.min(1,(Number(cfg.soundMaster??88)/100)*(Number(cfg.soundEffects??92)/100)));shotVideo.muted=!(audio?.enabled&&cfg.soundEnabled!==false);}
setInterval(syncShotAudio,100);
function endShot(){shotVideo.pause();shotVideo.style.display='none';shot=null;resetStandby();video.currentTime=LOOP_START;play();}
function showShot(){if(!shot)return;const elapsed=Math.max(0,(Date.now()-shot.syncStartedAt)/1000);if(elapsed>=(shotVideo.duration||10)){endShot();return;}video.pause();resetStandby();shotVideo.currentTime=elapsed;shotVideo.style.display='block';syncShotAudio();shotVideo.play().catch(()=>{shotVideo.muted=true;shotVideo.play().catch(()=>{});});}
for(const v of Object.values(shotVideos))v.addEventListener('ended',()=>{if(v===shotVideo)endShot();});
const play=()=>video.play().catch(()=>{});
function resetStandby(){} // Legacy shot return hook; the full 40-second clip loops natively.
function sync(){const epoch=window.AIFootballTikTok?.getClock?.()?.epoch;if(!Number.isFinite(epoch)||!video.duration||document.hidden)return;video.currentTime=((Date.now()-epoch)/1000%video.duration+video.duration)%video.duration;}
video.addEventListener('loadedmetadata',()=>{sync();play();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){video.pause();shotVideo.pause();}else if(shot){showShot();}else{resetStandby();sync();play();}});
window.addEventListener('pageshow',()=>{if(shot)showShot();else{sync();play();}});
function frame(){if(shot&&Date.now()>=shot.endsAt)endShot();requestAnimationFrame(frame);}
requestAnimationFrame(frame);
// No legacy character, ball or goalkeeper animation while shot clips are pending.
window.AIFootball3D={
getShotTiming:team=>({outcomeMs:team==='A'?5000:5500}),
beginShot(team,options={}){if(!shotVideos[team])return;shotVideo.pause();shotVideo.style.display='none';shotVideo=shotVideos[team];shot={team,syncStartedAt:options.startsAt||Date.now(),endsAt:(options.startsAt||Date.now())+Math.round((shotVideo.duration||10)*1000)};showShot();},
finishShot(team,result){if(shot?.team===team){shot.result=result;}},
playTestShot(){if(this.isAnimating||shotVideo.readyState<2)return false;this.beginShot('A',{startsAt:Date.now()});return true;},
async waitForShot(){while(this.isAnimating)await new Promise(r=>setTimeout(r,60));},
finishSyncedShot(startsAt){if(shot?.syncStartedAt===startsAt)endShot();},
get isAnimating(){if(shot&&Date.now()>=shot.endsAt)endShot();return !!shot;},
get shotStatus(){return this.isAnimating?{...shot,phase:'waiting',returnComplete:false}:null;},
get videoStatus(){return {ready:video.readyState>=2,motionReady:video.readyState>=2&&Object.values(shotVideos).every(v=>v.readyState>=2),mode:'unified-video',shotClipsReady:true};},
get ready(){return video.readyState>=2;},applySettings(value){settings={...settings,...value};},get settings(){return {...settings};},reset(){endShot();},configureTeams(){},reloadModels(){},get modelStatus(){return [];}
};
window.addEventListener('ai-football-settings',e=>window.AIFootball3D.applySettings(e.detail||{}));play();
})();

