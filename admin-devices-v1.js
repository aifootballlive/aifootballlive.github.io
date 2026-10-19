(()=>{'use strict';
const db=window.supabase.createClient('https://xozzbaguihyhruloiqjm.supabase.co','sb_publishable_Oftm7DRbr0Vdt9gTLFGAaw_LQq4PCnP'),OWNER='6893f884-6b91-4224-abaa-43f87df0966f',$=id=>document.getElementById(id);let busy=false;
async function rpc(name,args){const {data,error}=await db.rpc(name,args);if(error)throw Error(error.message||'İşlem tamamlanamadı');return data;}
function render(s){
 if(!s||typeof s.enabled!=='boolean'||typeof s.approved!=='boolean')throw Error('Sunucu güvenlik durumu doğrulanamadı');
 $('controls').hidden=false;$('bootstrap').hidden=s.enabled;$('request').hidden=!s.enabled||s.approved||s.current?.revoked===true;$('done').hidden=s.enabled&&!s.approved;
 $('pairing').hidden=!s.enabled||s.approved||!s.current;$('code').textContent=s.code||'';
 $('message').textContent=!s.enabled?'Kısıtlama henüz açık değil. Önce kendi PC’ni aşağıdaki düğmeyle onayla.':s.approved?'Bu tarayıcı onaylı. Diğer cihazın isteğini yalnız kodunu karşılaştırdıktan sonra onayla.':s.current?.revoked?'Bu oturumun onayı kaldırılmış. Yeniden giriş yapıp diğer onaylı cihazdan izin iste.':'Bu tarayıcı yönetim için kilitli. İstek gönderip PC’den onayla.';
 $('devices').replaceChildren();
 for(const d of s.devices||[]){const card=document.createElement('article'),title=document.createElement('strong'),info=document.createElement('p');title.textContent=d.label;info.textContent=d.approved?(d.current?'Onaylı • bu tarayıcı':'Onaylı'):'Onay bekliyor • '+d.code;card.append(title,info);
 if(!d.current){const button=document.createElement('button');button.textContent=d.approved?'Bu cihazın onayını kaldır':'Bu cihazı onayla';button.onclick=()=>act(async()=>{if(!confirm(d.approved?'Bu cihaz yönetim erişimini kaybedecek. Onayı kaldır?':'Diğer cihazda görünen kod '+d.code+' ile aynı mı? Bu tarayıcıya yönetim erişimi verilecek.'))return;render(await rpc(d.approved?'admin_device_revoke':'admin_device_approve',{target_session:d.id}));});card.append(button);} $('devices').append(card);
 }
}
async function act(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){$('message').textContent='İşlem tamamlanamadı: '+e.message;}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}}
const label=()=>{const text=$('deviceLabel').value.trim();if(!text||text.length>40)throw Error('Bu tarayıcı için bir ad yaz.');return text;};
$('bootstrap').onclick=()=>act(async()=>{const name=label();if(!confirm('Bu tarayıcı ilk onaylı cihaz olacak. Diğer tüm tarayıcıların yönetim erişimi kilitlenecek. Kendi PC’ndesin ve devam etmek istiyor musun?'))return;render(await rpc('admin_device_bootstrap',{device_label:name}));});
$('request').onclick=()=>act(async()=>render(await rpc('admin_device_request',{device_label:label()})));
$('refresh').onclick=()=>act(async()=>render(await rpc('admin_device_status')));
act(async()=>{const {data,error}=await db.auth.getUser();if(error||data?.user?.id!==OWNER)throw Error('Yönetici girişi gerekli');const m=await db.auth.mfa.getAuthenticatorAssuranceLevel();if(m.error||m.data?.currentLevel!=='aal2')throw Error('İki aşamalı doğrulama gerekli');render(await rpc('admin_device_status'));}).then(()=>{if($('controls').hidden)$('login').hidden=false;});
})();
