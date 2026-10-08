import {validateConfig,persistState} from './config.mjs';
export const SHOT_TIMELINE = {turn:300,run:1350,kick:300,flight:650,outcome:350,net:420,celebrate:1100,return:1350};
export const RESULT_MS=2950;
export function shotDuration(result){return RESULT_MS+(result==='goal'?SHOT_TIMELINE.net:0)+SHOT_TIMELINE.celebrate+SHOT_TIMELINE.return;}
export function phaseAt(shot,now=Date.now()){
  if(!shot)return'idle';let elapsed=now-shot.startedAt;
  for(const [phase,duration] of Object.entries(SHOT_TIMELINE)){if(phase==='net'&&shot.result!=='goal')continue;if(elapsed<duration)return phase;elapsed-=duration;}return'idle';
}
export class FootballEngine {
  constructor(state,{publish=()=>{},random=Math.random,now=Date.now,id=()=>crypto.randomUUID(),persist=persistState}={}){this.state=state;this.publish=publish;this.random=random;this.now=now;this.id=id;this.persist=persist;}
  change(){this.state.revision++;this.persist(this.state);this.publish(this.state);}
  log(message){this.state.eventLog.unshift({at:this.now(),message:String(message).slice(0,180)});this.state.eventLog.length=Math.min(this.state.eventLog.length,80);}
  gift(event){
    if(event.repeatEnd===false || (event.giftType===1 && event.repeatEnd!==true))return;
    const eventId=String(event.id||event.eventId||'');
    if(!eventId){this.log('Kimliksiz hediye yok sayıldı.');this.change();return;}
    if(this.state.recentEvents.includes(eventId))return;
    this.state.recentEvents.push(eventId);if(this.state.recentEvents.length>2000)this.state.recentEvents.shift();
    const giftId=String(event.giftId||event.giftName||'').trim().toLowerCase();
    const mapping=this.state.giftMappings.find(g=>g.giftId===giftId || g.name.toLowerCase()===giftId);
    if(!mapping){this.log('Eşleşmeyen hediye: '+giftId);this.change();return;}
    const repeats=Number(event.repeatCount??1);
    if(!Number.isFinite(repeats)||repeats<1){this.log('Geçersiz hediye adedi.');this.change();return;}
    const count=Math.min(this.state.gameSettings.maxShotsPerGift,Math.floor(repeats)*mapping.shots);
    this.enqueue(mapping.teamId,{count,points:mapping.points,username:event.username||'İzleyici'});
  }
  enqueue(teamId,{count=1,points=1,forcedResult=null,username='Test'}={}){
    if(!this.state.teams.some(t=>t.id===teamId))throw new Error('Takım bulunamadı.');
    if(!Number.isFinite(count)||count<1||!Number.isFinite(points)||points<1)throw new Error('Geçersiz şut değeri.');
    const room=Math.max(0,this.state.gameSettings.maxQueue-this.state.eventQueue.length);
    const accepted=Math.min(room,Math.floor(count),20);
    for(let i=0;i<accepted;i++)this.state.eventQueue.push({id:this.id(),teamId,points:Math.min(100,Math.floor(points)),forcedResult:['goal','save'].includes(forcedResult)?forcedResult:null,username:String(username).slice(0,32)});
    this.log(accepted?`${username}: ${teamId} için ${accepted} şut sırada.`:'Şut sırası dolu.');this.tick();this.change();return accepted;
  }
  tick(){
    const now=this.now();let changed=false;const active=this.state.animationState;
    if(active){
      if(!active.scored && now-active.startedAt>=RESULT_MS){active.scored=true;if(active.result==='goal')this.state.scores[active.teamId]+=active.points;this.state.lastResult={shotId:active.id,teamId:active.teamId,result:active.result,at:now};this.log(active.result==='goal'?`GOL! ${active.teamId} +${active.points}`:`${active.teamId}: kaleci kurtardı.`);changed=true;}
      const phase=phaseAt(active,now);if(phase!==active.phase){active.phase=phase;changed=true;}
      if(now-active.startedAt>=shotDuration(active.result)){this.state.animationState=null;changed=true;}
    }
    if(!this.state.animationState && this.state.eventQueue.length){const job=this.state.eventQueue.shift();this.state.animationState={...job,result:job.forcedResult||(this.random()<this.state.gameSettings.goalProbability?'goal':'save'),startedAt:now,scored:false,phase:'turn'};changed=true;}
    if(changed)this.change();
  }
  configure(input){if(this.state.animationState||this.state.eventQueue.length)throw new Error('Takım ayarlarını değiştirmek için şut sırasının bitmesini bekleyin.');const cfg=validateConfig(input);const previous=this.state.scores;Object.assign(this.state,cfg,{scores:Object.fromEntries(cfg.teams.map(t=>[t.id,previous[t.id]||0])),players:cfg.teams.map(t=>({teamId:t.id,model:t.model}))});this.log('Takım ve hediye ayarları kaydedildi.');this.change();}
  reset(){this.state.scores=Object.fromEntries(this.state.teams.map(t=>[t.id,0]));this.state.eventQueue=[];this.state.animationState=null;this.state.lastResult=null;this.log('Tüm skorlar ve bekleyen şutlar sıfırlandı.');this.change();}
  setScore(teamId,value){if(!(teamId in this.state.scores)||!Number.isFinite(value)||value<0)throw new Error('Geçersiz skor.');this.state.scores[teamId]=Math.min(999999,Math.floor(value));this.change();}
  audio(settings){this.state.audioSettings={...this.state.audioSettings,...settings,volume:Math.min(1,Math.max(0,Number(settings.volume??this.state.audioSettings.volume)||0))};this.change();}
}
