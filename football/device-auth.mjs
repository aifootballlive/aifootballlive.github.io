import {randomBytes,randomInt,createHash} from 'node:crypto';
const digest=value=>createHash('sha256').update(value).digest('hex');
export const isLoopback=address=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address);
export class DeviceAuth {
  constructor({load=()=>null,save=()=>{},now=Date.now}={}){this.save=save;this.now=now;this.devices=load()?.devices||[];this.pairing=null;this.failures=new Map();}
  token(req){return (req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('football_admin='))?.slice(15)||'';}
  device(req){const token=this.token(req);return token?this.devices.find(d=>d.hash===digest(token)):null;}
  issue(kind){if(this.devices.some(d=>d.kind===kind))throw new Error('Bu cihaz zaten eşleştirilmiş. Bilgisayardan erişimi yenileyin.');const token=randomBytes(32).toString('hex');this.devices.push({kind,hash:digest(token),createdAt:this.now()});this.save({devices:this.devices});return token;}
  cookie(token){return `football_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000`;}
  bootstrap(req){if(!isLoopback(req.socket.remoteAddress)||!['127.0.0.1','localhost','[::1]'].includes(new URL('http://'+req.headers.host).hostname))throw new Error('İlk giriş yalnızca bu bilgisayarda yapılır.');return this.issue('pc');}
  pair(req){if(this.device(req)?.kind!=='pc')throw new Error('Telefon eşleştirmesini bilgisayardan açın.');if(this.devices.some(d=>d.kind==='phone'))throw new Error('Telefon zaten eşleştirilmiş. Önce telefon erişimini kaldırın.');const code=String(randomInt(100000,1000000));this.pairing={hash:digest(code),expires:this.now()+600000};this.failures.clear();return code;}
  redeem(req,code){const ip=req.socket.remoteAddress,bucket=this.failures.get(ip)||{count:0,until:this.now()+600000};if(this.now()>bucket.until){bucket.count=0;bucket.until=this.now()+600000;}if(bucket.count>=5)throw new Error('Çok fazla deneme. Bilgisayardan yeni kod üretin.');bucket.count++;this.failures.set(ip,bucket);if(!/^\d{6}$/.test(String(code))||!this.pairing||this.now()>this.pairing.expires||digest(String(code))!==this.pairing.hash)throw new Error('Eşleştirme kodu geçersiz veya süresi dolmuş.');const token=this.issue('phone');this.pairing=null;return token;}
  revokePhone(req){if(this.device(req)?.kind!=='pc')throw new Error('Bu işlem yalnızca bilgisayardan yapılır.');this.devices=this.devices.filter(d=>d.kind!=='phone');this.pairing=null;this.save({devices:this.devices});}
}
