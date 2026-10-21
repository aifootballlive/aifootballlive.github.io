/* Shared-clock announcement rotation; no extra layout row or game writes. */
(()=>{'use strict';
 const node=document.getElementById('leagueProfileHint');if(!node)return;
 const lines=['KİŞİ BAŞI 1000 BEĞENİ = HER TAKIMA +1 ŞUT','LİG TABLOSU İÇİN PROFİLDEKİ LİNKE TIKLAYIN'];
 let timer;
 function render(){
  clearTimeout(timer);
  const now=window.AIFootballTime?.now?.()??Date.now(),index=Math.floor(now/7000)%lines.length;
  const text=window.AIFootballTikTok?.getLikeBonusStatus?.().enabled===false?'BEĞENİ BONUSU KAPALI':lines[index];
  if(node.textContent!==text)node.textContent=text;
  timer=setTimeout(render,Math.min(1000,Math.max(100,7000-now%7000+20)));
 }
 document.addEventListener('visibilitychange',render);
 window.AIFootballTime?.ready?.then(render).catch(()=>{});
 render();
})();
