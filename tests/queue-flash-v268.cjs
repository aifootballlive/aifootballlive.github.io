const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),mock=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'mfa-ui-v204.cjs'),'utf8').match(/const mock=(`[^`]*`);/)[1]);
const server=http.createServer((req,res)=>{try{
 const file=path.join(root,new URL(req.url,'http://localhost').pathname);
 res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.ttf':'font/ttf'})[path.extname(file)]||'text/html');res.end(fs.readFileSync(file));
}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  for(const [width,reducedMotion] of [[390,'no-preference'],[1440,'no-preference'],[390,'reduce']]){
   const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390,reducedMotion});
   await context.route('**/npm/@supabase/supabase-js@2',r=>r.fulfill({contentType:'text/javascript',body:mock}));
   await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/*.mp4*',r=>r.abort());
   const page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/live.html');
   await page.waitForFunction(()=>window.AIFootballTikTok?.getStatus().shared);
   const add=async teams=>page.evaluate(teams=>{const m=structuredClone(__row.rules.tiktok_match_v2);for(const team of teams)m.jobs.push({id:crypto.randomUUID(),team,count:5});m.revision++;__emit(m);},teams);
   await add(['A','B','C','D']);
   const effect=await page.locator('#frontQueueA').evaluate(e=>({spark:e.classList.contains('queueSpark'),animation:getComputedStyle(e).animationName}));
   assert(effect.spark);assert.equal(effect.animation,reducedMotion==='reduce'?'none':'aflQueueNumberBlink');
   await page.waitForFunction(()=>['A','B','C','D'].every(t=>{const e=document.getElementById('frontQueue'+t);return !e.classList.contains('queueSpark')&&getComputedStyle(e).color==='rgb(255, 255, 255)';}));
   await add(['A']);await page.waitForTimeout(600);await add(['A']);await page.waitForTimeout(600);
   assert(await page.locator('#frontQueueA').evaluate(e=>e.classList.contains('queueSpark')),'a second gift must restart its own full flash');
   await page.waitForFunction(()=>{const e=document.getElementById('frontQueueA');return !e.classList.contains('queueSpark')&&getComputedStyle(e).color==='rgb(255, 255, 255)';});
   console.log('PASS '+width+' '+reducedMotion+': flash retained; all four numbers return to white; rapid gifts restart cleanly.');
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
