const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto').webcrypto;
let source=fs.readFileSync(require.resolve('../tiktok-shared-v209.js'),'utf8');const a=source.indexOf(' function change('),b=source.indexOf(' async function digest',a);assert(a>0&&b>a);
source=source.slice(0,a)+`async function change(edit){if(window.failWrite)throw Error('TEST offline');if(!admin())return false;const next=clone(match);if(edit(next)===false)return false;match=next;return true;}\n`+source.slice(b);
source=source.replace(' install();connect();document.addEventListener',` window.probe={catalog:GIFT_CATALOG,validGuestRequest,guestBudget,receive,flush,inbox,saveGiftInbox,interruptOfflineMatch,pendingShotCounts,get:()=>match,set:m=>{match=m;match.lease={owner,until:Date.now()+9999999};}};return;document.addEventListener`);
const saved=new Map(),storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
function boot(){let timers=[];const c={window:{addEventListener(){},AIFootball3D:{videoStatus:{motionReady:true},getShotTiming:()=>({outcomeMs:3000,durationMs:10000})}},adminAuthed:true,state:{startKeepers:{A:10,B:10,C:10,D:10},keeperCost:10},crypto,TextEncoder,sessionStorage:storage,localStorage:storage,Date:{now:()=>10000000},setTimeout:f=>(timers.push(f),timers.length),clearTimeout(){},document:{querySelector:()=>null,getElementById:()=>null,addEventListener(){}},console};vm.createContext(c);vm.runInContext(source,c);return {p:c.window.probe,c,persist(){timers.at(-1)?.();}};}
const base=()=>({version:2,clock:{startedAt:null,round:1,finishedAt:null},scores:{A:0,B:0,C:0,D:0},keeper:{A:10,B:10,C:10,D:10},jobs:[],receipts:[],accepted:0,shotSequence:0});

(async()=>{
const x=boot();x.p.set(base());let index=0;const totals={A:0,B:0,C:0,D:0};
assert.equal(x.p.catalog.length,8);assert.deepEqual(Array.from(x.p.catalog,g=>g.coins),[10,100,10,100,10,100,10,100]);
for(const gift of x.p.catalog){
 assert.equal(gift.coins,gift.shots*10);
 for(const alias of gift.names){const id='alias-'+index++;const event={event:'gift',data:{transactionId:id,giftName:alias,diamondCount:gift.coins,giftType:0,repeatCount:1,uniqueId:'fixture'}};assert(await x.p.receive(event),alias);assert.equal(x.p.inbox.size,index);assert.equal(x.p.inbox.get([...x.p.inbox.keys()].at(-1)).team,gift.team);totals[gift.team]+=gift.shots;await x.p.receive(event);assert.equal(x.p.inbox.size,index);}
 const id='streak-'+index;const d={transactionId:id,giftName:gift.title,diamondCount:gift.coins,giftType:1,repeatCount:3,uniqueId:'fixture'};
 assert.equal(await x.p.receive({event:'gift',data:{...d,repeatEnd:false}}),false,'unfinished streak ignored');assert(await x.p.receive({event:'gift',data:{...d,repeatEnd:true}}));index++;totals[gift.team]+=gift.shots*3;
 assert.equal(await x.p.receive({event:'gift',data:{...d,transactionId:'wrong-price-'+index,repeatEnd:true,diamondCount:gift.coins+1}}),false);
}
for(const name of ['Rose','Gül','Turkish coffee','TikTok','Love in Scent','Ice Cream Cone','Overreact','Mantap','Name shoutout','Roket','Donat'])assert.equal(await x.p.receive({event:'gift',data:{transactionId:'obsolete-'+name,giftName:name,repeatCount:1,giftType:0}}),false,'removed gifts cannot route to a new slot');
while(x.p.inbox.size)await x.p.flush();const m=x.p.get();for(const team of ['A','B','C','D'])assert.equal(m.jobs.filter(j=>j.team===team).reduce((n,j)=>n+j.count,0),totals[team]);assert.equal(m.cue,undefined);assert.equal(m.scores.A,0);
const clientId=crypto.randomUUID(),request=(client=clientId,count=10)=>({id:crypto.randomUUID(),team:'A',count,sentAt:10000000,guestTrial:true,clientId:client});assert.equal(x.p.validGuestRequest(request(clientId,5)),false);assert.equal(x.p.validGuestRequest(request(clientId,10)),true);for(let i=0;i<3;i++)assert(x.p.guestBudget(request()));assert.equal(x.p.guestBudget(request()),false,'per-client limit remains 30');for(let j=0;j<4;j++){const client=crypto.randomUUID();for(let i=0;i<3;i++)assert(x.p.guestBudget(request(client)));}assert.equal(x.p.guestBudget(request(crypto.randomUUID(),1)),false,'global guest limit remains 150');
console.log('PASS: all eight gift mappings, English/Turkish aliases, 10/100 coin values, correct teams, three-gift streak = 3/30 shots, unfinished streak rejection, price mismatch rejection, duplicate suppression and retired gift rejection. Mock only.');
})().catch(e=>{console.error(e);process.exitCode=1;});
