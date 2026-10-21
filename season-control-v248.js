/* Explicit administrator season/match actions; preparing a selection never starts play. */
(()=>{'use strict';const settings=document.querySelector('#adminOverlay .adminBody');if(!settings)return;
const panel=document.createElement('section');panel.id='seasonResetSettings';panel.className='adminSection';panel.innerHTML=`
<h3>AKTİF SEZON VE MAÇ</h3>
<p id="matchSelectCurrent">Maç bilgisi bekleniyor…</p>
<div class="adminGrid"><label>Sezon<input id="matchSelectSeason" type="number" min="1" max="999999" step="1" value="1"></label><label>Oynanacak maç<input id="matchSelectNumber" type="number" min="1" max="9999" step="1" value="1"></label></div>
<p>Sezon ve maç numarasını seçip hazırla. Maç kendiliğinden başlamaz. Daha önce oynanmış bir maç tekrar tamamlanırsa eski sonucu değişir; puanlar iki kez eklenmez. Bekleyen şutlar korunur.</p>
<button id="matchSelectSubmit" type="button" class="adminBtn" disabled>SEÇİLEN MAÇI HAZIRLA</button>
<p>Maç açıksa bu düğme önce mevcut maçı o anki skoruyla kaydeder, sonra seçimini hazırlar. Yeni maç için Başlat düğmesine basmalısın.</p>
<div id="matchSelectStatus" role="status" aria-live="polite"></div>
<hr><h3>SEZONU SIFIRLA</h3>
<p id="seasonResetCurrent">Lig bilgisi bekleniyor…</p>
<div class="adminGrid">
<label>Lig<select id="seasonResetLeague" aria-label="Sıfırlanacak lig"></select></label>
<label>Başlangıç sezonu<input id="seasonResetNumber" type="number" min="1" max="999999" step="1" value="1"></label>
</div>
<p>Seçilen lig bu sezon numarasıyla 0 maç, 0 gol ve 0 puandan hazırlanır. İlk maçı sen başlatırsın. Şu anda yalnız aktif lig seçilebilir.</p>
<label class="seasonResetCheck"><input id="seasonResetClearShots" type="checkbox">Bekleyen şutları da sil</label>
<label class="seasonResetCheck"><input id="seasonResetClearHistory" type="checkbox">Bu ligin geçmiş sezonlarını ve kupalarını da temizle</label>
<p>İşaretlemezsen bekleyen şutlar, geçmiş sezonlar ve kupalar korunur. Canlı yayına tamamen sıfırdan başlamak için sezonu 1 seçip iki kutuyu da işaretleyebilirsin.</p>
<button id="seasonResetSubmit" type="button" disabled class="adminBtn resetBtn">SEZONU SIFIRLA</button>
<div id="seasonResetStatus" role="status" aria-live="polite"></div>
<p>20 maç sonunda şut kalırsa aynı sezonda puanlı ek maç açılır. Sonuç ekranında gelen hediyeler de bu sezonda oynanır. Her maç kendi süre sınırında biter. Kuyruk boşaldığında, gerekiyorsa final oynanıp şampiyon belirlenir ve otomatik devam durur. Ek maçların kendiliğinden başlaması için otomatik devam açık olmalı.</p>`;
const anchor=document.getElementById('broadcastTextSettings');anchor?anchor.after(panel):settings.append(panel);
const style=document.createElement('style');style.textContent='#matchSelectSubmit{width:100%;min-height:44px;padding:12px;border-radius:8px;background:#167c65;color:#fff;border:1px solid #64c7ae;font:800 16px/1.3 system-ui;cursor:pointer}#matchSelectSubmit:disabled{background:#28394d;color:#aab8cb;opacity:.7;cursor:default}#matchSelectStatus{margin-top:10px;color:#92e2bd}#seasonResetSettings label{display:flex;flex-direction:column;gap:8px}#seasonResetSettings input[type=number],#seasonResetSettings select{width:100%;min-width:0;background:#102039;color:#fff;border:1px solid #627a98;border-radius:8px;padding:10px;font:inherit}#seasonResetSettings .seasonResetCheck{display:flex;flex-direction:row;align-items:center;gap:10px;margin:12px 0}#seasonResetSettings input[type=checkbox]{flex:0 0 auto;width:22px;height:22px;accent-color:#31b99c}#seasonResetSubmit{width:100%;background:#98394c;color:#fff;border:1px solid #d77885;border-radius:8px;padding:12px;cursor:pointer;font:inherit;font-weight:800}#seasonResetSubmit:disabled{opacity:.6;cursor:default}#seasonResetStatus{margin-top:10px;color:#92e2bd}';document.head.append(style);
const id=s=>document.getElementById(s);let snapshot=null,busy=false,selectionBusy=false,selectionDirty=false;
function refresh(){if(busy)return;const next=window.AIFootballTikTok?.getSeasonControl?.();snapshot=next;id('seasonResetSubmit').disabled=!next||selectionBusy;id('matchSelectSubmit').disabled=!next||selectionBusy;id('matchSelectSubmit').textContent=selectionBusy?'HAZIRLANIYOR…':next?.running?'MAÇI DURDUR VE SEÇİLENİ HAZIRLA':'SEÇİLEN MAÇI HAZIRLA';id('matchSelectSeason').disabled=selectionBusy;id('matchSelectNumber').disabled=selectionBusy; if(next){id('matchSelectCurrent').textContent='Aktif arena: '+next.season+'. sezon • '+(next.matchNumber||1)+'. maç'+(next.running?' • Oynanıyor':' • Başlatılması bekleniyor');if(!selectionDirty){id('matchSelectSeason').value=next.season;id('matchSelectNumber').value=next.matchNumber||1;}}if(!next){id('seasonResetCurrent').textContent='Sezon bilgisi için yetkili yönetici oturumu gerekli.';return;}
 const selected=id('seasonResetLeague').value,signature=JSON.stringify(next.leagues);if(id('seasonResetLeague').dataset.options!==signature){id('seasonResetLeague').dataset.options=signature;id('seasonResetLeague').replaceChildren();for(const league of next.leagues){const option=document.createElement('option');option.value=league.id;option.textContent=league.name;id('seasonResetLeague').append(option);}if(next.leagues.some(l=>l.id===selected))id('seasonResetLeague').value=selected;}
 const pending=Object.values(next.pending||{}).reduce((sum,n)=>sum+Number(n||0),0);id('seasonResetCurrent').textContent='Mevcut sezon: '+next.season+' • Bekleyen şut: '+pending+(next.running?' • Önce aktif maçı durdur.':'');}
for(const field of ['matchSelectSeason','matchSelectNumber'])id(field).addEventListener('input',()=>{selectionDirty=true;});
id('matchSelectSubmit').addEventListener('click',async()=>{
 if(selectionBusy||busy)return;refresh();if(!snapshot)return;if(snapshot.practice){id('matchSelectStatus').textContent='Maç kategorisinden canlı yayın moduna geçip sezon seçebilirsin.';return;}
 const season=Number(id('matchSelectSeason').value),matchNumber=Number(id('matchSelectNumber').value);
 if(!Number.isSafeInteger(season)||season<1||season>999999||!Number.isSafeInteger(matchNumber)||matchNumber<1||matchNumber>9999){id('matchSelectStatus').textContent='Geçerli bir sezon ve maç numarası seç.';return;}
 const expected={expectedSeason:snapshot.season,resetToken:snapshot.resetToken,selectionToken:snapshot.selectionToken||'',clockToken:snapshot.clockToken,stopCurrent:!!snapshot.running};selectionBusy=true;refresh();id('matchSelectStatus').textContent=expected.stopCurrent?'Aktif maç kaydediliyor, seçilen maç hazırlanıyor…':'Maç hazırlanıyor…';
 try{const saved=await window.AIFootballTikTok.selectMatch({leagueId:'doruk',season,matchNumber,...expected});if(!saved)throw Error('Maç başlamış veya seçim başka cihazda değişmiş olabilir. Eski sonucu kaybolmuş maçlar güvenle değiştirilemez. Bilgileri kontrol et.');selectionDirty=false;id('matchSelectStatus').textContent=season+'. sezon • '+matchNumber+'. maç hazır. Başlat düğmesiyle oynatabilirsin.';}
 catch(error){id('matchSelectStatus').textContent=error?.message||'Maç hazırlanamadı.';}finally{selectionBusy=false;refresh();}
});
id('seasonResetSubmit').addEventListener('click',async()=>{if(busy||selectionBusy)return;refresh();if(!snapshot)return;
 const season=Number(id('seasonResetNumber').value);if(!Number.isSafeInteger(season)||season<1||season>999999){id('seasonResetStatus').textContent='1 ile 999999 arasında bir sezon numarası seç.';return;}
 if(snapshot.running){id('seasonResetStatus').textContent='Önce aktif maçı durdur veya bitmesini bekle. Sezon oynanırken sıfırlanmaz.';return;}
 const league=snapshot.leagues.find(l=>l.id===id('seasonResetLeague').value);if(!league)return;
 const clearPending=id('seasonResetClearShots').checked,clearHistory=id('seasonResetClearHistory').checked;
 if(!confirm(league.name+' — Sezon '+season+' sıfırdan hazırlansın mı?\nPuanlar, maçlar ve goller sıfırlanacak.\n'+(clearPending?'Bekleyen şutlar SİLİNECEK.':'Bekleyen şutlar korunacak.')+'\n'+(clearHistory?'Geçmiş sezonlar ve kupalar SİLİNECEK.':'Geçmiş sezonlar ve kupalar korunacak.')+'\nMaç kendiliğinden başlamayacak.'))return;
 busy=true;id('seasonResetSubmit').disabled=true;id('seasonResetStatus').textContent='Sezon hazırlanıyor…';
 try{const saved=await window.AIFootballTikTok.resetSeason({leagueId:league.id,season,clearPending,clearHistory,expectedSeason:snapshot.season,resetToken:snapshot.resetToken});if(!saved)throw Error('Sezon değişmiş, maç başlamış veya oturum yetkisi sona ermiş olabilir. Tekrar kontrol et.');id('seasonResetStatus').textContent='Sezon '+season+' sıfırdan hazır. '+(clearPending?'Eski bekleyen şutlar silindi.':'Bekleyen şutlar korundu.')+' İlk maç için Başlat düğmesine bas.';window.dispatchEvent(new Event('ai-football-season-reset'));}
 catch(error){id('seasonResetStatus').textContent=error?.message||'Sezon sıfırlanamadı. Bağlantıyı kontrol et.';}
 finally{busy=false;refresh();}
});
const update=()=>{if(!document.hidden&&document.getElementById('adminOverlay').classList.contains('show'))refresh();};
new MutationObserver(update).observe(document.getElementById('adminOverlay'),{attributes:true,attributeFilter:['class']});
setInterval(update,1000);update();
})();
