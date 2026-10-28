/* Owner-side gift notification. No game writes, shot changes or spectator audio. */
(()=>{'use strict';
 const PREF='afl.giftBeep.enabled.v355',RECEIPTS='afl.giftBeep.receipts.v355';
 let enabled=false,ctx=null,nextAt=0,played=0,control=null,status=null;
 const active=new Set(),memory=new Map();
 try{enabled=localStorage.getItem(PREF)==='true';}catch{}
 const owner=()=>{try{return adminAuthed===true&&!window.AIFootballOBSViewer;}catch{return false;}};
 function update(){if(control)control.checked=enabled;if(status)status.textContent=!enabled?'Kapalı':ctx?.state==='running'?'Açık · Arka planda da bildirim verir':'Açık · Sesi etkinleştirmek için “Bipi dene” düğmesine bas.';}
 async function unlock(){if(!owner())return false;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;if(!ctx||ctx.state==='closed')ctx=new Audio();if(ctx.state==='suspended')await ctx.resume();update();return ctx.state==='running';}catch{update();return false;}}
 function tone(){
  if(!enabled||!owner()||ctx?.state!=='running')return false;
  const at=Math.max(ctx.currentTime+.01,Math.min(nextAt,ctx.currentTime+2));nextAt=at+.26;
  for(const [frequency,offset]of [[880,0],[1320,.105]]){
   const oscillator=ctx.createOscillator(),gain=ctx.createGain(),start=at+offset;
   oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,start);
   gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.22,start+.008);gain.gain.exponentialRampToValueAtTime(.0001,start+.085);
   oscillator.connect(gain);gain.connect(ctx.destination);active.add(oscillator);
   oscillator.onended=()=>{active.delete(oscillator);oscillator.disconnect();gain.disconnect();};oscillator.start(start);oscillator.stop(start+.09);
  }
  played++;return true;
 }
 async function setEnabled(value){enabled=!!value;try{localStorage.setItem(PREF,String(enabled));}catch{}if(!enabled){for(const source of active)try{source.stop();}catch{}active.clear();nextAt=0;}update();if(enabled)await unlock();return enabled;}
 function receipt(g,room){
  if(!owner())return false;
  const id=g?.transactionId??g?.msgId??g?.common?.msgId??g?.id,gift=g?.giftId??g?.giftDetails?.giftId??g?.giftName??g?.giftDetails?.giftName;
  const units=Number(g?.repeatCount??1);if(!id||!gift||!Number.isSafeInteger(units)||units<1||units>10000)return false;
  const user=g.userId??g.user?.userId??g.user?.id??g.uniqueId??g.user?.uniqueId??'',group=g.groupId??g.group_id??g.giftDetails?.groupId;
  const combo=Number(g.giftType??g.giftDetails?.giftType)===1;
  const key=JSON.stringify([String(room||''),String(user),String(gift),combo&&group!=null?'combo:'+group:'event:'+id]);
  const now=Date.now();try{const saved=JSON.parse(localStorage.getItem(RECEIPTS)||'[]');if(Array.isArray(saved))for(const [k,v]of saved)if(v?.at>now-86400000)memory.set(k,v);}catch{}
  const previous=memory.get(key),total=combo?units:1;if(previous?.units>=total)return false;
  memory.set(key,{units:total,at:now});for(const [k,v]of memory)if(v.at<now-86400000)memory.delete(k);while(memory.size>2000)memory.delete(memory.keys().next().value);
  try{localStorage.setItem(RECEIPTS,JSON.stringify([...memory]));}catch{}
  // A new streak increment sounds once; its repeated final message is silent.
  return tone();
 }
 async function receive(g,room){try{if(navigator.locks?.request)return await navigator.locks.request('afl-gift-beep-v355',()=>receipt(g,room));return receipt(g,room);}catch{return false;}}
 async function test(){if(!enabled||!await unlock())return false;return tone();}
 function install(){
  const panel=document.getElementById('adminCategory-audio');if(!panel||document.getElementById('giftBeepSettings'))return;
  const section=document.createElement('section');section.id='giftBeepSettings';section.className='adminSection';
  const title=document.createElement('div');title.className='adminSectionTitle';title.textContent='HEDİYE BİLDİRİM SESİ';
  const label=document.createElement('label');label.className='adminToggle';const text=document.createElement('span');text.textContent='Bu cihazda hediye gelince bip çal';
  control=document.createElement('input');control.type='checkbox';control.id='setGiftBeepEnabled';control.checked=enabled;control.addEventListener('change',()=>{void setEnabled(control.checked);});label.append(text,control);
  const hint=document.createElement('p');hint.textContent='Her yeni hediye bildirimi için kısa çift bip. Spiker ve stadyum sesinden bağımsızdır. Yalnız bu yönetici cihazında çalışır; OBS ve izleyici ekranında çalmaz. Ayar anında kaydedilir.';
  const button=document.createElement('button');button.type='button';button.className='adminBtn';button.id='testGiftBeep';button.textContent='Bipi dene';button.addEventListener('click',()=>{void test();});
  status=document.createElement('p');status.id='giftBeepStatus';status.setAttribute('role','status');section.append(title,label,hint,button,status);panel.prepend(section);update();
 }
 document.addEventListener('pointerdown',()=>{if(enabled&&owner())void unlock();},{passive:true});
 window.addEventListener('storage',event=>{if(event.key===PREF){enabled=event.newValue==='true';if(!enabled){for(const source of active)try{source.stop();}catch{}active.clear();nextAt=0;}update();}});
 window.AIFootballGiftBeep={receive,setEnabled,test,getStatus:()=>({enabled,ready:ctx?.state==='running',played})};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
