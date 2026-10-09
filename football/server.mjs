import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WebSocketServer,WebSocket} from 'ws';
import {initialState,loadState} from './config.mjs';
import {FootballEngine} from './engine.mjs';
import {EventController} from './controller.mjs';
import os from 'node:os';
import {DeviceAuth} from './device-auth.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),port=Number(process.env.FOOTBALL_PORT||8890),file=path.join(root,'football/.runtime/state.json');
const storage={getItem:()=>fs.existsSync(file)?fs.readFileSync(file,'utf8'):null};
const deviceFile=path.join(root,'football/.runtime/devices.json');
const auth=new DeviceAuth({load:()=>{try{return JSON.parse(fs.readFileSync(deviceFile,'utf8'));}catch{return null;}},save:data=>{fs.mkdirSync(path.dirname(deviceFile),{recursive:true});fs.writeFileSync(deviceFile,JSON.stringify(data),{mode:0o600});}});
const ownerFile=path.join(root,'football/.runtime/owner.txt');
const owner=process.env.FOOTBALL_ADMIN_EMAIL||(fs.existsSync(ownerFile)?fs.readFileSync(ownerFile,'utf8').trim():'Yönetici');
const addresses=Object.values(os.networkInterfaces()).flat().filter(a=>a?.family==='IPv4'&&!a.internal).map(a=>a.address);
const allowedHosts=new Set(['localhost','127.0.0.1',...addresses]);
const sameOrigin=req=>{try{return new URL(req.headers.origin).host===req.headers.host;}catch{return false;}};
const json=(res,code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
async function adminAPI(req,res,pathname){
  if(req.method==='GET'&&pathname==='/api/admin/session'){const device=auth.device(req);return json(res,200,{authorized:!!device,device:device?.kind,owner:device?owner:undefined});}
  if(req.method!=='POST'||!sameOrigin(req))return json(res,403,{message:'Bu istek izin verilen yönetim sayfasından gelmeli.'});
  let body='';for await(const chunk of req){body+=chunk;if(body.length>2048)return json(res,413,{message:'İstek çok büyük.'});}
  try{const data=JSON.parse(body||'{}');let token;
    if(pathname==='/api/admin/bootstrap')token=auth.bootstrap(req);
    else if(pathname==='/api/admin/redeem')token=auth.redeem(req,data.code);
    else if(pathname==='/api/admin/pair')return json(res,200,{code:auth.pair(req),phoneUrl:`http://${addresses[0]||'127.0.0.1'}:${port}/admin/`});
    else if(pathname==='/api/admin/revoke-phone'){auth.revokePhone(req);for(const socket of clients)if(socket.adminDevice?.kind==='phone')socket.close(4001,'Cihaz erişimi kaldırıldı');return json(res,200,{ok:true});}
    else return json(res,404,{message:'Bulunamadı.'});
    res.setHeader('Set-Cookie',auth.cookie(token));return json(res,200,{ok:true});
  }catch(error){return json(res,403,{message:error.message});}
}
const state=loadState(storage);const clients=new Set();
const send=(socket,message)=>{if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify(message));};
const broadcast=message=>{for(const socket of clients)send(socket,message);};
let saved='';
const engine=new FootballEngine(state,{publish:state=>broadcast({type:'state',state}),persist:state=>{const data=JSON.stringify({...state,eventQueue:[],animationState:null,recentEvents:[],eventLog:[],connectionStatus:'disconnected'});if(data===saved)return;saved=data;fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);}});
const controller=new EventController(engine,{WebSocketImpl:WebSocket,audioTest:sound=>broadcast({type:'audioTest',sound})});
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');let pathname;
  try{pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400);return res.end();}
  let host;try{host=new URL('http://'+req.headers.host).hostname;}catch{return json(res,400,{message:'Geçersiz adres.'});}
  if(!allowedHosts.has(host))return json(res,403,{message:'İzin verilmeyen yayın adresi.'});
  if(pathname.startsWith('/api/admin/'))return adminAPI(req,res,pathname);
  if(pathname==='/'){res.writeHead(302,{Location:'/admin/'});return res.end();}
  let target=path.resolve(root,'.'+pathname);
  if(!target.startsWith(root)||path.relative(root,target).split(path.sep).some(segment=>segment.startsWith('.'))||target.includes('node_modules')){res.writeHead(403);return res.end();}
  if(fs.existsSync(target)&&fs.statSync(target).isDirectory()){if(!pathname.endsWith('/')){res.writeHead(302,{Location:pathname+'/'});return res.end();}target=path.join(target,'index.html');}
  fs.readFile(target,(error,data)=>{
    if(error){res.writeHead(404);return res.end('Not found');}
    const ext=path.extname(target),mime={'.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
    res.setHeader('Content-Type',mime[ext]||'application/octet-stream');
    if(ext==='.html')data=Buffer.from(data.toString().replace('</head>','<meta name="football-controller" content="/control"></head>'));
    res.setHeader('Cache-Control','no-cache');res.setHeader('X-Content-Type-Options','nosniff');
    res.end(data);
  });
});
const wss=new WebSocketServer({noServer:true,maxPayload:65536});
server.on('upgrade',(req,socket,head)=>{
  let origin;try{origin=new URL(req.headers.origin);}catch{socket.destroy();return;}
  if(req.url!=='/control'||!allowedHosts.has(origin.hostname)||origin.host!==req.headers.host){socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
});
wss.on('connection',(socket,req)=>{
  socket.adminDevice=auth.device(req);socket.adminRequest=req;
  clients.add(socket);send(socket,{type:'state',state:engine.state});let count=0,windowStart=Date.now();
  socket.on('message',async raw=>{
    if(Date.now()-windowStart>1000){windowStart=Date.now();count=0;}if(++count>30){send(socket,{type:'error',message:'Çok hızlı kontrol isteği.'});return;}
    try{const message=JSON.parse(raw.toString());if(message.type!=='command')return;
      const publicCommand=['shot','gift','audio'].includes(message.command)&&process.env.FOOTBALL_TEST_BUTTONS!=='0';
      if(!publicCommand&&!auth.device(socket.adminRequest))throw new Error('Bu ayarı değiştirmek için onaylı yönetici cihazından giriş yapın.');
      await controller.execute(message.command,message.payload);
    }catch(error){send(socket,{type:'error',message:error.message});}
  });socket.on('close',()=>clients.delete(socket));
});
setInterval(()=>engine.tick(),50);
server.listen(port,process.env.FOOTBALL_HOST||'127.0.0.1',async()=>{console.log(`Admin: http://127.0.0.1:${port}/admin/\nOBS Browser Source: http://127.0.0.1:${port}/live/`);if(state.connection.mode==='mock')await controller.connect();});
