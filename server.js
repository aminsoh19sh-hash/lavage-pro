require('dotenv').config();
const express=require('express'),fs=require('fs'),path=require('path'),bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken'),cors=require('cors'),crypto=require('crypto');
const E=process.env,SECRET=E.JWT_SECRET||'dev',app=express();
app.use(cors(),express.json(),express.static(path.join(__dirname,'public')));
const F=path.join(__dirname,'data/db.json'),load=()=>JSON.parse(fs.readFileSync(F,'utf8')),save=d=>fs.writeFileSync(F,JSON.stringify(d,null,2));
const uid=()=>crypto.randomUUID(),err=(r,c,m)=>r.status(c).json({error:m}),now=()=>new Date().toISOString();
const auth=(q,r,n)=>{try{q.shop=jwt.verify((q.headers.authorization||'').replace('Bearer ',''),SECRET).shop;n()}catch{err(r,401,'سجّل الدخول أولا')}};
const pick=(b,k)=>Object.fromEntries(k.filter(x=>x in b).map(x=>[x,b[x]]));
const pubShop=s=>({id:s.id,name:s.name,city:s.city,phone:s.phone,features:s.features,email:s.email,address:s.address||'',hours:s.hours||'',description:s.description||''});
const token=s=>jwt.sign({shop:s.id},SECRET,{expiresIn:'60d'});

// ===== حساب صاحب المحل =====
app.post('/api/auth/register',(q,r)=>{
  const {name,city,phone,email,password}=q.body,d=load();
  if(!name||!city||!/^\S+@\S+\.\S+$/.test(email||'')||(password||'').length<6)return err(r,400,'أكمل اسم المحل والمدينة والايميل وكلمة مرور من 6 أحرف');
  if(d.shops.find(s=>s.email===email.toLowerCase()))return err(r,409,'هذا الايميل مسجل من قبل');
  const s={id:uid(),name,city,phone:phone||'',email:email.toLowerCase(),features:['حجز مسبق','عمال محترفون'],hash:bcrypt.hashSync(password,10),created:now()};
  d.shops.push(s);
  [['غسيل خارجي','غسيل','سيارة',40],['غسيل شامل','غسيل','سيارة',90],['تنظيف داخلي عميق','تنظيف داخلي','سيارة',220],['تغيير الزيت','تغيير الزيت','الكل',150],['غسيل دراجة نارية','غسيل','دراجة نارية',30]]
    .forEach(([n,c,v,p])=>d.services.push({id:uid(),shopId:s.id,name:n,category:c,vehicle:v,price:p}));
  save(d);r.json({token:token(s),shop:pubShop(s)});
});
app.post('/api/auth/login',(q,r)=>{
  const s=load().shops.find(x=>x.email===(q.body.email||'').toLowerCase());
  if(!s||!bcrypt.compareSync(q.body.password||'',s.hash))return err(r,401,'الايميل أو كلمة المرور غير صحيحة');
  r.json({token:token(s),shop:pubShop(s)});
});
app.get('/api/me',auth,(q,r)=>{const s=load().shops.find(x=>x.id===q.shop);s?r.json(pubShop(s)):err(r,404,'غير موجود')});
app.put('/api/me',auth,(q,r)=>{const d=load(),s=d.shops.find(x=>x.id===q.shop);Object.assign(s,pick(q.body,['name','city','phone','features','address','hours','description']));save(d);r.json(pubShop(s))});

// ===== CRUD لصاحب المحل: الخدمات / الزبائن / المواعيد (كل محل يرى بياناته فقط) =====
const FIELDS={services:['name','category','vehicle','price'],customers:['name','phone','vehicle','plate'],
  appointments:['customerName','phone','vehicle','serviceName','price','date','time','status','notes']};
for(const n in FIELDS){
  app.get(`/api/${n}`,auth,(q,r)=>r.json(load()[n].filter(x=>x.shopId===q.shop)));
  app.post(`/api/${n}`,auth,(q,r)=>{const d=load(),o={id:uid(),shopId:q.shop,created:now(),...(n==='appointments'&&{status:'pending',source:'owner'}),...pick(q.body,FIELDS[n])};if(n!=='services'&&!o.vehicle)o.vehicle='سيارة';d[n].push(o);save(d);r.json(o)});
  app.put(`/api/${n}/:id`,auth,(q,r)=>{const d=load(),o=d[n].find(x=>x.id===q.params.id&&x.shopId===q.shop);if(!o)return err(r,404,'غير موجود');Object.assign(o,pick(q.body,FIELDS[n]));save(d);r.json(o)});
  app.delete(`/api/${n}/:id`,auth,(q,r)=>{const d=load();d[n]=d[n].filter(x=>!(x.id===q.params.id&&x.shopId===q.shop));save(d);r.json({ok:true})});
}

// ===== واجهة الزبون (بدون ايميل: يُعرَّف الجهاز برمز deviceId) =====
app.get('/api/shops',(q,r)=>{const d=load();r.json(d.shops.map(s=>({...pubShop(s),email:undefined,services:d.services.filter(x=>x.shopId===s.id).length})))});
app.get('/api/shops/:id/services',(q,r)=>r.json(load().services.filter(x=>x.shopId===q.params.id)));
app.post('/api/public/appointments',(q,r)=>{
  const d=load(),b=q.body,s=d.services.find(x=>x.id===b.serviceId&&x.shopId===b.shopId);
  if(!s||!b.deviceId||!b.name||!b.phone||!b.date||!b.time)return err(r,400,'أكمل بيانات الحجز');
  if(!d.customers.find(x=>x.shopId===b.shopId&&x.phone===b.phone))d.customers.push({id:uid(),shopId:b.shopId,name:b.name,phone:b.phone,vehicle:b.vehicle,plate:'',created:now()});
  const o={id:uid(),shopId:b.shopId,deviceId:b.deviceId,customerName:b.name,phone:b.phone,vehicle:b.vehicle,serviceName:s.name,price:s.price,date:b.date,time:b.time,notes:b.notes||'',status:'pending',source:'app',created:now()};
  d.appointments.push(o);save(d);r.json(o);
});
app.get('/api/public/appointments',(q,r)=>{const d=load();r.json(d.appointments.filter(x=>x.deviceId&&x.deviceId===q.query.deviceId).map(x=>({...x,shopName:(d.shops.find(s=>s.id===x.shopId)||{}).name})))});
app.put('/api/public/appointments/:id',(q,r)=>{
  const d=load(),o=d.appointments.find(x=>x.id===q.params.id&&x.deviceId===q.body.deviceId);
  if(!o)return err(r,404,'الموعد غير موجود');if(o.status==='done')return err(r,400,'لا يمكن تعديل موعد منتهي');
  Object.assign(o,{customerName:q.body.name||o.customerName},pick(q.body,['phone','vehicle','date','time','notes']),{status:'pending'});save(d);r.json(o);
});
app.delete('/api/public/appointments/:id',(q,r)=>{const d=load();d.appointments=d.appointments.filter(x=>!(x.id===q.params.id&&x.deviceId===q.query.deviceId));save(d);r.json({ok:true})});

app.listen(E.PORT||3000,()=>console.log(`🚗 لافاش برو يعمل على http://localhost:${E.PORT||3000}`));
