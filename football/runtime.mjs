import {loadState} from './config.mjs';
import {FootballEngine} from './engine.mjs';
import {EventController} from './controller.mjs';
const CHANNEL='aifootball-live-demo-v1',LOCK='aifootball-demo-controller';
export class Runtime extends EventTarget {
  constructor(){
    super();this.state=loadState();this.clientId=crypto.randomUUID();this.leader=false;this.seenCommands=new Set();this.closed=false;
    const endpoint=document.querySelector('meta[name="football-controller"]')?.content;
    if(endpoint){this.remoteUrl=new URL(endpoint,location.href);this.remoteUrl.protocol=location.protocol==='https:'?'wss:':'ws:';this.connectRemote();return;}
    this.channel=new BroadcastChannel(CHANNEL);this.engine=new FootballEngine(this.state,{publish:state=>this.publish(state)});
    this.controller=new EventController(this.engine,{audioTest:sound=>{this.channel.postMessage({type:'audioTest',sound});this.dispatchEvent(new CustomEvent('audioTest',{detail:sound}));}});
    this.channel.onmessage=({data})=>this.receive(data);this.channel.postMessage({type:'hello'});this.claim();
  }
  notify(){this.dispatchEvent(new CustomEvent('state',{detail:this.state}));}
  publish(state){this.state=state;this.channel.postMessage({type:'state',state});this.notify();}
  connectRemote(){
    this.socket=new WebSocket(this.remoteUrl.href);
    this.socket.onmessage=({data})=>{try{const message=JSON.parse(data);if(message.type==='state'){this.state=message.state;this.notify();}else if(message.type==='audioTest')this.dispatchEvent(new CustomEvent('audioTest',{detail:message.sound}));else if(message.type==='error')this.dispatchEvent(new CustomEvent('error',{detail:message.message}));}catch{}};
    this.socket.onclose=()=>{if(this.closed)return;this.dispatchEvent(new CustomEvent('error',{detail:'Yerel yayın bağlantısı kesildi; yeniden bağlanılıyor.'}));this.reconnect=setTimeout(()=>this.connectRemote(),2000);};
  }
  async claim(){
    if(!navigator.locks){this.dispatchEvent(new CustomEvent('error',{detail:'Bu demo Chrome/Edge ve güvenli HTTPS bağlantısı gerektiriyor.'}));return;}
    await navigator.locks.request(LOCK,async()=>{
      this.leader=true;this.engine.state=this.state;this.engine.tick();this.publish(this.state);
      this.timer=setInterval(()=>this.engine.tick(),50);
      if(this.state.connection.mode==='mock')await this.controller.connect();
      await new Promise(resolve=>{this.release=resolve;});
      clearInterval(this.timer);this.controller.disconnect();this.leader=false;
    });
  }
  receive(data){
    if(!data||typeof data!=='object')return;
    if(data.type==='state'&&!this.leader){this.state=data.state;this.engine.state=this.state;this.notify();}
    else if(data.type==='hello'&&this.leader)this.channel.postMessage({type:'state',state:this.state});
    else if(data.type==='command'&&this.leader){if(this.seenCommands.has(data.id))return;this.seenCommands.add(data.id);if(this.seenCommands.size>1000)this.seenCommands.delete(this.seenCommands.values().next().value);this.controller.execute(data.command,data.payload).catch(error=>this.report(error));}
    else if(data.type==='audioTest')this.dispatchEvent(new CustomEvent('audioTest',{detail:data.sound}));
    else if(data.type==='error')this.dispatchEvent(new CustomEvent('error',{detail:data.message}));
  }
  report(error){this.engine.log(error.message);this.engine.change();this.channel.postMessage({type:'error',message:error.message});this.dispatchEvent(new CustomEvent('error',{detail:error.message}));}
  command(command,payload={}){
    if(this.remoteUrl){if(this.socket.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify({type:'command',command,payload}));else this.dispatchEvent(new CustomEvent('error',{detail:'Yerel yayın bağlantısı henüz hazır değil.'}));}
    else if(this.leader)this.controller.execute(command,payload).catch(error=>this.report(error));
    else this.channel.postMessage({type:'command',id:crypto.randomUUID(),command,payload});
  }
  close(){this.closed=true;clearTimeout(this.reconnect);this.socket?.close();this.release?.();this.channel?.close();}
}
