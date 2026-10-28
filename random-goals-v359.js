/* Outcome selection is saved through the authenticated match API. */
(()=>{'use strict';
 const body=document.querySelector('#adminOverlay .adminBody');if(!body)return;
 const section=document.createElement('section');section.id='randomGoalSettings';section.className='adminSection';
 const title=document.createElement('div');title.className='adminSectionTitle';title.textContent='GOL ŞEKLİ';
 const label=document.createElement('label');label.textContent='Şut sonucu: ';
 const select=document.createElement('select');select.id='shotOutcomeMode';select.style.cssText='display:block;width:100%;margin:8px 0 12px;background:#102039;color:#fff;border:1px solid #627a98;border-radius:8px;padding:10px;font:inherit';
 for(const [value,text] of [['keeper','Kaleci gücüne göre'],['random','Rastgele']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}label.append(select);
 const help=document.createElement('p');help.className='giftToggleHelp';help.textContent='Rastgele modda her şut bağımsız belirlenir. Peş peşe goller veya kurtarışlar olabilir; her oyuncunun şansı aynıdır. Sabit gol sırası veya zorunlu gol kotası yoktur. Kaleci gücü bu modda sonucu belirlemez. Seçim hemen kaydedilir; başlamış veya hazırlanmış şutun sonucu değişmez.';
 const status=document.createElement('p');status.className='giftToggleHelp';status.setAttribute('role','status');
 section.append(title,label,help,status);body.prepend(section);
 let busy=false;
 function render(){const api=window.AIFootballTikTok;if(!api?.getShotOutcomeMode||busy)return;select.value=api.getShotOutcomeMode();}
 select.addEventListener('change',async()=>{const value=select.value;busy=true;select.disabled=true;try{const api=window.AIFootballTikTok;if(!api||!await api.setShotOutcomeMode(value))throw Error('Kaydedilemedi. Yönetici oturumunu ve bağlantıyı kontrol et.');status.textContent=value==='random'?'Rastgele gol şekli kaydedildi. Tüm oyuncular aynı şansa sahip.':'Kaleci gücüne göre gol şekli kaydedildi.';}catch(e){status.textContent=e.message||'Kaydedilemedi.';}finally{busy=false;select.disabled=false;render();}});
 setInterval(render,1500);render();
})();
