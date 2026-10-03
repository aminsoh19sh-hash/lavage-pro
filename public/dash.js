const $=s=>document.querySelector(s);if(!localStorage.tok)location='index.html';
const api=async(p,m='GET',b)=>{const r=await fetch('/api'+p,{method:m,headers:{'Content-Type':'application/json',Authorization:'Bearer '+localStorage.tok},body:b&&JSON.stringify(b)});
 const d=await r.json();if(r.status===401){localStorage.removeItem('tok');location='index.html'}if(!r.ok)throw Error(d.error||'خطأ');return d};
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)};
const m=a=>Object.fromEntries(a.map(x=>[x,x]));
const V=['سيارة','دراجة نارية','شاحنة','حافلة'],C=['غسيل','تنظيف داخلي','تلميع','ميكانيك','تغيير الزيت','أخرى'];
const VI={'سيارة':'🚗','دراجة نارية':'🏍️','شاحنة':'🚚','حافلة':'🚌'};
const ST={pending:'بانتظار التأكيد',confirmed:'مؤكد',done:'منتهي',cancelled:'ملغي'};
// تعريف التبويبات: الأعمدة، حقول النموذج، عنوان الفلترة
const T={
 appointments:{t:'📅 المواعيد',add:'＋ موعد جديد',fk:'status',fv:ST,fk2:'vehicle',fv2:m(V),
  cols:[['customerName','الزبون'],['phone','الهاتف'],['vehicle','المركبة'],['serviceName','الخدمة'],['price','السعر'],['date','التاريخ'],['time','الوقت'],['status','الحالة']],
  f:[['customerName','اسم الزبون'],['phone','الهاتف','tel'],['vehicle','نوع المركبة','sel',m(V)],['serviceName','الخدمة','svc'],['price','السعر (درهم)','number'],['date','التاريخ','date'],['time','الوقت','time'],['status','الحالة','sel',ST],['notes','ملاحظات']]},
 customers:{t:'👥 الزبائن',add:'＋ زبون جديد',fk:'vehicle',fv:m(V),
  cols:[['name','الاسم'],['phone','الهاتف'],['vehicle','المركبة'],['plate','اللوحة']],
  f:[['name','الاسم'],['phone','الهاتف','tel'],['vehicle','نوع المركبة','sel',m(V)],['plate','رقم اللوحة']]},
 services:{t:'🧾 الخدمات',add:'＋ خدمة جديدة',fk:'category',fv:m(C),
  cols:[['name','الخدمة'],['category','الصنف'],['vehicle','المركبة'],['price','السعر']],
  f:[['name','اسم الخدمة'],['category','الصنف','sel',m(C)],['vehicle','نوع المركبة','sel',{الكل:'الكل',...m(V)}],['price','السعر (درهم)','number']]}};
let D={appointments:[],customers:[],services:[]},tab='appointments',flt='',flt2='',edit=null,shop={};

async function load(){[D.appointments,D.customers,D.services]=await Promise.all(['appointments','customers','services'].map(n=>api('/'+n)));stats();view()}
function stats(){
 const rev=D.appointments.filter(a=>a.status==='done').reduce((s,a)=>s+(+a.price||0),0),pend=D.appointments.filter(a=>a.status==='pending').length;
 $('#stats').innerHTML=[['💰 الايرادات',rev.toLocaleString('ar-MA')+' درهم','من المواعيد المنتهية'],['📅 المواعيد',D.appointments.length,pend+' بانتظار التأكيد'],['👥 الزبائن',D.customers.length,'مسجلون'],['🧾 أنواع الخدمات',D.services.length,new Set(D.services.map(s=>s.category)).size+' أصناف']]
  .map(([a,b,c])=>`<div class="stat"><span>${a}</span><b>${b}</b><small>${c}</small></div>`).join('')}
