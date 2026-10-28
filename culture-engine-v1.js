(()=>{
'use strict';
/* Supabase yok: tüm durum yalnızca bu tarayıcıda saklanır.
   TikTok hediyelerini okumak için ileride ayrı yerel bağlayıcı gerekir. */
const $=id=>document.getElementById(id),KEY='culture-world-v1';
const RAW=[
['ID','🇮🇩','Endonezya','IDN','INDONESIA'],['BR','🇧🇷','Brezilya','BRA','BRAZIL'],
['US','🇺🇸','ABD','USA'],['MX','🇲🇽','Meksika','MEX','MEXICO'],['VN','🇻🇳','Vietnam','VNM'],
['PK','🇵🇰','Pakistan','PAK'],['PH','🇵🇭','Filipinler','PHL','PHILIPPINES'],
['TH','🇹🇭','Tayland','THA','THAILAND'],['BD','🇧🇩','Bangladeş','BGD','BANGLADESH'],
['NG','🇳🇬','Nijerya','NGA','NIGERIA'],['TR','🇹🇷','Türkiye','TUR','TURKEY'],
['JP','🇯🇵','Japonya','JPN','JAPAN'],['DE','🇩🇪','Almanya','DEU','GERMANY'],
['FR','🇫🇷','Fransa','FRA','FRANCE'],['IT','🇮🇹','İtalya','ITA','ITALY'],
['GB','🇬🇧','İngiltere','UK','GBR','ENGLAND'],['CA','🇨🇦','Kanada','CAN','CANADA'],
['ES','🇪🇸','İspanya','ESP','SPAIN'],['AR','🇦🇷','Arjantin','ARG','ARGENTINA'],
['ZA','🇿🇦','Güney Afrika','ZAF','SOUTH AFRICA']];
const countries=RAW.map(x=>({id:x[0],flag:x[1],name:x[2],aliases:[x[0],...x.slice(3),x[2]]}));
const byId=Object.fromEntries(countries.map(c=>[c.id,c]));
const defaults={durationMinutes:25,likeThreshold:100,likesEnabled:false,rotateSeconds:5,rotateCount:5};
const fresh=()=>({version:1,round:1,status:'waiting',config:{...defaults},scores:{},leaderTimes:{},leader:null,leaderSince:0,endsAt:0,remaining:0,advanceAt:0,winner:null,users:{},seen:[],likes:0,likesPending:0,history:[],notice:''});
const n=v=>Math.max(0,Math.floor(Number(v)||0));
const pad=v=>String(v).padStart(2,'0');
const fmt=ms=>pad(Math.floor(Math.max(0,ms)/60000))+':'+pad(Math.floor(Math.max(0,ms)/1000)%60);
function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||'null');return x&&x.version===1?{...fresh(),...x,config:{...defaults,...x.config}}:fresh()}catch{return fresh()}}
let current=read(),lastRank='',lastOther=0,otherPage=0;
function save(s){current=s;try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}render()}
function leadMs(s,id,at=Date.now()){return n(s.leaderTimes[id])+(s.status==='running'&&s.leader===id&&s.leaderSince?Math.max(0,at-s.leaderSince):0)}
function ordered(s,at=Date.now()){return countries.slice().sort((a,b)=>n(s.scores[b.id])-n(s.scores[a.id])||leadMs(s,b.id,at)-leadMs(s,a.id,at)||((a.id===s.leader)?-1:(b.id===s.leader)?1:0)||countries.indexOf(a)-countries.indexOf(b))}
function settle(s,at){if(s.leader&&s.leaderSince){s.leaderTimes[s.leader]=leadMs(s,s.leader,at);s.leaderSince=0}}
function leaderRecompute(s,at){
 const previous=s.leader;settle(s,at);
 const sorted=ordered(s,at),max=n(s.scores[sorted[0].id]);
 if(!max){s.leader=null;return}
 const tied=sorted.filter(c=>n(s.scores[c.id])===max);
 s.leader=previous&&tied.some(c=>c.id===previous)?previous:tied[0].id;
 s.leaderSince=at;
 if(s.leader!==previous)s.notice=byId[s.leader].name+' lider oldu';
}
function finish(s,at){
 if(s.status!=='running')return;
 settle(s,at);s.status='completed';
 const first=ordered(s,at)[0];s.winner=s.leader&&n(s.scores[s.leader])>0?s.leader:null;s.advanceAt=at+15000;
 s.history.push({round:s.round,winner:s.winner,scores:{...s.scores},times:{...s.leaderTimes},at});
 s.history=s.history.slice(-30);
}
function begin(s,at){s.status='running';s.scores={};s.leaderTimes={};s.leader=null;s.leaderSince=0;s.endsAt=at+n(s.config.durationMinutes)*60000;s.remaining=0;s.winner=null;s.advanceAt=0;s.likes=0;s.likesPending=0;s.notice=''}
function step(){
 const s=read(),at=Date.now();
 if(s.status==='running'&&at>=s.endsAt){finish(s,s.endsAt);save(s)}
 else if(s.status==='completed'&&at>=s.advanceAt){s.round++;begin(s,at);save(s)}
 else{current=s;render()}
}
function mutate(fn){const s=read(),at=Date.now();if(s.status==='running'&&at>=s.endsAt)finish(s,s.endsAt);const result=fn(s,at);save(s);return result}
function countryOf(raw){
 const t=String(raw||'').trim(),q=t.toLocaleUpperCase('tr-TR').replace(/\s+/g,' ');
 for(const c of countries)if(t===c.flag||c.aliases.some(a=>a.toLocaleUpperCase('tr-TR')===q))return c.id;
 return null;
}
function seen(s,eventId){
 if(!eventId)return false;
 const key=String(eventId);if(s.seen.includes(key))return true;
 s.seen.push(key);if(s.seen.length>800)s.seen.shift();return false;
}
const API={
 countries,getState:read,countryOf,
 acceptComment(o={}){
  if(!String(o.userId||''))return {ok:false,reason:'Kullanıcı kimliği gerekli'};
  const c=countryOf(o.text);if(!c)return {ok:false,reason:'Ülke bulunamadı'};
  return mutate(s=>{if(seen(s,o.eventId))return {ok:false,reason:'Tekrarlanan yorum'};s.users[String(o.userId)]=c;return {ok:true,country:c}})
 },
 acceptGift(o={}){
  return mutate((s,at)=>{if(s.status!=='running')return {ok:false,reason:'Yarışma başlamadı'};
    const id=s.users[String(o.userId||'')],value=n(o.coins)*Math.max(1,n(o.repeat||1));
    if(!byId[id])return {ok:false,reason:'Önce ülke seçilmeli'};
    if(!value)return {ok:false,reason:'Jeton geçersiz'};
    if(seen(s,o.eventId))return {ok:false,reason:'Tekrarlanan hediye'};
    s.scores[id]=n(s.scores[id])+value;leaderRecompute(s,at);return {ok:true,country:id,points:value};
  });
 },
 acceptLikes(o={}){
  return mutate(s=>{if(s.status!=='running'||!s.config.likesEnabled)return {ok:false,reason:'Beğeni puanı kapalı'};
   if(seen(s,o.eventId))return {ok:false,reason:'Tekrarlanan beğeni'};
   const count=n(o.count);s.likes+=count;s.likesPending+=count;
   const threshold=Math.max(1,n(s.config.likeThreshold)),points=Math.floor(s.likesPending/threshold);
   s.likesPending%=threshold;
   if(points)for(const c of countries)s.scores[c.id]=n(s.scores[c.id])+points;
   return {ok:true,pointsPerCountry:points};
  });
 },
 award(id,amount){
  return mutate((s,at)=>{if(s.status!=='running'||!byId[id])return {ok:false,reason:'Yarışma veya ülke seçimi geçersiz'};
   s.scores[id]=n(s.scores[id])+n(amount);leaderRecompute(s,at);return {ok:true};
  });
 },
 settings(cfg){
  return mutate(s=>{if(cfg.durationMinutes!==undefined)s.config.durationMinutes=Math.min(180,Math.max(1,n(cfg.durationMinutes)));
    if(cfg.likeThreshold!==undefined)s.config.likeThreshold=Math.min(100000,Math.max(1,n(cfg.likeThreshold)));
    if(cfg.likesEnabled!==undefined)s.config.likesEnabled=!!cfg.likesEnabled;
    if(cfg.rotateSeconds!==undefined)s.config.rotateSeconds=Math.min(60,Math.max(2,n(cfg.rotateSeconds)));
    if(cfg.rotateCount!==undefined)s.config.rotateCount=n(cfg.rotateCount)===10?10:5;
    return {ok:true};
  });
 },
 start(){return mutate((s,at)=>{begin(s,at);return {ok:true}})},
 pause(){return mutate((s,at)=>{if(s.status==='running'){settle(s,at);s.remaining=Math.max(0,s.endsAt-at);s.status='waiting'}return {ok:true}})},
 resume(){return mutate((s,at)=>{if(s.status==='waiting'&&s.remaining){s.status='running';s.endsAt=at+s.remaining;s.leaderSince=s.leader?at:0;s.remaining=0}return {ok:true}})},
 reset(){return mutate(s=>{const freshState=fresh();Object.assign(s,freshState,{config:{...s.config},users:{...s.users}});return {ok:true}})}
};
window.CultureAPI=API;
function put(id,value){const el=$(id);if(el)el.textContent=String(value)}
function render(){
 const s=current,at=Date.now(),sorted=ordered(s,at),lead=byId[s.leader];
 put('roundNum',pad(s.round));put('leadFlag',lead?lead.flag:'🌍');
 put('flagWave',lead?lead.flag:'🌍');put('leadName',lead?lead.name.toLocaleUpperCase('tr-TR'):'LİDER BEKLENİYOR');
 put('leadScore',(lead?n(s.scores[lead.id]):0).toLocaleString('tr-TR'));
 put('leadTime',fmt(lead?leadMs(s,lead.id,at):0));
 put('remaining',fmt(s.status==='running'?Math.max(0,s.endsAt-at):s.remaining||s.config.durationMinutes*60000));
 put('likesText',s.config.likesEnabled?String(s.config.likeThreshold)+' beğeni = herkese +1':'Puanlama kapalı');
 put('likesCount',n(s.likes).toLocaleString('tr-TR'));
 const fingerprint=sorted.slice(0,10).map(c=>c.id+':'+n(s.scores[c.id])).join(',');
 if(fingerprint!==lastRank){
  const parent=$('ranks'),previous=new Map([...parent.children].map(el=>[el.dataset.id,el.getBoundingClientRect().top])),old=new Map([...parent.children].map(el=>[el.dataset.id,el])),frag=document.createDocumentFragment();
  sorted.slice(0,10).forEach((c,i)=>{
   const row=old.get(c.id)||document.createElement('div');row.dataset.id=c.id;row.className='rank'+(i===0&&n(s.scores[c.id])>0?' first':'');
   row.replaceChildren();
   const pos=document.createElement('span');pos.className='pos';pos.textContent=String(i+1);
   const who=document.createElement('span');who.className='who';
   const flag=document.createElement('b');flag.textContent=c.flag;
   const name=document.createElement('span');name.textContent=c.name;who.append(flag,name);
   const pts=document.createElement('span');pts.className='pts';pts.textContent=n(s.scores[c.id]).toLocaleString('tr-TR');
   const time=document.createElement('span');time.className='time';time.textContent=fmt(leadMs(s,c.id,at));
   row.append(pos,who,pts,time);frag.append(row);
  });
  parent.replaceChildren(frag);
  for(const row of parent.children){const oldTop=previous.get(row.dataset.id);if(oldTop===undefined)continue;const shift=oldTop-row.getBoundingClientRect().top;if(Math.abs(shift)>2)row.animate([{transform:'translateY('+shift+'px)'},{transform:'translateY(0)'}],{duration:500,easing:'ease-in-out'})}
  lastRank=fingerprint;
 }else for(const row of $('ranks').children){const time=row.querySelector('.time');if(time)time.textContent=fmt(leadMs(s,row.dataset.id,at))}
 if(at-lastOther>=n(s.config.rotateSeconds)*1000||!lastOther){
  lastOther=at;const rest=sorted.slice(10),count=s.config.rotateCount===10?10:5,pages=Math.max(1,Math.ceil(rest.length/count)),page=otherPage++%pages;
  const list=$('otherNames');list.replaceChildren();
  rest.slice(page*count,(page+1)*count).forEach(c=>{
   const box=document.createElement('div');box.className='other';
   const icon=document.createElement('span');icon.className='fl';icon.textContent=c.flag;
   const name=document.createElement('span');name.className='nm';name.textContent=c.name;
   box.append(icon,name);list.append(box);
  });
 }
 const overlay=$('announcement');overlay.classList.toggle('show',s.status==='completed');
 put('winnerFlag',s.winner?byId[s.winner].flag:'🏆');
 put('winnerTitle',s.winner?byId[s.winner].name.toLocaleUpperCase('tr-TR')+' KAZANDI!':'TUR BİTTİ');
 put('winnerDetail',s.winner?'Yeni tur başlıyor':'Yeni tur hazırlanıyor');
}
render();setInterval(step,1000);
window.addEventListener('storage',e=>{if(e.key===KEY){current=read();lastRank='';lastOther=0;render()}});
})();