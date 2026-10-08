import {MockLiveEventAdapter,TikTokLiveEventAdapter} from './adapters.mjs';
export class EventController {
  constructor(engine,{audioTest=()=>{},WebSocketImpl=globalThis.WebSocket}={}){this.engine=engine;this.audioTest=audioTest;this.WebSocketImpl=WebSocketImpl;this.adapter=null;}
  get state(){return this.engine.state;}
  disconnect(){this.adapter?.disconnect();}
  async connect(){
    this.disconnect();this.adapter=this.state.connection.mode==='mock'?new MockLiveEventAdapter():new TikTokLiveEventAdapter(this.state.connection.bridgeUrl,{WebSocketImpl:this.WebSocketImpl});
    this.adapter.onGift(event=>this.engine.gift(event));
    for(const type of ['like','follow','comment'])this.adapter.subscribe(type,event=>{this.engine.log(`${type}: ${String(event.username||'İzleyici').slice(0,32)} ${String(event.text||'').slice(0,100)}`);this.engine.change();});
    this.adapter.onStatus(status=>{this.state.connectionStatus=status;this.engine.change();});
    await this.adapter.connect();
  }
  async execute(command,p={}){
    if(command==='shot')this.engine.enqueue(p.teamId,{forcedResult:p.result});
    else if(command==='gift'){if(!(this.adapter instanceof MockLiveEventAdapter))throw new Error('Mock bağlantısını açın.');this.adapter.gift(p.giftId,p.count||1);}
    else if(command==='connect')await this.connect();
    else if(command==='disconnect')this.disconnect();
    else if(command==='config'){const wasConnected=!!this.adapter?.connected;this.engine.configure(p);if(wasConnected)await this.connect();}
    else if(command==='connection'){this.disconnect();this.state.connection={mode:p.mode==='tiktok'?'tiktok':'mock',bridgeUrl:String(p.bridgeUrl||'')};this.engine.change();await this.connect();}
    else if(command==='reset')this.engine.reset();
    else if(command==='score')this.engine.setScore(p.teamId,Number(p.value));
    else if(command==='audio')this.engine.audio(p);
    else if(command==='audioTest')this.audioTest(p.sound);
    else if(command==='clearQueue'){this.state.eventQueue=[];this.engine.change();}
    else if(command==='social'){if(!(this.adapter instanceof MockLiveEventAdapter))throw new Error('Mock modunu seçin.');if(p.type==='comment')this.adapter.comment(p.text||'Güzel şut!');else if(p.type==='like')this.adapter.like();else this.adapter.follow();}
    else throw new Error('Bilinmeyen kontrol komutu.');
  }
}
