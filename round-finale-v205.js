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
  setTimeout(()=>{if(window.AIFootballTikTok?.getMatchClock?.()?.finishedAt!==stamp)return;speak(english?(winner?'The winner is '+winner+'! What a match! Congratulations!':'The match ends in a draw. Well played, everyone!'):
   (winner?'Maç sona erdi! Kazanan '+winner+'! Harika bir mücadeleydi. Takımımızı alkışlıyoruz.':'Maç sona erdi! Beraberlik var. Her iki tarafı da alkışlıyoruz!'),true,team||'draw');},1650);
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

let lifecycleStamp=null,lifecyclePhase=null,refereeClock=null;
function watchRefereeClock(clock,phase){
 const now=Date.now(),stamp=String(clock.round||0)+':'+String(clock.startedAt||0);
 const previous=refereeClock;
 refereeClock={stamp,running:phase.running===true,finishedAt:clock.finishedAt};
 // Joining or refreshing an existing match never replays an old whistle.
 if(!previous)return false;
 const started=phase.running&&(previous.stamp!==stamp||!previous.running)&&now-clock.startedAt>=0&&now-clock.startedAt<2500;
 if(started)window.AIFootballAudio?.refereeWhistle?.('start',stamp);
 if(previous.running&&previous.stamp===stamp&&clock.finishedAt&&clock.finishedAt!==previous.finishedAt&&!clock.interrupted&&now-clock.finishedAt<4000)
  window.AIFootballAudio?.refereeWhistle?.('end',stamp+':'+clock.finishedAt);
 return started;
}
function watchKickoff(){
 const game=window.AIFootballTikTok,clock=game?.getMatchClock?.(),phase=game?.getMatchState?.();if(!clock||!phase)return;
 const justStarted=watchRefereeClock(clock,phase);
 if(justStarted){const stamp=clock.startedAt;setTimeout(()=>{if(game.getMatchClock?.()?.startedAt===stamp&&game.getMatchState?.()?.running)speak(currentLanguage()==='en'?'The match has started!':'Ve maç başladı!',true,'kickoff');},750);}
 if(phase.starting&&lifecycleStamp!==clock.startedAt){lifecycleStamp=clock.startedAt;lifecyclePhase='preparing';if(clock.startedAt-Date.now()>25000)speak(currentLanguage()==='en'?'The match starts in thirty seconds. Get ready!':'Maç başlamak üzere! Takımlar hazırlanıyor. Otuz saniye sonra başlıyoruz!',true,'prepare');}
 else if(phase.running){lifecycleStamp=clock.startedAt;lifecyclePhase='playing';}
 else if(!phase.starting&&!phase.running&&lifecyclePhase==='preparing'){lifecyclePhase=null;window.AIFootballAudio?.stopAnnouncements?.();}
}
/* Varied, non-intrusive live commentary. Uses the broadcast's existing
   speech settings; no separate audio stream or duplicate live players. */
const LIVE_TEAM_NAMES={A:'Altın Pusula',B:'Kızıl Kıvılcım',C:'Gece Yıldızı',D:'Bordo Dalga'};
let liveRoundKey=null,lastLiveQueues=null,lastLiveGift=null,lastSupportAt=0,lastAtmosphereAt=0,voiceSequence=0;
const announcedMilestones=new Set();
function speakLiveLine(line,key=null,important=false){
 const audio=window.AIFootballAudio;
 if(!audio?.announce||(!important&&audio.announcing)||!audio.enabled||document.hidden)return false;
 const setting=window.__AI_FOOTBALL_SETTINGS||{};
 if(setting.aiSpeechEnabled===false||setting.soundEnabled===false)return false;
 Promise.resolve(audio.announce(line,key,{important})).catch(error=>console.warn('Canlı spiker',error));
 return true;
}
/* Explanations before kickoff: viewers hear why gifts are queued instead
   of silently expecting an instant shot. No voice flood while waiting. */
