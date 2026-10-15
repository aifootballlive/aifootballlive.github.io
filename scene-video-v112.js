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
const shotVideo=document.createElement('video');shotVideo.id='sceneShotVideo';shotVideo.src='./assets/scene-v112/fb-shot.mp4';shotVideo.preload='auto';shotVideo.muted=true;shotVideo.defaultMuted=true;shotVideo.playsInline=true;shotVideo.setAttribute('playsinline','');Object.assign(shotVideo.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'contain',zIndex:'3',display:'none'});stage.append(shotVideo);
function endShot(){shotVideo.pause();shotVideo.style.display='none';shot=null;resetStandby();video.currentTime=LOOP_START;play();}
function showShot(){if(!shot||shot.team!=='A')return;const elapsed=Math.max(0,(Date.now()-shot.syncStartedAt)/1000);if(elapsed>=(shotVideo.duration||10)){endShot();return;}video.pause();resetStandby();shotVideo.currentTime=elapsed;shotVideo.style.display='block';shotVideo.play().catch(()=>{});}
shotVideo.addEventListener('ended',endShot);
const play=()=>video.play().catch(()=>{});
function resetStandby(){} // Legacy shot return hook; the full 40-second clip loops natively.
function sync(){const epoch=window.AIFootballTikTok?.getClock?.()?.epoch;if(!Number.isFinite(epoch)||!video.duration||document.hidden)return;video.currentTime=((Date.now()-epoch)/1000%video.duration+video.duration)%video.duration;}
video.addEventListener('loadedmetadata',()=>{sync();play();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){video.pause();shotVideo.pause();}else if(shot?.team==='A'){showShot();}else{resetStandby();sync();play();}});
window.addEventListener('pageshow',()=>{if(shot?.team==='A')showShot();else{sync();play();}});
function frame(){if(shot&&Date.now()>=shot.endsAt)endShot();requestAnimationFrame(frame);}
requestAnimationFrame(frame);
// No legacy character, ball or goalkeeper animation while shot clips are pending.
window.AIFootball3D={
getShotTiming:team=>({outcomeMs:team==='A'?5000:1850}),
beginShot(team,options={}){shot={team,syncStartedAt:options.startsAt||Date.now(),endsAt:(options.startsAt||Date.now())+(team==='A'?Math.round((shotVideo.duration||10)*1000):3050)};if(team==='A')showShot();},
finishShot(team,result){if(shot?.team===team){shot.result=result;}},
playTestShot(){if(this.isAnimating||shotVideo.readyState<2)return false;this.beginShot('A',{startsAt:Date.now()});return true;},
async waitForShot(){while(this.isAnimating)await new Promise(r=>setTimeout(r,60));},
finishSyncedShot(startsAt){if(shot?.syncStartedAt===startsAt)endShot();},
get isAnimating(){if(shot&&Date.now()>=shot.endsAt)endShot();return !!shot;},
get shotStatus(){return this.isAnimating?{...shot,phase:'waiting',returnComplete:false}:null;},
get videoStatus(){return {ready:video.readyState>=2,motionReady:video.readyState>=2&&shotVideo.readyState>=2,mode:'unified-video',shotClipsReady:true};},
get ready(){return video.readyState>=2;},applySettings(value){settings={...settings,...value};},get settings(){return {...settings};},reset(){endShot();},configureTeams(){},reloadModels(){},get modelStatus(){return [];}
};
const testButton=document.createElement('button');testButton.type='button';testButton.className='giftbtn shotTest';testButton.textContent='ŞUT DENE';testButton.style.cssText='background:#315fff;width:100%;height:24px;min-height:24px;margin-top:3px;font-size:9px';testButton.title='Skoru değiştirmeden bu cihazda videoyu dene';testButton.onclick=()=>window.AIFootball3D.playTestShot();document.querySelector('.broadcastControls .panel')?.append(testButton);
window.addEventListener('ai-football-settings',e=>window.AIFootball3D.applySettings(e.detail||{}));play();
})();

