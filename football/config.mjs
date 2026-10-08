export const STORAGE_KEY = 'aifootball.live-demo.v1';
export const DEFAULT_CONFIG = {
  teams: [
    {id:'A', name:'Sarı-Lacivert', shortName:'SL', color:'#f5cc32', secondaryColor:'#152b59', model:'./assets/models/player-a.glb?v=5'},
    {id:'B', name:'Sarı-Kırmızı', shortName:'SK', color:'#e63240', secondaryColor:'#ffcc32', model:'./assets/models/player-a.glb?v=5'},
    {id:'C', name:'Yeşil-Beyaz', shortName:'YB', color:'#27845f', secondaryColor:'#f1f4ef', model:'./assets/models/player-a.glb?v=5'},
  ],
  giftMappings: [
    {giftId:'rose', name:'Rose', teamId:'A', shots:1, points:1},
    {giftId:'tiktok', name:'TikTok', teamId:'B', shots:1, points:1},
    {giftId:'finger-heart', name:'Finger Heart', teamId:'C', shots:1, points:1},
  ],
  audioSettings:{enabled:false, crowd:true, volume:0.45},
  gameSettings:{goalProbability:0.55, maxQueue:200, maxShotsPerGift:20},
  connection:{mode:'mock', bridgeUrl:''}
};
const copy = value => JSON.parse(JSON.stringify(value));
const number = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
export function validateConfig(input) {
  if (!input || !Array.isArray(input.teams) || !input.teams.length || input.teams.length > 6) throw new Error('1–6 takım ekleyin.');
  const ids = new Set();
  const teams = input.teams.map(t => {
    if (!/^[A-Za-z0-9_-]{1,24}$/.test(t.id) || ids.has(t.id)) throw new Error('Takım kimlikleri benzersiz olmalı.');
    ids.add(t.id);
    const model = String(t.model || '');
    if (model && (!/^\.\/assets\/models\/[\w./?=&%-]+\.glb(?:\?[^\s]*)?$/.test(model) || model.includes('..'))) throw new Error('Model assets/models içinde bir GLB olmalı.');
    return {id:t.id, name:String(t.name||t.id).slice(0,32), shortName:String(t.shortName||t.id).slice(0,8), color:/^#[0-9a-f]{6}$/i.test(t.color)?t.color:'#ffcc32', secondaryColor:/^#[0-9a-f]{6}$/i.test(t.secondaryColor)?t.secondaryColor:'#172344', model};
  });
  const gifts = new Set();
  const giftMappings = (input.giftMappings||[]).slice(0,50).map(g => {
    const giftId=String(g.giftId||'').trim().toLowerCase();
    if (!giftId || gifts.has(giftId) || !ids.has(g.teamId)) throw new Error('Hediye kimliği benzersiz olmalı ve bir takıma bağlanmalı.');
    gifts.add(giftId);
    return {giftId, name:String(g.name||giftId).slice(0,32), teamId:g.teamId, shots:Math.round(number(g.shots,1,20,1)), points:Math.round(number(g.points,1,100,1))};
  });
  return {teams, giftMappings, audioSettings:{enabled:!!input.audioSettings?.enabled,crowd:input.audioSettings?.crowd!==false,volume:number(input.audioSettings?.volume,0,1,.45)},gameSettings:{goalProbability:number(input.gameSettings?.goalProbability,0,1,.55),maxQueue:200,maxShotsPerGift:20},connection:{mode:input.connection?.mode==='tiktok'?'tiktok':'mock',bridgeUrl:String(input.connection?.bridgeUrl||'').slice(0,500)}};
}
export function initialState(config = DEFAULT_CONFIG) {
  const cfg=validateConfig(copy(config));
  return {...cfg, players:cfg.teams.map(t=>({teamId:t.id,model:t.model})),scores:Object.fromEntries(cfg.teams.map(t=>[t.id,0])),eventQueue:[],connectionStatus:'disconnected',animationState:null,eventLog:[],recentEvents:[],revision:0,lastResult:null};
}
export function loadState(storage=globalThis.localStorage) {
  try {const saved=JSON.parse(storage.getItem(STORAGE_KEY));const state=initialState(saved);for(const t of state.teams)state.scores[t.id]=Math.floor(number(saved.scores?.[t.id],0,999999,0));return state;} catch {return initialState();}
}
export function persistState(state, storage=globalThis.localStorage) {
  try {storage.setItem(STORAGE_KEY,JSON.stringify({...state,eventQueue:[],animationState:null,eventLog:[],recentEvents:[],connectionStatus:'disconnected'}));} catch {}
}