function view(){
 const c=T[tab];$('#add').textContent=c.add;
 $('#tabs').innerHTML=Object.keys(T).map(k=>`<button data-k="${k}" class="${k===tab?'on':''}">${T[k].t} (${D[k].length})</button>`).join('');
 $('#chips').innerHTML=`<button class="chip ${flt?'':'on'}" data-v="">الكل</button>`+Object.entries(c.fv).map(([k,l])=>`<button class="chip ${flt===k?'on':''}" data-v="${k}">${l}</button>`).join('');
 $('#chips2').innerHTML=c.fk2?`<button class="chip ${flt2?'':'on'}" data-w="">كل المركبات</button>`+Object.entries(c.fv2).map(([k,l])=>`<button class="chip ${flt2===k?'on':''}" data-w="${k}">${VI[k]||''} ${l}</button>`).join(''):'';
 const q=$('#q').value.trim().toLowerCase(),rows=D[tab].filter(r=>(!flt||r[c.fk]===flt)&&(!flt2||r[c.fk2]===flt2)&&(!q||JSON.stringify(Object.values(r)).toLowerCase().includes(q)));
 $('#tbl').innerHTML=rows.length?`<table><tr>${c.cols.map(x=>`<th>${x[1]}</th>`).join('')}<th>إجراءات</th></tr>${rows.map(r=>`<tr>${c.cols.map(([k])=>`<td>${k==='status'?`<span class="tag ${r[k]}">${ST[r[k]]||r[k]}</span>`:k==='price'?r[k]+' د':k==='vehicle'?`<span class="tag">${VI[r[k]]||'🚘'} ${r[k]||'—'}</span>`:r[k]||'—'}</td>`).join('')}<td>${acts(r)}</td></tr>`).join('')}</table>`:'<div class="empty">لا توجد نتائج. أضف عنصرا جديدا بالزر أعلاه.</div>'}
const acts=r=>(tab==='appointments'?`${r.status==='pending'||r.status==='cancelled'?`<button class="btn sm" data-a="confirmed" data-id="${r.id}">✔ تأكيد</button>`:''}${r.status==='confirmed'?`<button class="btn sm ghost" data-a="done" data-id="${r.id}">✓ تم</button>`:''}${r.status!=='cancelled'&&r.status!=='done'?`<button class="btn sm red" data-a="cancelled" data-id="${r.id}">✖ إلغاء</button>`:''}`:'')+`<button class="btn sm ghost" data-e="${r.id}">✎ تعديل</button><button class="btn sm red" data-d="${r.id}">🗑 حذف</button>`;

document.addEventListener('click',async e=>{const d=e.target.dataset;try{
 if(d.k){tab=d.k;flt='';flt2='';$('#q').value='';view()}
 if('v' in d){flt=d.v;view()}
 if('w' in d){flt2=d.w;view()}
 if(d.a){await api(`/appointments/${d.id}`,'PUT',{status:d.a});toast('تم تحديث الموعد');load()}
 if(d.e)openForm(D[tab].find(x=>x.id===d.e));
 if(d.d&&confirm('هل تريد حذف هذا العنصر نهائيا؟')){await api(`/${tab}/${d.d}`,'DELETE');toast('تم الحذف');load()}
}catch(x){toast(x.message)}});
$('#q').oninput=view;$('#add').onclick=()=>openForm(null);$('#cl').onclick=()=>$('#dlg').close();
function openForm(r){
 edit=r;const c=T[tab];$('#fT').textContent=(r?'تعديل ':'إضافة ')+c.t.slice(2);
 $('#fields').innerHTML=c.f.map(([k,l,t,o])=>{const v=r?r[k]??'':(k==='status'?'confirmed':k==='date'?new Date().toISOString().slice(0,10):'');
  const opts=t==='svc'?m(D.services.map(s=>s.name)):o;
  return `<label>${l}${t==='sel'||t==='svc'?`<select name="${k}">${t==='svc'?'<option value="">— اختر —</option>':''}${Object.entries(opts).map(([a,b])=>`<option value="${a}" ${a===v?'selected':''}>${b}</option>`).join('')}</select>`:`<input name="${k}" type="${t||'text'}" value="${v}">`}</label>`}).join('');
 const s=$('[name=serviceName]');if(s)s.onchange=()=>{const x=D.services.find(v=>v.name===s.value);if(x){$('[name=price]').value=x.price;const vv=$('[name=vehicle]');if(vv&&x.vehicle!=='الكل')vv.value=x.vehicle}};
 $('#dlg').showModal()}
$('#f').onsubmit=async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.target));
 try{edit?await api(`/${tab}/${edit.id}`,'PUT',b):await api('/'+tab,'POST',b);$('#dlg').close();toast('تم الحفظ ✔');load()}catch(x){toast(x.message)}};
$('#out').onclick=()=>{localStorage.removeItem('tok');location='index.html'};
(async()=>{shop=await api('/me');$('#shopName').textContent=shop.name+' · '+shop.city;load();setInterval(load,20000)})();
