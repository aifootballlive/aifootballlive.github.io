import {Runtime} from './runtime.mjs?v=22';
import {StadiumAudio} from './audio.mjs';
import {kitIcon} from './kit.mjs';
const runtime=new Runtime(),audio=new StadiumAudio();window.footballRuntime=runtime;
let teamSignature='',lastShot=null,lastResult=null,previousScores={},sceneReady=false;
const scoreRoot=document.getElementById('scores');
function render(state){
  const signature=JSON.stringify(state.teams);
  if(signature!==teamSignature){teamSignature=signature;scoreRoot.replaceChildren(...state.teams.map(team=>{const box=document.createElement('div');box.className='team-score';box.dataset.team=team.id;box.setAttribute('aria-label',team.name);box.style.setProperty('--team',team.color);const value=document.createElement('strong');value.textContent=state.scores[team.id]||0;box.append(kitIcon(team),value);return box;}));if(sceneReady)window.AIFootball3D.configureTeams(state.teams);renderControls(state);}
  for(const box of scoreRoot.children){const score=state.scores[box.dataset.team]||0;box.querySelector('strong').textContent=score;if(previousScores[box.dataset.team]!==undefined&&score>previousScores[box.dataset.team]){box.classList.remove('flash');void box.offsetWidth;box.classList.add('flash');}}
  previousScores={...state.scores};document.getElementById('queueCount').textContent=state.eventQueue.length;
  const active=state.animationState,team=state.teams.find(t=>t.id===active?.teamId);
  const phases={turn:'Hazırlanıyor',run:'Topa koşuyor',kick:'Şut!',flight:'Top kaleye gidiyor',outcome:active?.result==='goal'?'GOL!':'Kurtarış!',net:'GOL!',celebrate:active?.result==='goal'?'Gol sevinci':'Kaleci kurtardı',return:'Sıraya dönüyor'};
  document.getElementById('shotStatus').textContent=active?`${team?.name||active.teamId} · ${phases[active.phase]||'Şut'}`:'Oyuncular hazır · Hediye gönder, takımın şut atsın';
  audio.apply(state.audioSettings);
  const audible=state.audioSettings.enabled&&audio.ctx?.state==='running';
  document.getElementById('unlockAudio').textContent=audible?'Sesi kapat':'Sesi aç';
  document.getElementById('unlockAudio').setAttribute('aria-pressed',String(!!audible));
  if(sceneReady&&active&&active.id!==lastShot){lastShot=active.id;window.AIFootball3D.playDemoShot(active);}
  if(!active&&lastShot){lastShot=null;window.AIFootball3D?.reset();}
  if(state.lastResult?.shotId!==lastResult){lastResult=state.lastResult?.shotId;if(state.lastResult&&Date.now()-state.lastResult.at<1000)audio.play(state.lastResult.result==='goal'?'goal':'save');}
}
window.addEventListener('football-scene-ready',()=>{sceneReady=true;window.AIFootball3D.configureTeams(runtime.state.teams);render(runtime.state);});
window.addEventListener('football-scene-phase',({detail})=>{if(detail.phase==='ball')audio.play('kick');if(detail.phase==='net')audio.play('net');});
runtime.addEventListener('state',({detail})=>render(detail));runtime.addEventListener('audioTest',({detail})=>audio.play(detail));runtime.addEventListener('error',({detail})=>{document.getElementById('shotStatus').textContent=detail;});
function renderControls(state){
  const controls=document.getElementById('giftControls');
  controls.replaceChildren(...state.teams.map(team=>{
    const row=document.createElement('div');row.className='gift-team';row.append(kitIcon(team));
    for(const count of [1,5,10]){const b=document.createElement('button');b.textContent=`🎁 ${count} şut`;b.setAttribute('aria-label',`${team.name}: ${count} şut hediyesi`);b.onclick=()=>{
      const mapping=runtime.state.giftMappings.find(g=>g.teamId===team.id);
      if(mapping&&runtime.state.connection.mode==='mock')runtime.command('gift',{giftId:mapping.giftId,count});
      else runtime.command('shot',{teamId:team.id,count});
    };row.append(b);}return row;
  }));
}
document.getElementById('unlockAudio').onclick=async()=>{
  const enabled=runtime.state.audioSettings.enabled&&audio.ctx?.state==='running';
  if(!enabled)await audio.unlock();runtime.command('audio',{enabled:!enabled});
};
document.getElementById('toggleGifts').onclick=()=>{
  const controls=document.getElementById('giftControls');controls.hidden=!controls.hidden;document.body.classList.toggle('tests-hidden',controls.hidden);window.dispatchEvent(new Event('resize'));
  document.getElementById('toggleGifts').textContent=controls.hidden?'Hediye testlerini göster':'Hediye testlerini gizle';
};
runtime.addEventListener('state',({detail})=>{const sig=JSON.stringify(detail.giftMappings);if(sig!==renderControls.signature){renderControls.signature=sig;renderControls(detail);}});
render(runtime.state);
