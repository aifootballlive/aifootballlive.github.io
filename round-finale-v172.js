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
function speak(text){
 if(!isBroadcastController()||!('speechSynthesis' in window))return;
 try{
  const u=new SpeechSynthesisUtterance(text);
  u.lang='tr-TR';u.rate=.94;u.pitch=.88;u.volume=1;
  const voices=window.speechSynthesis.getVoices();
  u.voice=voices.find(v=>v.lang?.toLowerCase().startsWith('tr'))||null;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
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
 start(team,scores){
  const stamp=window.AIFootballTikTok?.getMatchClock?.()?.finishedAt;
  if(!stamp||spokenRound===stamp)return;
  spokenRound=stamp;showConfetti();applause();
  const winner=NAMES[team];
  speak(winner?'Maçın kazananı '+winner+'! Takımımızı alkışlıyoruz. Tebrikler!':'Maç berabere tamamlandı. Tüm takımlarımızı alkışlıyoruz!');
 },
 announceNext(seconds){
  const stamp=window.AIFootballTikTok?.getMatchClock?.()?.finishedAt;
  if(!stamp||spokenNext===stamp)return;spokenNext=stamp;
  speak('Lig puan durumunu izliyoruz. Sonraki maç iki dakika sonra başlayacak. Hediyeleriniz sonraki maç için sıraya ekleniyor.');
 },
 announceCountdown(seconds){
  if(seconds!==60)return;
  const stamp=window.AIFootballTikTok?.getMatchClock?.()?.finishedAt;
  const key=stamp+':60';if(spokenNext===key||!stamp)return;
  spokenNext=key;
  speak('Yeni maça son altmış saniye! Takımınızı desteklemeye hazır olun.');
 }
};
})();