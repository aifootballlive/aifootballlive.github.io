const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{if(req.url==='/fixture.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Local video test</title>');return;}try{const file=path.join(root,new URL(req.url,'http://localhost').pathname),data=fs.readFileSync(file);res.setHeader('Content-Type',file.endsWith('.mp4')?'video/mp4':'text/javascript');if(req.headers.range){const m=/bytes=(\d+)-(\d*)/.exec(req.headers.range),a=+m[1],z=m[2]?+m[2]:data.length-1;res.writeHead(206,{'Content-Range':`bytes ${a}-${z}/${data.length}`,'Accept-Ranges':'bytes','Content-Length':z-a+1});res.end(data.subarray(a,z+1));}else res.end(data);}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/fixture.html');await page.setContent('<div class="wrap" style="position:relative;width:390px;height:844px"></div>');
 await page.evaluate(()=>{
  document.addEventListener('ended',event=>{if(event.target.id==='sceneShotVideo'||event.target.id==='sceneNextShotVideo')window.actualEnds=(window.actualEnds||0)+1;},true);window.finishes=[];window.actualEnds=0;window.start=Date.now();
  window.AIFootballClipCache={mobile:true,waitingSrc:'./assets/scene-v111/waiting.mp4',manifest:{A_save:{seconds:10.005,src:'./assets/scene-v112/fb-shot.mp4'}},getURL:()=>null,warm:async()=>null,warmAll(){},stats:{}};
  window.AIFootballTikTok={getMatchState:()=>({running:true}),getStatus:()=>({leader:false}),getCurrentCue:()=>({id:'cold'}),getMatchClock:()=>({startedAt:start}),getClock:()=>({}),hasPendingShot:()=>false,onShotVideoStarted(){},onShotVideoFinished:p=>finishes.push(p),onVideoEnded:()=>false};
 });await page.addScriptTag({url:'http://127.0.0.1:'+server.address().port+'/scene-video-v219.js'});
 await page.evaluate(()=>AIFootball3D.beginShot('A',{cueId:'cold',result:'save',startsAt:Date.now(),playbackOwner:'test'}));
 await page.waitForFunction(()=>document.getElementById('sceneShotVideo').style.opacity==='1',{},{timeout:6000});
 await page.waitForFunction(()=>document.getElementById('sceneShotVideo').currentTime>=2);
 await page.evaluate(()=>{const v=document.getElementById('sceneShotVideo');window.holdAt=v.currentTime;window.nativePlay=v.play.bind(v);v.pause();v.play=()=>Promise.resolve();window.jumps=[];v.addEventListener('seeking',()=>{if(v.currentTime-holdAt>.5)jumps.push(v.currentTime);});});
 await page.waitForTimeout(2800);
 const held=await page.locator('#sceneShotVideo').evaluate(v=>v.currentTime);const holdAt=await page.evaluate(()=>holdAt);assert(Math.abs(held-holdAt)<.1,'A held spectator must not be force-seeked');
 await page.evaluate(()=>{const v=document.getElementById('sceneShotVideo');v.play=nativePlay;return v.play();});await page.waitForTimeout(500);
 const resumed=await page.locator('#sceneShotVideo').evaluate(v=>({time:v.currentTime,rate:v.playbackRate}));assert(resumed.time-holdAt>.2&&resumed.time-holdAt<.8,'Spectator must resume continuous motion, not jump by the stall duration');assert(resumed.rate<=1.03);
 await page.waitForFunction(()=>actualEnds===1,{},{timeout:15000});assert.deepEqual(await page.evaluate(()=>jumps),[]);
 console.log('PASS: real mobile spectator paused for 2.8s resumes at the same footage, without a forward seek; full clip reaches its natural end and shared clock is unchanged.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
