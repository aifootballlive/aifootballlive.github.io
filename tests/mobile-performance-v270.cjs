const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),fixture=fs.readFileSync(path.join(__dirname,'mfa-ui-v204.cjs'),'utf8').match(/const mock=(`[^`]*`);/);
const mock=vm.runInNewContext(fixture[1])+`;const original=window.supabase.createClient;window.supabase.createClient=(...args)=>{const c=original(...args);c.auth.mfa={getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal2'}})};c.rpc=async()=>({data:{enabled:true,approved:true}});return c;};`;
const server=http.createServer((req,res)=>{try{const file=path.join(root,new URL(req.url,'http://localhost').pathname);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.svg':'image/svg+xml'})[path.extname(file)]||'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(()=>localStorage.setItem('test-admin','1'));
  await context.route('**/npm/@supabase/supabase-js@2',r=>r.fulfill({contentType:'text/javascript',body:mock}));await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/*.mp4*',r=>r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/live.html');await page.waitForFunction(()=>window.AIFootballTikTok?.getStatus().shared);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1500);
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});await cdp.send('Performance.enable');
  async function sample(){
   await page.evaluate(()=>{window.perfMutations=0;window.perfResizes=0;window.perfLong=0;window.perfObserver=new MutationObserver(rs=>perfMutations+=rs.length);perfObserver.observe(document.getElementById('broadcastViewport'),{attributes:true,childList:true,subtree:true});window.perfResize=()=>perfResizes++;window.addEventListener('resize',perfResize);window.perfLongObserver=new PerformanceObserver(list=>{perfLong+=list.getEntries().filter(e=>e.startTime>=window.perfStart).length;});perfStart=performance.now();perfLongObserver.observe({type:'longtask'});});
   const before=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));await page.waitForTimeout(5000);const after=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
   const dom=await page.evaluate(()=>{perfObserver.disconnect();perfLongObserver.disconnect();window.removeEventListener('resize',perfResize);return {mutations:perfMutations,resizes:perfResizes,longTasks:perfLong};});
   return {...dom,...Object.fromEntries(['LayoutCount','RecalcStyleCount','LayoutDuration','ScriptDuration','TaskDuration'].map(k=>[k,+(after[k]-before[k]).toFixed(4)]))};
  }
  const idle=await sample();await page.evaluate(()=>{const m=structuredClone(__row.rules.tiktok_match_v2);m.clock={startedAt:Date.now()-10000,manualStarted:true,round:1,finishedAt:null};m.lease.until=0;__emit(m);});await page.waitForTimeout(1000);const running=await sample();
  assert.deepEqual(errors,[]);const report={idle,running};console.log(JSON.stringify(report,null,2));
  if(process.env.PERF_BASELINE)fs.writeFileSync(process.env.PERF_BASELINE,JSON.stringify(report));
  else{assert(idle.LayoutCount<30,'Idle layout churn');assert(idle.mutations<150,'Idle DOM churn');assert(running.LayoutCount<80,'Countdown layout churn');}
  // Incremental fitting must still shrink growing scores/queues, without
  // resetting every other font once per second.
  for(const selector of ['.panelHead.teamScore .num','.adminTeamQueue strong']){
   let previous=Infinity;
   for(const text of ['1','999','999999']){
    await page.locator(selector).first().evaluate((node,text)=>node.textContent=text,text);await page.waitForTimeout(180);
    const size=await page.locator(selector).first().evaluate(node=>{const range=document.createRange();range.selectNodeContents(node);const ink=range.getBoundingClientRect(),box=node.getBoundingClientRect();return {font:parseFloat(getComputedStyle(node).fontSize),ink:ink.width,box:box.width};});
    assert(size.font<=previous+.01,'Growing numbers must not enlarge type');assert(size.ink<=size.box+1,'Digits must fit their box');previous=size.font;
   }
  }
  console.log('PASS: growing score and pending-shot digits still shrink into their existing boxes.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
