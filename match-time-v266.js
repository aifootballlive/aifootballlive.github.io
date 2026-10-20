/* One UTC clock for all match clients. Never changes Date or the device clock. */
(()=>{
'use strict';
let anchorUtc=0,anchorMono=0,inFlight=null,timer=null,lastSync=0;
const mono=()=>performance.now();
const now=()=>anchorUtc?anchorUtc+mono()-anchorMono:Date.now();
function serverStamp(headers){
 // Fastly's per-request edge timestamp is fractional UTC, even for cached pages.
 // HTTP Date is also current response time: do NOT add Age (cached object age).
 const edge=/^S(\d{10}(?:\.\d+)?),/.exec(headers.get('x-timer')||'');
 const stamp=edge?Number(edge[1])*1000:Date.parse(headers.get('date')||'')+500;
 return Number.isFinite(stamp)&&stamp>=1577836800000&&stamp<4102444800000?stamp:null;
}
async function sample(){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),3500);
 const url=new URL('./live.html',location.href);
 url.searchParams.set('afl_clock',crypto.randomUUID());
 const before=mono();
 try{
  const response=await fetch(url.href,{method:'HEAD',cache:'no-store',credentials:'omit',signal:controller.signal});
  const after=mono(),stamp=serverStamp(response.headers);
  if(!response.ok||stamp===null)throw Error('Clock response unavailable');
  return {utc:stamp+(after-before)/2,at:after,rtt:after-before};
 }finally{clearTimeout(timeout);}
}
function sync(){
 if(inFlight)return inFlight;
 inFlight=(async()=>{
  const results=await Promise.allSettled([sample(),sample(),sample()]);
  const samples=results.filter(r=>r.status==='fulfilled').map(r=>r.value).sort((a,b)=>a.rtt-b.rtt);
  if(samples.length){
   const best=samples[0];anchorUtc=best.utc;anchorMono=best.at;lastSync=mono();
   window.dispatchEvent(new Event('afl-clock-synced'));
  }
  return !!anchorUtc;
 })().finally(()=>{
  inFlight=null;clearTimeout(timer);timer=setTimeout(sync,anchorUtc?300000:10000);
 });
 return inFlight;
}
window.AIFootballTime={now,sync,get synced(){return !!anchorUtc;},get lastSync(){return lastSync;}};
window.AIFootballTime.ready=sync();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
window.addEventListener('online',sync);
})();