let preWaitingKey=null,preWaitingSince=0,lastPreWaitingSpeech=0,preWaitingVariant=0;
let preparationKey=null;
const prepMilestones=new Set();
function preMatchSpeechTick(){
 const game=window.AIFootballTikTok;
 const clock=game?.getMatchClock?.(),phase=game?.getMatchState?.();
 if(!clock||!phase||document.hidden)return;
 const now=Date.now();
 if(phase.waiting&&!phase.results&&!phase.running&&!phase.starting){
  const key=String(clock.round||0)+':'+String(clock.finishedAt||0)+':'+String(clock.startedAt||'idle');
  if(preWaitingKey!==key){
   preWaitingKey=key;preWaitingSince=now;lastPreWaitingSpeech=0;
  }
  if(now-preWaitingSince<8000||lastPreWaitingSpeech&&now-lastPreWaitingSpeech<75000)return;
  const queues=game.getPendingQueue?.()||{},total=Object.values(queues).reduce((n,v)=>n+Math.max(0,Number(v)||0),0);
  const english=currentLanguage()==='en';
  const withShots=english?[
   'The referee has not started the match yet. '+total+' shots are waiting and will play automatically after kickoff.',
   'Your shot gifts are saved. '+total+' shots are queued until the referee starts the game.',
   'Stand by for kickoff! '+total+' shots are ready; no player shoots before the match begins.',
   'The teams are ready. '+total+' shots will be played in order when the match starts.'
  ]:[
   'Hakemin maçı başlatması bekleniyor. '+total+' şut sırada. Maç başlayınca otomatik kullanılacak.',
   'Şut hediyeleriniz kaydedildi. '+total+' şut bekliyor; başlama düdüğünden önce oyuncular şut çekmez.',
   'Maç henüz başlamadı! '+total+' şut hazır, hakem başlatınca sırayla oynatılacak.',
   'Takımlar hazır. Biriken '+total+' şut maç aktif olduğunda otomatik olarak kullanılacak.'
  ];
  const withoutShots=english?[
   'The referee has not started the match yet. You can send shot gifts now; they will be saved for kickoff.',
   'The match is waiting for the referee. Gift shots will be queued and played when the match starts.',
   'Before kickoff, any new shot gifts are stored safely until the game begins.',
   'The players are getting ready. Shots sent now will begin automatically after kickoff.'
  ]:[
   'Hakemin maçı başlatması bekleniyor. Şimdi gönderilen şut hediyeleri kaydedilip maç başlayınca kullanılacak.',
   'Maç henüz başlamadı. Şut gönderebilirsiniz; hediyeler sıraya alınır, oyuncular düdükle birlikte şut çeker.',
   'Oyuncular başlama düdüğünü bekliyor. Gelen hediyeler kaybolmaz, maç başlayınca otomatik oynanır.',
   'Doruk Arenası’nda hazırlıklar sürüyor. Şimdi gelen şutlar başlayacak maça saklanıyor.'
  ];
  const lines=total>0?withShots:withoutShots;
  const variant=preWaitingVariant++%lines.length;
  if(speakLiveLine(lines[variant],english?null:'waiting'+(variant+1)))lastPreWaitingSpeech=now;
  return;
 }
 preWaitingKey=null;
 if(!phase.starting||phase.results||!Number.isFinite(clock.startedAt))return;
 const key=String(clock.round||0)+':'+String(clock.startedAt);
 if(key!==preparationKey){preparationKey=key;prepMilestones.clear();}
 const remaining=Math.ceil((clock.startedAt-now)/1000);
 if(remaining<=16&&remaining>=13&&!prepMilestones.has('15')){
  const line=currentLanguage()==='en'?
   'Fifteen seconds until kickoff. All queued shots will begin playing in order when the match starts.':
   'Maçın başlamasına on beş saniye kaldı! Biriken şutlar başlama düdüğüyle sırayla oynanacak.';
  if(speakLiveLine(line,currentLanguage()==='tr'?'prepare15':null))prepMilestones.add('15');
 }else if(remaining<=6&&remaining>=3&&!prepMilestones.has('5')){
  const line=currentLanguage()==='en'?
   'Five seconds! Get ready, the match is about to begin.':
   'Son beş saniye! Takımlar hazır, maç birazdan başlıyor!';
  if(speakLiveLine(line,currentLanguage()==='tr'?'prepare5':null))prepMilestones.add('5');
 }
}

