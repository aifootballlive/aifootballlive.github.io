const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),vm=require('vm'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),fixture=fs.readFileSync(path.join(__dirname,'mfa-ui-v204.cjs'),'utf8').match(/const mock=(`[^`]*`);/);assert(fixture);
const mock=vm.runInNewContext(fixture[1])+`;const original=window.supabase.createClient;window.supabase.createClient=(...args)=>{const c=original(...args);c.auth.mfa={getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:localStorage.getItem('test-aal')||'aal1'}})};c.rpc=async()=>({data:{enabled:true,approved:false}});return c;};`;
const server=http.createServer((req,res)=>{try{const f=path.join(root,req.url.split('?')[0]);res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}}).listen(8952,'127.0.0.1');
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
for(const scenario of ['fresh-normal','fresh-standalone','known-signed-out','legacy-marker','password-only','unapproved-mfa'])for(const width of [320,390,430]){
const c=await b.newContext({viewport:{width,height:width===430?932:844},isMobile:true,hasTouch:true});
await c.addInitScript(({scenario})=>{if(scenario==='fresh-standalone')Object.defineProperty(navigator,'standalone',{get:()=>true});if(['known-signed-out','unapproved-mfa'].includes(scenario))localStorage.setItem('afl.approvedAdminBrowser.v1','approved');if(scenario==='legacy-marker')localStorage.setItem('afl.adminRecognizedBrowser.v1','verified');if(['password-only','unapproved-mfa'].includes(scenario))localStorage.setItem('test-admin','1');if(scenario==='unapproved-mfa')localStorage.setItem('test-aal','aal2');},{scenario});
await c.route('**/npm/@supabase/supabase-js@2',r=>r.fulfill({contentType:'text/javascript',body:mock}));await c.route('**/*.supabase.co/**',r=>r.abort());await c.route('**/*.mp4*',r=>r.abort());
const p=await c.newPage();await p.goto('http://127.0.0.1:8952/live.html');await p.locator('.broadcastControls').waitFor({state:'visible'});await p.waitForTimeout(500);
assert(p.url().endsWith('/live.html'),scenario+' must stay on game');assert.equal(await p.locator('#adminOpen').isVisible(),false);
const link=p.locator('#guestAdminLogin');assert.equal(await link.isVisible(),['known-signed-out','fresh-standalone'].includes(scenario),scenario);
if(['known-signed-out','fresh-standalone'].includes(scenario)){
const geo=await p.evaluate(()=>{const box=s=>document.querySelector(s).getBoundingClientRect().toJSON();return {link:box('#guestAdminLogin'),cards:box('.broadcastControls'),arena:box('.arenaTitle'),width:innerWidth,height:innerHeight};});const overlaps=(a,z)=>a.x<z.right&&a.right>z.x&&a.y<z.bottom&&a.bottom>z.y;
assert(geo.link.x>=0&&geo.link.right<=geo.width&&geo.link.y>=0&&geo.link.bottom<=geo.height);assert(!overlaps(geo.link,geo.cards));assert(!overlaps(geo.link,geo.arena));
await link.click();await p.waitForURL('**/admin-security.html');await p.getByRole('link',{name:'Yönetici oturumunu aç',exact:true}).click();await p.waitForURL('**/admin-edm2026.html?next=security');await p.locator('#loginForm').waitFor({state:'visible'});
}
if(scenario==='unapproved-mfa')assert.equal(await p.evaluate(()=>localStorage.getItem('afl.approvedAdminBrowser.v1')),null,'revoked/unapproved marker cleared');
await c.close();
}
console.log('PASS: 18 mobile cases: fresh/incognito-like/legacy/AAL1/unapproved stay on game with login hidden; installed app and known signed-out profiles can reach explicit login; no marker grants admin; no overlap; MFA/login path reachable.');
}finally{await b.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
