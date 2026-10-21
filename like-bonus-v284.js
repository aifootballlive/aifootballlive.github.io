/* Like bonuses use authenticated game writes; this module only validates/mutates a draft. */
(()=>{'use strict';
 const TEAMS=['A','B','C','D'],LIMIT=1000;
 const integer=(v,min=0)=>v!=null&&v!==''&&Number.isSafeInteger(Number(v))&&Number(v)>=min&&Number(v)<=1e12?Number(v):null;
 function parse(raw,room,now){
  if(String(raw?.event||raw?.type||'').toLowerCase()!=='like')return null;
  const d=raw.data||{},total=integer(d.totalLikeCount??d.totalLikes),count=integer(d.likeCount??d.count,1),id=String(d.msgId??d.id??d.eventId??'').slice(0,200);
  if(total===null&&(!id||count===null))return null;
  const key=String(d.roomId??d.room_id??d.common?.roomId??room??'').slice(0,100)||'unknown-'+new Date(now).toISOString().slice(0,10);
  return {key,total,count,id,at:now};
 }
 function status(m){const b=m?.likeBonus||{};return {enabled:b.enabled!==false,threshold:LIMIT,progress:Number(b.progress)||0,awarded:Number(b.awarded)||0,observed:Number(b.observed)||0};}
 function apply(m,batch,now){
  let changed=false,rounds=0;
  const b=m.likeBonus||={enabled:true,progress:0,awarded:0,observed:0,retired:[]};
  for(const e of batch){
   if(!e||typeof e.key!=='string'||!e.key||!Number.isFinite(e.at)||e.at<=Number(b.resetAt||0))continue;
   if(e.total!==null&&integer(e.total)===null||e.total===null&&(!e.id||integer(e.count,1)===null))continue;
   if(b.current?.key!==e.key){
    if((b.retired||[]).includes(e.key))continue;
    if(b.current)(b.retired||=[]).push(b.current.key);
    b.retired=(b.retired||[]).slice(-32);b.progress=0;b.observed=0;b.awarded=0;
    b.current={key:e.key,mode:e.total!==null?'total':'events',last:null,seen:[]};changed=true;
   }
   const c=b.current;let delta=0;
   if(c.mode==='total'){
    if(e.total===null)continue;
    if(c.last===null)c.last=Math.max(0,e.total-(e.count||0));
    if(e.total<=c.last)continue;
    delta=e.total-c.last;c.last=e.total;
   }else{
    if(!e.id||!e.count||c.seen.includes(e.id))continue;
    c.seen.push(e.id);c.seen=c.seen.slice(-4000);delta=e.count;
   }
   changed=true;
   if(b.enabled===false)continue;
   b.observed+=delta;const sum=b.progress+delta,n=Math.floor(sum/LIMIT);b.progress=sum%LIMIT;b.awarded+=n;rounds+=n;
  }
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
 const title=document.createElement('div');title.className='adminSectionTitle';title.textContent='1000 BEĞENİ BONUSU';
 const info=document.createElement('p');info.className='giftToggleHelp';
 const toggle=document.createElement('button');toggle.type='button';toggle.className='adminBtn applyBtn';toggle.id='likeBonusToggle';
 const reset=document.createElement('button');reset.type='button';reset.className='adminBtn logoutBtn';reset.id='likeBonusReset';reset.textContent='BEĞENİ SAYACINI SIFIRLA';
 const help=document.createElement('p');help.className='giftToggleHelp';help.textContent='Her 1000 yeni beğenide dört takıma birer şut eklenir. Sayacı sıfırlamak bekleyen şutları silmez.';
 const actions=document.createElement('div');actions.className='adminActions';actions.append(toggle,reset);section.append(title,info,actions,help);anchor.after(section);
 function render(){const api=window.AIFootballTikTok,s=api?.getLikeBonusStatus?.();if(!s)return;const label='BEĞENİ BONUSU: '+(s.enabled?'AÇIK':'KAPALI'),text='SAYILAN BEĞENİ: '+s.observed+' · SONRAKİ ÖDÜL: '+(LIMIT-s.progress)+' BEĞENİ · VERİLEN BONUS: '+s.awarded;if(toggle.textContent!==label)toggle.textContent=label;if(info.textContent!==text)info.textContent=text;}
 toggle.addEventListener('click',async()=>{const api=window.AIFootballTikTok;if(!api)return;toggle.disabled=true;try{await api.setLikeBonusEnabled(!api.getLikeBonusStatus().enabled);}finally{toggle.disabled=false;render();}});
 reset.addEventListener('click',async()=>{reset.disabled=true;try{await window.AIFootballTikTok?.resetLikeBonusCounter();}finally{reset.disabled=false;render();}});
 setInterval(render,1500);render();
})();
