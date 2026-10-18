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
const shotCalls=new Set();let shotVariant=0,goalVariant=0;
function trimShots(){if(shotCalls.size>256)shotCalls.delete(shotCalls.values().next().value);}
function currentLanguage(){return window.AIFootballTikTok?.getTimings?.()?.language==='en'?'en':'tr';}
function speak(text,important=true,key=null){
 if(key&&currentLanguage()==='tr'&&window.AIFootballAudio?.announce){window.AIFootballAudio.announce(text,key,{important});return;}
 if(!important&&window.AIFootballAudio?.announcing)return;
 if(!isBroadcastController()||!('speechSynthesis' in window))return;
 const settings=window.__AI_FOOTBALL_SETTINGS||{};
 if(settings.aiSpeechEnabled===false||settings.soundEnabled===false)return;
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
function applause(){window.AIFootballAudio?.applause?.();}

window.AIFootballRoundCelebration={
 announceKick(team,id){
  const key='kick:'+id;if(shotCalls.has(key))return;shotCalls.add(key);trimShots();
  const variant=(shotVariant++%2)+1;
  speak(currentLanguage()==='en'?'What a shot!':variant===1?'Harika bir şut!':'Müthiş bir vuruş!',false,'shot'+variant);
 },
 announceShot(team,result,id){
  const key=result+':'+id;if(shotCalls.has(key))return;shotCalls.add(key);trimShots();
  if(result==='goal'){const variant=(goalVariant++%2)+1;speak(currentLanguage()==='en'?'What a goal!':variant===1?'Gol! Harika bir gol! Tribünler ayakta!':'Muhteşem bir gol! Nefis bir bitiriş!',true,'goal'+variant);}
  else speak(currentLanguage()==='en'?'An amazing save!':'Kaleciden müthiş bir kurtarış!',false,'save');
 },
 start(team,scores){
  const stamp=window.AIFootballTikTok?.getMatchClock?.()?.finishedAt;
  if(!stamp||spokenRound===stamp)return;
  spokenRound=stamp;showConfetti();applause();
  const winner=NAMES[team],english=currentLanguage()==='en';
  speak(english?(winner?'The winner is '+winner+'! What a match! Congratulations!':'The match ends in a draw. Well played, everyone!'):
   (winner?'Maç sona erdi! Kazanan '+winner+'! Harika bir mücadeleydi. Takımımızı alkışlıyoruz.':'Maç sona erdi! Beraberlik var. Her iki tarafı da alkışlıyoruz!'),true,team||'draw');
  setTimeout(()=>{if(window.AIFootballTikTok?.getMatchClock?.().finishedAt===stamp&&window.AIFootballTikTok.getMatchState()?.results)window.AIFootballRoundCelebration.announceNext();},11000);
 },
 announceNext(seconds){
  const stamp=window.AIFootballTikTok?.getMatchClock?.()?.finishedAt;
  if(!stamp||spokenNext===stamp)return;spokenNext=stamp;
  const english=currentLanguage()==='en';
  speak(english?'Here are the league standings. The next match is coming up. New gifts count for the next match.':
   'Şimdi lig puan durumundayız. Birazdan yeni maç başlayacak. Gönderilen şutlar yeni maç için sıraya ekleniyor.',false,'league');
 },
 announceCountdown(seconds){
  if(seconds!==60)return;
  const stamp=window.AIFootballTikTok?.getMatchClock?.()?.finishedAt;
  const key=stamp+':60';if(spokenNext===key||!stamp)return;
  spokenNext=key;
  speak(currentLanguage()==='en'?'Sixty seconds until the next match. Get ready to support your team!':'Yeni maça son altmış saniye! Takımlar hazırlanıyor, futbol heyecanı birazdan devam edecek.',true,'countdown');
 }
};

let lifecycleStamp=null,lifecyclePhase=null;
function watchKickoff(){
 const game=window.AIFootballTikTok,clock=game?.getMatchClock?.(),phase=game?.getMatchState?.();if(!clock||!phase)return;
 if(phase.starting&&lifecycleStamp!==clock.startedAt){lifecycleStamp=clock.startedAt;lifecyclePhase='preparing';if(clock.startedAt-Date.now()>25000)speak(currentLanguage()==='en'?'The match starts in thirty seconds. Get ready!':'Maç başlamak üzere! Takımlar hazırlanıyor. Otuz saniye sonra başlıyoruz!',true,'prepare');}
 else if(phase.running&&lifecycleStamp===clock.startedAt&&lifecyclePhase==='preparing'){lifecyclePhase='playing';if(Date.now()-clock.startedAt<3000)speak(currentLanguage()==='en'?'The match has started!':'Ve maç başladı! Bütün takımlara başarılar. Futbol şölenine hazır olun!',true,'kickoff');}
 else if(!phase.starting&&!phase.running&&lifecyclePhase==='preparing'){lifecyclePhase=null;window.AIFootballAudio?.stopAnnouncements?.();}
}
setInterval(watchKickoff,150);
})();