const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require.resolve('../gift-beep-v355.js'),'utf8'),saved=new Map();
function boot({admin=true,obs=false}={}){
 const notes=[],listeners={};class Audio{constructor(){this.state='suspended';this.currentTime=1;this.destination={};}async resume(){this.state='running';}createOscillator(){return {frequency:{setValueAtTime:n=>notes.push(n)},connect(){},disconnect(){},start(){},stop(){}};}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}}
 const c={adminAuthed:admin,console,Date,Map,Set,navigator:{locks:{request:async(_name,fn)=>fn()}},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},document:{hidden:true,readyState:'loading',addEventListener:(name,fn)=>listeners[name]=fn},window:{AudioContext:Audio,AIFootballOBSViewer:obs,addEventListener(){}}};vm.runInNewContext(source,c);return {api:c.window.AIFootballGiftBeep,notes,c};
}
(async()=>{
 const a=boot();assert.equal(a.api.getStatus().enabled,false,'new device starts silent');const gift={msgId:'event-1',userId:'donor',giftId:5655,giftName:'Rose',repeatCount:1};
 await a.api.receive(gift,'room-1');assert.equal(a.notes.length,0);await a.api.setEnabled(true);assert.equal(await a.api.receive({...gift,msgId:'event-2'},'room-1'),true);assert.deepEqual(a.notes,[880,1320],'distinct double beep while document is hidden');assert.equal(await a.api.receive({...gift,msgId:'event-2'},'room-1'),false,'duplicate delivery is silent');
 const b=boot();await b.api.setEnabled(true);assert.equal(await b.api.receive({...gift,msgId:'event-2'},'room-1'),false,'second admin tab does not duplicate a receipt');
 for(const [msgId,repeatCount,repeatEnd]of [['c1',1,false],['c2',2,false],['c3',2,true]])await a.api.receive({...gift,msgId,giftType:1,groupId:'combo-1',repeatCount,repeatEnd},'room-1');assert.equal(a.api.getStatus().played,3,'two new streak increments, no extra final beep');
 await a.api.setEnabled(false);await a.api.receive({...gift,msgId:'muted'},'room-1');assert.equal(a.api.getStatus().played,3,'off switch silences gifts');assert.equal(boot().api.getStatus().enabled,false,'off setting survives reload');
 const spectator=boot({admin:false});await spectator.api.setEnabled(true);assert.equal(await spectator.api.receive({...gift,msgId:'public'},'room-1'),false);assert.equal(spectator.notes.length,0,'spectators are silent');const obs=boot({obs:true});await obs.api.setEnabled(true);await obs.api.receive({...gift,msgId:'obs'},'room-1');assert.equal(obs.notes.length,0,'OBS is silent even with a saved preference');
 await a.api.setEnabled(true);for(const event of [{...gift,msgId:''},{...gift,msgId:'bad',repeatCount:0},{...gift,msgId:'bad2',repeatCount:10001}])assert.equal(await a.api.receive(event,'room-1'),false);assert.equal(a.api.getStatus().played,3);
 assert.equal(await a.api.test(),true,'manual audio test works');assert.equal(a.api.getStatus().played,4);
 const bridge=fs.readFileSync(require.resolve('../tiktok-shared-v209.js'),'utf8'),start=bridge.indexOf(' async function receive(raw){'),end=bridge.indexOf(' async function flush()',start);assert(start>0&&end>start);
 const ingest=vm.runInNewContext(bridge.slice(start,end)+';receive',{window:{AIFootballGiftBeep:a.api},queueMetrics(){},bridgeRoomId:'isolated-room',GIFT_CATALOG:[],LEGACY_GIFT_CATALOG:[],giftDiagnostic(){},console});
 assert.equal(await ingest({event:'gift',data:{...gift,msgId:'unmapped-live-gift'}}),false,'unmapped gift does not add a shot');await Promise.resolve();assert.equal(a.api.getStatus().played,5,'real intake hook still notifies about an unmapped gift');
 await ingest({event:'gift',data:{...gift,msgId:'unmapped-live-gift'}});await Promise.resolve();assert.equal(a.api.getStatus().played,5,'duplicate intake remains silent');
 console.log('PASS: owner-only background beep, independent toggle/persistence, duplicate and combo-final suppression, cross-tab receipts, invalid events, OBS/public silence and real intake hook; no game writes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
