(()=>{
'use strict';
let ctx=null,master=null,teamTimer=null,currentTeam=null,enabled=false,lastGoalAt=0,lastKickAt=0,nativeGoalSound=null;
let userMuted=false;
let goalBufferPromise=null,goalSource=null,goalGeneration=0;
let crowdBufferPromise=null,crowdLoading=false,crowdGeneration=0;
let crowdSource=null,crowdGain=null,crowdLfo=null,crowdLfoGain=null;
let settings={soundMaster:88,soundCrowd:72,soundEffects:92,soundGoal:100,soundEnabled:true,crowdEnabled:true,announcerEnabled:true,aiSpeechEnabled:true};
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
  if(crowdGain)crowdGain.gain.value=.65*pct(settings.soundCrowd,72);
}
function ensureButton(){
  let b=$('soundEnable');if(b)return b;
  b=document.createElement('button');b.id='soundEnable';b.textContent='SESİ KAPAT';
  Object.assign(b.style,{position:'fixed',right:'10px',bottom:'10px',zIndex:'500',border:'1px solid #6f84c5',background:'#1f315c',color:'#fff',borderRadius:'10px',padding:'10px 12px',fontWeight:'900',fontSize:'11px',boxShadow:'0 6px 22px rgba(0,0,0,.35)'});
  b.onclick=async e=>{e.preventDefault();e.stopPropagation();await toggleSound();};(document.getElementById('matchControls')||document.body).appendChild(b);return b;
}
function syncSoundState(){
  enabled=!userMuted&&settings.soundEnabled&&ctx?.state==='running';
  window.__aiFootballSoundEnabled=enabled;
  const b=ensureButton();
  b.textContent=userMuted||!settings.soundEnabled?'SESİ AÇ':enabled?'SES AÇIK':'SESİ AÇ';
  b.style.background=userMuted||!settings.soundEnabled?'#1f315c':'#8e2f44';
  b.setAttribute('aria-pressed',String(enabled));
  b.dataset.audioUnlocked=String(enabled);
  b.setAttribute('aria-label',enabled?'Ses açık; kapatmak için dokun':'Sesleri ve hakem düdüğünü aç');
  if(enabled){refreshVolumes();if(settings.crowdEnabled)startCrowd()}else if(userMuted||!settings.soundEnabled){stopTeamMusic();stopCrowd();}
}
function patchNativeGoalSound(){
  if(nativeGoalSound||typeof window.playGoalSound!=='function')return;
  nativeGoalSound=window.playGoalSound;
  window.playGoalSound=function(){if(!enabled)return;};
}
const noiseCache=new Map();
function noiseBuffer(seconds=2){
  const key=Math.ceil(seconds*10)/10;if(noiseCache.has(key))return noiseCache.get(key);
  const rate=ctx.sampleRate,len=Math.max(1,Math.floor(rate*key)),buffer=ctx.createBuffer(1,len,rate),data=buffer.getChannelData(0);
  for(let i=0;i<len;i++)data[i]=(Math.random()*2-1);
  noiseCache.set(key,buffer);if(noiseCache.size>12)noiseCache.delete(noiseCache.keys().next().value);return buffer;
}
async function startCrowd(){
  if(!enabled||!ctx||crowdSource||crowdLoading||!settings.crowdEnabled)return;
  crowdLoading=true;const generation=crowdGeneration;
  try{
    if(!crowdBufferPromise)crowdBufferPromise=fetch('./assets/audio/crowd-stadium-v1.mp3?v=1').then(r=>{if(!r.ok)throw new Error('Crowd audio unavailable');return r.arrayBuffer()}).then(bytes=>ctx.decodeAudioData(bytes));
    const buffer=await crowdBufferPromise;
    if(generation!==crowdGeneration||!enabled||userMuted||!settings.crowdEnabled||ctx.state!=='running')return;
    crowdSource=ctx.createBufferSource();crowdSource.buffer=buffer;crowdSource.loop=true;
    crowdGain=ctx.createGain();crowdGain.gain.value=.65*pct(settings.soundCrowd,72);
    crowdSource.connect(crowdGain);crowdGain.connect(master);crowdSource.start();
  }catch(error){crowdBufferPromise=null;console.warn('Seyirci sesi yuklenemedi',error)}
  finally{crowdLoading=false;if(generation!==crowdGeneration&&enabled&&!userMuted&&settings.crowdEnabled)startCrowd();}
}
function stopCrowd(){
  crowdGeneration++;
  try{crowdSource?.stop();crowdLfo?.stop()}catch(e){}
  crowdSource=null;crowdGain=null;crowdLfo=null;crowdLfoGain=null;
}
async function enableSound(){
  readSettings();if(userMuted||!settings.soundEnabled){syncSoundState();return;}
  patchNativeGoalSound();
  const b=ensureButton();
  try{
    if(!ctx){ctx=new(window.AudioContext||window.webkitAudioContext)();ctx.addEventListener('statechange',syncSoundState);loadGoalBuffer().catch(()=>{});}
    if(!master){master=ctx.createGain();master.connect(ctx.destination)}
    syncSoundState();
    if(ctx.state!=='running'&&ctx.state!=='closed')await ctx.resume();
    syncSoundState();loadRefereeWhistle().catch(()=>{});setTimeout(warmSpeech,0);

  }catch(e){
    enabled=false;window.__aiFootballSoundEnabled=false;
    b.textContent='SESİ KAPAT';b.style.background='#8e2f44';
  }
}
function disableSound(){
  stopAnnouncements();stopRefereeWhistles();
  leagueAudioGeneration++;for(const source of leagueAudioSources){try{source.stop();}catch{}}leagueAudioSources.clear();
  goalGeneration++;try{goalSource?.stop()}catch(e){}goalSource=null;
  userMuted=true;
  enabled=false;window.__aiFootballSoundEnabled=false;stopTeamMusic();stopCrowd();
  try{if(master)master.gain.value=0}catch(e){}
  try{if(ctx&&ctx.state==='running')ctx.suspend()}catch(e){}
  try{if('speechSynthesis' in window)speechSynthesis.cancel()}catch(e){}
  syncSoundState();
}
async function toggleSound(){
  if(enabled&&!userMuted&&settings.soundEnabled){disableSound()}
  else{userMuted=false;settings.soundEnabled=true;window.__AI_FOOTBALL_SETTINGS={...(window.__AI_FOOTBALL_SETTINGS||{}),soundEnabled:true};await enableSound()}
}
function tone(freq,at,dur=.16,vol=.045,type='sine',gainGroup='effects'){
  if(!enabled||!ctx)return;
  const factor=(gainGroup==='goal'?pct(settings.soundGoal,100):pct(settings.soundEffects,92))*1.10;
  const o=ctx.createOscillator(),g=ctx.createGain(),now=ctx.currentTime+at;
  o.type=type;o.frequency.value=freq;
  g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(Math.max(.0001,vol*factor),now+.008);g.gain.exponentialRampToValueAtTime(.0001,now+dur);
  o.connect(g);g.connect(master);o.onended=()=>{o.disconnect();g.disconnect();};o.start(now);o.stop(now+dur+.03);
}
function noiseBurst(at=0,dur=.08,vol=.07,freq=900,type='bandpass',gainGroup='effects'){
  if(!enabled||!ctx)return;
  const factor=(gainGroup==='goal'?pct(settings.soundGoal,100):pct(settings.soundEffects,92))*1.10;
  const s=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain(),now=ctx.currentTime+at;
  s.buffer=noiseBuffer(Math.max(.12,dur+.04));filter.type=type;filter.frequency.value=freq;filter.Q.value=.65;
  g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(Math.max(.0001,vol*factor),now+.006);g.gain.exponentialRampToValueAtTime(.0001,now+dur);
  s.connect(filter);filter.connect(g);g.connect(master);s.onended=()=>{s.disconnect();filter.disconnect();g.disconnect();};s.start(now);s.stop(now+dur+.04);
}
const whistledCues=new Set();
let refereeBufferPromise=null;
const refereeSources=new Set(),refereeEvents=new Set();
function loadRefereeWhistle(){
 if(!refereeBufferPromise)refereeBufferPromise=fetch('./assets/audio/referee-v254.mp3').then(r=>{if(!r.ok)throw Error('Referee whistle unavailable');return r.arrayBuffer();}).then(b=>ctx.decodeAudioData(b)).catch(e=>{refereeBufferPromise=null;throw e;});
 return refereeBufferPromise;
}
function stopRefereeWhistles(){for(const source of refereeSources){try{source.stop();}catch{}}refereeSources.clear();}
async function refereeWhistle(kind,eventId){
 if(!['ready','start','end'].includes(kind)||userMuted||settings.soundEnabled===false)return false;
 if(!enabled)await enableSound();
 if(!enabled||!ctx||ctx.state!=='running')return false;
 const key=eventId==null?null:kind+':'+eventId;
 if(key&&refereeEvents.has(key))return false;
 if(key){refereeEvents.add(key);if(refereeEvents.size>128)refereeEvents.delete(refereeEvents.values().next().value);}
 const generation=leagueAudioGeneration;
 if(kind!=='ready')stopAnnouncements();
 const pattern=kind==='end'?[[0,.22],[.36,.22],[.72,.78]]:kind==='start'?[[0,.65]]:[[0,.16]];
 try{
  const buffer=await loadRefereeWhistle();
  if(generation!==leagueAudioGeneration||userMuted||!enabled||ctx.state!=='running'||!settings.soundEnabled)return false;
  for(const [delay,length] of pattern){
   const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;
   const time=ctx.currentTime+delay,duration=Math.min(length,buffer.duration);
   gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.85*pct(settings.soundEffects,92),time+.012);
   gain.gain.setValueAtTime(.85*pct(settings.soundEffects,92),time+Math.max(.013,duration-.035));gain.gain.linearRampToValueAtTime(0,time+duration);
   source.connect(gain);gain.connect(master);refereeSources.add(source);
   source.onended=()=>{refereeSources.delete(source);source.disconnect();gain.disconnect();};source.start(time,0,duration);
  }
  return true;
 }catch(error){
  if(generation!==leagueAudioGeneration||!enabled||userMuted)return false;
  // Keep the same referee rhythm if the recording cannot be loaded.
  for(const [delay,duration] of pattern){tone(2850,delay,duration,.065);tone(3420,delay+.005,Math.max(.08,duration-.02),.025);}
  return true;
 }
}
function whistle(cueKey){
 if(!enabled||!ctx||ctx.state!=='running'||settings.soundEnabled===false)return false;
 if(cueKey!=null){if(whistledCues.has(cueKey))return false;whistledCues.add(cueKey);if(whistledCues.size>256)whistledCues.delete(whistledCues.values().next().value);}
 tone(2850,0,.21,.065,'sine');tone(3420,.005,.185,.025,'sine');noiseBurst(0,.045,.009,3100,'highpass');return true;
}
function kick(at=0){
  const nowMs=Date.now();if(nowMs-lastKickAt<120)return;lastKickAt=nowMs;
  if(!enabled||userMuted||!ctx||ctx.state!=='running')return;
  const fx=pct(settings.soundEffects,92);
  if(!fx)return;
  at=Math.max(0,Number(at)||0);
  // Kick is mixed over the uninterrupted crowd recording.
  const out=ctx.createGain(),comp=ctx.createDynamicsCompressor(),lowShelf=ctx.createBiquadFilter();
  out.gain.value=4.8*fx;
  lowShelf.type='lowshelf';lowShelf.frequency.value=180;lowShelf.gain.value=7;
  comp.threshold.value=-8;comp.knee.value=8;comp.ratio.value=4;comp.attack.value=.001;comp.release.value=.18;
  out.connect(lowShelf);lowShelf.connect(comp);
  const impactGain=ctx.createGain();impactGain.gain.value=2.2;
  comp.connect(impactGain);impactGain.connect(master);

  const noiseHit=(delay,dur,vol,lowpass)=>{
    const src=ctx.createBufferSource(),lp=ctx.createBiquadFilter(),hp=ctx.createBiquadFilter(),g=ctx.createGain(),t=ctx.currentTime+delay;
    src.buffer=noiseBuffer(Math.max(.16,dur+.06));
    hp.type='highpass';hp.frequency.value=55;
    lp.type='lowpass';lp.frequency.value=lowpass;lp.Q.value=.55;
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(vol,t+.002);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    src.connect(hp);hp.connect(lp);lp.connect(g);g.connect(out);src.start(t);src.stop(t+dur+.06);
  };
  const body=(freq,delay,dur,vol)=>{
    const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+delay;
    o.type='sine';o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(38,freq*.54),t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.0015);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(out);o.start(t);o.stop(t+dur+.03);
  };

  // Leather-ball impact: one dull body hit, one short contact slap.
  noiseHit(at,.145,1.25,520);
  noiseHit(at+.004,.075,.58,980);
  body(96,at,.205,1.15);
  body(154,at+.006,.115,.42);
}
function sceneEffect(kind,variation=0,displayAt){
 if(!enabled||!ctx||ctx.state!=='running'||settings.soundEnabled===false)return false;
 const delay=Number.isFinite(displayAt)?Math.max(0,(displayAt-performance.now())/1000-(ctx.outputLatency||ctx.baseLatency||0)):0;
 if(kind==='step')return false;
 if(kind==='kick'){kick(delay);return true;}
 if(kind==='catch'){noiseBurst(delay,.085,.12,650,'lowpass');tone(150,delay,.09,.07,'sine');return true;}
 if(kind==='net'){noiseBurst(delay,.17,.055,1900,'highpass');tone(225,delay,.13,.025,'triangle');return true;}
 return false;
}
function bounce(at=0,scale=1){noiseBurst(at,.05,.062*scale,1200,'bandpass');tone(155,at,.07,.048*scale,'sine')}
function netHit(){noiseBurst(0,.14,.065,1500,'highpass');bounce(.05,.8);bounce(.22,.52);bounce(.40,.32)}
function saveSound(){noiseBurst(0,.10,.09,520,'bandpass');tone(145,0,.17,.067,'triangle');bounce(.16,.72)}
function cheer(){
  if(!enabled||!ctx)return;
  noiseBurst(0,.9,.11,1050,'bandpass','goal');noiseBurst(.18,1.25,.08,1650,'bandpass','goal');
  if(crowdGain&&settings.crowdEnabled){
    const base=.65*pct(settings.soundCrowd,72),peak=.85*pct(settings.soundGoal,100),now=ctx.currentTime;
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
function loadGoalBuffer(){
  if(!goalBufferPromise)goalBufferPromise=fetch('./assets/audio/goal-shout-v1.wav?v=1').then(r=>{if(!r.ok)throw new Error('Goal audio unavailable');return r.arrayBuffer()}).then(bytes=>ctx.decodeAudioData(bytes)).catch(error=>{goalBufferPromise=null;throw error});
  return goalBufferPromise;
}
async function speakGoal(){
  if(settings.aiSpeechEnabled!==false)return;
  if(!enabled||userMuted||ctx?.state!=='running'||!settings.announcerEnabled)return;
  const now=Date.now();if(now-lastGoalAt<1600||goalSource)return;lastGoalAt=now;
  const generation=goalGeneration;
  try{
    const buffer=await loadGoalBuffer();
    if(generation!==goalGeneration||!enabled||userMuted||!settings.announcerEnabled||ctx.state!=='running'||goalSource)return;
    const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=false;
    gain.gain.value=1.25*pct(settings.soundGoal,100);source.connect(gain);gain.connect(master);goalSource=source;
    source.onended=()=>{if(goalSource===source)goalSource=null;source.disconnect();gain.disconnect();};
    source.start(0,0,Math.min(4,buffer.duration));
  }catch(error){console.warn('Gol sesi yuklenemedi',error)}
}
async function applySettings(next){
  readSettings(next);if(settings.aiSpeechEnabled!==false)setTimeout(warmSpeech,0);
  if(settings.aiSpeechEnabled===false||!settings.soundEnabled)stopAnnouncements();
  if(!settings.soundEnabled){stopRefereeWhistles();syncSoundState();if(master)master.gain.value=0;return}
  if(userMuted){syncSoundState();return}
  if(ctx&&ctx.state==='running'){
    syncSoundState();
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
    let last=(ev.dataset.matchMessage||ev.textContent||'').trim();
    new MutationObserver(()=>{
      const t=(ev.dataset.matchMessage||ev.textContent||'').trim();if(!t||t===last)return;last=t;
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
  readSettings();userMuted=false;
  window.__aiFootballSoundEnabled=false;patchNativeGoalSound();
  const b=ensureButton();b.textContent='SESİ AÇ';b.style.background='#8e2f44';bind();
  const unlock=e=>{
    if(e?.target?.id==='soundEnable')return;
    if(!userMuted&&settings.soundEnabled&&(!enabled||ctx?.state!=='running'))enableSound().catch(()=>{});
  };
  enableSound().catch(()=>{});
  document.addEventListener('pointerdown',unlock,{capture:true});
  document.addEventListener('touchstart',unlock,{capture:true,passive:true});
  document.addEventListener('keydown',unlock,{capture:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!userMuted&&settings.soundEnabled)enableSound().catch(()=>{})});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
const leagueAudioCache=new Map(),leagueAudioSources=new Set(),speechSources=new Set();let leagueAudioGeneration=0,speechGeneration=0,speechPending=false,lastSpeechKey=null;
const extraSpeechKeys=new Set(['support1','support2','support3','final30a','final30b','final30c','atmosphere1','atmosphere2','waiting1','waiting2','waiting3','waiting4','prepare15','prepare5','final300','final120','final60','final20','final10','final5','empty1','empty2','empty3','queued1','queued2']);
const speechKeys=new Set(['prepare','kickoff','shot1','shot2','goal1','goal2','save','league']);
function stopAnnouncements(){speechGeneration++;speechPending=false;for(const source of speechSources){try{source.stop();}catch{}}speechSources.clear();try{window.speechSynthesis?.cancel();}catch{}}
function loadLeagueClip(key){
 if(!leagueAudioCache.has(key)){const folder=key==='applause'?'league-v193':'commentary-v253';const pending=fetch('./assets/audio/'+folder+'/'+key+'.mp3').then(r=>{if(!r.ok)throw Error('Announcement unavailable');return r.arrayBuffer();}).then(b=>ctx.decodeAudioData(b));leagueAudioCache.set(key,pending);pending.catch(()=>leagueAudioCache.delete(key));}
 return leagueAudioCache.get(key);
}
let speechWarmed=false;
async function warmSpeech(){if(speechWarmed||!enabled||!ctx||settings.aiSpeechEnabled===false)return;speechWarmed=true;const keys=[...speechKeys,...extraSpeechKeys,'A','B','C','D','draw','countdown'];for(let n=0;n<keys.length;n+=2)await Promise.allSettled(keys.slice(n,n+2).map(loadLeagueClip));}
async function leagueClip(key,group='goal',volume=1,speech=false){
 if(!enabled||userMuted||!settings.soundEnabled||!ctx||ctx.state!=='running')return false;
 const generation=leagueAudioGeneration,ticket=speechGeneration;
 try{
  const buffer=await loadLeagueClip(key);if(generation!==leagueAudioGeneration||!enabled||userMuted||ctx.state!=='running'||speech&&(ticket!==speechGeneration||settings.aiSpeechEnabled===false))return false;
  const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=volume*pct(group==='crowd'?settings.soundCrowd:settings.soundGoal,100);source.connect(gain);gain.connect(master);leagueAudioSources.add(source);if(speech){speechSources.add(source);lastSpeechKey=key;}source.onended=()=>{leagueAudioSources.delete(source);speechSources.delete(source);source.disconnect();gain.disconnect();};source.start();return true;
 }catch(error){console.warn('League announcement unavailable',error);return false;}
}
async function announce(text,key,options={}){
 if(!enabled||userMuted||!settings.soundEnabled||settings.aiSpeechEnabled===false)return false;
 if(options.important===false&&(speechSources.size||speechPending||window.speechSynthesis?.speaking))return false;
 stopAnnouncements();const ticket=speechGeneration;speechPending=true;
 try{
  if(key&&await leagueClip(key,'goal',1.1,true))return true;
  if(ticket!==speechGeneration||settings.aiSpeechEnabled===false||userMuted||!enabled||!('speechSynthesis' in window))return false;
  const line=new SpeechSynthesisUtterance(text);line.lang='tr-TR';line.rate=1.02;line.volume=pct(settings.soundMaster,88)*pct(settings.soundGoal,100);const voice=speechSynthesis.getVoices().find(v=>v.lang.startsWith('tr'));if(voice)line.voice=voice;speechSynthesis.speak(line);return true;
 }finally{if(ticket===speechGeneration)speechPending=false;}
}
function applause(){if(!settings.crowdEnabled)return;leagueClip('applause','crowd',.65);}
window.AIFootballAudio={announce,stopAnnouncements,applause,get speechStatus(){return {active:speechSources.size,pending:speechPending,lastKey:lastSpeechKey};},get announcing(){return speechSources.size>0||speechPending;},enableSound,disableSound,toggleSound,startTeamMusic,stopTeamMusic,speakGoal,whistle,refereeWhistle,sceneEffect,kick,bounce,applySettings,get effectStats(){return {activeGrassSources:0,noiseBuffers:noiseCache.size,grassBuffers:0};},get enabled(){return enabled},get settings(){return {...settings}}};
})();
