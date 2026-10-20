const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 const page=await browser.newPage();await page.route('**/*',r=>r.abort());await page.setContent('<div class="wrap"></div>');
 await page.evaluate(()=>{
  window.testNow=10000;window.testMono=0;window.ticks=[];window.seeks=[];window.loads=[];
  Object.defineProperty(performance,'now',{value:()=>testMono});window.setInterval=(fn,ms)=>{ticks.push({fn,ms});return ticks.length;};
  const proto=HTMLMediaElement.prototype;
  for(const [key,get]of Object.entries({duration:()=>10,error:()=>null,readyState:function(){return this._ready??2;},networkState:()=>2,paused:function(){return this._paused!==false;},ended:()=>false,buffered:function(){const end=this._bufferEnd??2;return {length:1,start:()=>0,end:()=>end};}}))Object.defineProperty(proto,key,{configurable:true,get});
  Object.defineProperty(proto,'currentTime',{configurable:true,get(){return this._time||0;},set(value){seeks.push({id:this.id,value});this._time=value;}});
  proto.play=function(){this._paused=false;return Promise.resolve();};proto.pause=function(){this._paused=true;};proto.load=function(){loads.push(this.id);};HTMLVideoElement.prototype.requestVideoFrameCallback=undefined;
  window.AIFootballTime={now:()=>testNow};window.AIFootballClipCache={manifest:{A_save:{seconds:10}},getURL:()=>null,warm:async()=>null,warmAll(){},stats:{}};
  window.AIFootballTikTok={getMatchState:()=>({running:true}),getStatus:()=>({leader:false}),getCurrentCue:()=>({id:'test'}),getClock:()=>({}),hasPendingShot:()=>false};
 });
 await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../scene-video-v219.js'),'utf8')});
 await page.evaluate(()=>{AIFootball3D.beginShot('A',{cueId:'test',result:'save',startsAt:testNow-4000});});await page.waitForTimeout(200);
 const cold=await page.evaluate(()=>({seeks,loads}));assert.equal(cold.seeks.length,0,'Cold spectator must not seek beyond downloaded video');
 await page.evaluate(()=>{const tick=ticks.find(t=>t.ms===250).fn;for(const ms of [100,2100,4100,6100]){testMono=ms;testNow=10000+ms;tick();}});
 const stalled=await page.evaluate(()=>({seeks,loads}));assert.equal(stalled.loads.filter(id=>id==='sceneShotVideo').length,1,'Slow download must not restart at the second recovery tick');assert.equal(stalled.seeks.length,0,'Buffer starvation must not cause unbuffered seek loops');
 await page.evaluate(()=>{document.getElementById('sceneShotVideo')._paused=true;testMono=8000;testNow=18000;ticks.find(t=>t.ms===250).fn();});
 assert.equal(await page.locator('#sceneShotVideo').evaluate(v=>v.paused),false,'Paused buffering deck must resume without reloading');
 // Once data arrives, resume motion rather than skipping visible footage.
 await page.evaluate(()=>{const v=document.getElementById('sceneShotVideo');v._ready=4;v._bufferEnd=10;testNow=19000;testMono=9000;ticks.find(t=>t.ms===250).fn();});
 const ready=await page.evaluate(()=>({seeks,rate:document.getElementById('sceneShotVideo').playbackRate}));assert.equal(ready.seeks.length,0,'Buffered spectator must not jump forward after a stall');assert(ready.rate<=1.03&&ready.rate>=.97,'Only gradual bounded synchronization');
 await page.evaluate(()=>{const v=document.getElementById('sceneShotVideo');v._time=2;testNow=19500;testMono=9500;ticks.find(t=>t.ms===250).fn();document.getElementById('sceneNextShotVideo')._ready=0;AIFootballClipCache.getURL=()=> 'blob:local-cached-copy';testNow=21500;testMono=11500;ticks.find(t=>t.ms===250).fn();});
 assert.equal(await page.locator('#sceneNextShotVideo').evaluate(v=>v.paused),true,'Cached repair must wait for metadata before restoring playback position');
 await page.evaluate(()=>{const replacement=document.getElementById('sceneNextShotVideo');replacement._ready=2;replacement.dispatchEvent(new Event('loadedmetadata'));});
 const repaired=await page.evaluate(()=>seeks);assert(repaired.some(s=>s.id==='sceneNextShotVideo'&&s.value===2),'Cached replacement must resume the last actual media position');assert(repaired.every(s=>s.value<=2),'Recovery must not jump to wall-clock time');
 console.log('PASS: slow mobile download causes no unbuffered seek, repeated reload or forward leap; cached repair preserves actual media position; shared clock is unchanged.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
