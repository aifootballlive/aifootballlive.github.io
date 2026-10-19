const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),vm=require('vm'),assert=require('assert/strict');
const root=path.join(__dirname,'..');
const fixture=fs.readFileSync(path.join(__dirname,'mfa-ui-v204.cjs'),'utf8').match(/const mock=(`[^`]*`);/);
const mock=vm.runInNewContext(fixture[1])+`;const original=window.supabase.createClient;window.supabase.createClient=(...args)=>{const c=original(...args);c.auth.mfa={getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal2'}})};c.rpc=async()=>({data:{enabled:true,approved:true}});return c;};`;
const server=http.createServer((req,res)=>{try{const f=path.join(root,req.url.split('?')[0]);res.setHeader('Content-Type',f.endsWith('.css')?'text/css':f.endsWith('.js')?'text/javascript':f.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}}).listen(8984,'127.0.0.1');
(async()=>{
 const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const configs=[{}, {all:130,headings:80,teams:110,scores:130,shots:80,queues:100,info:80,buttons:120}, {all:130,teams:200,scores:200,info:130}];
  for(const [index,config] of configs.entries()){
   const results=[];
   // 1600x1250 CSS pixels at 0.8 device scale represents a 1280x1000 physical viewport at 80%.
   for(const [name,width,height,scale,admin] of [['desktop80',1600,1250,.8,true],['desktop100',1280,1000,1,true],['phone',390,844,1,false],['source720',720,1280,1,false],['source1080',1080,1920,1,false]]){
    const c=await b.newContext({viewport:{width,height},deviceScaleFactor:scale});
    if(admin)await c.addInitScript(()=>localStorage.setItem('test-admin','1'));
    await c.route('**/npm/@supabase/supabase-js@2',r=>r.fulfill({contentType:'text/javascript',body:mock}));
    await c.route('**/*.supabase.co/**',r=>r.abort());await c.route('**/*.mp4*',r=>r.abort());
    const p=await c.newPage();await p.goto('http://127.0.0.1:8984/live.html'+(name.startsWith('source')?'?studio=tiktok1080':''));
    await p.waitForFunction(()=>!!window.AIFootballBroadcastText&&!document.documentElement.classList.contains('aflStarting'));
    if(admin)await p.waitForFunction(()=>document.querySelector('.wrap.adminView'));
    await p.evaluate(config=>{__row.rules.broadcast_text=config;applyRules(__row.rules);},config);
    if(admin)await p.evaluate(()=>openAdmin());
    await p.waitForTimeout(1200);
    const data=await p.evaluate(()=>{
     const root=document.querySelector('#broadcastViewport'),width=root.getBoundingClientRect().width,out={};
     for(const sel of ['.arenaTitle','#goalsHeading','.teamTitle','.teamScore .num','.giftEffect','.queueLabel','.adminTeamQueue strong','#leagueProfileHint','.clockLabel','.panel','.giftVisual','.giftbtn.shot','.adminTeamQueue','#matchClockHud']){
      const n=root.querySelector(sel),r=n.getBoundingClientRect(),s=getComputedStyle(n);
      out[sel]={x:(r.left-root.getBoundingClientRect().left)/width,y:(r.top-root.getBoundingClientRect().top)/width,font:parseFloat(s.fontSize)/width,h:r.height/width,w:r.width/width,border:parseFloat(s.borderTopWidth)/width,radius:parseFloat(s.borderTopLeftRadius)/width};
     }
     return out;
    });
    assert.equal(await p.locator('#liveStartButton').isVisible(),admin,'Private Start visibility');if(!admin)assert(Math.abs((data['.clockLabel'].x+data['.clockLabel'].w/2)-(data['#matchClockHud'].x+data['#matchClockHud'].w/2))<.002,'Viewer status is not centered');
    results.push({name,data});
    if(index===1&&['desktop80','source1080'].includes(name))await p.screenshot({path:path.join(root,'qa244-'+name+'.png')});
    await c.close();
   }
   for(const result of results.slice(1))for(const [sel,props]of Object.entries(result.data)){
    const reference=results[0].data[sel];
    const visibleFont=['.arenaTitle','#goalsHeading','.teamTitle','.teamScore .num','.giftEffect','.queueLabel','.adminTeamQueue strong','#leagueProfileHint','.clockLabel'].includes(sel);
    if([".arenaTitle"].includes(sel))assert(Math.abs(props.x-reference.x)<.006,`${index} ${result.name} ${sel} alignment differs`); if(visibleFont&&sel!=='.clockLabel')assert(Math.abs(props.font-reference.font)<.004,`${index} ${result.name} ${sel} font differs ${props.font} vs ${reference.font}`);
    if(['#goalsHeading','.panel','.giftVisual','.giftbtn.shot','.adminTeamQueue','#leagueProfileHint','#matchClockHud'].includes(sel))for(const key of ['h','w','border','radius'])assert(Math.abs(props[key]-reference[key])<.006,`${index} ${result.name} ${sel} ${key} differs`);
   }
   console.log(`Configuration ${index}: 80% desktop, desktop drawer, phone, 720 and 1080 sources share typography and frame proportions; private controls remain private`);
  }
 }finally{await b.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
