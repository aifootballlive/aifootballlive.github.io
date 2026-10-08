export class LiveEventAdapter {
  constructor(){this.listeners=new Map();this.connected=false;}
  subscribe(type, callback){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(callback);return()=>this.listeners.get(type)?.delete(callback);}
  emit(type,event){for(const callback of this.listeners.get(type)||[])callback(event);}
  onGift(fn){return this.subscribe('gift',fn);}
  onLike(fn){return this.subscribe('like',fn);}
  onFollow(fn){return this.subscribe('follow',fn);}
  onComment(fn){return this.subscribe('comment',fn);}
  onStatus(fn){return this.subscribe('status',fn);}
  async connect(){throw new Error('Bir bağlantı adaptörü seçin.');}
  disconnect(){this.connected=false;this.emit('status','disconnected');}
}
export class MockLiveEventAdapter extends LiveEventAdapter {
  async connect(){this.connected=true;this.emit('status','connected');}
  gift(giftId, repeatCount=1, extra={}){if(!this.connected)throw new Error('Mock bağlantısını açın.');this.emit('gift',{id:crypto.randomUUID(),giftId,repeatCount,repeatEnd:true,username:'Demo izleyici',...extra});}
  like(){this.emit('like',{username:'Demo izleyici',count:1});}
  follow(){this.emit('follow',{username:'Demo izleyici'});}
  comment(text){this.emit('comment',{username:'Demo izleyici',text});}
}
// A server-side TikTok connector emits this protocol; browser code has no cookies or credentials.
export class TikTokLiveEventAdapter extends LiveEventAdapter {
  constructor(url,{WebSocketImpl=globalThis.WebSocket}={}){super();this.url=url;this.WebSocketImpl=WebSocketImpl;this.socket=null;this.generation=0;}
  async connect(){
    this.disconnect();const generation=++this.generation;
    const url=new URL(this.url);
    if(url.protocol!=='wss:' && !(url.protocol==='ws:' && ['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('Güvenli bir wss:// köprü adresi girin.');
    this.emit('status','connecting');
    return new Promise((resolve,reject)=>{
      const socket=this.socket=new this.WebSocketImpl(url.href);
      const timeout=setTimeout(()=>{socket.close();reject(new Error('Bağlantı zaman aşımına uğradı.'));},10000);
      socket.onopen=()=>{clearTimeout(timeout);if(generation!==this.generation)return;this.connected=true;this.emit('status','connected');resolve();};
      socket.onmessage=({data})=>{if(generation!==this.generation || typeof data!=='string' || data.length>16384)return;try{const event=JSON.parse(data);if(['gift','like','follow','comment'].includes(event.type)&&event.data&&typeof event.data==='object')this.emit(event.type,event.data);}catch{}};
      socket.onerror=()=>{clearTimeout(timeout);this.emit('status','error');reject(new Error('TikTok köprüsüne bağlanılamadı.'));};
      socket.onclose=()=>{clearTimeout(timeout);if(generation!==this.generation)return;this.connected=false;this.emit('status','disconnected');reject(new Error('Bağlantı kapandı.'));};
    });
  }
  disconnect(){this.generation++;if(this.socket){this.socket.close();this.socket=null;}super.disconnect();}
}
