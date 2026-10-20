const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 const page=await browser.newPage();await page.route('**/*',r=>r.abort());await page.setContent('<div class="wrap"></div>');
 await page.evaluate(()=>{
  window.testNow=10000;window.playCalls=[];window.testMono=0;window.ticks=[];window.seeks=[];window.loads=[];
  Object.defineProperty(performance,'now',{value:()=>testMono});window.setInterval=(fn,ms)=>{ticks.push({fn,ms});return ticks.length;};
  const proto=HTMLMediaElement.prototype;
  for(const [key,get]of Object.entries({duration:()=>10,error:()=>null,readyState:function(){return this._ready??2;},networkState:()=>2,paused:function(){return this._paused!==false;},ended:()=>false,buffered:function(){const end=this._bufferEnd??.5;return {length:1,start:()=>0,end:()=>end};}}))Object.defineProperty(proto,key,{configurable:true,get});
  Object.defineProperty(proto,'currentTime',{configurable:true,get(){return this._time||0;},set(value){seeks.push({id:this.id,value});this._time=value;}});
  proto.play=function(){playCalls.push(this.id);this._paused=false;return Promise.resolve();};proto.pause=function(){this._paused=true;};proto.load=function(){loads.push(this.id);};HTMLVideoElement.prototype.requestVideoFrameCallback=undefined;
  window.AIFootballTime={now:()=>testNow};window.AIFootballClipCache={mobile:true,manifest:{A_save:{seconds:10}},getURL:()=>null,warm:async()=>null,warmAll(){},stats:{}};
  window.AIFootballTikTok={getMatchState:()=>({running:true}),getStatus:()=>({leader:true}),getCurrentCue:()=>({id:'cold'}),getClock:()=>({}),hasPendingShot:()=>false};
 });
 await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../scene-video-v219.js'),'utf8')});
 await page.evaluate(()=>{AIFootball3D.beginShot('A',{cueId:'cold',result:'save',startsAt:testNow});for(const ms of [250,500,750,1000]){testMono=ms;testNow=10000+ms;ticks.find(t=>t.ms===250).fn();}});await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>playCalls.filter(id=>id==='sceneShotVideo').length),0,'Watchdog must not force playback while the initial buffer is incomplete');
 await page.evaluate(()=>{document.getElementById('sceneShotVideo')._bufferEnd=3;});await page.waitForTimeout(180);
 assert(await page.evaluate(()=>playCalls.includes('sceneShotVideo')),'Playback begins once real downloaded footage is ready');assert.equal(await page.locator('#sceneShotVideo').evaluate(v=>v.style.opacity),'1');
 console.log('PASS: initial mobile readiness is respected by the watchdog; no hidden playback or premature visible freeze; downloaded footage starts normally.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
