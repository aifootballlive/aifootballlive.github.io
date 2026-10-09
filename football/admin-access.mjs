const gate=document.getElementById('adminGate'),panel=document.getElementById('adminPanel'),status=document.getElementById('accessStatus');
const request=async(path,body)=>{const response=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});if(!response.ok){let message='Yönetici sunucusu bulunamadı.';try{message=(await response.json()).message||message;}catch{}throw new Error(message);}return response.json();};
async function enter(){
  const session=await request('/api/admin/session');
  if(!session.authorized)return false;
  gate.hidden=true;panel.hidden=false;
  document.getElementById('ownerAccount').textContent=session.owner||'Yönetici';
  document.getElementById('deviceControls').hidden=session.device!=='pc';
  if(!window.adminLoaded){window.adminLoaded=true;await import('./admin.mjs?v=24');}
  return true;
}
document.getElementById('pairPhone').onclick=async()=>{try{const result=await request('/api/admin/pair',{});document.getElementById('pairDetails').textContent=`Kod: ${result.code} · 10 dakika geçerli. Telefonda aynı Wi-Fi üzerinden ${result.phoneUrl} adresini açın.`;}catch(error){document.getElementById('pairDetails').textContent=error.message;}};
document.getElementById('revokePhone').onclick=async()=>{try{await request('/api/admin/revoke-phone',{});document.getElementById('pairDetails').textContent='Telefon erişimi kaldırıldı. Yeni telefon eşleştirebilirsiniz.';}catch(error){document.getElementById('pairDetails').textContent=error.message;}};
document.getElementById('pairForm').onsubmit=async event=>{event.preventDefault();try{await request('/api/admin/redeem',{code:document.getElementById('pairCode').value});await enter();}catch(error){status.textContent=error.message;}};
try{if(!await enter()){
  if(['localhost','127.0.0.1','[::1]'].includes(location.hostname)){await request('/api/admin/bootstrap',{});await enter();}
  else status.textContent='Bilgisayarda oluşturduğunuz eşleştirme kodunu girin.';
}}catch(error){status.textContent=location.hostname.endsWith('github.io')?'Özel yönetim bu herkese açık adreste çalışmaz. Bilgisayarınızda yayın sunucusunu başlatın, ardından http://127.0.0.1:8890/admin/ adresini açın.':error.message;document.getElementById('pairForm').hidden=location.hostname.endsWith('github.io');}
