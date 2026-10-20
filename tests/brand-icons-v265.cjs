const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const pages=['index.html','live.html','league.html','tiktok-studio.html','admin-edm2026.html','admin-settings.html','admin-security.html','admin-devices.html','admin/index.html','live/index.html'];
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 try{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep))throw Error('outside root');
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
  // Keep redirect entry pages open only inside this metadata fixture.
  const body=fs.readFileSync(file);
  res.end(file.endsWith('.html')?body.toString('utf8').replace(/<meta\b[^>]*http-equiv=["']refresh["'][^>]*>/gi,''):body);
 }catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  // Disable all page scripts: branding checks must never contact or mutate the live game.
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  const page=await context.newPage();let commonApple,commonManifest;
  for(const name of pages){
   await page.goto(origin+'/'+name,{waitUntil:'domcontentloaded'});
   const metadata=await page.evaluate(()=>({
    icons:[...document.querySelectorAll('link[rel="icon"]')].map(e=>e.href),
    apple:document.querySelector('link[rel="apple-touch-icon"]').href,
    manifest:document.querySelector('link[rel="manifest"]').href
   }));
   assert.equal(metadata.icons.length,3);assert(metadata.icons.every(u=>u.startsWith(origin+'/')));
   if(commonApple){assert.equal(metadata.apple,commonApple);assert.equal(metadata.manifest,commonManifest);}
   commonApple=metadata.apple;commonManifest=metadata.manifest;
   const sizes=await page.evaluate(async urls=>Promise.all(urls.map(async src=>{
    const img=new Image();img.src=src;await img.decode();return [img.naturalWidth,img.naturalHeight];
   })),metadata.icons.slice(1).concat(metadata.apple));
   assert.deepEqual(sizes,[[32,32],[16,16],[180,180]]);
  }
  const response=await context.request.get(commonManifest);assert(response.ok());const manifest=await response.json();
  assert.equal(manifest.start_url,'/live.html');assert.equal(manifest.display,'standalone');assert.equal(manifest.id,'/live.html');
  for(const icon of manifest.icons){
   const size=await page.evaluate(async src=>{const img=new Image();img.src=src;await img.decode();return img.naturalWidth+'x'+img.naturalHeight;},origin+icon.src);
   assert.equal(size,icon.sizes);
  }
  assert(manifest.icons.some(i=>i.purpose==='maskable'&&i.sizes==='512x512'));
  console.log('PASS: 10 page headers share decoded 16/32/180 icons; standalone manifest, 192/512 and maskable icons load from local assets, including nested routes. No external profile requests.');
  await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
