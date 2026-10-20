const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/mobile-v274/manifest.json'),'utf8'));
let original=0,mobile=0;
for(const [key,entry]of Object.entries(manifest)){
 const data=fs.readFileSync(path.join(root,entry.src)),source=fs.readFileSync(path.join(root,entry.originalSrc));
 assert.equal(crypto.createHash('sha256').update(source).digest('hex'),entry.originalSha256,key+' original changed');assert.equal(crypto.createHash('sha256').update(data).digest('hex'),entry.sha256,key+' derivative changed');
 assert.equal(data.length,entry.bytes);assert(data.length<source.length*.5,key+' mobile copy too large');
 const boxes=[];for(let at=0;at<data.length;){let size=data.readUInt32BE(at);if(size===1)size=Number(data.readBigUInt64BE(at+8));if(size===0)size=data.length-at;assert(size>=8);boxes.push(data.toString('ascii',at+4,at+8));at+=size;}
 assert(boxes.includes('moov')&&boxes.indexOf('moov')<boxes.indexOf('mdat'),key+' missing streaming faststart');assert.equal(entry.width,540);assert.equal(entry.height,960);assert(entry.frames>150);
 if(key!=='waiting'){assert.equal(entry.audio,'packet-copy');original+=source.length;mobile+=data.length;}
}
assert.equal(Object.keys(manifest).length,9);assert(mobile/original<.35);
console.log('PASS: 9 faststart mobile derivatives, unchanged original hashes, shot audio copied; '+original+' -> '+mobile+' shot bytes. Frame timelines verified by the builder.');
