const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.join(__dirname,'..');
const server=http.createServer((req,res)=>{
 try{const file=path.join(root,req.url.split('?')[0]);res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(file));}
 catch{res.writeHead(404).end();}
}).listen(8991,'127.0.0.1');
const league={season:5,completedRounds:1,plannedRounds:20,teams:{A:{played:1,points:3,goals:2}},trophies:{A:3},history:[{round:1,winner:'A',scores:{A:2}}]};
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{for(const width of [390,1224]){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.addInitScript(()=>{
   localStorage.setItem('sb-xozzbaguihyhruloiqjm-auth-token','owner-session-sentinel');
   window.sessionAccess=[];
   for(const name of ['getItem','setItem','removeItem','clear']){
    const original=Storage.prototype[name];Storage.prototype[name]=function(...args){window.sessionAccess.push(name);return original.apply(this,args);};
   }
  });
  let mode='success';const requests=[],externalScripts=[];
  await context.route('**/*.supabase.co/**',async route=>{
   const request=route.request();requests.push({method:request.method(),headers:request.headers(),url:request.url()});
   if(mode==='error')return route.fulfill({status:503,body:'unavailable'});
   await route.fulfill({contentType:'application/json',body:JSON.stringify([{league,archive:[{season:'<img src=x onerror="window.injected=1">',champion:'A',teams:{A:{points:21}}}]}])});
  });
  context.on('request',r=>{if(r.resourceType()==='script')externalScripts.push(r.url());});
  const page=await context.newPage();await page.goto('http://127.0.0.1:8991/league.html');
  await page.waitForFunction(()=>document.querySelector('#season').textContent==='5');
  assert.equal(await page.locator('a,form,input,iframe').count(),0);
  assert.equal(await page.getByText('Maça dön',{exact:true}).count(),0);
  assert.equal(await page.locator('#standings tr').count(),4);
  assert.equal(await page.locator('#archive img').count(),0);
  assert.equal(await page.evaluate(()=>window.injected),undefined);
  assert.deepEqual(await page.evaluate(()=>window.sessionAccess),[]);
  assert.equal(await page.evaluate(()=>localStorage['sb-xozzbaguihyhruloiqjm-auth-token']),'owner-session-sentinel');
  assert(externalScripts.every(url=>url.startsWith('http://127.0.0.1:8991/')));
  assert(requests.length>0);
  for(const request of requests){
   assert.equal(request.method,'GET');assert(!request.headers.authorization);assert(!request.headers.cookie);
   assert.equal(new URL(request.url).searchParams.get('select'),'league:rules->tiktok_match_v2->league,archive:rules->tiktok_match_v2->leagueArchive,seasons:rules->tiktok_match_v2->leagueSeasons,resets:rules->tiktok_match_v2->seasonResetHistory');
  }
  await page.evaluate(()=>window.dispatchEvent(new MessageEvent('message',{origin:'https://untrusted.example',source:window,data:{type:'AIFootballLeagueSnapshotV1',league:{season:999}}})));
  assert.equal(await page.locator('#season').textContent(),'5');
  await page.getByRole('button',{name:'Kıvılcım Arenası',exact:true}).click();assert((await page.locator('#leagueInfo').textContent()).includes('henüz başlamadı'));
  mode='error';await page.reload();await page.getByText('Canlı lig bilgileri bekleniyor. Takımlar gösteriliyor.',{exact:true}).waitFor();
  assert.equal(await page.locator('#standings tr').count(),4);
  await context.close();console.log(width+': GET only, no auth/session access, no game links, safe text, foreign messages rejected, offline fallback PASS');
 }}finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
