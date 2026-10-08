import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WebSocketServer,WebSocket} from 'ws';
import {initialState,loadState} from './config.mjs';
import {FootballEngine} from './engine.mjs';
import {EventController} from './controller.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),port=Number(process.env.FOOTBALL_PORT||8890),file=path.join(root,'football/.runtime/state.json');
const storage={getItem:()=>fs.existsSync(file)?fs.readFileSync(file,'utf8'):null};
const state=loadState(storage);const clients=new Set();
const send=(socket,message)=>{if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify(message));};
const broadcast=message=>{for(const socket of clients)send(socket,message);};
let saved='';
const engine=new FootballEngine(state,{publish:state=>broadcast({type:'state',state}),persist:state=>{const data=JSON.stringify({...state,eventQueue:[],animationState:null,recentEvents:[],eventLog:[],connectionStatus:'disconnected'});if(data===saved)return;saved=data;fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);}});
const controller=new EventController(engine,{WebSocketImpl:WebSocket,audioTest:sound=>broadcast({type:'audioTest',sound})});
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');let pathname;
  try{pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400);return res.end();}
  if(pathname==='/'){res.writeHead(302,{Location:'/admin/'});return res.end();}
  let target=path.resolve(root,'.'+pathname);
  if(!target.startsWith(root)||path.relative(root,target).split(path.sep).some(segment=>segment.startsWith('.'))||target.includes('node_modules')){res.writeHead(403);return res.end();}
  if(fs.existsSync(target)&&fs.statSync(target).isDirectory()){if(!pathname.endsWith('/')){res.writeHead(302,{Location:pathname+'/'});return res.end();}target=path.join(target,'index.html');}
  fs.readFile(target,(error,data)=>{
    if(error){res.writeHead(404);return res.end('Not found');}
    const ext=path.extname(target),mime={'.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
    res.setHeader('Content-Type',mime[ext]||'application/octet-stream');
    if(ext==='.html')data=Buffer.from(data.toString().replace('</head>','<meta name="football-controller" content="/control"></head>'));
    res.end(data);
  });
});
const wss=new WebSocketServer({noServer:true,maxPayload:65536});
server.on('upgrade',(req,socket,head)=>{
  let origin;try{origin=new URL(req.headers.origin);}catch{socket.destroy();return;}
  if(req.url!=='/control'||!['127.0.0.1','localhost'].includes(origin.hostname)||origin.port!==String(port)){socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
});
wss.on('connection',socket=>{
  clients.add(socket);send(socket,{type:'state',state:engine.state});let count=0,windowStart=Date.now();
  socket.on('message',async raw=>{
    if(Date.now()-windowStart>1000){windowStart=Date.now();count=0;}if(++count>30){send(socket,{type:'error',message:'Çok hızlı kontrol isteği.'});return;}
    try{const message=JSON.parse(raw.toString());if(message.type!=='command')return;await controller.execute(message.command,message.payload);}catch(error){send(socket,{type:'error',message:error.message});}
  });socket.on('close',()=>clients.delete(socket));
});
setInterval(()=>engine.tick(),50);
server.listen(port,'127.0.0.1',async()=>{console.log(`Admin: http://127.0.0.1:${port}/admin/\nOBS Browser Source: http://127.0.0.1:${port}/live/`);if(state.connection.mode==='mock')await controller.connect();});
