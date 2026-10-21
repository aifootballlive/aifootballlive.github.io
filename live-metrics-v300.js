/* Observed LIVE events and manually entered TikTok end-of-stream totals. */
(()=>{'use strict';
 const copy=v=>JSON.parse(JSON.stringify(v)),int=v=>v!==null&&v!==undefined&&v!==''&&Number.isSafeInteger(Number(v))&&Number(v)>=0&&Number(v)<=1e12?Number(v):null;
 const fields=['totalViews','totalJoined','likes','newFollowers','giftGivers','comments','fans','diamonds','earningsUsd','peakViewers'];
 const kinds=new Set(['connected','roominfo','roomuser','like','member','chat','comment','follow','share','gift','streamend']);
 const data=m=>m.liveReports||=( {version:1,sessions:[],activeId:null} );
 function create(m,now,room=''){const d=data(m),old=d.sessions.find(s=>s.id===d.activeId);if(old?.status==='live')end(old,now);const s={id:'live:'+now+':'+room,room,startedAt:now,endedAt:null,status:'live',partial:true,observed:{likes:0,joins:0,viewers:0,giftGivers:0,comments:0,newFollowers:0,shares:0,gifts:0,coins:0},reported:{},manual:{},seen:[],people:{},donors:{},followers:{},updatedAt:now};d.sessions.push(s);d.activeId=s.id;return s;}
 function end(s,now){s.status='ended';s.endedAt=now;s.currentViewers=0;}
 function parse(raw,room,now){const kind=String(raw?.event||raw?.type||'').toLowerCase().replace(/[_-]/g,'');if(!kinds.has(kind))return null;const d=raw.data||{},u=d.user||{},viewer=String(d.userId??u.userId??u.id??d.uniqueId??u.uniqueId??'').slice(0,200),r=String(d.roomId??d.room_id??d.common?.roomId??d.state?.roomId??room??'').slice(0,100);
  if(['connected','roominfo'].includes(kind)&&!r)return null;
  const type=Number(d.giftType??d.giftDetails?.giftType??0);if(kind==='gift'&&type===1&&d.repeatEnd!==true)return null;
  const e={kind,room:r,at:now,viewer,id:String(d.msgId??d.common?.msgId??d.transactionId??d.id??d.eventId??''),count:int(d.likeCount??d.count),likeTotal:int(d.totalLikeCount??d.totalLikes),current:int(d.viewerCount??d.userCount),joined:int(d.totalUser??d.totalViewerCount),views:int(d.totalViewCount??d.totalViews),units:int(d.repeatCount??1),coins:int(d.diamondCount??d.giftDetails?.diamondCount),comment:kind==='chat'||kind==='comment'?String(d.comment??d.text??'').slice(0,1000):''};
  if(kind==='gift'&&(e.units===null||e.units<1||e.units>10000||e.coins!==null&&e.coins>1000000))return null;
  e.identity=JSON.stringify([e.id?'':r,kind,e.id||[viewer,e.likeTotal,e.current,e.joined,e.views,e.comment].join(':')]);return e;
 }
 function distinct(s,map,key,count){if(!key||s[map]?.[key])return;const set=s[map]||={};if(Object.keys(set).length>=5000){s.truncated=true;return;}set[key]=1;s.observed[count]++;}
 function apply(m,batch,now){let changed=false;for(const e of batch.slice().sort((a,b)=>a.at-b.at)){
  const d=data(m);let s=d.sessions.find(s=>s.id===d.activeId);
  if(!s||e.room&&s.room&&s.room!==e.room){const prior=e.room&&d.sessions.find(x=>x.room===e.room);if(prior){s=prior;if(prior.status!=='ended')d.activeId=s.id;}else s=create(m,e.at,e.room);}
  if(e.at<s.startedAt){const prior=d.sessions.slice().reverse().find(x=>x.startedAt<=e.at&&(!x.endedAt||e.at<=x.endedAt)&&(!e.room||x.room===e.room));if(!prior)continue;s=prior;}
  if(s.status==='ended'&&e.at>s.endedAt)continue;if(!s.room&&e.room)s.room=e.room;
  if(s.seen.includes(e.key))continue;s.seen.push(e.key);if(s.seen.length>4000)s.seen.shift();s.updatedAt=now;changed=true;
  distinct(s,'people',e.viewer,'viewers');
  if(e.current!==null){if(s.status==='live')s.currentViewers=e.current;s.reported.peakViewers=Math.max(s.reported.peakViewers||0,e.current);}
  for(const [key,value]of [['likes',e.likeTotal],['totalJoined',e.joined],['totalViews',e.views]])if(value!==null)s.reported[key]=Math.max(s.reported[key]||0,value);
  if(e.kind==='like'&&e.count!==null)s.observed.likes+=e.count;
  if(e.kind==='member')s.observed.joins++;
  if(e.kind==='chat'||e.kind==='comment')s.observed.comments++;
  if(e.kind==='follow')distinct(s,'followers',e.viewer,'newFollowers');
  if(e.kind==='share')s.observed.shares++;
  if(e.kind==='gift'){distinct(s,'donors',e.viewer,'giftGivers');if(e.units!==null)s.observed.gifts+=e.units;if(e.units!==null&&e.coins!==null)s.observed.coins+=e.units*e.coins;else s.missingGiftPrice=true;}
  if(e.kind==='streamend')end(s,e.at);
 }
 return changed;}
 function manual(m,id,values,now){const s=data(m).sessions.find(s=>s.id===id);if(!s||!values||typeof values!=='object')return false;const clean={};for(const key of fields){const v=values[key];if(v===null||v===''){clean[key]=null;continue;}const x=key==='earningsUsd'?Number(v):int(v);if(!Number.isFinite(x)||x<0||x>1e12)return false;clean[key]=x;}s.manual=clean;s.manualUpdatedAt=now;return true;}
 function view(m){return copy(m?.liveReports||{version:1,sessions:[],activeId:null});}
 window.AIFootballLiveMetrics={parse,apply,create,end,manual,view,fields};
})();