function liveCommentaryTick(){
 const game=window.AIFootballTikTok,audio=window.AIFootballAudio;
 if(!game?.getPendingQueue||!game?.getMatchState||!game?.getMatchClock||!audio)return;
 const info=game.getMatchState(),clock=game.getMatchClock(),queues=game.getPendingQueue();
 if(!clock||!queues||document.hidden)return;
 const roundKey=String(clock.round||0)+':'+String(clock.startedAt||'waiting');
 if(roundKey!==liveRoundKey){
  liveRoundKey=roundKey;lastLiveQueues={...queues};lastLiveGift=game.getStatus?.().lastGift?.id||null;
  announcedMilestones.clear();lastAtmosphereAt=Date.now();return;
 }
 const now=Date.now();
 const gift=game.getStatus?.().lastGift;
 let addedTeam=null,addedCount=0;
 for(const t of ['A','B','C','D']){
  const change=Number(queues[t]||0)-Number(lastLiveQueues?.[t]||0);
  if(change>addedCount){addedCount=change;addedTeam=t;}
 }
 if(gift?.id&&gift.id!==lastLiveGift){
  if(!addedTeam&&LIVE_TEAM_NAMES[gift.team]){addedTeam=gift.team;addedCount=Number(gift.count)||1;}
  lastLiveGift=gift.id;
 }
 lastLiveQueues={...queues};
 const total=Object.values(queues).reduce((sum,n)=>sum+(Number(n)||0),0);
 if(!info.results&&(info.running||info.waiting||info.starting)&&addedTeam&&now-lastSupportAt>=14000){
  const team=LIVE_TEAM_NAMES[addedTeam],count=queues[addedTeam]||addedCount;
  const active=info.running===true;
  const idleVariants=[
   team+' taraftarlarından yeni şut desteği geldi. '+count+' şut hazır, başlama düdüğünü bekliyor.',
   'Yeni hediye için teşekkürler! '+team+' takımının şutları sırada. Maç başlar başlamaz kullanılacak.',
   team+' cephesi güçleniyor! Şut hediyeleri kaydedildi; henüz oyuncular harekete geçmiyor.',
   'Şut kuyruğunda hareket var. '+team+' için gelen hediyeler maçın başlamasıyla sırayla oynanacak.'
  ],liveVariants=[
   team+' takımına yeni şut geldi! Bekleyen '+count+' şut sırayla kullanılacak.',
   'Tribünlerden '+team+' tarafına destek! Yeni şutlar kuyruğa eklendi.',
   team+' için bir şut hediyesi daha! Sahadaki sırayı takip ediyoruz.',
   'Hediyeler gelmeye devam ediyor. '+team+' için '+count+' şut bekliyor.'
  ];
  const variants=active?liveVariants:idleVariants;const pick=voiceSequence++;
  if(speakLiveLine(variants[pick%variants.length],active?'support'+(pick%3+1):'waiting'+(pick%4+1))){lastSupportAt=now;lastAtmosphereAt=now;}
 }
 if(!info.running||!Number.isFinite(clock.startedAt))return;
 const t=game.getTimings?.()||{},totalDuration=((Number(t.normalMinutes)||25)+(Number(t.overtimeMinutes)||0))*60000;
 const leftMs=totalDuration-(now-clock.startedAt),remaining=Math.ceil(leftMs/1000);
 if(remaining<=0)return;
 const milestones=[
  [300,['Maçın bitmesine beş dakika kaldı! Son bölümde her şut çok değerli.']],
  [120,['Son iki dakikaya girdik. Takımlar için şut desteği kritik hale geliyor.']],
  [60,['Maçın bitmesine son bir dakika! Skor hâlâ değişebilir.']],
  [30,['Maçın bitmesine son otuz saniye! Son bölümde her şut çok değerli.','Son yarım dakikadayız! Final düdüğüne kadar heyecan devam ediyor.','Otuz saniye kaldı! Takımlar son fırsatlarını değerlendirmek istiyor.']],
  [20,['Yirmi saniye kaldı! Tribünlerde heyecan giderek yükseliyor.']],
  [10,['Son on saniye! Final düdüğü artık çok yakın.']],
  [5,['Beş saniye kaldı! Maçın son anlarını yaşıyoruz.']]
 ];
 for(const [point,lines] of milestones){
  const tag=roundKey+':'+point;
  if(remaining<=point&&remaining>point-3&&!announcedMilestones.has(tag)){
   const pick=Math.max(0,Number(clock.round)||0)%lines.length;
   if(speakLiveLine(lines[pick],point===30?'final30'+['a','b','c'][pick]:'final'+point,point===30)){announcedMilestones.add(tag);lastAtmosphereAt=now;lastSupportAt=now;}
   return;
  }
 }
 // A quiet pitch should still invite the audience to participate.
 // Only when the match is actually running, no shot is in progress and
 // there are no pending shots. Space prompts out to avoid repetitive speech.
 if(total===0&&!game?.getCurrentCue?.()?.id&&now-lastAtmosphereAt>=55000&&now-lastSupportAt>=22000){
  const variants=[
   'Şu anda şut sırası boş! Hangi takım önce atağa geçecek? Taraftarların desteğini bekliyoruz.',
   'Sahada şut bekleniyor! Desteklediğiniz takım için şut hediyesi göndererek oyuna katılabilirsiniz.',
   'Dört takım da hazır ama bekleyen şut yok. Doruk Arenası’nda ilk hareketi hangi taraftar başlatacak?',
   'Şut kuyruğu boşaldı. Bir hediye ile takımınızı hücuma çıkarabilir, heyecanı yeniden başlatabilirsiniz.',
   'Kaleci gözünü topa dikti fakat henüz sırada şut yok. Taraftarların yeni hamlesini bekliyoruz.'
  ];
  const pick=voiceSequence++;
  if(speakLiveLine(variants[pick%variants.length],'empty'+(pick%3+1),false))lastAtmosphereAt=now;
  return;
 }
 if(remaining>30&&total>0&&now-lastAtmosphereAt>=48000){
  const variants=[
   'Şut sırası doluyor, şu anda toplam '+total+' bekleyen şut var.',
   'Takımların taraftarları mücadeleyi canlı tutuyor. '+total+' şut sırasını bekliyor.',
   'Oyuncular hazır; '+total+' şut henüz kullanılmadı. Yeni hediyeler geldikçe sıra güncelleniyor.',
   'Doruk Arenası’nda tempo yükseliyor. Bekleyen '+total+' şut bizi heyecanlandırıyor.'
  ];
  const pick=voiceSequence++;if(speakLiveLine(variants[pick%variants.length],'queued'+(pick%2+1)))lastAtmosphereAt=now;
 }
}
setInterval(preMatchSpeechTick,1000);
setInterval(liveCommentaryTick,1500);

setInterval(watchKickoff,150);
})();
