import test from 'node:test';
import assert from 'node:assert/strict';
import {DeviceAuth} from '../device-auth.mjs';
const request=(token='',ip='127.0.0.1',host='127.0.0.1:8890')=>({headers:{host,cookie:token?'football_admin='+token:''},socket:{remoteAddress:ip}});
test('only local PC bootstraps; only approved PC pairs one phone',()=>{
  const auth=new DeviceAuth();assert.throws(()=>auth.bootstrap(request('','192.168.1.20')));
  const token=auth.bootstrap(request()),pc=request(token);assert.equal(auth.device(pc).kind,'pc');assert.throws(()=>auth.bootstrap(request()));assert.throws(()=>auth.pair(request()));
  const code=auth.pair(pc),phoneToken=auth.redeem(request('','192.168.1.20'),code),phone=request(phoneToken,'192.168.1.20');assert.equal(auth.device(phone).kind,'phone');assert.equal(auth.devices.length,2);assert.throws(()=>auth.pair(phone));assert.throws(()=>auth.redeem(request('','192.168.1.21'),code));assert.throws(()=>auth.pair(pc));
  auth.revokePhone(pc);assert.equal(auth.device(phone),undefined);assert.equal(auth.devices.length,1);
});
test('pairing expires, rate limits guesses and keeps only token hashes',()=>{
  let now=0,saved;const auth=new DeviceAuth({now:()=>now,save:data=>saved=data});const token=auth.bootstrap(request()),pc=request(token);assert(!JSON.stringify(saved).includes(token));let code=auth.pair(pc);now=600001;assert.throws(()=>auth.redeem(request('','phone'),code));code=auth.pair(pc);for(let i=0;i<5;i++)assert.throws(()=>auth.redeem(request('','phone'),'000000'));assert.throws(()=>auth.redeem(request('','phone'),code));code=auth.pair(pc);assert(auth.redeem(request('','phone'),code));
});
