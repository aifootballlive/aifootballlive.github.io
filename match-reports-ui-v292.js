/* Read-only admin report view. Changing the optional conversion rate never changes game data. */
(()=>{'use strict';
 const overlay=document.getElementById('adminOverlay'),body=overlay?.querySelector('.adminBody');if(!body)return;
 const node=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
 const section=node('section',undefined,'adminSection');section.id='matchReportsSettings';section.append(node('h3','MAÇ İSTATİSTİKLERİ'));
 const note=node('p','Her maç ayrı kaydedilir. Çekilen şutlar ve gelen Hediyeler farklı sayaçlardır. Tarih ve saat Türkiye saatidir. Eski maçların tutulmamış şut/hediye verileri “—” görünür. Telefonda diğer sütunlar için tabloyu yana kaydır.','giftToggleHelp');
 const select=node('select');select.id='matchReportSelect';select.setAttribute('aria-label','İstatistikleri gösterilecek maç');
 const rateLabel=node('label','İsteğe bağlı: 1 jetonun TL karşılığı '),rate=node('input');rate.type='number';rate.id='matchReportCoinRate';rate.min='0';rate.max='100000';rate.step='0.0001';rate.placeholder='Oran gir';rateLabel.append(rate);
 try{rate.value=localStorage.getItem('afl.reportCoinRate.v292')||'';}catch{}
 const moneyNote=node('p','TL sütunu yalnızca senin girdiğin oranla hesaplanır; TikTok’tan alacağın net kazanç değildir. Oran girmezsen toplam jeton gösterilir.','giftToggleHelp');
 const detail=node('p');detail.id='matchReportDetails';const scroller=node('div');scroller.className='matchReportScroll';const table=node('table');table.id='matchReportTable';table.setAttribute('aria-label','Takım bazında maç istatistikleri');scroller.append(table);
 const status=node('p',undefined,'giftToggleHelp');status.id='matchReportStatus';section.append(note,select,detail,rateLabel,moneyNote,scroller,status);
 const anchor=document.getElementById('likeBonusSettings');if(anchor)anchor.after(section);else body.append(section);
 const style=node('style');style.textContent='#matchReportsSettings select{width:100%;margin:8px 0;background:#102039;color:#fff;border:1px solid #627a98;border-radius:8px;padding:10px;font:inherit}#matchReportsSettings input{width:140px;max-width:100%;background:#102039;color:#fff;border:1px solid #627a98;border-radius:8px;padding:9px;font:inherit}#matchReportsSettings .matchReportScroll{overflow-x:auto;max-width:100%}#matchReportTable{border-collapse:collapse;min-width:650px;width:100%;font-size:14px}#matchReportTable th,#matchReportTable td{padding:10px 8px;border:1px solid #46546f;text-align:right;white-space:nowrap}#matchReportTable th:first-child,#matchReportTable td:first-child{text-align:left}#matchReportTable th{background:#203752}#matchReportTable tfoot{font-weight:bold;background:#203752}';document.head.append(style);
 const names={A:'Altın Pusula',B:'Kızıl Kıvılcım',C:'Gece Yıldızı',D:'Bordo Dalga'},teams=Object.keys(names),fmt=n=>n===null||n===undefined?'—':Number(n).toLocaleString('tr-TR'),date=n=>n?new Date(n).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'Kayıt yok';
 let selected='',signature='',displaySignature='';
 function refresh(){
  if(!overlay.classList.contains('show'))return;
  const data=window.AIFootballTikTok?.getMatchReports?.();if(!data){select.disabled=true;table.replaceChildren();detail.textContent='İstatistikler için yetkili yönetici oturumu gerekli.';return;}select.disabled=false;
  const options=data.records.map(r=>({id:r.id,label:r.season+'. Sezon · '+(r.final?'Final':r.matchNumber+'/'+r.plannedRounds+' Maç')+' · '+date(r.startedAt||r.endedAt)+(r.status==='playing'?' · Devam ediyor':'')}));
  options.push({id:'pending',label:'Henüz başlamayan maç için gelen Hediyeler'});
  const next=JSON.stringify(options);if(signature!==next){const previous=select.value||selected;select.replaceChildren(...options.map(o=>{const n=node('option',o.label);n.value=o.id;return n;}));select.value=options.some(o=>o.id===previous)?previous:options[0].id;selected=select.value;signature=next;}
  const pending=select.value==='pending',r=pending?{teams:data.pending}:data.records.find(x=>x.id===select.value);if(!r)return;
  const nRate=rate.value.trim()===''?null:Number(rate.value),conversion=nRate!==null&&Number.isFinite(nRate)&&nRate>=0&&nRate<=100000?nRate:null;
  const nextDisplay=JSON.stringify([r,conversion]);if(nextDisplay===displaySignature)return;displaySignature=nextDisplay;
  detail.textContent=pending?'Maç başlayınca bu Hediyeler o maçın kaydına aktarılır.':('Başlangıç: '+date(r.startedAt)+' · Bitiş: '+(r.status==='playing'?'Devam ediyor':date(r.endedAt))+' · '+(r.status==='interrupted'?'Yarıda kesildi':r.status==='legacy'?'Eski kayıt':r.status==='finished'?'Tamamlandı':'Canlı'));
  table.replaceChildren();const head=node('thead'),header=node('tr');for(const text of ['Takım','Çekilen şut','Gol','10 jeton adet','100 jeton adet','Hediye adet','Toplam jeton','Tahmini TL'])header.append(node('th',text));head.append(header);const rows=node('tbody');
  function row(label,t){const tr=node('tr');tr.append(node('th',label));for(const key of ['shots','goals','gifts10','gifts100','gifts','coins'])tr.append(node('td',pending&&['shots','goals'].includes(key)?'—':fmt(t?.[key])));tr.append(node('td',conversion===null||t?.coins==null?'—':(t.coins*conversion).toLocaleString('tr-TR',{style:'currency',currency:'TRY'})));return tr;}
  for(const t of teams)rows.append(row(names[t],r.teams[t]));const totals={};for(const key of ['shots','goals','gifts10','gifts100','gifts','coins'])totals[key]=teams.some(t=>r.teams[t]?.[key]==null)?null:teams.reduce((n,t)=>n+(r.teams[t]?.[key]||0),0);const foot=node('tfoot');foot.append(row('TOPLAM',totals));table.append(head,rows,foot);
  const unknown=teams.reduce((n,t)=>n+(r.teams[t]?.unknown||0),0);status.textContent=r.status==='legacy'?'Bu eski maç için yalnızca gol ve bitiş zamanı kaydı mevcut.':(r.partial?'Kayıt bu maç başladıktan sonra açıldı; şut/hediye adetleri yalnızca takip edilen bölümü kapsar. ':'')+(unknown?unknown+' eski hediye bildiriminin fiyat/adet bilgisi eksik; jeton toplamına dahil edilmedi. ':'')+'Hediye adetleri, oyuna tanımlı 10 ve 100 jetonluk Hediyeleri kapsar.';
 }
 select.addEventListener('change',()=>{selected=select.value;displaySignature='';refresh();});rate.addEventListener('input',()=>{try{localStorage.setItem('afl.reportCoinRate.v292',rate.value);}catch{}displaySignature='';refresh();});
 new MutationObserver(()=>{displaySignature='';refresh();}).observe(overlay,{attributes:true,attributeFilter:['class']});setInterval(refresh,1500);refresh();
})();
