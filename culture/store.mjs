import {DatabaseSync} from 'node:sqlite';
import {fresh,command,tick,publicState} from './engine.mjs';
export class CultureStore{
 constructor(file){this.db=new DatabaseSync(file);this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS culture_state(mode TEXT PRIMARY KEY,json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS culture_events(id TEXT PRIMARY KEY,json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS culture_meta(key TEXT PRIMARY KEY,json TEXT NOT NULL);');for(const mode of ['live','test'])if(!this.db.prepare('SELECT 1 FROM culture_state WHERE mode=?').get(mode))this.save(fresh(mode));}
 read(mode='live'){if(!['live','test'].includes(mode))throw Error('Geçersiz mod');return JSON.parse(this.db.prepare('SELECT json FROM culture_state WHERE mode=?').get(mode).json);}
 save(s){this.db.prepare('INSERT OR REPLACE INTO culture_state VALUES(?,?)').run(s.mode,JSON.stringify(s));}
 transact(fn){this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 apply(mode,type,p={},at=Date.now(),event=null){return this.transact(()=>{
  const s=this.read(mode);let payload={...p},ledger;
  if(event){if(!event.id||String(event.id).length>350)throw Error('Kalıcı olay kimliği gerekli');const id=mode+':'+event.id,old=this.db.prepare('SELECT json FROM culture_events WHERE id=?').get(id);ledger=old?JSON.parse(old.json):null;
   if(type==='gift'&&event.cumulative){const count=Number(p.count),previous=ledger?.count||0;if(count<=previous)return {ok:false,duplicate:true};if(ledger&&(ledger.coins!==p.coins||ledger.userId!==p.userId))throw Error('Seri hediye bilgisi değişti');payload={...p,count:count-previous,...(ledger?.country?{country:ledger.country}:{})};}
   else if(old)return {ok:false,duplicate:true};
  }
  const result=command(s,type,payload,at);s.revision++;this.save(s);
  if(event){const record={at,type,userId:p.userId,coins:p.coins,count:p.count,...result};this.db.prepare('INSERT OR REPLACE INTO culture_events VALUES(?,?)').run(mode+':'+event.id,JSON.stringify(record));}
  return result;
 });}
 step(at=Date.now()){for(const mode of ['live','test'])this.transact(()=>{const s=this.read(mode);if(tick(s,at)){s.revision++;this.save(s);}});}
 snapshot(mode='live',at=Date.now()){return publicState(this.read(mode),at);}
 likeTotal(room,total,count,at=Date.now()){return this.transact(()=>{const key='likes:'+room,old=this.meta(key);if(old!==null&&total<=old)return {ok:false,duplicate:true};const increment=old===null?Math.min(total,Number.isSafeInteger(count)&&count>0?count:0):total-old;const s=this.read('live'),result=increment?command(s,'likes',{count:increment},at):{ok:true,baseline:true};s.revision++;this.save(s);this.meta(key,total);return result;});}
 meta(key,value){if(value!==undefined)this.db.prepare('INSERT OR REPLACE INTO culture_meta VALUES(?,?)').run(key,JSON.stringify(value));const r=this.db.prepare('SELECT json FROM culture_meta WHERE key=?').get(key);return r?JSON.parse(r.json):null;}
 close(){this.db.close();}
}
