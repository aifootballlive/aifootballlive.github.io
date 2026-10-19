/* Public, no-credential update notification shared by admin & spectator views.
   Poll the deployed GitHub Pages document and the public repository revision.
   No automatic refresh: never interrupt a real shot or erase an admin draft. */
(()=>{
'use strict';
const localMarker=document.querySelector('meta[name="aifootball-release"]')?.content||'';
const home=new URL('./live.html',location.href);
const gitEndpoint='https://api.github.com/repos/aifootballlive/aifootballlive.github.io/commits/main';
let firstCommit=null,stale=false,checkingPage=false,checkingGit=false,lastPageCheck=0,lastGitCheck=0;
function showUpdate(){
 if(stale)return;stale=true;
 const shade=document.createElement('div');shade.id='aifootballUpdateNotification';
 Object.assign(shade.style,{position:'fixed',inset:'0',background:'rgba(5,13,26,.92)',zIndex:'2147483646',
   display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',boxSizing:'border-box'});
 const card=document.createElement('section');
 Object.assign(card.style,{background:'#152843',color:'#fff',border:'2px solid #7ccbab',borderRadius:'16px',
   maxWidth:'440px',width:'100%',padding:'24px',textAlign:'center',fontFamily:'system-ui,sans-serif',
   boxShadow:'0 10px 36px rgba(0,0,0,.5)'});
 const title=document.createElement('div');title.textContent='YENİ SÜRÜM YAYINLANDI';
 Object.assign(title.style,{fontSize:'21px',fontWeight:'900',marginBottom:'11px'});
 const detail=document.createElement('p');detail.textContent='Yönetici ve izleyici sayfalarının güncel çalışması için lütfen sayfayı yenileyin.';
 Object.assign(detail.style,{fontSize:'16px',lineHeight:'1.5',margin:'0 0 18px'});
 const button=document.createElement('button');button.type='button';button.textContent='SAYFAYI YENİLE';
 Object.assign(button.style,{background:'#16846a',color:'#fff',border:'none',borderRadius:'10px',
   minHeight:'48px',padding:'13px 28px',fontSize:'17px',fontWeight:'900',cursor:'pointer'});
 button.addEventListener('click',()=>{
   const next=new URL('./live.html',location.href);
   next.searchParams.set('updated',String(Date.now()));
   if(document.body.classList.contains('drawerMode')||document.body.classList.contains('settingsMode'))
     next.hash='admin';
   location.replace(next.href);
 });
 card.append(title,detail,button);shade.append(card);document.body.append(shade);
 document.dispatchEvent(new CustomEvent('aifootball-update-required'));
}
async function pageProbe(force=false){
 if(stale||checkingPage||(!force&&Date.now()-lastPageCheck<45000)||document.hidden)return;
 lastPageCheck=Date.now();checkingPage=true;
 try{
  const url=new URL(home);url.searchParams.set('version_probe',String(Date.now()));
  const response=await fetch(url.href,{cache:'no-store',credentials:'omit'});
  if(!response.ok)return;
  const html=await response.text();
  const match=html.match(/<meta name="aifootball-release" content="([^"]+)"/);
  if(match&&localMarker&&match[1]!==localMarker)showUpdate();
 }catch(error){console.warn('Güncelleme kontrolü bekliyor',error.message)}
 finally{checkingPage=false;}
}
async function gitProbe(){
 if(stale||checkingGit||Date.now()-lastGitCheck<120000||document.hidden)return;
 lastGitCheck=Date.now();checkingGit=true;
 try{
  const response=await fetch(gitEndpoint,{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
  if(!response.ok)return;
  const data=await response.json(),sha=typeof data.sha==='string'?data.sha:null;
  if(!sha)return;
  if(firstCommit&&sha!==firstCommit){
   // Only notify once the Pages site is serving a new release. A Git commit
   // can precede Pages publication or may modify README-only files.
   await pageProbe(true);
  }
  firstCommit=sha;
 }catch(error){console.warn('GitHub sürüm kontrolü bekliyor',error.message)}
 finally{checkingGit=false;}
}
function check(){pageProbe();gitProbe();}
setTimeout(check,7000);
setInterval(check,50000);
window.addEventListener('focus',check);
window.addEventListener('pageshow',check);
window.addEventListener('online',check);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
})();