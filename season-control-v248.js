/* Admin season preparation. Only the explicit confirmed button writes shared state. */
(()=>{'use strict';const settings=document.querySelector('#adminOverlay .adminBody');if(!settings)return;
const panel=document.createElement('section');panel.id='seasonResetSettings';panel.className='adminSection';panel.innerHTML=`
<h3>SEZONU SIFIRLA</h3>
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
<p>Sezonun son maçı ve gerekiyorsa şampiyonluk finali tamamlanınca otomatik devam durur. Bekleyen ve arada gelen şutlar korunur; yeni sezonu Başlat ile açtığında kullanılmaya devam eder.</p>`;
const anchor=document.getElementById('broadcastTextSettings');anchor?anchor.after(panel):settings.append(panel);
const style=document.createElement('style');style.textContent='#seasonResetSettings label{display:flex;flex-direction:column;gap:8px}#seasonResetSettings input[type=number],#seasonResetSettings select{width:100%;min-width:0;background:#102039;color:#fff;border:1px solid #627a98;border-radius:8px;padding:10px;font:inherit}#seasonResetSettings .seasonResetCheck{display:flex;flex-direction:row;align-items:center;gap:10px;margin:12px 0}#seasonResetSettings input[type=checkbox]{flex:0 0 auto;width:22px;height:22px;accent-color:#31b99c}#seasonResetSubmit{width:100%;background:#98394c;color:#fff;border:1px solid #d77885;border-radius:8px;padding:12px;cursor:pointer;font:inherit;font-weight:800}#seasonResetSubmit:disabled{opacity:.6;cursor:default}#seasonResetStatus{margin-top:10px;color:#92e2bd}';document.head.append(style);
const id=s=>document.getElementById(s);let snapshot=null,busy=false;
function refresh(){if(busy)return;const next=window.AIFootballTikTok?.getSeasonControl?.();snapshot=next;id('seasonResetSubmit').disabled=!next;if(!next){id('seasonResetCurrent').textContent='Sezon bilgisi için yetkili yönetici oturumu gerekli.';return;}
 const selected=id('seasonResetLeague').value,signature=JSON.stringify(next.leagues);if(id('seasonResetLeague').dataset.options!==signature){id('seasonResetLeague').dataset.options=signature;id('seasonResetLeague').replaceChildren();for(const league of next.leagues){const option=document.createElement('option');option.value=league.id;option.textContent=league.name;id('seasonResetLeague').append(option);}if(next.leagues.some(l=>l.id===selected))id('seasonResetLeague').value=selected;}
 const pending=Object.values(next.pending||{}).reduce((sum,n)=>sum+Number(n||0),0);id('seasonResetCurrent').textContent='Mevcut sezon: '+next.season+' • Bekleyen şut: '+pending+(next.running?' • Önce aktif maçı durdur.':'');}
id('seasonResetSubmit').addEventListener('click',async()=>{if(busy)return;refresh();if(!snapshot)return;
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
