/* Original MP4 bytes: bounded disk cache, one network fetch, at most three blob URLs. */
(()=>{'use strict';
const manifest={"A_save": {"src": "./assets/scene-v112/fb-shot.mp4", "seconds": 10.01, "bytes": 7237013}, "A_goal": {"src": "./assets/scene-v110/fb-shot.mp4", "seconds": 8.0, "bytes": 6592959}, "B_save": {"src": "./assets/scene-v116/gs-shot.mp4", "seconds": 14.02, "bytes": 11202821}, "B_goal": {"src": "./assets/scene-v126/gs-goal.mp4", "seconds": 10.01, "bytes": 7529480}, "C_save": {"src": "./assets/scene-v125/bjk-save.mp4", "seconds": 10.01, "bytes": 7664786}, "C_goal": {"src": "./assets/scene-v132/bjk-goal.mp4", "seconds": 10.01, "bytes": 6980251}, "D_save": {"src": "./assets/scene-v123/ts-save.mp4", "seconds": 10.01, "bytes": 7611015}, "D_goal": {"src": "./assets/scene-v140/ts-goal.mp4", "seconds": 10.01, "bytes": 6761835}},CACHE='football-original-shots-v195',MAX_URLS=3;
const urls=new Map(),pending=new Map(),queue=[],cached=new Set(),temporary=new Map();let active=0,networkFetches=0,failures=0,storageDisabled=false;
const absolute=key=>new URL(manifest[key].src,location.href).href;
const storePromise=typeof caches==='undefined'?Promise.resolve(null):caches.open(CACHE).catch(()=>null);
// Phones stream the active/next original in their video decks. A second full
// fetch competes with playback and materializing every clip pressures memory.
const constrained=()=>navigator.connection?.saveData||['slow-2g','2g','3g'].includes(navigator.connection?.effectiveType)||window.matchMedia?.('(pointer:coarse)').matches||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||'');
function pinned(){return new Set([...document.querySelectorAll('video[data-clip-key]')].map(v=>v.dataset.clipKey));}
function trim(){const pins=pinned();for(const [key,url]of urls){if(urls.size<=MAX_URLS)break;if(!pins.has(key)){URL.revokeObjectURL(url);urls.delete(key);}}}
function getURL(key){const url=urls.get(key);if(url){urls.delete(key);urls.set(key,url);}return url||null;}
function pump(){if(active||!queue.length)return;queue.sort((a,b)=>b.priority-a.priority);const job=queue.shift();active=1;
 (async()=>{const store=storageDisabled?null:await storePromise,url=absolute(job.key);if(store){const hit=await store.match(url);if(hit){cached.add(job.key);return true;}}
 if(!store&&!job.materialize)return false;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);let response;
 try{networkFetches++;response=await fetch(url,{signal:controller.signal,cache:'force-cache',priority:job.priority>1?'high':'low'});if(!response.ok)throw Error('Clip cache HTTP '+response.status);const length=Number(response.headers.get('content-length'));if(length&&length>16*1024*1024)throw Error('Oversize clip');
 if(store){try{await store.put(url,response);cached.add(job.key);return true;}catch{storageDisabled=true;return false;}}
 if(job.materialize){const blob=await response.blob();if(blob.size>16*1024*1024)throw Error('Oversize clip');temporary.set(job.key,blob);return true;}return false;
 }finally{clearTimeout(timer);}
 })().then(job.resolve,error=>{failures++;job.resolve(false);}).finally(()=>{active=0;pending.delete(job.key);pump();});
}
function ensure(key,priority=0,materialize=false){if(!manifest[key])return Promise.resolve(false);if(cached.has(key)||temporary.has(key))return Promise.resolve(true);const old=pending.get(key);if(old){old.priority=Math.max(old.priority,priority);old.materialize||=materialize;return old.promise;}
 const job={key,priority,materialize};job.promise=new Promise(resolve=>job.resolve=resolve);pending.set(key,job);queue.push(job);pump();return job.promise;
}
async function warm(key,options={}){const priority=options.priority??10,materialize=options.materialize!==false;if(!manifest[key])return null;if(materialize&&getURL(key))return getURL(key);
 if(constrained()&&!options.recovery&&!cached.has(key)&&!temporary.has(key)){
  const store=await storePromise;if(!store||!await store.match(absolute(key)))return null;cached.add(key);
 }
 if(!await ensure(key,priority,materialize))return null;if(!materialize)return true;
 if(getURL(key))return getURL(key);let blob=temporary.get(key);temporary.delete(key);if(!blob){const store=await storePromise;const response=await store?.match(absolute(key));if(!response)return null;blob=await response.blob();}if(getURL(key))return getURL(key);const url=URL.createObjectURL(blob);urls.set(key,url);trim();return getURL(key);
}
let backgroundStarted=false;
function warmAll(){if(backgroundStarted||constrained()||document.hidden)return;backgroundStarted=true;storePromise.then(store=>{if(store&&!storageDisabled)for(const key of Object.keys(manifest))ensure(key,-10,false);});}
window.addEventListener('pagehide',()=>{for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();temporary.clear();});
window.AIFootballClipCache={manifest,getURL,warm,warmAll,get stats(){return {cachedClips:cached.size,blobURLs:urls.size,inFlight:active,queued:queue.length,networkFetches,failures,storageDisabled};}};
})();
