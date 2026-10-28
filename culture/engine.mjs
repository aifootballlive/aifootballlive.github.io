import {countries,byId,countryOf} from './countries.mjs';
export const defaults={durationMinutes:25,likeThreshold:100,likesEnabled:false,rotateSeconds:5,rotateCount:5,autoNext:false,breakSeconds:15,matchesPerSeason:20,musicEnabled:true,musicVolume:35};
export const integer=(n,max=Number.MAX_SAFE_INTEGER)=>{const x=Number(n);return Number.isSafeInteger(x)&&x>=0&&x<=max?x:0;};
export function fresh(mode='live'){return {version:2,mode,revision:0,season:1,round:1,status:'waiting',config:{...defaults},scores:{},countryPoints:{},leaderTimes:{},leader:null,leaderSince:null,order:countries.map(c=>c.id),startedAt:null,endsAt:null,remaining:0,advanceAt:null,winner:null,users:{},likes:0,likesPending:0,history:[],notice:''};}
export function leadMs(s,id,at){return (s.leaderTimes[id]||0)+(s.status==='running'&&s.leader===id&&s.leaderSince!==null?Math.max(0,at-s.leaderSince):0);}
export function ordered(s,at){const positions=new Map(s.order.map((id,i)=>[id,i]));return countries.map(c=>c.id).sort((a,b)=>(s.scores[b]||0)-(s.scores[a]||0)||leadMs(s,b,at)-leadMs(s,a,at)||(positions.get(a)??999)-(positions.get(b)??999));}
function settle(s,at){if(s.leader&&s.leaderSince!==null)s.leaderTimes[s.leader]=leadMs(s,s.leader,at);s.leaderSince=null;}
function recompute(s,at){const old=s.leader;settle(s,at);s.order=ordered(s,at);const top=s.order[0];s.leader=(s.countryPoints[top]||0)>0?top:null;s.leaderSince=s.leader&&s.status==='running'?at:null;if(old!==s.leader&&s.leader)s.notice=byId[s.leader].name+' lider oldu';}
export function finish(s,at){if(s.status!=='running'&&s.status!=='paused')return false;settle(s,at);s.order=ordered(s,at);s.status='completed';s.winner=s.leader;s.finishedAt=at;s.remaining=0;s.advanceAt=s.config.autoNext?at+s.config.breakSeconds*1000:null;s.history.push({season:s.season,round:s.round,winner:s.winner,scores:{...s.scores},times:{...s.leaderTimes},startedAt:s.startedAt,at,mode:s.mode});return true;}
function begin(s,at,next=false){if(next){s.round++;if(s.round>s.config.matchesPerSeason){s.season++;s.round=1;}}Object.assign(s,{status:'running',scores:{},countryPoints:{},leaderTimes:{},leader:null,leaderSince:null,startedAt:at,endsAt:at+s.config.durationMinutes*60000,remaining:0,advanceAt:null,winner:null,finishedAt:null,likes:0,likesPending:0,notice:''});}
export function tick(s,at){let changed=false;if(s.status==='running'&&at>=s.endsAt)changed=finish(s,s.endsAt);if(s.status==='completed'&&s.config.autoNext&&s.advanceAt!==null&&at>=s.advanceAt){begin(s,at,true);changed=true;}return changed;}
export function configure(s,values){
 const ranges={durationMinutes:[1,180],likeThreshold:[1,1000000],rotateSeconds:[2,60],breakSeconds:[5,300],matchesPerSeason:[1,1000],musicVolume:[0,100]};
 for(const [key,value]of Object.entries(values||{})){if(['likesEnabled','autoNext','musicEnabled'].includes(key)){if(typeof value!=='boolean')throw Error('Geçersiz aç/kapat ayarı');s.config[key]=value;}else if(key==='rotateCount'){if(![5,10].includes(value))throw Error('5 veya 10 ülke seçin');s.config[key]=value;}else if(ranges[key]){const [lo,hi]=ranges[key];if(!Number.isSafeInteger(value)||value<lo||value>hi)throw Error('Geçersiz ayar: '+key);if(key==='likeThreshold'&&value!==s.config[key])s.likesPending=0;s.config[key]=value;}else throw Error('Bilinmeyen ayar: '+key);}
}
export function command(s,type,p={},at){
 tick(s,at);
 if(type==='settings'){configure(s,p);if(s.status==='completed')s.advanceAt=s.config.autoNext?at+s.config.breakSeconds*1000:null;return {ok:true};}
 if(type==='start'){if(s.status==='running'||s.status==='paused')throw Error('Mevcut turu önce bitirin veya devam ettirin.');begin(s,at,s.status==='completed');return {ok:true};}
 if(type==='pause'){if(s.status!=='running')throw Error('Yarışma devam etmiyor');settle(s,at);s.remaining=Math.max(0,s.endsAt-at);s.status='paused';return {ok:true};}
 if(type==='resume'){if(s.status!=='paused')throw Error('Yarışma duraklatılmamış');s.status='running';s.endsAt=at+s.remaining;s.leaderSince=s.leader?at:null;return {ok:true};}
 if(type==='finish'){if(!finish(s,at))throw Error('Tamamlanacak tur yok');return {ok:true};}
 if(type==='comment'){const user=String(p.userId||'').trim(),country=countryOf(p.text);if(!user||user.length>150||!country)return {ok:false,reason:'Açık bir ülke seçimi gerekli'};s.users[user]=country;return {ok:true,country};}
 if(type==='gift'){
  if(s.status!=='running'&&s.status!=='paused')return {ok:false,reason:'Yarışma başlamadı; hediye puana yazılmadı'};
  const id=p.country||s.users[String(p.userId||'')],coins=integer(p.coins,1000000),count=integer(p.count,100000);
  if(!byId[id])return {ok:false,reason:'Önce ülke seçilmeli'};if(!coins||!count||!Number.isSafeInteger(coins*count))return {ok:false,reason:'Jeton maliyeti doğrulanamadı'};
  const amount=coins*count;if(!Number.isSafeInteger((s.scores[id]||0)+amount))throw Error('Puan sınırı aşıldı');s.scores[id]=(s.scores[id]||0)+amount;s.countryPoints[id]=(s.countryPoints[id]||0)+amount;recompute(s,at);return {ok:true,country:id,points:amount};
 }
 if(type==='likes'){
  if(s.status!=='running'||!s.config.likesEnabled)return {ok:false,reason:'Beğeni puanı kapalı veya yarışma durmuş'};
  const count=integer(p.count,10000000);if(!count)return {ok:false,reason:'Geçersiz beğeni'};s.likes+=count;s.likesPending+=count;const points=Math.floor(s.likesPending/s.config.likeThreshold);s.likesPending%=s.config.likeThreshold;
  if(points)for(const c of countries)s.scores[c.id]=(s.scores[c.id]||0)+points;
  // Equal likes cannot invent a leader when nobody has selected/supported a country.
  return {ok:true,pointsPerCountry:points};
 }
 throw Error('Bilinmeyen komut');
}
export function publicState(s,at){return {version:s.version,revision:s.revision,mode:s.mode,season:s.season,round:s.round,status:s.status,config:{...s.config},scores:{...s.scores},leaderTimes:Object.fromEntries(countries.map(c=>[c.id,leadMs(s,c.id,at)])),leader:s.leader,order:ordered(s,at),serverTime:at,startedAt:s.startedAt,endsAt:s.endsAt,remaining:s.remaining,advanceAt:s.advanceAt,winner:s.winner,likes:s.likes,likesPending:s.likesPending,history:s.history,notice:s.notice};}
