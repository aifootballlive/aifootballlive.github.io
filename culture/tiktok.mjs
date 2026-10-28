import {integer} from './engine.mjs';
const stable=values=>values.map(v=>v===undefined||v===null?'':String(v)).find(v=>v&&v!=='0')||null;
const identifier=o=>stable([o?.msgId,o?.common?.msgId,o?.transactionId]);
const userIdentifier=o=>stable([o?.userId,o?.user?.idStr,o?.user?.userId,o?.user?.id]);
export function normalizeComment(data){const id=identifier(data),userId=userIdentifier(data);return id&&userId?{id,payload:{userId,text:data.comment??data.content??data.text??''}}:null;}
export function normalizeLike(data){const raw=data.totalLikeCount??data.totalLikes??data.total;if(raw===undefined||raw===null||raw==='')return null;const total=Number(raw),count=Number(data.likeCount??data.count);return Number.isSafeInteger(total)&&total>=0?{total,count}:null;}
export function normalizeGift(data,room,catalog){
 const userId=userIdentifier(data),giftId=stable([data.giftId,data.gift?.id]),type=Number(data.giftType??data.gift?.type??data.giftDetails?.giftType??data.extendedGiftInfo?.type??data.gift?.giftType),count=integer(data.repeatCount??1,100000);
 if(type===1&&![true,1,'true','1'].includes(data.repeatEnd))return null;
 const price=integer(catalog.get(giftId),1000000),transaction=identifier(data),group=stable([data.groupId,data.gift?.groupId]);
 if(!Number.isFinite(type)||!userId||!giftId||!price||!count||!room||!transaction&&!(type===1&&group))return null;
 // The catalog's diamond_count is the connector's unit coin-cost metadata,
 // never the creator's account Diamonds or estimated cash reward.
 const key=type===1&&group?`combo:${userId}:${giftId}:${group}`:`gift:${transaction}`;
 return {payload:{userId,coins:price,count},event:{id:`${room}:${key}`,cumulative:type===1&&!!group}};
}
export class CultureTikTok{
 constructor(store,changed=()=>{}){this.store=store;this.changed=changed;this.connection=null;this.timer=null;this.generation=0;this.catalog=new Map();this.status={connected:false,username:'',roomId:null,message:'Bağlantı kapalı',catalogSize:0,rejected:0};}
 disconnect(){this.generation++;clearTimeout(this.timer);this.timer=null;try{this.connection?.disconnect();}catch{}this.connection=null;this.catalog.clear();this.status={...this.status,connected:false,roomId:null,catalogSize:0,message:'Bağlantı kapalı'};this.changed();}
 async connect(username){if(!/^[A-Za-z0-9._]{2,40}$/.test(username))throw Error('Geçerli TikTok kullanıcı adını girin');this.disconnect();this.status.username=username;this.store.meta('tiktokUsername',username);const generation=this.generation;await this.open(generation);}
 async open(generation){
  if(generation!==this.generation)return;this.status.message='TikTok yayını aranıyor';this.changed();
  try{
   const {TikTokLiveConnection,WebcastEvent}=await import('tiktok-live-connector');
   const c=new TikTokLiveConnection(this.status.username,{processInitialData:false,fetchRoomInfoOnConnect:true,enableExtendedGiftInfo:true});this.connection=c;let ended=false,room='';
   const lose=()=>{if(ended||generation!==this.generation)return;ended=true;this.status.connected=false;this.status.roomId=null;this.catalog.clear();this.status.catalogSize=0;this.status.message='Yayın veya bağlantı kapandı. Yeniden denenecek.';this.changed();try{c.disconnect();}catch{}clearTimeout(this.timer);this.timer=setTimeout(()=>this.open(generation),30000);};
   const guarded=fn=>data=>{try{fn(data);}catch(error){this.status.rejected++;this.status.message='Olay işlenemedi: '+String(error.message).slice(0,140);this.changed();}};
   c.on(WebcastEvent.GIFT,guarded(data=>{if(!this.status.connected||!room)return;const normalized=normalizeGift(data,room,this.catalog);if(!normalized){this.status.rejected++;this.changed();return;}this.store.apply('live','gift',normalized.payload,Date.now(),normalized.event);this.changed();}));
   c.on(WebcastEvent.CHAT,guarded(data=>{const n=normalizeComment(data);if(!this.status.connected||!n||!room)return;this.store.apply('live','comment',n.payload,Date.now(),{id:`${room}:comment:${n.id}`});this.changed();}));
   c.on(WebcastEvent.LIKE,guarded(data=>{if(!this.status.connected||!room)return;const n=normalizeLike(data);if(!n)return;this.store.likeTotal(room,n.total,n.count,Date.now());this.changed();}));
   c.on('disconnected',lose);c.on('streamEnd',lose);c.on('error',lose);
   const connected=await c.connect();if(generation!==this.generation){c.disconnect();return;}
   if(ended)return;room=String(connected?.roomId??c.roomId??'');const gifts=c.availableGifts||await c.fetchAvailableGifts();const list=Array.isArray(gifts)?gifts:Array.isArray(gifts?.gifts)?gifts.gifts:[];
   if(generation!==this.generation||ended){c.disconnect();return;}this.catalog=new Map(list.filter(g=>integer(g.diamond_count,1000000)>0).map(g=>[String(g.id),integer(g.diamond_count,1000000)]));
   if(!this.catalog.size)throw Error('Oda hediye fiyatları doğrulanamadı');this.status={...this.status,connected:true,roomId:room,catalogSize:this.catalog.size,message:'Bağlı • Ülke yorumları ve katalog jeton maliyetleri izleniyor'};this.changed();
  }catch(error){if(generation!==this.generation)return;this.status.connected=false;try{this.connection?.disconnect();}catch{}this.connection=null;this.catalog.clear();this.status.roomId=null;this.status.catalogSize=0;this.status.message='Bağlantı kurulamadı: '+String(error.message).slice(0,220);this.changed();clearTimeout(this.timer);this.timer=setTimeout(()=>this.open(generation),30000);}
 }
}
