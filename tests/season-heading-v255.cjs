const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),vm=require('vm'),assert=require('assert/strict');const root=path.join(__dirname,'..');
const fixture=fs.readFileSync(path.join(__dirname,'mfa-ui-v204.cjs'),'utf8').match(/const mock=(`[^`]*`);/);const mock=vm.runInNewContext(fixture[1]);
const server=http.createServer((req,res)=>{try{const file=path.join(root,req.url.split('?')[0]);res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}}).listen(8995,'127.0.0.1');
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 for(const width of [320,390,1280,720,1080]){
  const c=await b.newContext({viewport:{width,height:width===1080?1920:width===720?1280:900}});await c.route('**/npm/@supabase/supabase-js@2',r=>r.fulfill({contentType:'text/javascript',body:mock}));await c.route('**/*.supabase.co/**',r=>r.abort());await c.route('**/*.mp4*',r=>r.abort());const p=await c.newPage();
  await p.goto('http://127.0.0.1:8995/live.html');await p.waitForFunction(()=>window.__row&&window.AIFootballBroadcastText);
  const cases=[
   {season:5,done:2,total:20,phase:'waiting',expected:'5. SEZON · 2/20 MAÇ · GOL SAYILARI'},
   {season:5,done:2,total:20,phase:'running',expected:'5. SEZON · 3/20 MAÇ · GOL SAYILARI'},
   {season:5,done:2,total:20,phase:'finished',expected:'5. SEZON · 2/20 MAÇ · GOL SAYILARI'},
   {season:6,done:0,total:20,phase:'waiting',expected:'6. SEZON · 0/20 MAÇ · GOL SAYILARI'},
   {season:6,done:20,total:21,phase:'running',expected:'6. SEZON · 21/21 MAÇ · GOL SAYILARI'},
   {season:6,done:20,total:20,phase:'running',expected:'6. SEZON · 20/20 MAÇ · GOL SAYILARI'},
   {season:999,done:100,total:101,phase:'running',expected:'999. SEZON · 101/101 MAÇ · GOL SAYILARI'}
  ];
  for(const item of cases){
   await p.evaluate(item=>{const m=structuredClone(__row.rules.tiktok_match_v2);m.league={...m.league,season:item.season,completedRounds:item.done,plannedRounds:item.total};m.clock={round:100,startedAt:item.phase==='waiting'?null:Date.now()-5000,manualStarted:item.phase!=='waiting',finishedAt:item.phase==='finished'?Date.now():null};__row.rules.broadcast_text={all:130,headings:130};__emit(m);},item);
   await p.waitForFunction(text=>document.querySelector('#goalsHeading').textContent===text,item.expected);await p.waitForTimeout(100);
   assert(await p.locator('#goalsHeading').evaluate(node=>{const range=document.createRange();range.selectNodeContents(node);const text=range.getBoundingClientRect(),box=node.getBoundingClientRect();return text.left>=box.left+1&&text.right<=box.right-1&&text.top>=box.top&&text.bottom<=box.bottom;}),'heading must fit '+width+' '+item.expected);
  }
  await p.screenshot({path:path.join(root,'qa255-heading-'+width+'.png')});console.log(width+': current match, completed match, reset, extra match, final and max-size fit PASS');await c.close();
 }
}finally{await b.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
