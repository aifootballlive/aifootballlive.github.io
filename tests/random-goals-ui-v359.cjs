const {chromium}=require('playwright'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{for(const width of [390,1280]){const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.abort());
  await page.setContent('<div id="adminOverlay"><div class="admin"><div class="adminHead"></div><div class="adminBody"></div></div></div>');
  await page.evaluate(()=>{window.saved='keeper';window.allow=true;window.AIFootballTikTok={getShotOutcomeMode:()=>window.saved,setShotOutcomeMode:async v=>{if(!window.allow)return false;window.saved=v;return true;}};});
  await page.addScriptTag({path:path.join(root,'random-goals-v359.js')});await page.addScriptTag({path:path.join(root,'admin-categories-v293.js')});
  const input=page.locator('#adminCategory-match #shotOutcomeMode');await page.locator('#adminCategoryTab-match').click();assert(await input.isVisible());assert.equal(await input.inputValue(),'keeper');
  await input.selectOption('random');await page.waitForFunction(()=>window.saved==='random'&&!document.getElementById('shotOutcomeMode').disabled);assert.match(await page.locator('#randomGoalSettings [role=status]').textContent(),/kaydedildi/);
  const colors=await input.evaluate(e=>({bg:getComputedStyle(e).backgroundColor,fg:getComputedStyle(e).color,w:e.getBoundingClientRect().width}));assert.equal(colors.bg,'rgb(16, 32, 57)');assert.equal(colors.fg,'rgb(255, 255, 255)');assert(colors.w<=width);
  await page.locator('#adminCategoryTab-likes').click();await page.locator('#adminCategoryTab-match').click();assert.equal(await input.inputValue(),'random');
  await page.evaluate(()=>window.allow=false);await input.selectOption('keeper');await page.waitForFunction(()=>!document.getElementById('shotOutcomeMode').disabled);assert.equal(await input.inputValue(),'random','failed save restores persisted selection');assert.match(await page.locator('#randomGoalSettings [role=status]').textContent(),/Kaydedilemedi/);assert.deepEqual(errors,[]);await page.close();
 }console.log('PASS: isolated Chrome 390/1280, Settings > Match random selector, save, failure recovery, tab navigation, dark readable colors. No live requests.');}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
