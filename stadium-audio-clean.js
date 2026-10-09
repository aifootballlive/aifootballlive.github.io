(()=>{
'use strict';
let ctx=null,master=null,teamTimer=null,currentTeam=null,enabled=false,lastGoalAt=0,nativeGoalSound=null;
let crowdSource=null,crowdGain=null,crowdLfo=null,crowdLfoGain=null;
let settings={soundMaster:88,soundCrowd:72,soundEffects:92,soundGoal:100,soundEnabled:true,crowdEnabled:true,announcerEnabled:true};
const $=id=>document.getElementById(id);
const has3d=()=>!!document.getElementById('game3dStage');
const clamp01=v=>Math.max(0,Math.min(1,Number(v)||0));
const pct=(v,fallback)=>clamp01((Number.isFinite(Number(v))?Number(v):fallback)/100);
function readSettings(next){
  const src=next||window.__AI_FOOTBALL_SETTINGS||{};
  settings={...settings,...src};
}
function refreshVolumes(){
  if(master)master.gain.value=.86*pct(settings.soundMaster,88);
  if(crowdGain)crowdGain.gain.value=.075*pct(settings.soundCrowd,72);
}
function ensureButton(){
  let b=$('soundEnable');if(b)return b;
  b=document.createElement('button');b.id='soundEnable';b.textContent='SESİ AÇ';
  Object.assign(b.style,{position:'fixed',right:'10px',bottom:'10px',zIndex:'500',border:'1px solid #6f84c5',background:'#1f315c',color:'#fff',borderRadius:'10px',padding:'10px 12px',fontWeight:'900',fontSize:'11px',boxShadow:'0 6px 22px rgba(0,0,0,.35)'});
  b.onclick=toggleSound;document.body.appendChild(b);return b;
}
function patchNativeGoalSound(){
  if(nativeGoalSound||typeof window.playGoalSound!=='function')return;
  nativeGoalSound=window.playGoalSound;
  window.playGoalSound=function(){if(!enabled)return;};
}
function noiseBuffer(seconds=2){
  const rate=ctx.sampleRate,len=Math.max(1,Math.floor(rate*seconds)),buffer=ctx.createBuffer(1,len,rate),data=buffer.getChannelData(0);
  for(let i=0;i<len;i++)data[i]=(Math.random()*2-1);
  return buffer;
}
function startCrowd(){
  if(!enabled||!ctx||crowdSource||!settings.crowdEnabled)return;
  crowdSource=ctx.createBufferSource();crowdSource.buffer=noiseBuffer(3);crowdSource.loop=true;
  const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=720;filter.Q.value=.42;
  const low=ctx.createBiquadFilter();low.type='lowpass';low.frequency.value=2500;
  crowdGain=ctx.createGain();crowdGain.gain.value=.075*pct(settings.soundCrowd,72);
  crowdLfo=ctx.createOscillator();crowdLfo.frequency.value=.085;
  crowdLfoGain=ctx.createGain();crowdLfoGain.gain.value=.019*pct(settings.soundCrowd,72);
  crowdLfo.connect(crowdLfoGain);crowdLfoGain.connect(crowdGain.gain);
  crowdSource.connect(filter);filter.connect(low);low.connect(crowdGain);crowdGain.connect(master);
  crowdSource.start();crowdLfo.start();
}
function stopCrowd(){
  try{crowdSource?.stop();crowdLfo?.stop()}catch(e){}
  crowdSource=null;crowdGain=null;crowdLfo=null;crowdLfoGain=null;
}
async function enableSound(){
  try{
    readSettings();if(!settings.soundEnabled)return;
    patchNativeGoalSound();
    if(!ctx)ctx=new(window.AudioContext||window.webkitAudioContext)();
    if(ctx.state==='suspended')await ctx.resume();
    if(!master){master=ctx.createGain();master.connect(ctx.destination)}
    enabled=true;window.__aiFootballSoundEnabled=true;refreshVolumes();if(settings.crowdEnabled)startCrowd();
    const b=ensureButton();b.textContent='SESİ KAPAT';b.style.background='#8e2f44';
  }catch(e){console.error('Ses açılamadı',e)}
}
function disableSound(){
  enabled=false;window.__aiFootballSoundEnabled=false;stopTeamMusic();stopCrowd();
  try{if(master)master.gain.value=0}catch(e){}
  try{if(ctx&&ctx.state==='running')ctx.suspend()}catch(e){}
  try{if('speechSynthesis' in window)speechSynthesis.cancel()}catch(e){}
  const b=ensureButton();b.textContent='SESİ AÇ';b.style.background='#1f315c';
}
async function toggleSound(){
  if(enabled){settings.soundEnabled=false;disableSound()}
  else{settings.soundEnabled=true;await enableSound()}
}
function tone(freq,at,dur=.16,vol=.045,type='sine',gainGroup='effects'){
  if(!enabled||!ctx)return;
  const factor=(gainGroup==='goal'?pct(settings.soundGoal,100):pct(settings.soundEffects,92))*1.10;
  const o=ctx.createOscillator(),g=ctx.createGain(),now=ctx.currentTime+at;
  o.type=type;o.frequency.value=freq;
  g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(Math.max(.0001,vol*factor),now+.008);g.gain.exponentialRampToValueAtTime(.0001,now+dur);
  o.connect(g);g.connect(master);o.start(now);o.stop(now+dur+.03);
}
function noiseBurst(at=0,dur=.08,vol=.07,freq=900,type='bandpass',gainGroup='effects'){
  if(!enabled||!ctx)return;
  const factor=(gainGroup==='goal'?pct(settings.soundGoal,100):pct(settings.soundEffects,92))*1.10;
  const s=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain(),now=ctx.currentTime+at;
  s.buffer=noiseBuffer(Math.max(.12,dur+.04));filter.type=type;filter.frequency.value=freq;filter.Q.value=.65;
  g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(Math.max(.0001,vol*factor),now+.006);g.gain.exponentialRampToValueAtTime(.0001,now+dur);
  s.connect(filter);filter.connect(g);g.connect(master);s.start(now);s.stop(now+dur+.04);
}
function kick(at=0){noiseBurst(at,.075,.18,240,'lowpass');noiseBurst(at+.004,.038,.075,1500,'bandpass');tone(86,at,.15,.16,'sine');tone(178,at+.010,.09,.060,'triangle')}
function bounce(at=0,scale=1){noiseBurst(at,.05,.062*scale,1200,'bandpass');tone(155,at,.07,.048*scale,'sine')}
function netHit(){noiseBurst(0,.14,.065,1500,'highpass');bounce(.05,.8);bounce(.22,.52);bounce(.40,.32)}
function saveSound(){noiseBurst(0,.10,.09,520,'bandpass');tone(145,0,.17,.067,'triangle');bounce(.16,.72)}
function cheer(){
  if(!enabled||!ctx)return;
  noiseBurst(0,.9,.11,1050,'bandpass','goal');noiseBurst(.18,1.25,.08,1650,'bandpass','goal');
  if(crowdGain&&settings.crowdEnabled){
    const base=.075*pct(settings.soundCrowd,72),peak=.19*pct(settings.soundGoal,100),now=ctx.currentTime;
    crowdGain.gain.cancelScheduledValues(now);crowdGain.gain.setValueAtTime(base,now);crowdGain.gain.linearRampToValueAtTime(peak,now+.16);crowdGain.gain.linearRampToValueAtTime(base,now+2.3);
  }
}
function playMotif(team){
  if(!enabled||!ctx)return;
  const notes=team==='A'?[220,277.18,329.63,440]:[196,246.94,293.66,392];
  notes.forEach((n,i)=>tone(n,i*.32,.13,.014,team==='A'?'triangle':'sine'));
}
function startTeamMusic(team){
  if(!enabled||!team||currentTeam===team)return;
  currentTeam=team;if(teamTimer)clearInterval(teamTimer);playMotif(team);teamTimer=setInterval(()=>playMotif(team),4200);
}
function stopTeamMusic(){currentTeam=null;if(teamTimer){clearInterval(teamTimer);teamTimer=null}}
function speakGoal(){
  if(!enabled)return;
  const now=Date.now();if(now-lastGoalAt<1600)return;lastGoalAt=now;cheer();
  if(settings.announcerEnabled){
    try{
      if('speechSynthesis'in window){
        speechSynthesis.cancel();
        const u=new SpeechSynthesisUtterance('Gooooooooooooool!');
        u.lang='tr-TR';u.rate=.58;u.pitch=.82;u.volume=pct(settings.soundGoal,100);
        const voices=speechSynthesis.getVoices(),tr=voices.find(v=>/^tr/i.test(v.lang));
        if(tr)u.voice=tr;speechSynthesis.speak(u);
      }
    }catch(e){}
  }
  [392,523,659,784].forEach((f,i)=>tone(f,i*.09,.28,.045,'sawtooth','goal'));
}
async function applySettings(next){
  readSettings(next);
  if(!settings.soundEnabled){disableSound();return}
  if(ctx&&ctx.state==='running'){
    enabled=true;refreshVolumes();
    if(settings.crowdEnabled){if(!crowdSource)startCrowd()}else stopCrowd();
  }
}
function bindSceneAudio(){
  window.addEventListener('football-scene-phase',e=>{
    const phase=e?.detail?.phase;
    if(phase==='kick')kick(0);
    else if(phase==='save')saveSound();
    else if(phase==='net'){netHit();speakGoal()}
  });
}
function bind(){
  bindSceneAudio();
  window.addEventListener('ai-football-settings',e=>applySettings(e.detail||{}));
  const ev=$('event'),qa=$('queueA'),qb=$('queueB');
  if(ev){
    let last='';
    new MutationObserver(()=>{
      const t=(ev.textContent||'').trim();if(!t||t===last)return;last=t;
      if(!has3d()){
        if(/şut çekiyor!/i.test(t))kick(0);
        if(/kalecisi kurtardı!/i.test(t))saveSound();
        if(/^GOL!/i.test(t)){netHit();speakGoal()}
      }
      if(/Maç sıfırlandı/i.test(t))stopTeamMusic();
    }).observe(ev,{childList:true,characterData:true,subtree:true});
  }
  if(qa&&qb){
    let a=Number(qa.textContent)||0,b=Number(qb.textContent)||0;
    new MutationObserver(()=>{const n=Number(qa.textContent)||0;if(n<a)startTeamMusic('A');a=n}).observe(qa,{childList:true,characterData:true,subtree:true});
    new MutationObserver(()=>{const n=Number(qb.textContent)||0;if(n<b)startTeamMusic('B');b=n}).observe(qb,{childList:true,characterData:true,subtree:true});
  }
}
function boot(){
  readSettings();window.__aiFootballSoundEnabled=false;patchNativeGoalSound();ensureButton();bind();
  if(settings.soundEnabled)document.addEventListener('pointerdown',()=>{if(!enabled)enableSound()},{once:true,capture:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.AIFootballAudio={enableSound,disableSound,toggleSound,startTeamMusic,stopTeamMusic,speakGoal,kick,bounce,applySettings,get enabled(){return enabled},get settings(){return {...settings}}};
})();