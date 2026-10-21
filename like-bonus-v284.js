/* Like bonuses use authenticated game writes; this module only validates/mutates a draft. */
(()=>{'use strict';
 const TEAMS=['A','B','C','D'],LIMIT=1000;
 const threshold=m=>{const n=Number(m?.likeBonus?.threshold);return Number.isSafeInteger(n)&&n>=1&&n<=1000000?n:LIMIT;};
 const integer=(v,min=0)=>v!=null&&v!==''&&Number.isSafeInteger(Number(v))&&Number(v)>=min&&Number(v)<=1e12?Number(v):null;
 function parse(raw,room,now){
  if(String(raw?.event||raw?.type||'').toLowerCase()!=='like')return null;
  const d=raw.data||{},u=d.user||{},total=integer(d.totalLikeCount??d.totalLikes),count=integer(d.likeCount??d.count,1);
  const uid=String(d.userId??d.user_id??u.userId??u.user_id??u.id??'').trim(),handle=String(d.uniqueId??u.uniqueId??'').trim().toLowerCase();
  const viewer=uid&&uid!=='0'?'id:'+uid:handle?'handle:'+handle:'';
  const id=String(d.msgId??d.common?.msgId??d.id??d.eventId??(total===null?'':'total:'+total)).slice(0,200);
  if(!viewer||viewer.length>200||count===null||!id)return null;
  const key=String(d.roomId??d.room_id??d.common?.roomId??room??'').slice(0,100)||'unknown-'+new Date(now).toISOString().slice(0,10);
  return {key,viewer,total,count,id,at:now};
 }
 function status(m){const b=m?.likeBonus||{},people=Object.values(b.viewers||{}),progress=people.reduce((n,p)=>Math.max(n,p.progress||0),0);return {enabled:b.enabled!==false,threshold:threshold(m),scope:'viewer',viewers:people.length,progress,awarded:b.scope==='viewer'?Number(b.awarded)||0:0,observed:b.scope==='viewer'?Number(b.observed)||0:0};}
 function apply(m,batch,now){
  let changed=false,rounds=0;
  const b=m.likeBonus||={enabled:true,retired:[]};
  for(const e of batch){
   if(!e||typeof e.key!=='string'||!e.key||typeof e.viewer!=='string'||!e.viewer||!e.id||!Number.isFinite(e.at)||e.at<=Number(b.resetAt||0)||integer(e.count,1)===null||e.total!==null&&integer(e.total)===null)continue;
   if(b.scope!=='viewer'){
    // Historical room totals cannot be attributed to individuals. Earned jobs stay intact.
    b.scope='viewer';b.viewers={};b.progress=0;b.observed=0;b.awarded=0;
    b.current=b.current?{key:b.current.key,seen:[],floor:null}:null;changed=true;
   }
   if(b.current?.key!==e.key){
    if((b.retired||[]).includes(e.key))continue;
    if(b.current)(b.retired||=[]).push(b.current.key);
    b.retired=(b.retired||[]).slice(-32);b.viewers={};b.progress=0;b.observed=0;b.awarded=0;
    b.current={key:e.key,seen:[],floor:null};changed=true;
   }
   const c=b.current,receipt=JSON.stringify([e.viewer,e.id]);
   if(c.seen.some(x=>x.id===receipt)||e.total!==null&&c.floor!==null&&e.total<=c.floor)continue;
   c.seen.push({id:receipt,total:e.total});
   // A cumulative room total is only a replay boundary, never a person's like count.
   if(c.seen.length>4000){const removed=c.seen.splice(0,c.seen.length-4000);for(const x of removed)if(x.total!==null)c.floor=Math.max(c.floor||0,x.total);}
   changed=true;
   if(b.enabled===false||e.at<=Number(b.enabledAt||0))continue;
   const p=b.viewers[e.viewer]||={progress:0,observed:0,awarded:0};
   p.observed+=e.count;const limit=threshold(m),sum=p.progress+e.count,n=Math.floor(sum/limit);p.progress=sum%limit;p.awarded+=n;
   b.observed+=e.count;b.awarded+=n;rounds+=n;
  }
  if(b.scope==='viewer')b.progress=status(m).progress;
  if(rounds){
   m.jobs||=[];m.giftNotices||={};
   const stamp='likes:'+now+':'+b.awarded;
   for(const team of TEAMS){m.jobs.push({id:stamp+':'+team,team,count:rounds,nextIndex:0});m.giftNotices[team]={id:stamp+':'+team,at:now};}
   m.lastShotQueuedAt=now;b.lastAwardAt=now;
  }
  return {changed,rounds};
 }
 window.AIFootballLikeBonus={parse,apply,status};
 const overlay=document.getElementById('adminOverlay'),anchor=overlay?.querySelector('.adminSection');
 if(!anchor)return;
 const section=document.createElement('section');section.className='adminSection';section.id='likeBonusSettings';
 const title=document.createElement('div');title.className='adminSectionTitle';title.textContent='KİŞİ BAŞI BEĞENİ BONUSU';
 const info=document.createElement('p');info.className='giftToggleHelp';
 const toggle=document.createElement('button');toggle.type='button';toggle.className='adminBtn applyBtn';toggle.id='likeBonusToggle';
 const reset=document.createElement('button');reset.type='button';reset.className='adminBtn logoutBtn';reset.id='likeBonusReset';reset.textContent='BEĞENİ SAYACINI SIFIRLA';
 const help=document.createElement('p');help.className='giftToggleHelp';help.textContent='Her izleyicinin beğenileri ayrı sayılır. Aynı izleyici her 1000 beğeniyi tamamladığında dört takıma birer şut eklenir. Canlı yayında açıp kapatabilirsin. Kapalıyken beğeniler şut kazandırmaz; tekrar açınca önceki ilerlemeden devam eder. Hediyelerden gelen şutlar ve bekleyen şutlar etkilenmez.';
 const field=document.createElement('label');field.textContent='Birer şut için kişi başı beğeni: ';
 const input=document.createElement('input');input.type='number';input.id='likeBonusThreshold';input.min='1';input.max='1000000';input.step='1';input.value='1000';input.style.cssText='width:130px;background:#102039;color:#fff;border:1px solid #627a98;border-radius:8px;padding:10px;font:inherit';field.append(input);
 const save=document.createElement('button');save.type='button';save.className='adminBtn applyBtn';save.id='likeBonusThresholdSave';save.textContent='BEĞENİ ADEDİNİ KAYDET';
 const feedback=document.createElement('p');feedback.id='likeBonusFeedback';feedback.className='giftToggleHelp';feedback.setAttribute('role','status');
 const thresholdHelp=document.createElement('p');thresholdHelp.className='giftToggleHelp';thresholdHelp.textContent='Adedi değiştirince kişi başı biriken beğeni ilerlemesi sıfırdan başlar. Kazanılmış şutlar korunur. Sayacı Sıfırla düğmesi de bekleyen şutları silmez.';
 let editing=false;input.addEventListener('input',()=>{editing=true;});
 save.addEventListener('click',async()=>{const value=Number(input.value);if(!Number.isSafeInteger(value)||value<1||value>1000000){feedback.textContent='1 ile 1000000 arasında tam sayı gir.';return;}save.disabled=true;try{const api=window.AIFootballTikTok;if(!api)throw Error('Maç bağlantısı hazır değil.');if(api.getLikeBonusStatus().threshold!==value&&!await api.setLikeBonusThreshold(value))throw Error('Kaydedilemedi. Yönetici oturumunu ve bağlantıyı kontrol et.');editing=false;feedback.textContent='Kişi başı '+value+' beğeni olarak kaydedildi.';render();}catch(error){feedback.textContent=error.message||'Kaydedilemedi.';}finally{save.disabled=false;}});
 const actions=document.createElement('div');actions.className='adminActions';actions.append(toggle,reset);section.append(title,info,field,save,feedback,thresholdHelp,actions,help);anchor.after(section);
 function render(){const api=window.AIFootballTikTok,s=api?.getLikeBonusStatus?.();if(!s)return;if(!editing&&document.activeElement!==input)input.value=String(s.threshold);title.textContent='KİŞİ BAŞI '+s.threshold+' BEĞENİ BONUSU';help.textContent='Her izleyici kendi '+s.threshold+' beğenisini tamamlayınca dört takıma birer şut eklenir. Canlı yayında açıp kapatabilirsin. Kapalı süredeki beğeniler sayılmaz; önceki ilerleme korunur. Hediyelerin şutları eklenmeye devam eder.';const label=s.enabled?'BEĞENİ BONUSUNU KAPAT':'BEĞENİ BONUSUNU AÇ',text='DURUM: '+(s.enabled?'AÇIK':'KAPALI')+' · '+'İZLEYİCİ: '+s.viewers+' · ÖDÜLE EN YAKIN KİŞİ: '+(s.threshold-s.progress)+' BEĞENİ · VERİLEN BONUS: '+s.awarded;toggle.setAttribute('aria-pressed',String(s.enabled));if(toggle.textContent!==label)toggle.textContent=label;if(info.textContent!==text)info.textContent=text;}
 toggle.addEventListener('click',async()=>{const api=window.AIFootballTikTok;if(!api)return;toggle.disabled=true;try{await api.setLikeBonusEnabled(!api.getLikeBonusStatus().enabled);}finally{toggle.disabled=false;render();}});
 reset.addEventListener('click',async()=>{reset.disabled=true;try{await window.AIFootballTikTok?.resetLikeBonusCounter();}finally{reset.disabled=false;render();}});
 setInterval(render,1500);render();
})();
