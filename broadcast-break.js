/* Local visual effects and synthesized applause: no third-party recordings. */
(()=>{
 'use strict';
 let frame=null,lastResult=null,announced=null,ctx=null;
 const policy=()=>window.AIFootballPolicy;
 function speak(text){
  if(!window.AIFootballAudio?.enabled||!window.AIFootballAudio?.settings.announcerEnabled||!window.speechSynthesis)return;
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang='tr-TR';
  const voice=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('tr'));
  if(voice)utterance.voice=voice;
  utterance.volume=Math.min(1,(window.AIFootballAudio.settings.soundMaster??88)/100);
  speechSynthesis.speak(utterance);
 }
 function celebrate(){
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
   const layer=document.createElement('div');layer.setAttribute('aria-hidden','true');
   layer.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:95;overflow:hidden';
   for(let i=0;i<60;i++){
    const piece=document.createElement('i');
    piece.style.cssText=`position:absolute;top:-20px;left:${Math.random()*100}%;width:7px;height:12px;background:${['#ffe168','#64cfff','#ff7a98','#fff'][i%4]}`;
    layer.append(piece);piece.animate([{transform:'translateY(0) rotate(0)'},{transform:`translateY(105vh) rotate(${360+i*17}deg)`}],{duration:2200+Math.random()*1800,delay:Math.random()*600,fill:'forwards'});
   }
   document.body.append(layer);setTimeout(()=>layer.remove(),5000);
  }
  if(!window.AIFootballAudio?.enabled)return;
  try{
   ctx ||= new AudioContext();if(ctx.state!=='running')return;
   const buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.12),ctx.sampleRate),data=buffer.getChannelData(0);
   for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*.025));
   for(let i=0;i<50;i++){
    const source=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
    source.buffer=buffer;filter.type='highpass';filter.frequency.value=700;
    const settings=window.AIFootballAudio.settings;
    gain.gain.value=.22*(settings.soundMaster/100)*(settings.soundEffects/100);
    source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
    source.start(ctx.currentTime+i*.065+Math.random()*.05);
   }
  }catch(error){console.warn('Alkış sesi başlatılamadı',error);}
 }
 document.addEventListener('pointerdown',()=>{try{ctx ||= new AudioContext();ctx.resume().catch(()=>{});}catch{}},{once:true});
 function update(m){
  if(!m||!policy())return;
  const now=Date.now(),ended=Number.isFinite(m.clock?.finishedAt),phase=policy().phase(m,now);
  if(ended&&phase==='league'){
   if(!frame){
    frame=document.createElement('iframe');frame.title='Maç arası lig tablosu';frame.src='./league.html?embedded=1';
    frame.style.cssText='position:absolute;inset:80px 0 0;width:100%;height:calc(100% - 80px);border:0;z-index:40;background:#08111e';
    document.querySelector('.wrap')?.append(frame);
   }
  }else if(frame){frame.remove();frame=null;}
  if(ended&&lastResult!==m.clock.finishedAt){
   lastResult=m.clock.finishedAt;
   // Late joiners do not replay celebrations after the winner screen.
   if(phase==='winner'&&!m.clock.interrupted){
    if(m.clock.winner){celebrate();speak('Kazananımız '+policy().names[m.clock.winner]+'. Alkışlıyoruz!');}
    else speak('Maç berabere tamamlandı.');
   }
  }
  const c=policy().controls(m),left=ended?policy().breakMs-(now-m.clock.finishedAt):Infinity;
  if(ended&&c.autoContinue&&!c.adminStarts&&!m.league?.finalRequired&&left<=60000&&left>55000&&announced!==m.clock.finishedAt){
   announced=m.clock.finishedAt;speak('Yeni maç altmış saniye sonra başlayacak.');
  }
  for(const key of ['autoContinue','adminStarts']){
   const input=document.getElementById(key);
   if(input&&!input.matches(':focus'))input.checked=c[key];
  }
  const start=document.getElementById('startNextMatch');
  if(start)start.disabled=!policy().canStart(m,now,true);
  const status=document.getElementById('matchControlStatus');
  if(status&&!status.dataset.error)status.textContent=m.league?.finalRequired?'Şampiyonluk eşitliği: final maçı uygulanana kadar kupa ve yeni sezon bekletilir.':'Maç arası 3 dakika. Admin başlatma seçeneği önceliklidir. Şutlar korunur.';
 }
 document.addEventListener('DOMContentLoaded',()=>{
  const report=async(action)=>{
   const status=document.getElementById('matchControlStatus');
   try{if(!await action())throw Error('Ayar kaydedilemedi; admin oturumunu ve bağlantıyı kontrol edin.');delete status.dataset.error;}
   catch(error){status.dataset.error='true';status.textContent=error.message;}
  };
  document.getElementById('exportMatch')?.addEventListener('click',()=>{const snapshot=window.AIFootballTikTok?.exportMatch();if(!snapshot)return;const url=URL.createObjectURL(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),match:snapshot},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='football-match-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  for(const key of ['autoContinue','adminStarts'])document.getElementById(key)?.addEventListener('change',e=>report(()=>window.AIFootballTikTok.setControl(key,e.target.checked)));
  document.getElementById('startNextMatch')?.addEventListener('click',()=>report(()=>window.AIFootballTikTok.startNextMatch()));
 });
 window.AIFootballBreak={update};
})();
