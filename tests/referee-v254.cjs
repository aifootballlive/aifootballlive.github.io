const assert=require('assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),http=require('http');
const {chromium}=require('playwright');const root=path.join(__dirname,'..');
// Observe real shared-clock transitions without changing any production match.
function lifecycle(initial){
 let now=100000,state=initial,clock={round:1,startedAt:50000,finishedAt:null};const events=[],timers=[];
 const game={getMatchClock:()=>clock,getMatchState:()=>state,getTimings:()=>({language:'tr'})};
 const sandbox={window:{AIFootballTikTok:game,AIFootballAudio:{refereeWhistle:(...args)=>events.push(args)}},document:{hidden:false,visibilityState:'visible',getElementById:()=>null},Date:class extends Date{static now(){return now;}},setInterval:fn=>timers.push(fn),setTimeout:()=>{},console};
 vm.runInNewContext(fs.readFileSync(path.join(root,'round-finale-v205.js'),'utf8'),sandbox);
 return {events,tick:()=>timers.at(-1)(),set:(phase,next,time)=>{state=phase;clock={...clock,...next};if(time)now=time;}};
}
const l=lifecycle({waiting:true});l.tick();l.set({starting:true},{startedAt:101000},100000);l.tick();
l.set({running:true},{},101000);l.tick();l.tick();assert.deepEqual(l.events.map(x=>x[0]),['start']);
l.set({running:true},{},161000);l.tick();assert.equal(l.events.length,1);
l.set({results:true},{finishedAt:162000},162000);l.tick();l.tick();assert.deepEqual(l.events.map(x=>x[0]),['start','end']);
const joined=lifecycle({running:true});joined.tick();joined.tick();assert.equal(joined.events.length,0);
const ended=lifecycle({results:true});ended.set({results:true},{finishedAt:99999});ended.tick();assert.equal(ended.events.length,0);
const cancelled=lifecycle({starting:true});cancelled.tick();cancelled.set({waiting:true},{startedAt:null});cancelled.tick();assert.equal(cancelled.events.length,0);
const interrupted=lifecycle({running:true});interrupted.tick();interrupted.set({results:true},{finishedAt:100001,interrupted:true},100001);interrupted.tick();assert.equal(interrupted.events.length,0);
console.log('Clock: kickoff/end once, no replay on refresh, no whistle on countdown cancellation or technical interruption PASS');
const server=http.createServer((req,res)=>{
 if(req.url==='/fixture.html'){res.setHeader('Content-Type','text/html');res.end('<div id="matchControls"></div><script>window.__AI_FOOTBALL_SETTINGS={aiSpeechEnabled:false,crowdEnabled:false};</script><script src="/stadium-audio-v219.js"></script>');return;}
 try{const file=path.join(root,req.url.split('?')[0]);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'audio/mpeg');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
}).listen(8993,'127.0.0.1');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:8993/fixture.html');
 await page.waitForFunction(()=>window.AIFootballAudio?.enabled);
 const result=await page.evaluate(async()=>{
  const starts=[],original=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(){const source=original.call(this),start=source.start.bind(source);source.start=(...args)=>{starts.push(args);return start(...args);};return source;};
  await AIFootballAudio.refereeWhistle('ready','test');await AIFootballAudio.refereeWhistle('start','test');await AIFootballAudio.refereeWhistle('end','test');
  AIFootballAudio.whistle('shot-test');AIFootballAudio.whistle('shot-test');await new Promise(resolve=>setTimeout(resolve,50));
  const duplicate=await AIFootballAudio.refereeWhistle('end','test');AIFootballAudio.disableSound();const muted=await AIFootballAudio.refereeWhistle('start','muted');
  return {starts,duplicate,muted};
 });
 assert.equal(result.starts.length,6);assert.equal(result.duplicate,false);assert.equal(result.muted,false);
 const durations=result.starts.map(x=>x[2]);assert.deepEqual(durations,[.16,.65,.22,.22,.78,.16]);
 assert(Math.abs(result.starts[3][0]-result.starts[2][0]-.36)<.02);assert(Math.abs(result.starts[4][0]-result.starts[2][0]-.72)<.02);
 console.log('Audio: short press, single kickoff, three final blasts; deduplication and mute PASS');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
