const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto').webcrypto;
const root=path.resolve(__dirname,'..'),epoch=Date.UTC(2026,9,20,10,0,0),started=performance.now();
const elapsed=()=>performance.now()-started;
const source=fs.readFileSync(path.join(root,'match-time-v266.js'),'utf8');
const gameSource=fs.readFileSync(path.join(root,'tiktok-shared-v209.js'),'utf8').replace(' install();connect();document.addEventListener',
 ' window.probe={matchClockView,matchRunning,matchStarting,admin};return;document.addEventListener');
async function client(skew,{edge=true,fail=false}={}){
 let deviceSkew=skew,requests=0;const timers=[],events=[],storage={getItem:()=>null,setItem(){}};
 const sandbox={window:{addEventListener(){},dispatchEvent:e=>events.push(e.type)},document:{hidden:false,addEventListener(){},getElementById:()=>null},
  location:{href:'https://example.test/live.html'},crypto,URL,Event,AbortController,TextEncoder,console,
  performance:{now:elapsed},Date:class extends Date{static now(){return epoch+elapsed()+deviceSkew;}},
  sessionStorage:storage,localStorage:storage,adminAuthed:true,state:{},
  setTimeout:(fn,ms)=>{if(ms===3500){const t=setTimeout(fn,ms);t.unref();return t;}timers.push({fn,ms});return 0;},clearTimeout,
  fetch:async(url,options)=>{
   assert.equal(options.method,'HEAD');assert.equal(options.cache,'no-store');assert.equal(options.credentials,'omit');
   assert.equal(new URL(url).origin,'https://example.test');
   if(fail)throw Error('offline');
   const before=elapsed(),rtt=[20,80,150][requests++%3];
   await new Promise(r=>setTimeout(r,rtt));const duration=elapsed()-before;
   const stamp=epoch+before+duration/2;
   return {ok:true,headers:new Map([['x-timer',edge?'S'+stamp/1000+',VS0,VE1':''],['date',new Date(stamp).toUTCString()],['age','470']])};
  }};
 vm.createContext(sandbox);vm.runInContext(source,sandbox);await sandbox.window.AIFootballTime.ready;
 vm.runInContext(gameSource,sandbox);
 return {clock:sandbox.window.AIFootballTime,probe:sandbox.window.probe,timers,events,setSkew:v=>deviceSkew=v};
}
(async()=>{
 const clients=await Promise.all([client(0),client(7000),client(-3600000)]);
 const match={clock:{startedAt:epoch+elapsed()+29900,manualStarted:true,round:1,finishedAt:null},timing:{normalMinutes:25,overtimeMinutes:5,countdownSeconds:30}};
 const clockNow=clients.map(c=>c.clock.now());assert(Math.max(...clockNow)-Math.min(...clockNow)<40);
 for(const c of clients){
  assert(c.clock.synced);assert(c.probe.admin());assert.equal(c.probe.matchClockView(match).digits,'00:30');
  assert(!c.probe.matchRunning(match));assert(c.probe.matchStarting(match));
  const before=c.clock.now();c.setSkew(86400000);assert(Math.abs(c.clock.now()-before)<20,'wall-clock edits must not move a running timer');
  match.clock.startedAt=c.clock.now()-1100;assert(c.probe.matchRunning(match));assert.equal(c.probe.matchClockView(match).digits,'24:59');
  match.clock.startedAt=epoch+elapsed()+29900;
 }
 const fallback=await client(7000,{edge:false});assert(fallback.clock.synced);assert(Math.abs(fallback.clock.now()-(epoch+elapsed()))<600,'Date fallback must ignore cached object Age');
 const offline=await client(7000,{fail:true});assert(!offline.clock.synced);assert(!offline.probe.admin(),'no privileged writes before UTC synchronization');assert(offline.timers.some(t=>t.ms===10000));
 assert(clients.every(c=>c.events.includes('afl-clock-synced')));
 console.log('PASS: PC, phone +7s and device -1h share 30-second countdown, kickoff and 25-minute clock; wall-clock changes do not jump timer; HTTP Date/Age fallback; unavailable server clock blocks writes and retries.');
})().catch(e=>{console.error(e);process.exitCode=1;});
