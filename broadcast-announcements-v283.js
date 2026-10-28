/* Shared-clock announcement rotation; no extra layout row or game writes. */
(()=>{'use strict';
 const node=document.getElementById('leagueProfileHint');if(!node)return;
 const lines=['TOPLAM 1000 BEĞENİ = HER TAKIMA +1 ŞUT','LİG TABLOSU İÇİN PROFİLDEKİ LİNKE TIKLAYIN'];
 let timer;
 function render(){
  clearTimeout(timer);
  const now=window.AIFootballTime?.now?.()??Date.now(),index=now%21000<14000?0:1;
  const status=window.AIFootballTikTok?.getLikeBonusStatus?.(),personal=status?.scope==='personal',threshold=status?.threshold||1000;
  const bonus=status?.notice,age=now-Number(bonus?.at),fresh=!!bonus?.id&&age>=0&&age<2000;
  node.dataset.likeBonus=String(fresh);
  if(fresh){node.setAttribute('role','status');node.setAttribute('aria-live','polite');}
  else{node.removeAttribute('role');node.removeAttribute('aria-live');}
  const bonusText=fresh?((Number(bonus.threshold)||threshold)*(Number(bonus.rounds)||1))+' BEĞENİ BONUSU · HER TAKIMA +'+(Number(bonus.rounds)||1)+' ŞUT':'';
  const text=fresh?bonusText:status?.enabled===false?'BEĞENİ BONUSU KAPALI':index===0?(personal?'KİŞİ BAŞI HER ':'TOPLAM ')+threshold+' BEĞENİ = HER TAKIMA +1 ŞUT':lines[index];
  if(node.textContent!==text)node.textContent=text;
  timer=setTimeout(render,fresh?Math.max(16,2000-age):Math.min(1000,Math.max(100,7000-now%7000+20)));
 }
 window.addEventListener('afl-like-bonus',render);
 document.addEventListener('visibilitychange',render);
 window.AIFootballTime?.ready?.then(render).catch(()=>{});
 render();
})();
