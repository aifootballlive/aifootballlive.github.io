/* Public release watcher. Never carries credentials or unlocks admin controls.
   Both spectator and admin game pages use the same deployed release marker. */
(()=>{
'use strict';
const currentMarker=document.querySelector('meta[name="aifootball-release"]')?.content||'';
const liveUrl=new URL('./live.html',location.href);
const releasePattern=/<meta\s+name=["']aifootball-release["']\s+content=["']([^"']+)["']/i;
const gitUrl='https://api.github.com/repos/aifootballlive/aifootballlive.github.io/commits/main';
const reloadKey='aifootball-auto-refresh-attempt-v2';
const navigation=performance.getEntriesByType?.('navigation')?.[0];
const explicitlyRefreshed=navigation?.type==='reload'||['refresh','updated','afl_updated'].some(k=>new URL(location.href).searchParams.has(k));
let shown=false,pageBusy=false,gitBusy=false,pageCheckedAt=0,gitCheckedAt=0,lastGitSha=null;

function refreshedUrl(){
 const dest=new URL('./live.html',location.href);
 // A new URL is essential: meta http-equiv Cache-Control alone does not
 // override HTTP caches or an already cached GitHub Pages document.
 dest.searchParams.delete('version_probe');
 dest.searchParams.delete('updated');
 dest.searchParams.delete('refresh');
 dest.searchParams.set('afl_updated',String(Date.now()));
 if(document.body.classList.contains('drawerMode')||
    document.body.classList.contains('settingsMode')||
    document.getElementById('adminOverlay')?.classList.contains('show'))dest.hash='admin';
 return dest.href;
}
function reloadFresh(){location.replace(refreshedUrl());}
function displayRefreshNotice(){
 if(shown)return;shown=true;
 const shade=document.createElement('div');shade.id='aifootballUpdateNotification';
 Object.assign(shade.style,{position:'fixed',inset:'0',background:'rgba(5,13,26,.92)',zIndex:'2147483646',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',boxSizing:'border-box'});
 const card=document.createElement('section');
 Object.assign(card.style,{background:'#152843',color:'#fff',border:'2px solid #7ccbab',borderRadius:'16px',maxWidth:'440px',width:'100%',padding:'24px',textAlign:'center',fontFamily:'system-ui,sans-serif',boxShadow:'0 10px 36px rgba(0,0,0,.5)'});
 const title=document.createElement('div');title.textContent='YENİ SÜRÜM YAYINLANDI';
 Object.assign(title.style,{fontSize:'21px',fontWeight:'900',marginBottom:'11px'});
 const detail=document.createElement('p');detail.textContent='Güncel değişiklikleri görmek için sayfayı yenileyin. Yönetici ve izleyici ekranlarında ayrı ayrı yenileme yapılmalıdır.';
 Object.assign(detail.style,{fontSize:'16px',lineHeight:'1.5',margin:'0 0 18px'});
 const button=document.createElement('button');button.type='button';button.textContent='GÜNCEL SÜRÜME GEÇ';
 Object.assign(button.style,{background:'#16846a',color:'#fff',border:'none',borderRadius:'10px',minHeight:'48px',padding:'13px 28px',fontSize:'17px',fontWeight:'900',cursor:'pointer'});
 button.addEventListener('click',reloadFresh);
 card.append(title,detail,button);shade.append(card);document.body.append(shade);
 document.dispatchEvent(new CustomEvent('aifootball-update-required'));
}
function isNewerRelease(remoteMarker){
 const re=/^(\d{8})-v(\d+)/;
 const remote=remoteMarker.match(re),local=currentMarker.match(re);
 if(!remote||!local)return remoteMarker!==currentMarker;
 if(remote[1]!==local[1])return remote[1]>local[1];
 return Number(remote[2])>Number(local[2]);
}
function maybeFixReload(remoteMarker){
 if(!explicitlyRefreshed||!currentMarker||!remoteMarker||remoteMarker===currentMarker)return false;
 const attempt=currentMarker+' -> '+remoteMarker;
 let previous='';
 try{previous=sessionStorage.getItem(reloadKey)||'';}catch(_){}
 if(previous===attempt)return false;
 try{sessionStorage.setItem(reloadKey,attempt);}catch(_){}
 reloadFresh();
 return true;
}
async function probePage(force=false){
 if(shown||pageBusy||(!force&&Date.now()-pageCheckedAt<18000)||document.hidden)return;
 pageCheckedAt=Date.now();pageBusy=true;
 try{
  const query=new URL(liveUrl);
  query.searchParams.set('version_probe',String(Date.now()));
  const response=await fetch(query.href,{cache:'no-store',credentials:'omit'});
  if(!response.ok)return;
  const html=await response.text();
  const remoteMarker=html.match(releasePattern)?.[1];
  if(!remoteMarker||!currentMarker)return;
  if(remoteMarker===currentMarker){try{sessionStorage.removeItem(reloadKey);}catch(_){}return;}
  if(!isNewerRelease(remoteMarker))return;
  // A manual browser refresh should correct a stale cached page on its own,
  // without asking the user to refresh it a second time.
  if(maybeFixReload(remoteMarker))return;
  displayRefreshNotice();
 }catch(error){console.warn('Güncelleme kontrolü bekliyor',error?.message||error);}
 finally{pageBusy=false;}
}
async function probeGit(){
 if(shown||gitBusy||Date.now()-gitCheckedAt<120000||document.hidden)return;
 gitCheckedAt=Date.now();gitBusy=true;
 try{
  const response=await fetch(gitUrl,{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
  if(!response.ok)return;
  const payload=await response.json();
  const sha=typeof payload.sha==='string'?payload.sha:null;
  if(sha&&lastGitSha&&sha!==lastGitSha)await probePage(true);
  if(sha)lastGitSha=sha;
 }catch(error){console.warn('GitHub sürüm kontrolü bekliyor',error?.message||error);}
 finally{gitBusy=false;}
}
function check(){void probePage();void probeGit();}
setTimeout(check,1200);
setInterval(check,20000);
window.addEventListener('focus',check);
window.addEventListener('pageshow',check);
window.addEventListener('online',check);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
})();