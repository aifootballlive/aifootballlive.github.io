import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const root=new URL('../../',import.meta.url);
function harness(){
 let time=2000000;
 const storage={getItem:()=>null,setItem:()=>{}};
 const context=vm.createContext({crypto:webcrypto,console,localStorage:storage,sessionStorage:storage,Date:{now:()=>time},setTimeout:()=>1,clearTimeout(){},setInterval(){},adminAuthed:true,state:{startKeeper:10,startKeepers:{},keeperCost:10},document:{addEventListener(){},getElementById:()=>null},window:{addEventListener(){},AIFootball3D:{videoStatus:{motionReady:true}}}});
 vm.runInContext(fs.readFileSync(new URL('match-policy.js',root),'utf8'),context);
 let source=fs.readFileSync(new URL('tiktok-shared-v172.js',root),'utf8');
 source=source.replace(' install();connect();document.addEventListener', ' /* test suppress startup */ document.addEventListener');
 source=source.replace(' window.AIFootballTikTok={', ` globalThis.hooks={newLeague,recordLeagueRound,interruptOfflineMatch,advance,get:()=>match,set:m=>{match=m;},receive,flush};
 owns=()=>true;change=async edit=>{const next=clone(match);if(edit(next)===false)return false;match=next;return true;};
 window.AIFootballTikTok={`);
 vm.runInContext(source,context);
 return {p:context.AIFootballPolicy,h:context.hooks,time:t=>{time=t;},api:context.window.AIFootballTikTok};
}
function match(){return {version:2,revision:7,policyVersion:1,clock:{startedAt:0,round:1,finishedAt:null},scores:{A:0,B:0,C:0,D:0},keeper:{A:10,B:10,C:10,D:10},jobs:[],receipts:[],shotSequence:0};}
test('winner 60s, league 120s, next round exactly at 180s; admin precedence',()=>{
 const {p}=harness(),m=match();m.clock.finishedAt=1000;
 assert.equal(p.phase(m,60999),'winner');assert.equal(p.phase(m,61000),'league');
 assert.equal(p.canStart(m,180999),false);assert.equal(p.canStart(m,181000),true);
 m.controls={autoContinue:true,adminStarts:true};assert.equal(p.canStart(m,181000),false);assert.equal(p.canStart(m,181000,true),true);
 m.controls={autoContinue:false,adminStarts:false};assert.equal(p.canStart(m,181000),false);
});
test('migration preserves scores, queue, receipts, active cue and unknown fields',()=>{
 const {p}=harness(),m=match();delete m.policyVersion;m.jobs=[{id:'paid',team:'A',count:8}];m.cue={id:'active'};m.custom={x:1};
 const before=structuredClone(m);assert.equal(p.migrate(m),true);
 for(const key of Object.keys(before))assert.deepEqual(m[key],before[key]);assert.equal(p.migrate(m),false);
});
test('results and admin waiting retain gifts and start with same queue',async()=>{
 const {h,time,api}=harness(),m=match();m.clock.finishedAt=1000000;m.jobs=[{id:'gift',team:'B',count:10}];h.set(m);
 time(1100000);await h.advance();assert.equal(h.get().jobs[0].count,10);assert.equal(h.get().clock.finishedAt,1000000);
 time(1180000);await h.advance();assert.equal(h.get().clock.finishedAt,null);assert.equal(h.get().jobs[0].count,10);
 h.get().clock.finishedAt=1180000;h.get().controls={adminStarts:true};time(1360000);await h.advance();assert.equal(h.get().clock.finishedAt,1180000);
 await api.startNextMatch();await h.advance();assert.equal(h.get().clock.finishedAt,null);
});
test('unbounded overtime while gifts remain; paused queue carries without loss',async()=>{
 const {h}=harness(),m=match();m.jobs=[{id:'paid',team:'A',count:12}];h.set(m);await h.advance();
 assert.equal(h.get().clock.finishedAt,null);assert.ok(h.get().cue);assert.equal(h.get().jobs[0].count,11);
 const paused=match();paused.processingPaused=true;paused.jobs=[{id:'paid',team:'A',count:12}];h.set(paused);await h.advance();
 assert.equal(h.get().clock.finishedAt,2000000);assert.equal(h.get().jobs[0].count,12);
});
test('disconnect requeues uncommitted active and reserved shots without league credit',()=>{
 const {h}=harness(),m=match();m.cue={id:'a',team:'A',committed:false};m.nextCue={id:'b',team:'B'};
 h.interruptOfflineMatch(m,9);assert.equal(m.jobs.length,2);assert.equal(m.lastResult.interrupted,true);h.recordLeagueRound(m);assert.equal(m.league,undefined);
});
test('season tie records finalists and gives no arbitrary trophy; unique champion gets one',()=>{
 const {h,p}=harness(),m=match();m.league=h.newLeague();m.league.plannedRounds=1;m.clock.finishedAt=8;m.lastResult={};
 h.recordLeagueRound(m);assert.equal(m.league.champion,null);assert.equal(m.league.finalRequired.teams.length,4);assert.equal(m.league.trophies.A,0);assert.equal(p.canStart(m,9999999,true),false);
 const unique=match();unique.league=h.newLeague();unique.league.plannedRounds=1;unique.scores.A=3;unique.lastResult={};h.recordLeagueRound(unique);assert.equal(unique.league.champion,'A');assert.equal(unique.league.trophies.A,1);
});
test('reset preserves accepted paid queue and reserved shot',async()=>{
 const {h,api}=harness(),m=match();m.jobs=[{id:'gift',team:'A',count:4}];m.nextCue={id:'reserved',team:'B'};h.set(m);
 await api.reset();assert.equal(h.get().jobs.reduce((n,j)=>n+j.count,0),5);assert.equal(h.get().receipts.length,0);
});
