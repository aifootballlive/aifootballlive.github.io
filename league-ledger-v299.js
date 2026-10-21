/* Season/match identities, retained results, and replacement-safe standings. */
(()=>{'use strict';
 const teams=['A','B','C','D'],copy=v=>JSON.parse(JSON.stringify(v)),n=v=>Math.max(0,Number(v)||0);
 const blank=()=>Object.fromEntries(teams.map(t=>[t,{played:0,wins:0,draws:0,losses:0,goals:0,points:0}]));
 function points(scores){const top=Math.max(...teams.map(t=>n(scores?.[t]))),w=teams.filter(t=>n(scores?.[t])===top);return Object.fromEntries(teams.map(t=>[t,w.includes(t)?w.length===1?3:1:0]));}
 function add(rows,game,sign=1){if(game.final)return;const pts=points(game.scores);for(const t of teams){const r=rows[t];r.played+=sign;r.goals+=sign*n(game.scores?.[t]);r.points+=sign*pts[t];r[pts[t]===3?'wins':pts[t]===1?'draws':'losses']+=sign;}}
 function normalize(league){
  league.history||=[];const regular=league.history.filter(h=>!h.final),offset=Math.max(0,n(league.completedRounds)-regular.length);let i=0;
  for(const h of league.history){if(!h.final)i++;if(!Number.isSafeInteger(h.matchNumber)||h.matchNumber<1)h.matchNumber=offset+i;}
  if(!league.historyBase){const base=blank();for(const t of teams)for(const k of Object.keys(base[t]))base[t][k]=n(league.teams?.[t]?.[k]);for(const h of league.history)add(base,h,-1);for(const t of teams)for(const k of Object.keys(base[t]))base[t][k]=Math.max(0,base[t][k]);league.historyBase={completedRounds:offset,teams:base};}
  return league;
 }
 function standings(league,through=Infinity){normalize(league);const rows=copy(league.historyBase.teams);for(const h of league.history)if(n(h.matchNumber)<=through)add(rows,h);return rows;}
 function rebuild(league){league.teams=standings(league);league.completedRounds=n(league.historyBase.completedRounds)+league.history.filter(h=>!h.final).length;}
 function catalogs(m){const map={};for(const x of m.seasonResetHistory||[])if(x.previous)map[x.previous.season]=copy(x.previous);for(const x of m.leagueArchive||[])map[x.season]=copy(x);for(const [key,x]of Object.entries(m.leagueSeasons||{}))map[key]=copy(x);if(m.league)map[m.league.season]=copy(m.league);return map;}
 function sync(m){if(!m.league)return;const all=catalogs(m);for(const l of Object.values(all))normalize(l);m.leagueSeasons=all;normalize(m.league);m.leagueSeasons[m.league.season]=copy(m.league);}
 function record(m,now){
  const l=normalize(m.league),number=Number(m.clock.matchNumber)||(n(l.completedRounds)+1),scores=copy(m.scores),pts=points(scores),w=teams.filter(t=>pts[t]===3),index=l.history.findIndex(h=>!h.final&&h.matchNumber===number),old=index>=0?l.history[index]:null;
  if(l.champion){l.trophies[l.champion]=Math.max(0,n(l.trophies[l.champion])-1);l.champion=null;}
  const game={round:m.clock.round,matchNumber:number,startedAt:m.clock.startedAt,at:now,scores,points:pts,winner:w[0]||null,replayedAt:old?now:undefined};
  if(old)l.history[index]=game;else l.history.push(game);
  l.history=l.history.filter(h=>!h.final);delete l.pendingFinalResult;l.finalists=[];l.finalAttempts=0;l.completionPending=false;
  rebuild(l);return game;
 }
 function snapshot(m){const seasons=catalogs(m);return {league:copy(m.league),archive:Object.values(seasons).filter(l=>Number(l.season)!==Number(m.league?.season)).sort((a,b)=>n(a.season)-n(b.season))};}
 window.AIFootballLeagueLedger={points,normalize,standings,rebuild,catalogs,sync,record,snapshot};
})();
