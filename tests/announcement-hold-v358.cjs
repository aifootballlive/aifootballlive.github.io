const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(require.resolve('../broadcast-announcements-v283.js'),'utf8');
let now=0,render,status={enabled:true,threshold:222,scope:'personal'};
const node={dataset:{},setAttribute(){},removeAttribute(){}};
const c={window:{AIFootballTime:{now:()=>now},AIFootballTikTok:{getLikeBonusStatus:()=>status},addEventListener:(_,fn)=>render=fn},document:{getElementById:()=>node,addEventListener(){}},clearTimeout(){},setTimeout:()=>0};vm.createContext(c);vm.runInContext(source,c);
const bilingual=source.includes('slot=');let like=0,league=0;
for(now=0;now<(bilingual?42000:21000);now+=1000){render();if(node.textContent.includes('222')){like++;assert.match(node.textContent,/KİŞİ BAŞI|EACH VIEWER/);}else league++;}
assert.equal(like,league*2,'like instruction gets twice the league instruction time');
status.notice={id:'bonus',at:now,rounds:1,threshold:222};render();assert.equal(node.dataset.likeBonus,'true');now+=1999;render();assert.equal(node.dataset.likeBonus,'true');now++;render();assert.equal(node.dataset.likeBonus,'false','earned bonus card still lasts exactly two seconds');
console.log('PASS: dynamic 222 personal label, doubled instruction time, two-second earned bonus card unchanged. Mock only.');
