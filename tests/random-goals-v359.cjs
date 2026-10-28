const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
let source=fs.readFileSync(require.resolve('../tiktok-shared-v209.js'),'utf8');
const start=source.indexOf(' function change('),end=source.indexOf(' async function digest',start);
source=source.slice(0,start)+`async function change(edit){if(!admin())return false;const next=clone(match);if(edit(next)===false)return false;match=next;return true;}\n`+source.slice(end);
source=source.replace(' install();connect();document.addEventListener',`window.probe={goalForShot,makeCue,prepareInitialPreview,prepareQueuedPreview,get:()=>match,set:m=>match=m};return;document.addEventListener`);
const storage={getItem:()=>null,setItem(){}};let preview;
const c={window:{addEventListener(){},AIFootball3D:{getShotTiming:()=>({outcomeMs:1000,durationMs:5000}),prepareUpcomingShot:x=>preview=x,shotStatus:{}}},adminAuthed:true,state:{startKeepers:{A:20,B:20,C:20,D:20},keeperCost:10},crypto:require('crypto').webcrypto,TextEncoder,sessionStorage:storage,localStorage:storage,Date:{now:()=>100000},setTimeout:()=>0,clearTimeout(){},document:{querySelector:()=>null,getElementById:()=>null,addEventListener(){}},console};
vm.createContext(c);vm.runInContext(source,c);const p=c.window.probe,api=c.window.AIFootballTikTok,copy=x=>JSON.parse(JSON.stringify(x));
const base=()=>({scores:{A:3,B:2,C:1,D:0},keeper:{A:20,B:20,C:20,D:20},jobs:[{id:'paid',team:'A',count:10,nextIndex:0}],shotSequence:0,lease:{owner:'test'},clock:{startedAt:90000,manualStarted:true},receipts:['paid-receipt']});
(async()=>{
 let m=base();p.set(m);assert.equal(api.getShotOutcomeMode(),'keeper');
 assert.equal(p.makeCue(m,{id:'old-save',team:'A'},100000).result,'save');m.keeper.A=0;assert.equal(p.makeCue(m,{id:'old-goal',team:'A'},100000).result,'goal');
 m=base();m.cue=p.makeCue(m,{id:'active',team:'B'},100000);m.nextCue=p.makeCue(m,{id:'reserved',team:'C'},105000);p.set(m);const before=copy(m);
 assert(await api.setShotOutcomeMode('random'));m=p.get();assert.equal(api.getShotOutcomeMode(),'random');assert(m.shotRandomSeed);
 for(const k of ['scores','keeper','jobs','cue','nextCue','receipts'])assert.deepEqual(copy(m[k]),before[k],k+' must survive mode change');
 const seed=m.shotRandomSeed;p.set(copy(m));assert.equal(api.getShotOutcomeMode(),'random');
 const counts=[];
 for(const team of ['A','B','C','D']){let goals=0,run=0,last,maxGoalRun=0,maxSaveRun=0;
  for(let i=0;i<12000;i++){const job={id:'paid:'+i,team};const goal=p.goalForShot(m,job,m.keeper);assert.equal(goal,p.goalForShot(copy(m),job,{A:0,B:0,C:0,D:0}),'power and reload do not reroll');goals+=goal;run=last===goal?run+1:1;last=goal;if(goal)maxGoalRun=Math.max(maxGoalRun,run);else maxSaveRun=Math.max(maxSaveRun,run);}
  assert(goals>5500&&goals<6500,team+' uses same unbiased rule');assert(maxGoalRun>=3&&maxSaveRun>=6,'variable consecutive goals and saves');counts.push(goals);
 }
 assert(Math.max(...counts)-Math.min(...counts)<650,'no team weighting');
 m.cue=null;m.nextCue=null;p.prepareInitialPreview(m);const expected=preview.result;const cue=p.makeCue(m,{id:'paid:0',team:'A'},100000);assert.equal(cue.result,expected,'preview agrees with actual cue');assert.deepEqual(copy(cue.after.keeper),copy(m.keeper),'random mode freezes keeper power');assert.equal(cue.after.scores.A,m.scores.A+(cue.result==='goal'?1:0));
 m.cue=cue;c.window.AIFootball3D.shotStatus.cueId=cue.id;p.prepareQueuedPreview(m);assert.equal(preview.result,p.goalForShot(m,{id:'paid:0',team:'A'},m.keeper)?'goal':'save');
 p.set(m);assert(await api.setShotOutcomeMode('keeper'));assert(await api.setShotOutcomeMode('random'));assert.equal(p.get().shotRandomSeed,seed,'toggle cannot reroll pending shots');assert.equal(await api.setShotOutcomeMode('bad'),false);
 c.adminAuthed=false;assert.equal(await api.setShotOutcomeMode('keeper'),false);assert.equal(api.getShotOutcomeMode(),'random');
 console.log('PASS: selectable saved random mode, identical chance rule for four teams, variable streaks, stable reload/retry/preview, legacy keeper mode, active shots/scores/paid queue preserved, admin only. Isolated mocks.');
})().catch(e=>{console.error(e);process.exitCode=1;});
