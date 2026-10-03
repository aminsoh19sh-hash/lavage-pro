const $=s=>document.querySelector(s);let reg=false;
function mode(r){reg=r;document.querySelectorAll('.reg').forEach(x=>x.style.display=r?'':'none');$('#dT').textContent=r?'تسجيل محل جديد':'دخول صاحب المحل';$('#go').textContent=r?'إنشاء الحساب':'دخول';$('#sw').textContent=r?'لدي حساب بالفعل':'ليس لدي حساب';$('#msg').textContent=''}
document.querySelectorAll('[data-auth]').forEach(b=>b.onclick=e=>{e.preventDefault();mode(b.dataset.auth==='reg');$('#dlg').showModal()});
$('#sw').onclick=()=>mode(!reg);$('#cl').onclick=()=>$('#dlg').close();
$('#af').onsubmit=async e=>{e.preventDefault();const v=i=>$(i).value;
 try{const r=await fetch('/api/auth/'+(reg?'register':'login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:v('#sn'),city:v('#sc'),phone:v('#sp'),email:v('#se'),password:v('#pw')})});
  const d=await r.json();if(!r.ok)throw Error(d.error);localStorage.tok=d.token;location='dashboard.html'}catch(x){$('#msg').textContent=x.message}};
mode(false);
