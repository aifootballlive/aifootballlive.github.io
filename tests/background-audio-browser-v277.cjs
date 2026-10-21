const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{if(req.url==='/fixture.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Local video test</title>');return;}try{const file=path.join(root,new URL(req.url,'http://localhost').pathname),data=fs.readFileSync(file);res.setHeader('Content-Type',file.endsWith('.mp4')?'video/mp4':file.endsWith('.mp3')?'audio/mpeg':'text/javascript');if(req.headers.range){const m=/bytes=(\d+)-(\d*)/.exec(req.headers.range),a=+m[1],z=m[2]?+m[2]:data.length-1;res.writeHead(206,{'Content-Range':`bytes ${a}-${z}/${data.length}`,'Accept-Ranges':'bytes','Content-Length':z-a+1});res.end(data.subarray(a,z+1));}else res.end(data);}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});try{

 const context=await browser.newContext();await context.route('**/*.supabase.co/**',r=>r.abort());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const base='http://127.0.0.1:'+server.address().port;
 await page.goto(base+'/fixture.html');await page.evaluate(()=>{
  Object.defineProperty(document,'hidden',{get:()=>true,configurable:true});Object.defineProperty(document,'visibilityState',{get:()=>'hidden',configurable:true});
  window.__AI_FOOTBALL_SETTINGS={soundEnabled:true,aiSpeechEnabled:true,crowdEnabled:false};window.AIFootballClipCache={mobile:true};window.testQueues={A:1,B:0,C:0,D:0};window.testPhase={waiting:true};window.testClock={round:1,startedAt:null};
  window.AIFootballTikTok={getMatchClock:()=>testClock,getMatchState:()=>testPhase,getPendingQueue:()=>testQueues,getStatus:()=>({leader:true}),getTimings:()=>({language:'tr',normalMinutes:3}),getCurrentCue:()=>null};
 });await page.addScriptTag({url:base+'/stadium-audio-v219.js'});await page.evaluate(()=>AIFootballAudio.enableSound());await page.waitForFunction(()=>AIFootballAudio.enabled);await page.addScriptTag({url:base+'/round-finale-v205.js'});
 await page.waitForFunction(()=>AIFootballAudio.speechStatus.active===1&&/^waiting/.test(AIFootballAudio.speechStatus.lastKey),{},{timeout:16000});
 await page.evaluate(()=>{AIFootballAudio.stopAnnouncements();testClock={round:2,startedAt:Date.now()-13000};testPhase={running:true};});
 await page.waitForTimeout(1700);await page.evaluate(()=>testQueues.B=5);
 await page.waitForFunction(()=>AIFootballAudio.speechStatus.active===1&&AIFootballAudio.speechStatus.lastKey==='queueInfo',{},{timeout:10000});
 assert.equal(await page.evaluate(()=>document.hidden),true);await page.evaluate(()=>AIFootballAudio.disableSound());assert.equal(await page.evaluate(()=>AIFootballAudio.speechStatus.active),0);assert.equal(await page.evaluate(()=>AIFootballAudio.announce('Muted','goal1')),false);assert.deepEqual(errors,[]);
 console.log('PASS: neutral waiting and queue-receipt MP3s decode/start while page reports hidden; master mute stops speech. Local browser with simulated visibility, no production match.');await context.close();
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
