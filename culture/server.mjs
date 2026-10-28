import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {WebSocketServer,WebSocket} from 'ws';
import {CultureStore} from './store.mjs';
import {CultureTikTok} from './tiktok.mjs';
const root=path.resolve(import.meta.dirname,'..');
export function createCultureServer({database=path.join(root,'culture/.runtime/culture.sqlite'),football='http://127.0.0.1:8892',authorize,clock=()=>Date.now()}={}){
 fs.mkdirSync(path.dirname(database),{recursive:true});const store=new CultureStore(database),clients=new Set();
 const allowed=new Set(['127.0.0.1','localhost',...(process.env.CULTURE_ALLOWED_HOSTS||'').split(',').filter(Boolean)]);
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 async function authenticated(req){if(authorize)return !!await authorize(req);if(!req.headers.cookie)return false;try{const r=await fetch(football+'/local-api/rpc',{method:'POST',headers:{'Content-Type':'application/json',Origin:football,Cookie:req.headers.cookie},body:JSON.stringify({name:'admin_device_status'}),signal:AbortSignal.timeout(3000)});if(!r.ok)return false;const d=await r.json();return d?.data?.approved===true;}catch{return false;}}
 const projection=mode=>({type:'state',state:store.snapshot(mode,clock())});
 function publish(){for(const ws of clients)if(ws.readyState===1)ws.send(JSON.stringify(projection(ws.mode)));}
 const bridge=new CultureTikTok(store,publish);
 async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16384)throw Error('İstek çok büyük');}return JSON.parse(raw||'{}');}
 function proxy(req,res){const upstream=new URL(req.url,football),localHost=/^(127\.0\.0\.1|localhost):/.test(req.headers.host||'');const headers={...req.headers,host:localHost?upstream.host:req.headers.host};if(localHost&&req.headers.origin)headers.origin=new URL(football).origin;const request=http.request(upstream,{method:req.method,headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});request.on('error',()=>json(res,503,{error:'Futbol sunucusuna ulaşılamıyor'}));req.pipe(request);}
 const server=http.createServer(async(req,res)=>{try{
  const name=new URL('http://'+req.headers.host).hostname,host=new URL((['127.0.0.1','localhost'].includes(name)?'http://':'https://')+req.headers.host);if(!allowed.has(host.hostname))return json(res,403,{error:'Bu alan adına izin verilmiyor'});
  const url=new URL(req.url,host),raw=decodeURIComponent(url.pathname),p=raw.startsWith('/culture-app/')?raw.slice('/culture-app'.length):raw,mode=url.searchParams.get('mode')==='test'?'test':'live';
  if(p.startsWith('/football/')){if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==host.origin)return json(res,403,{error:'İzin verilmeyen futbol komut kaynağı'});req.url=p+url.search;return proxy(req,res);}
  if(req.method==='GET'&&p==='/culture-api/state')return json(res,200,projection(mode));
  if(req.method==='GET'&&p==='/culture-api/admin')return json(res,200,{authorized:await authenticated(req),connection:bridge.status,username:store.meta('tiktokUsername')||'',backend:'local',state:store.snapshot(mode,clock())});
  if(p==='/culture-api/command'){
   if(req.method!=='POST'||req.headers.origin!==host.origin)return json(res,403,{error:'Komut aynı yönetim sayfasından gelmeli'});
   if(!await authenticated(req))return json(res,401,{error:'Onaylı yönetici oturumu gerekli. Futbol yönetimine giriş yapın.'});
   const b=await body(req),which=b.mode==='test'?'test':'live';let result;
   if(b.type==='connect'){await bridge.connect(String(b.payload?.username||'').replace(/^@/,''));result={ok:true};}
   else if(b.type==='disconnect'){bridge.disconnect();result={ok:true};}
   else if(['comment','gift','likes'].includes(b.type)){if(which!=='test')return json(res,403,{error:'Canlı puan yalnızca gerçek TikTok olaylarından alınır'});result=store.apply('test',b.type,b.payload,clock());}
   else if(['settings','start','pause','resume','finish'].includes(b.type))result=store.apply(which,b.type,b.payload,clock());
   else return json(res,400,{error:'Bilinmeyen yönetim komutu'});
   publish();return json(res,200,result);
  }
  if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Salt okunur sayfa'});
  const file=p==='/'?'uygulamalarim.html':p.replace(/^\//,'');
  if(!/^(?:culture\.html|culture-engine-v1\.js|uygulamalarim\.html|culture\/(?:countries\.mjs|engine\.mjs|client\.mjs|admin\.mjs|apps\.mjs|audio\.mjs|live\.css|hub\.css)|assets\/culture-v1\/[\w./-]+)$/.test(file)||file.split('/').some(x=>x.startsWith('.')))return json(res,404,{error:'Sayfa bulunamadı'});
  const target=path.resolve(root,file);if(!target.startsWith(root+path.sep)||!fs.existsSync(target))return json(res,404,{error:'Dosya bulunamadı'});
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});return req.method==='HEAD'?res.end():fs.createReadStream(target).pipe(res);
 }catch(error){if(!res.headersSent)json(res,400,{error:String(error.message).slice(0,250)});else res.end();}});
 const wss=new WebSocketServer({noServer:true,maxPayload:1024});server.on('upgrade',(req,socket,head)=>{
  let url;try{const name=new URL('http://'+req.headers.host).hostname,host=new URL((['127.0.0.1','localhost'].includes(name)?'http://':'https://')+req.headers.host);if(!allowed.has(host.hostname)||req.headers.origin!==host.origin)throw Error();url=new URL(req.url,host);if(url.pathname.startsWith('/culture-app/'))url.pathname=url.pathname.slice('/culture-app'.length);}catch{socket.destroy();return;}
  if(url.pathname.startsWith('/football/')){
   const target=new URL(url.pathname+url.search,football);target.protocol='ws:';const localHost=/^(127\.0\.0\.1|localhost):/.test(req.headers.host||'');const upstream=new WebSocket(target,{headers:{Cookie:req.headers.cookie||'',...(localHost?{}:{Host:req.headers.host})},origin:localHost?new URL(football).origin:req.headers.origin});
   upstream.on('open',()=>wss.handleUpgrade(req,socket,head,down=>{down.on('message',(d,isBinary)=>{if(upstream.readyState===1)upstream.send(d,{binary:isBinary});});upstream.on('message',(d,isBinary)=>{if(down.readyState===1)down.send(d,{binary:isBinary});});down.on('close',()=>upstream.close());upstream.on('close',()=>down.close());}));upstream.on('error',()=>socket.destroy());return;
  }
  if(url.pathname!=='/culture-api/live'){socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>{ws.mode=url.searchParams.get('mode')==='test'?'test':'live';clients.add(ws);ws.send(JSON.stringify(projection(ws.mode)));ws.on('message',()=>ws.close(1008,'Yayın bağlantısı salt okunurdur'));ws.on('close',()=>clients.delete(ws));});
 });
 const interval=setInterval(()=>{store.step(clock());publish();},1000);interval.unref();
 return {server,store,bridge,close:async()=>{clearInterval(interval);bridge.disconnect();for(const ws of clients)ws.terminate();wss.close();await new Promise(r=>server.close(r));store.close();}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){const app=createCultureServer();app.server.listen(Number(process.env.CULTURE_PORT)||8894,'127.0.0.1',()=>console.log('Uygulamalarım: http://127.0.0.1:'+ (Number(process.env.CULTURE_PORT)||8894)+'/uygulamalarim.html?app=culture'));}
