/**
 * Local TikTok LIVE -> AI Football public match relay.
 * Run on the same computer as the MFA-authenticated admin browser.
 * Bind ONLY 127.0.0.1; never forward this port to the internet.
 *
 * Install: npm install
 * Start:   npm run tiktok:bridge -- --username YOUR_TIKTOK_NAME
 *
 * Gift authenticity: events are received directly by the local TikTok connector;
 * game state writes still require Supabase authenticated administrator AAL2.
 */
import {WebSocketServer} from 'ws';
import {TikTokLiveConnection,WebcastEvent} from 'tiktok-live-connector';

const args=process.argv.slice(2);
function valueOf(flag){const i=args.indexOf(flag);return i>=0?args[i+1]:null;}
const username=String(valueOf('--username')||process.env.TIKTOK_USERNAME||'').replace(/^@/,'').trim();
const PORT=Number(process.env.TIKTOK_BRIDGE_PORT||21213);
const ORIGINS=new Set(['https://aifootballlive.github.io','http://127.0.0.1:8890','http://localhost:8890']);
const MAX_RECENT=10000,MAX_BACKLOG=4000;
if(!username||!/^[a-zA-Z0-9._]{2,40}$/.test(username)){
 console.error('TikTok kullanici adini girin: npm run tiktok:bridge -- --username kullaniciadi');
 process.exit(2);
}
if(!Number.isSafeInteger(PORT)||PORT<1024||PORT>65535)throw Error('Gecersiz port');
const wss=new WebSocketServer({
 host:'127.0.0.1',port:PORT,maxPayload:8192,
 verifyClient:info=>{
  const origin=info.origin||info.req.headers.origin;
  if(!ORIGINS.has(origin)){console.warn('Izin verilmeyen tarayici:',origin||'(yok)');return false;}
  return info.req.url==='/';
 }
});
const clients=new Set(),recent=new Set(),backlog=[];
let activeConnection=null,retryDelay=2500,retryTimer=null,reconnectGeneration=0,closing=false,roomId=null,lastLikeSnapshot=null;
const now=()=>new Date().toLocaleTimeString('tr-TR',{hour12:false});
const log=(...msg)=>console.log('['+now()+']',...msg);
function trimRecent(){while(recent.size>MAX_RECENT)recent.delete(recent.values().next().value);}
function enqueue(message){
 if(recent.has(message.data.id))return;
 recent.add(message.data.id);trimRecent();
 backlog.push(message);if(backlog.length>MAX_BACKLOG){backlog.shift();log('Uyari: baglanti bekleyen hediye tamponu dolu');}
 for(const client of clients)if(client.readyState===1)client.send(JSON.stringify(message));
}
function stableId(data){
 // TikTok offers globally unique msgId/transactionId on most gift events.
 const value=data.msgId??data.transactionId??data.id??data.eventId;
 if(value!=null&&String(value).trim())return String(value);
 return null; // Do not invent IDs: it would create duplicate gifts on reconnect.
}
function giftPayload(data){
 const gift=data.giftDetails||data.gift||{};
 const giftId=data.giftId??gift.giftId??gift.id;
 const giftName=data.giftName??gift.giftName??gift.name;
 const msgId=stableId(data);
 if(!msgId||!giftName&&!giftId)return null;
 const repeatCount=Number(data.repeatCount??data.repeat_count??1);
 if(!Number.isSafeInteger(repeatCount)||repeatCount<1||repeatCount>10000)return null;
 const giftType=Number(data.giftType??gift.giftType??0);
 const repeatEnd=data.repeatEnd===true||data.repeat_end===true;
 if(giftType===1&&!repeatEnd)return null;
 return {
  id:msgId,transactionId:msgId,msgId,
  userId:String(data.user?.userId??data.userId??''),
  uniqueId:String(data.user?.uniqueId??data.uniqueId??''),
  giftId:String(giftId??''),giftName:String(giftName??''),
  giftDetails:{giftId:String(giftId??''),giftName:String(giftName??''),giftType},
  giftType,repeatCount,repeatEnd:true
 };
}
function onGift(event){
 const data=giftPayload(event);
 if(!data)return;
 const payload={event:'gift',data};
 enqueue(payload);
 log('Hediye:',data.uniqueId||'izleyici','->',data.giftName||data.giftId,'x'+data.repeatCount,'id',data.id);
}
function onLike(event){
 const total=Number(event.totalLikeCount),count=Number(event.likeCount);
 if(!Number.isSafeInteger(total)||total<0||!Number.isSafeInteger(count)||count<1)return;
 const room=String(event.roomId??event.common?.roomId??activeConnection?.roomId??roomId??'');
 const message={event:'like',data:{id:stableId(event)||'like:'+room+':'+total,roomId:room,totalLikeCount:total,likeCount:count}};
 // Likes never occupy/evict the durable paid-gift backlog. One cumulative
 // snapshot recovers missed like totals when the admin reconnects.
 lastLikeSnapshot=message;
 for(const client of clients)if(client.readyState===1)client.send(JSON.stringify(message));
}
function stopConnection(){
 try{activeConnection?.disconnect?.()}catch{}
 activeConnection=null;
}
function scheduleReconnect(reason){
 if(closing||retryTimer)return;
 const delay=retryDelay;retryDelay=Math.min(60000,Math.round(retryDelay*1.65));
 log('TikTok baglantisi kapandi:',reason||'bilinmiyor','/ yeniden deneme',Math.round(delay/1000),'sn');
 retryTimer=setTimeout(()=>{retryTimer=null;connectTikTok().catch(()=>{})},delay);
}
async function connectTikTok(){
 if(closing)return;
 const generation=++reconnectGeneration;
 stopConnection();
 const connection=activeConnection=new TikTokLiveConnection(username,{
   processInitialData:false,fetchRoomInfoOnConnect:true
 });
 connection.on(WebcastEvent.GIFT,onGift);
 connection.on(WebcastEvent.LIKE,onLike);
 // The connector's reconnect behavior can differ between versions; schedule
 // a single replacement on stream close/errors.
 const lost=event=>{if(activeConnection!==connection||generation!==reconnectGeneration)return;scheduleReconnect(event?.message||'baglanti koptu')};
 connection.on('disconnected',()=>lost({message:'disconnected'}));
 connection.on('streamEnd',()=>lost({message:'yayin sona erdi'}));
 connection.on('error',error=>{log('TikTok hatasi:',error?.message||String(error));lost(error)});
 try{
  const state=await connection.connect();
  if(closing||generation!==reconnectGeneration)return;
  retryDelay=2500;const nextRoom=state?.roomId??null;if(nextRoom!==roomId)lastLikeSnapshot=null;roomId=nextRoom;
  for(const client of clients)if(client.readyState===1)client.send(JSON.stringify({event:'connected',data:{roomId}}));
  log('TikTok LIVE baglandi @'+username,'oda:',roomId||'bilinmiyor');
 }catch(error){log('TikTok baglanamadi:',error?.message||String(error));scheduleReconnect(error?.message)}
}
wss.on('connection',socket=>{
 clients.add(socket);
 socket.send(JSON.stringify({event:'connected',data:{roomId}}));
 if(lastLikeSnapshot)socket.send(JSON.stringify(lastLikeSnapshot));
 log('MFA yonetici sayfasi baglandi. Gonderim tamponu:',backlog.length);
 // Re-send buffered events on reconnect; the browser/DB suppresses repeat IDs.
 for(const msg of backlog)socket.send(JSON.stringify(msg));
 socket.on('message',()=>socket.close(1008,'Salt okunur hediye aktarimi'));
 socket.on('close',()=>clients.delete(socket));
 socket.on('error',error=>log('Yerel WS hatasi:',error?.message));
});
wss.on('listening',()=>{log('Guvenli yerel hediye koprusu:',`ws://127.0.0.1:${PORT}`);
 log('TikTok kullanicisi: @'+username);
 log('Yonetici tarayicisi AAL2 (MFA) ile acik tutulmalidir.');
 connectTikTok().catch(error=>log('Baglanti baslatma hatasi:',error?.message));});
wss.on('error',error=>{console.error('Yerel kopru portu acilamadi:',error.message);process.exitCode=1;});
function shutdown(){
 closing=true;clearTimeout(retryTimer);stopConnection();
 for(const client of clients)try{client.close()}catch{}
 wss.close(()=>process.exit(0));
}
process.on('SIGINT',shutdown);
process.on('SIGTERM',shutdown);
