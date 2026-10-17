/* Shared, side-effect-free policy. Existing v2 scores, jobs and receipts stay intact. */
(()=>{
 'use strict';
 const teams=['A','B','C','D'];
 const names={A:'Sarı-Lacivert',B:'Sarı-Kırmızı',C:'Siyah-Beyaz',D:'Bordo-Mavi'};
 const matchMs=1500000,winnerMs=60000,breakMs=180000;
 function controls(m){return {autoContinue:m?.controls?.autoContinue!==false,adminStarts:m?.controls?.adminStarts===true};}
 function canStart(m,now,manual=false){
  if(!Number.isFinite(m?.clock?.finishedAt)||now-m.clock.finishedAt<breakMs||m.league?.finalRequired)return false;
  const c=controls(m);return manual||c.autoContinue&&!c.adminStarts;
 }
 function phase(m,now){return !Number.isFinite(m?.clock?.finishedAt)?'match':now-m.clock.finishedAt<winnerMs?'winner':'league';}
 function finalists(league){
  const value=t=>['points','wins','goals'].map(k=>Number(league.teams?.[t]?.[k])||0);
  const order=teams.slice().sort((a,b)=>{const x=value(a),y=value(b);return y[0]-x[0]||y[1]-x[1]||y[2]-x[2];});
  const top=value(order[0]);return order.filter(t=>value(t).every((v,i)=>v===top[i]));
 }
 function migrate(m){
  if(m.policyVersion===1)return false;
  m.controls=controls(m);m.policyVersion=1;return true;
 }
 globalThis.AIFootballPolicy={teams,names,matchMs,winnerMs,breakMs,controls,canStart,phase,finalists,migrate};
})();
