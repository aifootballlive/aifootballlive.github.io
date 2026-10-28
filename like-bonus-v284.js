/* Like bonuses use authenticated game writes; this module only validates/mutates a draft. */
(()=>{'use strict';
 const TEAMS=['A','B','C','D'],LIMIT=1000;
 const countMode=m=>m?.likeBonus?.countMode==='global'?'global':'personal';
 const threshold=m=>{const n=Number(m?.likeBonus?.threshold);return Number.isSafeInteger(n)&&n>=1&&n<=1000000?n:LIMIT;};
 const integer=(v,min=0)=>v!=null&&v!==''&&Number.isSafeInteger(Number(v))&&Number(v)>=min&&Number(v)<=1e12?Number(v):null;
 function parse(raw,room,now){
  if(String(raw?.event||raw?.type||'').toLowerCase()!=='like')return null;
  const d=raw.data||{},u=d.user||{},total=integer(d.totalLikeCount??d.totalLikes),count=integer(d.likeCount??d.count,1);
  const uid=[d.userId,d.user_id,u.userId,u.user_id,u.id,u.idStr].map(v=>String(v??'').trim()).find(v=>v&&v!=='0')||'',handle=[d.uniqueId,u.uniqueId,u.unique_id].map(v=>String(v??'').trim().toLowerCase()).find(Boolean)||'';
  const viewer=uid&&uid!=='0'?'id:'+uid:handle?'handle:'+handle:'room';
  const id=String(d.msgId??d.common?.msgId??d.id??d.eventId??(total===null?'':'total:'+total)).slice(0,200);
  if(viewer.length>200||(count===null&&total===null)||!id)return null;
  const key=String(d.roomId??d.room_id??d.common?.roomId??room??'').slice(0,100)||'unknown-'+new Date(now).toISOString().slice(0,10);
  return {key,viewer,total,count:count??0,id,at:now};
 }
 function status(m){const b=m?.likeBonus||{},selected=countMode(m),active=b.scope===selected,people=b.personal||{};return {enabled:b.enabled!==false,threshold:threshold(m),scope:selected,notice:active&&b.notice?{...b.notice}:null,viewers:active?Object.keys(b.viewers||{}).length:0,progress:active?(selected==='personal'?Math.max(0,...Object.values(people).map(p=>Number(p.progress)||0)):Number(b.progress)||0):0,awarded:active?Number(b.awarded)||0:0,observed:active?Number(b.observed)||0:0,unattributed:active?Number(b.unattributed)||0:0};}
 function setScope(m,value,at){if(!['personal','global'].includes(value))return false;const b=m.likeBonus||={enabled:true,retired:[]};if(b.countMode===value&&b.scope===value)return false;b.countMode=value;b.scope=value;b.viewers={};b.personal={};b.progress=0;b.observed=0;b.awarded=0;b.unattributed=0;b.scopeChangedAt=at;delete b.notice;return true;}
 function apply(m,batch,now){
  let changed=false,rounds=0;
  const b=m.likeBonus||={enabled:true,retired:[]};
  for(const e of batch){
   if(!e||typeof e.key!=='string'||!e.key||typeof e.viewer!=='string'||!e.viewer||!e.id||!Number.isFinite(e.at)||e.at<=Number(b.resetAt||0)||integer(e.count)===null||e.total!==null&&integer(e.total)===null)continue;
   if(b.scope!==countMode(m)){
    // A mode change starts fresh progress; earned shot jobs remain intact.
    // Existing earned jobs and receipt boundaries are preserved.
    b.scope=countMode(m);b.countMode=b.scope;b.viewers={};b.personal={};b.unattributed=0;b.progress=0;b.observed=0;b.awarded=0;
    if(b.current){b.current.total=null;b.current.unanchored=0;}changed=true;
   }
   if(b.current?.key!==e.key){
    if((b.retired||[]).includes(e.key))continue;
    if(b.current)(b.retired||=[]).push(b.current.key);
    b.retired=(b.retired||[]).slice(-32);b.viewers={};b.personal={};b.unattributed=0;b.progress=0;b.observed=0;b.awarded=0;
    b.current={key:e.key,seen:[],floor:null,total:null,unanchored:0};changed=true;
   }
   const c=b.current,receipt=JSON.stringify([e.viewer,e.id]);
   if(c.seen.some(x=>x.id===receipt)||e.total!==null&&c.floor!==null&&e.total<=c.floor)continue;
   c.seen.push({id:receipt,total:e.total});
   if(c.seen.length>4000){const removed=c.seen.splice(0,c.seen.length-4000);for(const x of removed)if(x.total!==null)c.floor=Math.max(c.floor||0,x.total);}
   changed=true;
   let delta=e.count;
   if(e.total!==null){
    if(c.total!==null&&c.total!==undefined){if(e.total<=c.total){if(countMode(m)==='global')continue;delta=0;}else delta=Math.max(0,e.total-c.total-(Number(c.unanchored)||0));}
    c.total=Math.max(Number(c.total)||0,e.total);c.unanchored=0;
   }else c.unanchored=(Number(c.unanchored)||0)+delta;
   // Always advance the room baseline while disabled, but never award it later.
   if(b.enabled===false||e.at<=Number(b.enabledAt||0)||e.at<=Number(b.scopeChangedAt||0))continue;
   if(countMode(m)==='personal'){
    if(e.viewer==='room'){b.unattributed=(Number(b.unattributed)||0)+e.count;continue;}
    if(!e.count)continue;
    b.personal||={};if(!b.personal[e.viewer]&&Object.keys(b.personal).length>=10000)continue;
    const person=b.personal[e.viewer]||={progress:0,observed:0,awarded:0},sum=(Number(person.progress)||0)+e.count,n=Math.floor(sum/threshold(m));
    person.progress=sum%threshold(m);person.observed+=e.count;person.awarded+=n;b.viewers[e.viewer]=true;b.observed=(Number(b.observed)||0)+e.count;b.awarded=(Number(b.awarded)||0)+n;rounds+=n;continue;
   }
   if(e.viewer!=='room')b.viewers[e.viewer]=true;
   const sum=(Number(b.progress)||0)+delta,n=Math.floor(sum/threshold(m));
   b.progress=sum%threshold(m);b.observed=(Number(b.observed)||0)+delta;b.awarded=(Number(b.awarded)||0)+n;rounds+=n;
  }
  if(rounds){
   m.jobs||=[];m.giftNotices||={};
   const stamp='likes:'+now+':'+b.awarded;
   b.notice={id:stamp,at:now,rounds,threshold:threshold(m),savedForLive:!!m.practiceMode};
   for(const team of TEAMS){(m.practiceMode?(m.savedLiveJobs||=[]):m.jobs).push({id:stamp+':'+team,team,count:rounds,nextIndex:0});m.giftNotices[team]={id:stamp+':'+team,at:now,savedForLive:!!m.practiceMode};}
   m.lastShotQueuedAt=now;b.lastAwardAt=now;
  }
  return {changed,rounds};
 }
 window.AIFootballLikeBonus={parse,apply,status,setScope};
 const overlay=document.getElementById('adminOverlay'),anchor=overlay?.querySelector('.adminSection');
 if(!anchor)return;
 const section=document.createElement('section');section.className='adminSection';section.id='likeBonusSettings';
 const title=document.createElement('div');title.className='adminSectionTitle';title.textContent='TOPLAM BEĞENİ BONUSU';
 const info=document.createElement('p');info.className='giftToggleHelp';
 const modeField=document.createElement('label');modeField.textContent='Beğeni sayımı: ';const modeInput=document.createElement('select');modeInput.id='likeBonusScope';modeInput.style.cssText='display:block;width:100%;margin:8px 0 12px;background:#102039;color:#fff;border:1px solid #627a98;border-radius:8px;padding:10px;font:inherit';for(const [value,text]of [['personal','Kişi bazlı — Her izleyicinin sayacı ayrı'],['global','Tüm izleyicilerin toplamı']]){const option=document.createElement('option');option.value=value;option.textContent=text;modeInput.append(option);}modeField.append(modeInput);
 const toggle=document.createElement('button');toggle.type='button';toggle.className='adminBtn applyBtn';toggle.id='likeBonusToggle';
 const reset=document.createElement('button');reset.type='button';reset.className='adminBtn logoutBtn';reset.id='likeBonusReset';reset.textContent='BEĞENİ SAYACINI SIFIRLA';
 const help=document.createElement('p');help.className='giftToggleHelp';help.textContent='Tüm izleyicilerin beğenileri birlikte sayılır. Toplam her 1000 beğenide dört takıma birer şut eklenir. Canlı yayında açıp kapatabilirsin. Kapalıyken beğeniler şut kazandırmaz; tekrar açınca önceki ilerlemeden devam eder. Hediyelerden gelen şutlar ve bekleyen şutlar etkilenmez.';
 const field=document.createElement('label');field.textContent='Birer şut için beğeni adedi: ';
 const input=document.createElement('input');input.type='number';input.id='likeBonusThreshold';input.min='1';input.max='1000000';input.step='1';input.value='1000';input.style.cssText='width:130px;background:#102039;color:#fff;border:1px solid #627a98;border-radius:8px;padding:10px;font:inherit';field.append(input);
 const save=document.createElement('button');save.type='button';save.className='adminBtn applyBtn';save.id='likeBonusThresholdSave';save.textContent='BEĞENİ ADEDİNİ KAYDET';
 const feedback=document.createElement('p');feedback.id='likeBonusFeedback';feedback.className='giftToggleHelp';feedback.setAttribute('role','status');
 const thresholdHelp=document.createElement('p');thresholdHelp.className='giftToggleHelp';thresholdHelp.textContent='Beğeni adedini veya sayım şeklini değiştirince beğeni ilerlemesi yeniden başlar. Kazanılmış şutlar korunur. Sayacı Sıfırla düğmesi de bekleyen şutları silmez.';
 let editing=false;input.addEventListener('input',()=>{editing=true;});
 save.addEventListener('click',async()=>{const value=Number(input.value);if(!Number.isSafeInteger(value)||value<1||value>1000000){feedback.textContent='1 ile 1000000 arasında tam sayı gir.';return;}save.disabled=true;try{const api=window.AIFootballTikTok;if(!api)throw Error('Maç bağlantısı hazır değil.');if(api.getLikeBonusStatus().threshold!==value&&!await api.setLikeBonusThreshold(value))throw Error('Kaydedilemedi. Yönetici oturumunu ve bağlantıyı kontrol et.');editing=false;feedback.textContent=value+' beğeni olarak kaydedildi.';render();}catch(error){feedback.textContent=error.message||'Kaydedilemedi.';}finally{save.disabled=false;}});
 const actions=document.createElement('div');actions.className='adminActions';actions.append(toggle,reset);section.append(title,modeField,info,field,save,feedback,thresholdHelp,actions,help);anchor.after(section);
 function render(){const api=window.AIFootballTikTok,s=api?.getLikeBonusStatus?.();if(!s)return;modeInput.value=s.scope;const personal=s.scope==='personal';if(!editing&&document.activeElement!==input)input.value=String(s.threshold);title.textContent=(personal?'KİŞİ BAZLI ':'TOPLAM ')+s.threshold+' BEĞENİ BONUSU';help.textContent=personal?'Her izleyici kendi '+s.threshold+' beğenisinde dört takıma birer şut kazandırır. Farklı kişilerin beğenileri birleşmez. Kimliği belli olmayan beğeniler kişi bazlı bonus vermez.':'Tüm izleyicilerin toplam her '+s.threshold+' beğenisinde dört takıma birer şut eklenir.';const label=s.enabled?'BEĞENİ BONUSUNU KAPAT':'BEĞENİ BONUSUNU AÇ',text='DURUM: '+(s.enabled?'AÇIK':'KAPALI')+' · '+(personal?'EN YAKIN KİŞİ SAYACI: ':'TOPLAM İLERLEME: ')+s.progress+'/'+s.threshold+' · SONRAKİ BONUS İÇİN: '+(s.threshold-s.progress)+' BEĞENİ · VERİLEN BONUS: '+s.awarded;toggle.setAttribute('aria-pressed',String(s.enabled));if(toggle.textContent!==label)toggle.textContent=label;if(info.textContent!==text)info.textContent=text;}
 modeInput.addEventListener('change',async()=>{const value=modeInput.value;modeInput.disabled=true;try{const api=window.AIFootballTikTok;if(!api||!await api.setLikeBonusScope(value))throw Error('Sayım şekli kaydedilemedi.');feedback.textContent='Sayım şekli kaydedildi. Beğeni ilerlemesi yeniden başlar; kazanılmış şutlar korunur.';}catch(e){feedback.textContent=e.message;}finally{modeInput.disabled=false;render();}});
 toggle.addEventListener('click',async()=>{const api=window.AIFootballTikTok;if(!api)return;toggle.disabled=true;try{await api.setLikeBonusEnabled(!api.getLikeBonusStatus().enabled);}finally{toggle.disabled=false;render();}});
 reset.addEventListener('click',async()=>{reset.disabled=true;try{await window.AIFootballTikTok?.resetLikeBonusCounter();}finally{reset.disabled=false;render();}});
 setInterval(render,1500);render();
})();
