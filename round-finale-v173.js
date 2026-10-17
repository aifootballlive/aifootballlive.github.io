/* Original sound cues for match winners; no third-party audio files. */
(()=>{
'use strict';
let spokenRound='',spokenNext='',context=null;
const NAMES={A:'Altın Pusula',B:'Kızıl Kıvılcım',C:'Gece Yıldızı',D:'Bordo Dalga'};
function showConfetti(){
 const parent=document.getElementById('roundConfetti');if(!parent)return;
 parent.replaceChildren();
 const colors=['#ffd34c','#f3f6f8','#a34468','#62b4eb','#e04c47','#325091'];
 for(let i=0;i<32;i++){
  const p=document.createElement('i');
  p.style.left=(3+(i*29%97))+'%';
  p.style.background=colors[i%colors.length];
  p.style.animationDelay=(i%11*.15)+'s';
  p.style.animationDuration=(3.2+(i%8)*.25)+'s';
  parent.append(p);
 }
}
function isBroadcastController(){
 return document.visibilityState!=='hidden'&&typeof adminAuthed!=='undefined'&&adminAuthed===true&&window.AIFootballTikTok?.getStatus?.().leader===true;
}
let lastShotSpeech=0;
function currentLanguage(){return window.AIFootballTikTok?.getTimings?.()?.language==='en'?'en':'tr';}
function speak(text,important=true){
 if(!isBroadcastController()||!('speechSynthesis' in window))return;
 const settings=window.__AI_FOOTBALL_SETTINGS||{};
 if(settings.announcerEnabled===false||settings.soundEnabled===false)return;
 try{
  const language=currentLanguage(),locale=language==='en'?'en-US':'tr-TR';
  const synth=window.speechSynthesis;
  if(!important&&synth.speaking)return;
  const u=new SpeechSynthesisUtterance(text);
  u.lang=locale;u.rate=language==='en'?.99:1.02;u.pitch=1;u.volume=Math.max(0,Math.min(1,(Number(settings.soundGoal??100))/100));
  const candidates=synth.getVoices().filter(v=>v.lang?.toLowerCase().startsWith(language));
  candidates.sort((a,b)=>{
    const rank=v=>Number(/natural|neural|premium|emel|yelda|deniz|google/i.test(v.name))*5+
      Number(v.localService)*2-Number(/compact|espeak/i.test(v.name))*3;
    return rank(b)-rank(a);
  });
  u.voice=candidates[0]||null;
  if(important)synth.cancel();
  synth.speak(u);
 }catch(error){console.warn('Spiker seslendirilemiyor',error);}
}
function applause(){
 if(!isBroadcastController())return;
 try{
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  context ||= new C();
  if(context.state==='suspended')context.resume().catch(()=>{});
  const duration=.14,length=Math.floor(context.sampleRate*duration);
  const buffer=context.createBuffer(1,length,context.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
  for(let i=0;i<16;i++){
   const start=context.currentTime+.03+i*.13;
   const src=context.createBufferSource(),gain=context.createGain(),filter=context.createBiquadFilter();
   src.buffer=buffer;filter.type='bandpass';filter.frequency.value=700+(i%5)*190;
   gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.13,start+.016);gain.gain.exponentialRampToValueAtTime(.001,start+.13);
   src.connect(filter).connect(gain).connect(context.destination);src.start(start);src.stop(start+.14);
  }
 }catch(e){console.warn('Alkış sesi başlatılamadı',e);}
}
window.AIFootballRoundCelebration={
 announceShot(team,result){
  const now=Date.now();if(now-lastShotSpeech<7500)return;
  lastShotSpeech=now;
  const english=currentLanguage()==='en';
  const words=english?(result==='goal'?'What a goal! Amazing finish!':'Great shot! What a save!'):
   (result==='goal'?'Müthiş bir gol! Harika bitiriş!':'Güzel şut! Kaleciden şahane kurtarış!');
  speak(words,false);
 },
 start(team,scores){
  const stamp=window.AIFootballTikTok?.getMatchClock?.()?.finishedAt;
  if(!stamp||spokenRound===stamp)return;
  spokenRound=stamp;showConfetti();applause();
  const winner=NAMES[team],english=currentLanguage()==='en';
  speak(english?(winner?'The winner is '+winner+'! What a match! Congratulations!':'The match ends in a draw. Well played, everyone!'):
   (winner?'Maç sona erdi! Kazanan '+winner+'! Harika bir mücadeleydi. Takımımızı alkışlıyoruz.':'Maç sona erdi! Beraberlik var. Her iki tarafı da alkışlıyoruz!'));
 },
 announceNext(seconds){
  const stamp=window.AIFootballTikTok?.getMatchClock?.()?.finishedAt;
  if(!stamp||spokenNext===stamp)return;spokenNext=stamp;
  const english=currentLanguage()==='en';
  speak(english?'Here are the league standings. The next match is coming up. New gifts count for the next match.':
   'Şimdi lig puan durumundayız. Birazdan yeni maç başlayacak. Gönderilen şutlar yeni maç için sıraya ekleniyor.');
 },
 announceCountdown(seconds){
  if(seconds!==60)return;
  const stamp=window.AIFootballTikTok?.getMatchClock?.()?.finishedAt;
  const key=stamp+':60';if(spokenNext===key||!stamp)return;
  spokenNext=key;
  speak(currentLanguage()==='en'?'Sixty seconds until the next match. Get ready to support your team!':'Yeni maça son altmış saniye! Takımlar hazırlanıyor, futbol heyecanı birazdan devam edecek.');
 }
};
})();