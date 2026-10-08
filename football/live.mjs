import {Runtime} from './runtime.mjs';
import {StadiumAudio} from './audio.mjs';
const runtime=new Runtime(),audio=new StadiumAudio();window.footballRuntime=runtime;
let teamSignature='',lastShot=null,lastResult=null,previousScores={},sceneReady=false;
const scoreRoot=document.getElementById('scores');
function render(state){
  const signature=JSON.stringify(state.teams);
  if(signature!==teamSignature){teamSignature=signature;scoreRoot.replaceChildren(...state.teams.map(team=>{const box=document.createElement('div');box.className='team-score';box.dataset.team=team.id;box.style.setProperty('--team',team.color);const name=document.createElement('span');name.textContent=team.name;const value=document.createElement('strong');value.textContent=state.scores[team.id]||0;box.append(name,value);return box;}));if(sceneReady)window.AIFootball3D.configureTeams(state.teams);}
  for(const box of scoreRoot.children){const score=state.scores[box.dataset.team]||0;box.querySelector('strong').textContent=score;if(previousScores[box.dataset.team]!==undefined&&score>previousScores[box.dataset.team]){box.classList.remove('flash');void box.offsetWidth;box.classList.add('flash');}}
  previousScores={...state.scores};document.getElementById('queueCount').textContent=state.eventQueue.length;
  const active=state.animationState,team=state.teams.find(t=>t.id===active?.teamId);
  const phases={turn:'Hazırlanıyor',run:'Topa koşuyor',kick:'Şut!',flight:'Top kaleye gidiyor',outcome:active?.result==='goal'?'GOL!':'Kurtarış!',net:'GOL!',celebrate:active?.result==='goal'?'Gol sevinci':'Kaleci kurtardı',return:'Sıraya dönüyor'};
  document.getElementById('shotStatus').textContent=active?`${team?.name||active.teamId} · ${phases[active.phase]||'Şut'}`:'Oyuncular hazır · Hediye gönder, takımın şut atsın';
  audio.apply(state.audioSettings);
  if(sceneReady&&active&&active.id!==lastShot){lastShot=active.id;window.AIFootball3D.playDemoShot(active);}
  if(!active&&lastShot){lastShot=null;window.AIFootball3D?.reset();}
  if(state.lastResult?.shotId!==lastResult){lastResult=state.lastResult?.shotId;if(state.lastResult&&Date.now()-state.lastResult.at<1000)audio.play(state.lastResult.result==='goal'?'goal':'save');}
}
window.addEventListener('football-scene-ready',()=>{sceneReady=true;window.AIFootball3D.configureTeams(runtime.state.teams);render(runtime.state);});
window.addEventListener('football-scene-phase',({detail})=>{if(detail.phase==='ball')audio.play('kick');if(detail.phase==='net')audio.play('net');});
runtime.addEventListener('state',({detail})=>render(detail));runtime.addEventListener('audioTest',({detail})=>audio.play(detail));runtime.addEventListener('error',({detail})=>{document.getElementById('shotStatus').textContent=detail;});
document.getElementById('unlockAudio').onclick=async()=>{await audio.unlock();runtime.command('audio',{enabled:true});document.getElementById('unlockAudio').hidden=true;};
render(runtime.state);
