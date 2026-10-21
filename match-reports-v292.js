/* Match aggregates are persisted with the same authenticated CAS as their source event. */
(()=>{'use strict';
 const TEAMS=['A','B','C','D'],copy=v=>JSON.parse(JSON.stringify(v)),number=v=>Math.max(0,Number(v)||0);
 const empty=()=>Object.fromEntries(TEAMS.map(t=>[t,{shots:0,goals:0,gifts10:0,gifts100:0,gifts:0,coins:0,unknown:0}]));
 const key=m=>Number(m?.clock?.startedAt)>0?[m.seasonReset?.id||'',m.league?.season||1,m.clock.round||1,m.clock.startedAt].join(':'):null;
 function sync(m,now){
  const data=m.matchReports||={version:1,trackingStartedAt:now,records:[],pending:empty()};
  const id=key(m),started=m.clock?.manualStarted===true||m.clock?.autoStarted===true;
  for(const r of data.records)if(r.status==='playing'&&r.id!==id){r.status='interrupted';r.endedAt=now;}
  if(!id||!started)return null;
  let r=data.records.find(r=>r.id===id);
  if(!r){
   if(Number.isFinite(m.clock.finishedAt))return null;
   r={id,season:Number(m.league?.season)||1,round:Number(m.clock.round)||1,matchNumber:Number(m.clock?.matchNumber)||(Number(m.league?.completedRounds)||0)+1,plannedRounds:Number(m.league?.plannedRounds)||20,final:!!m.clock.leagueFinal,startedAt:m.clock.startedAt,acceptingFrom:Number(m.clock.countdownStartedAt)||Math.min(now,m.clock.startedAt),endedAt:null,status:'playing',partial:data.trackingStartedAt>m.clock.startedAt,normalMinutes:Number(m.timing?.normalMinutes)||25,overtimeMinutes:Number.isFinite(Number(m.timing?.overtimeMinutes))?Number(m.timing.overtimeMinutes):5,liveSessionIds:[],teams:empty()};
   for(const t of TEAMS)for(const k of ['gifts10','gifts100','gifts','coins','unknown'])r.teams[t][k]=number(data.pending?.[t]?.[k]);
   data.pending=empty();data.records.push(r);
  }
  const session=m.liveReports?.sessions?.find(s=>s.id===m.liveReports.activeId);if(session&&session.status==='live'&&session.startedAt<=(Number.isFinite(m.clock.finishedAt)?m.clock.finishedAt:now)&&!r.liveSessionIds?.includes(session.id))(r.liveSessionIds||=[]).push(session.id);
  for(const t of TEAMS)r.teams[t].goals=number(m.scores?.[t]);
  if(Number.isFinite(m.clock.finishedAt)){r.endedAt=m.clock.finishedAt;r.status=m.clock.interrupted||m.lastResult?.interrupted?'interrupted':'finished';if(r.status==='finished')for(const old of data.records)if(old!==r&&old.season===r.season&&old.matchNumber===r.matchNumber&&old.status==='finished'){old.status='replaced';old.replacedBy=r.id;}}
  return r;
 }
 function gift(m,g,now){
  sync(m,now);const data=m.matchReports,at=number(g.receivedAt)||now;
  const r=[...data.records].reverse().find(r=>at>=(r.acceptingFrom||r.startedAt)&&(r.endedAt===null||at<=r.endedAt))||data.records.find(r=>r.status==='playing'&&at<r.startedAt);
  const teams=r?.teams||data.pending,t=teams[g.team];if(!t)return;
  if(![10,100].includes(g.coins)||!Number.isSafeInteger(g.units)||g.units<1){t.unknown++;if(r)r.partial=true;return;}
  t.gifts+=g.units;t.coins+=g.units*g.coins;t[g.coins===10?'gifts10':'gifts100']+=g.units;
 }
 function shot(m,cue,now){
  if(!cue||cue.reportShotCounted||!TEAMS.includes(cue.team))return;
  const r=sync(m,now);if(!r||r.status!=='playing')return;
  r.teams[cue.team].shots++;cue.reportShotCounted=true;
 }
 function view(m,now){
  if(!m)return {records:[],pending:empty()};const snapshot=copy(m);sync(snapshot,now);const data=snapshot.matchReports,records=data.records.slice();
  const leagues=[m.league,...(m.seasonResetHistory||[]).map(x=>x.previous)].filter(Boolean);
  for(const league of leagues){
   const history=league.history||[],regular=history.filter(h=>!h.final),offset=Math.max(0,number(league.completedRounds)-regular.length);let index=0;
   for(const h of history){if(!h.final)index++;if(records.some(r=>r.season===(Number(league.season)||1)&&r.round===h.round&&r.endedAt===h.at))continue;
    const teams=empty();for(const t of TEAMS){for(const k of ['shots','gifts10','gifts100','gifts','coins','unknown'])teams[t][k]=null;teams[t].goals=number(h.scores?.[t]);}
    records.push({id:'legacy:'+league.season+':'+h.round+':'+h.at,season:Number(league.season)||1,round:h.round,matchNumber:offset+index,plannedRounds:Number(league.plannedRounds)||20,final:!!h.final,startedAt:null,endedAt:h.at,status:'legacy',partial:true,teams});
   }
  }
  return {records:records.sort((a,b)=>number(b.startedAt||b.endedAt)-number(a.startedAt||a.endedAt)),pending:data.pending,trackingStartedAt:data.trackingStartedAt};
 }
 window.AIFootballMatchReports={sync,gift,shot,view};
})();
