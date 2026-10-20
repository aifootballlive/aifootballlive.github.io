const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{if(req.url==='/fixture.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Local video test</title>');return;}try{const file=path.join(root,new URL(req.url,'http://localhost').pathname),data=fs.readFileSync(file);res.setHeader('Content-Type',file.endsWith('.mp4')?'video/mp4':'text/javascript');if(req.headers.range){const m=/bytes=(\d+)-(\d*)/.exec(req.headers.range),a=+m[1],z=m[2]?+m[2]:data.length-1;res.writeHead(206,{'Content-Range':`bytes ${a}-${z}/${data.length}`,'Accept-Ranges':'bytes','Content-Length':z-a+1});res.end(data.subarray(a,z+1));}else res.end(data);}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await context.route('**/*.mp4',async route=>{await new Promise(r=>setTimeout(r,700));await route.continue();});
 const page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/fixture.html');await page.setContent('<div class="wrap" style="position:relative;width:390px;height:844px"></div>');
 await page.evaluate(()=>{
  HTMLVideoElement.prototype.requestVideoFrameCallback=function(){return 0;};window.finishes=[];window.start=Date.now();
  window.AIFootballClipCache={manifest:{A_save:{seconds:10.005}},getURL:()=>null,warm:async()=>null,warmAll(){},stats:{}};
  window.AIFootballTikTok={getMatchState:()=>({running:true}),getStatus:()=>({leader:true}),getCurrentCue:()=>({id:'cold'}),getMatchClock:()=>({startedAt:start}),getClock:()=>({}),hasPendingShot:()=>false,onShotVideoStarted(){},onShotVideoFinished:p=>finishes.push(p),onVideoEnded:()=>false};
 });await page.addScriptTag({url:'http://127.0.0.1:'+server.address().port+'/scene-video-v219.js'});
 await page.evaluate(()=>AIFootball3D.beginShot('A',{cueId:'cold',result:'save',startsAt:Date.now(),playbackOwner:'test'}));
 await page.waitForFunction(()=>document.getElementById('sceneShotVideo').style.opacity==='1',{},{timeout:6000});
 await page.waitForFunction(()=>finishes.length===1,{},{timeout:18000});const proof=await page.evaluate(()=>finishes[0]);assert(proof.naturalEnd);assert(proof.playedSeconds>=proof.duration-.35);assert(proof.elapsedMs>=proof.duration*1000-500);
 console.log('PASS: 700ms cold media load, absent frame callbacks, visible playback and natural full-video completion; no hidden-deck deadlock or repeated shot.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
