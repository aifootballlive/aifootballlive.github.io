const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),mock=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'mfa-ui-v204.cjs'),'utf8').match(/const mock=(`[^`]*`);/)[1])+`;const original=window.supabase.createClient;window.supabase.createClient=(...args)=>{const c=original(...args);c.auth.mfa={getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal2'}})};c.rpc=async()=>({data:{enabled:true,approved:true}});return c;};`;
const server=http.createServer((req,res)=>{try{const file=path.join(root,new URL(req.url,'http://localhost').pathname);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.svg':'image/svg+xml'})[path.extname(file)]||'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  for(const [width,height,admin,app,studio] of [[320,740,false,false,false],[390,844,false,false,false],[390,844,true,true,false],[1440,1100,true,false,false],[720,1280,false,false,true],[1080,1920,false,false,true]]){
   const context=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500});
   await context.addInitScript(({admin,app})=>{if(admin)localStorage.setItem('test-admin','1');if(app)Object.defineProperty(navigator,'standalone',{get:()=>true});},{admin,app});
   await context.route('**/npm/@supabase/supabase-js@2',r=>r.fulfill({contentType:'text/javascript',body:mock}));await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/*.mp4*',r=>r.abort());
   const page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/live.html'+(studio?'?studio=tiktok1080':''));await page.waitForFunction(()=>AIFootballTikTok?.getStatus().shared&&window.AIFootballBroadcastText);await page.evaluate(()=>document.fonts.ready);
   for(const values of [{all:105,headings:85},{all:130,headings:130}]){
    await page.evaluate(v=>AIFootballBroadcastText.apply(v,true),values);await page.waitForTimeout(300);
    const view=await page.locator('.arenaTitle').evaluate(node=>{const range=document.createRange();range.selectNodeContents(node);const box=node.getBoundingClientRect(),text=range.getBoundingClientRect(),heading=document.getElementById('goalsHeading').getBoundingClientRect(),frame=document.getElementById('broadcastViewport').getBoundingClientRect(),style=getComputedStyle(node);return {weight:style.fontWeight,style:style.fontStyle,color:style.color,background:style.backgroundColor,text:node.innerText,left:text.left-frame.left,right:frame.right-text.right,bottom:Math.max(text.bottom,box.bottom),next:heading.top,lines:range.getClientRects().length};});
    assert.equal(view.weight,'900');assert.equal(view.style,'italic');assert.equal(view.background,'rgba(0, 0, 0, 0)');assert.equal(view.text,'DORUK ARENASI');assert.equal(view.lines,1);assert(view.left>=2&&view.right>=2);assert(view.bottom<=view.next-1,'arena overlaps score heading '+JSON.stringify(view));
   }
   await page.screenshot({path:path.join(root,'qa269-arena-'+width+(app?'-app':'')+'.png')});console.log('PASS '+width+(app?' app':'')+': bold gold sports title, one line and clear of score heading at 85–130%.');await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
