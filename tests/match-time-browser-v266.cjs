const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),fixture=fs.readFileSync(path.join(__dirname,'mfa-ui-v204.cjs'),'utf8').match(/const mock=(`[^`]*`);/);
const mock=vm.runInNewContext(fixture[1])+`;const original=window.supabase.createClient;window.supabase.createClient=(...args)=>{const c=original(...args);c.auth.mfa={getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal2'}})};c.rpc=async()=>({data:{enabled:true,approved:true}});return c;};`;
const server=http.createServer((req,res)=>{try{
 const file=path.join(root,new URL(req.url,'http://localhost').pathname),ext=path.extname(file);
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.ttf':'font/ttf'})[ext]||'application/octet-stream');
 res.setHeader('X-Timer','S'+Date.now()/1000+',VS0,VE0');res.end(fs.readFileSync(file));
}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const devices=[];
  for(const [width,skew] of [[1440,0],[390,7000]]){
   const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
   await context.addInitScript(skew=>{const original=Date.now;Date.now=()=>original()+skew;localStorage.setItem('test-admin','1');},skew);
   await context.route('**/npm/@supabase/supabase-js@2',r=>r.fulfill({contentType:'text/javascript',body:mock}));
   await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/*.mp4*',r=>r.abort());
   const page=await context.newPage();await page.goto(origin+'/live.html');
   await page.waitForFunction(()=>window.AIFootballTime?.synced&&window.AIFootballTikTok?.getStatus().shared);
   await page.locator('#adminFrontKeeper').waitFor({state:'visible'});
   await page.evaluate(()=>{const m=structuredClone(__row.rules.tiktok_match_v2);m.keeper={A:20,B:20,C:20,D:20};m.revision++;__emit(m);AIFootballBroadcastText.apply({all:105,info:55},true);});await page.waitForTimeout(250);
   const keeper=await page.evaluate(()=>[...document.querySelectorAll('.frontKeeperTop strong')].map(n=>{
    const r=document.createRange();r.selectNodeContents(n);const text=r.getBoundingClientRect(),box=n.closest('.frontKeeperCard').getBoundingClientRect();
    return {font:parseFloat(getComputedStyle(n).fontSize),root:document.getElementById('broadcastViewport').getBoundingClientRect().width,
     left:text.left-box.left,right:box.right-text.right,top:text.top-box.top,bottom:box.bottom-text.bottom};
   }));

   for(const n of keeper){assert(n.font>=n.root*.025,'keeper numbers must remain large at info 55% '+JSON.stringify(n));assert(n.left>=1&&n.right>=1&&n.top>=0&&n.bottom>=0,'keeper number must fit '+JSON.stringify(n));}
   await page.screenshot({path:path.join(root,'qa266-keeper-'+width+'.png')});
   devices.push({context,page});
  }
  const deadline=Date.now()+29900;
  for(const {page} of devices)await page.evaluate(deadline=>{
   const m=structuredClone(__row.rules.tiktok_match_v2);
   m.clock={startedAt:deadline,countdownStartedAt:deadline-30000,manualStarted:true,round:1,finishedAt:null};
   m.timing={...m.timing,normalMinutes:25,countdownSeconds:30};m.revision++;__emit(m);
  },deadline);
  const snapshots=await Promise.all(devices.map(async({page})=>{
   await page.waitForFunction(()=>document.querySelector('#matchClockHud').dataset.phase==='countdown');
   return page.evaluate(()=>({utc:AIFootballTime.now(),device:Date.now(),digits:document.querySelector('.clockDigits').textContent,startedAt:AIFootballTikTok.getMatchClock().startedAt}));
  }));
  assert.equal(snapshots[0].startedAt,snapshots[1].startedAt);
  assert(Math.abs(snapshots[0].utc-snapshots[1].utc)<100);
  assert(snapshots[1].device-snapshots[0].device>6900);
  assert.equal(snapshots[0].digits,'00:30');assert.equal(snapshots[1].digits,'00:30');
  console.log('PASS: real desktop and touch/mobile browsers display the same 00:30 and shared kickoff despite a phone clock 7 seconds fast; keeper numbers remain large and fit at info 55%. Production DB blocked.');
  for(const {context} of devices)await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
