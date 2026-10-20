const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../shot-cache-v195.js'),'utf8');
async function fixture({mobile=false,saveData=false,effectiveType='4g'}={}){
 const entries=new Map(),requests=[];const window={matchMedia:()=>({matches:mobile}),addEventListener(){}};
 const store={match:async key=>entries.get(key)?.clone(),put:async(key,response)=>{entries.set(key,response.clone());}};
 vm.runInNewContext(source,{window,navigator:{userAgent:mobile?'iPhone':'Desktop',connection:{saveData,effectiveType}},document:{hidden:false,querySelectorAll:()=>[]},location:{href:'https://local.test/live.html'},caches:{open:async()=>store},URL,AbortController,setTimeout,clearTimeout,fetch:async(url,options)=>{requests.push({url,priority:options.priority});return new Response(new Uint8Array(64));}});
 return {cache:window.AIFootballClipCache,requests};
}
const settle=()=>new Promise(r=>setTimeout(r,30));
(async()=>{
 for(const options of [{mobile:true},{saveData:true},{effectiveType:'3g'}]){
  const {cache,requests}=await fixture(options);cache.warmAll();await settle();assert.equal(requests.length,0,'No bulk downloads on constrained devices');
  assert.equal(await cache.warm('A_save',{priority:100}),null);assert.equal(requests.length,0,'Cold video deck must not compete with a duplicate full fetch');
  const blob=await cache.warm('A_save',{priority:200,recovery:true});assert(blob.startsWith('blob:'));assert.equal(requests.length,1,'Stall recovery can still fetch original');
  assert.equal(await cache.warm('A_save'),blob);assert.equal(requests.length,1,'Reuse cached original');
 }
 const {cache,requests}=await fixture();cache.warmAll();await settle();assert.equal(requests.length,8,'Desktop retains bounded original cache');assert(requests.every(r=>r.priority==='low'));
 console.log('PASS: mobile/data saver/3G skip all 8 speculative downloads and cold duplicate fetches; cached playback and stall recovery preserved; desktop cache unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
