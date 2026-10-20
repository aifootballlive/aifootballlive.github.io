const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto').webcrypto;
let source=fs.readFileSync(require.resolve('../tiktok-shared-v209.js'),'utf8'),now=10000000;
const a=source.indexOf(' function change('),b=source.indexOf(' async function digest',a);
source=source.slice(0,a)+`async function change(edit){if(!admin())return false;const next=clone(match);if(edit(next)===false)return false;match=next;window.writes=(window.writes||0)+1;return true;}\n`+source.slice(b);
source=source.replace(' install();connect();document.addEventListener',`window.probe={owner,visibleScores,hasGoalProof,hasVideoCompletionProof,returnUnplayedCues,advance,get:()=>match,set:m=>match=m};return;document.addEventListener`);
function boot(){const storage={getItem:()=>null,setItem(){}};const c={window:{addEventListener(){},AIFootball3D:{getShotTiming:()=>({durationMs:8000}),reset(){}}},adminAuthed:true,state:{startKeepers:{A:20,B:20,C:20,D:20}},crypto,TextEncoder,sessionStorage:storage,localStorage:storage,Date:{now:()=>now},setTimeout:()=>0,clearTimeout(){},document:{getElementById:()=>null,querySelector:()=>null,addEventListener(){}},console};vm.createContext(c);vm.runInContext(source,c);return {c,p:c.window.probe,api:c.window.AIFootballTikTok};}


(async()=>{
 const {c,p,api}=boot();const m={version:2,revision:1,clock:{startedAt:now-60000,manualStarted:true,round:1,finishedAt:null},scores:{A:0,B:0,C:0,D:0},keeper:{A:20,B:20,C:20,D:20},jobs:[{id:'following-B',team:'B',count:1,nextIndex:0}],receipts:[],shotSequence:0,lease:{owner:p.owner,until:now+100000,protocol:125},cue:{id:'one-real-A-shot',team:'A',result:'save',playbackProtocol:204,playbackOwner:p.owner,startsAt:now-40000,videoStartedAt:now-39000,durationMs:8000,endsAt:now-32000,after:{scores:{A:0,B:0,C:0,D:0},keeper:{A:10,B:20,C:20,D:20}},committed:false,finishedAt:null}};
 c.window.AIFootball3D.isAnimating=true;c.window.AIFootball3D.shotStatus={cueId:m.cue.id};p.set(m);
 for(let i=0;i<8;i++){await p.advance();assert.equal(p.get().cue.id,'one-real-A-shot','Overdue active video must not be requeued as a fresh A shot');assert.equal(p.get().jobs.length,1);assert.equal(p.get().keeper.A,20);}
 assert.equal(c.window.writes||0,0,'Elapsed timeout alone must not rewrite or inflate queue');
 c.window.AIFootball3D.isAnimating=false;c.window.AIFootball3D.shotStatus=null;await p.advance();assert.equal(p.get().cue,null,'Truly abandoned cue can still recover');assert.equal(p.get().jobs.filter(j=>j.team==='A').length,1,'Abandoned recovery preserves one shot exactly once');
 console.log('PASS: repeated deadlines cannot requeue an active slow/background A clip or increase its count; an abandoned cue still returns once.');
})().catch(e=>{console.error(e);process.exitCode=1;});

const scene=fs.readFileSync(require.resolve('../scene-video-v219.js'),'utf8'),gate={document:{hidden:true},shot:{controller:true},window:{AIFootballTikTok:{getStatus:()=>({leader:true})}}};vm.createContext(gate);vm.runInContext(scene.slice(scene.indexOf('function canRunShot(){'),scene.indexOf('function recordPlaybackProgress(')),gate);assert(gate.canRunShot());gate.shot.controller=false;assert(!gate.canRunShot(),'Hidden spectator cannot run background proof');gate.shot.controller=true;gate.window.AIFootballTikTok.getStatus=()=>({leader:false});assert(!gate.canRunShot(),'Former owner cannot run background proof');gate.document.hidden=false;assert(gate.canRunShot());
