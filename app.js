/* =========================
   POESIA GARDEN CAFE v1.0.0
   Masa / adisyon, mutfak & bar ekranı, paket servis, rezervasyon, menü,
   kasa & gün sonu (Z), raporlar, personel ve QR menü.
   Veriler cihazda (localStorage) tutulur; internet gerekmez.
   ========================= */
'use strict';
const APP_VERSION='1.0.0',KEY='poesia-garden-cafe';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{const n=parseFloat(String(v??'').replace(',','.'));return Number.isFinite(n)?n:0};
const r2=n=>Math.round((num(n)+Number.EPSILON)*100)/100;
const sum=a=>a.reduce((x,y)=>x+num(y),0);
const money=n=>'₺'+r2(n).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
const pad=n=>String(n).padStart(2,'0');
const nowISO=()=>new Date().toISOString();
const dayKey=(d=new Date())=>{d=new Date(d);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const timeStr=d=>new Date(d).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
const dateStr=d=>new Date(d).toLocaleDateString('tr-TR');
const minsSince=d=>Math.max(0,Math.floor((Date.now()-new Date(d))/60000));
const dur=d=>{const m=minsSince(d);return m<60?`${m} dk`:`${Math.floor(m/60)} sa ${m%60} dk`};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const lower=s=>String(s||'').toLocaleLowerCase('tr');
const NATIVE=window.PoesiaAndroid||null;

/* ---------- PIN şifreleme (SHA-256, cihaz içi) ---------- */
const SHA_K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
function sha256Hex(message){
  const ror=(x,n)=>(x>>>n)|(x<<(32-n));
  const bytes=new TextEncoder().encode(String(message)),len=bytes.length,padded=((len+9+63)>>6)<<6,buf=new Uint8Array(padded);
  buf.set(bytes);buf[len]=0x80;const dv=new DataView(buf.buffer);dv.setUint32(padded-4,(len*8)>>>0);dv.setUint32(padded-8,Math.floor(len/0x20000000));
  let h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];const w=new Uint32Array(64);
  for(let off=0;off<padded;off+=64){
    for(let i=0;i<16;i++)w[i]=dv.getUint32(off+i*4);
    for(let i=16;i<64;i++){const s0=ror(w[i-15],7)^ror(w[i-15],18)^(w[i-15]>>>3),s1=ror(w[i-2],17)^ror(w[i-2],19)^(w[i-2]>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0}
    let [a,b,c,d,e,f,g,k]=h;
    for(let i=0;i<64;i++){const t1=(k+(ror(e,6)^ror(e,11)^ror(e,25))+((e&f)^(~e&g))+SHA_K[i]+w[i])>>>0,t2=((ror(a,2)^ror(a,13)^ror(a,22))+((a&b)^(a&c)^(b&c)))>>>0;k=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0}
    h=[h[0]+a,h[1]+b,h[2]+c,h[3]+d,h[4]+e,h[5]+f,h[6]+g,h[7]+k].map(x=>x>>>0);
  }
  return h.map(x=>x.toString(16).padStart(8,'0')).join('');
}
function randomSalt(){const a=new Uint8Array(12);(window.crypto||{}).getRandomValues?.(a);return Array.from(a,x=>x.toString(16).padStart(2,'0')).join('')||String(Math.random()).slice(2)}
function setPin(u,pin){u.pinSalt=randomSalt();u.pinHash=sha256Hex(`${u.pinSalt}:${pin}`)}
function checkPin(u,pin){return !!u.pinHash&&sha256Hex(`${u.pinSalt}:${pin}`)===u.pinHash}

/* ---------- Sabitler ve varsayılan veri ---------- */
const DEFAULT_SETTINGS={name:'Poesia Garden Cafe',phone:'',address:'',instagram:'',wifi:'',footer:'Bizi tercih ettiğiniz için teşekkür ederiz. Yine bekleriz!',receiptWidth:'80',serviceRate:0,kitchenTicket:false,waiterPayment:true,waiterDiscount:false,lastBackupAt:''};
const ROLES={admin:'Yönetici',waiter:'Garson',kitchen:'Mutfak / Bar'};
const ROLE_VIEWS={admin:['tables','takeaway','kitchen','reservations','menu','cash','reports','settings'],waiter:['tables','takeaway','kitchen','reservations'],kitchen:['kitchen']};
const VIEWS={tables:['🪴','Masalar'],takeaway:['🛍️','Paket / Gel-Al'],kitchen:['👨‍🍳','Mutfak & Bar'],reservations:['📅','Rezervasyon'],menu:['📋','Menü'],cash:['💰','Kasa & Gün Sonu'],reports:['📊','Raporlar'],settings:['⚙️','Ayarlar'],order:['🧾','Adisyon']};
const METHODS={cash:'Nakit',card:'Kredi Kartı',other:'Yemek Kartı / Diğer'};
const STATIONS={bar:'Bar',kitchen:'Mutfak'};
const ITEM_STATES={new:'Yeni',sent:'Hazırlanıyor',ready:'Hazır',served:'Servis edildi'};
const QUICK_NOTES=['Şekersiz','Az şekerli','Orta','Şekerli','Sade','Sütsüz','Laktozsuz süt','Bol buzlu','Buzsuz','Acısız','Soğansız','Az pişmiş','İyi pişmiş','Paket','Önce bunu getir'];
const RES_STATES={waiting:'Bekleniyor',seated:'Geldi',cancelled:'İptal',noshow:'Gelmedi'};

function seedState(){
  const s={version:1,settings:{...DEFAULT_SETTINGS},areas:['Bahçe','Teras','İç Salon'],tables:[],categories:[],products:[],orders:[],cashMoves:[],dayClosings:[],reservations:[],staff:[],seq:{order:1}};
  [['Bahçe','B',12,4],['Teras','T',6,4],['İç Salon','S',6,2]].forEach(([area,p,n,seats])=>{for(let i=1;i<=n;i++)s.tables.push({id:uid(),name:p+i,area,seats})});
  const menu=[
    ['Sıcak İçecekler','☕','bar',[['Çay',25],['Fincan Çay',45],['Türk Kahvesi',90,'Lokum ile'],['Espresso',85],['Americano',100],['Latte',115],['Cappuccino',115],['Flat White',120],['Sıcak Çikolata',120],['Sahlep',110,'Tarçınlı']]],
    ['Soğuk İçecekler','🧊','bar',[['Ice Latte',125],['Ice Americano',110],['Ev Yapımı Limonata',95],['Taze Portakal Suyu',110],['Frozen (Çilek / Mango)',130],['Milkshake',140],['Soda',40],['Su',20],['Kola',60]]],
    ['Kahvaltı','🍳','kitchen',[['Serpme Kahvaltı (2 kişilik)',750,'Peynir çeşitleri, zeytin, reçel, bal-kaymak, sıcaklar, sınırsız çay'],['Kahvaltı Tabağı',380],['Menemen',180],['Sahanda Sucuklu Yumurta',190],['Pişi Tabağı',220]]],
    ['Atıştırmalık & Yemek','🥪','kitchen',[['Kaşarlı Tost',140],['Karışık Tost',170],['Poesia Burger',340,'Patates kızartması ile'],['Penne Arrabbiata',260],['Tavuklu Sezar Salata',290],['Patates Kızartması',140],['Çıtır Tavuk Sepeti',260]]],
    ['Tatlılar','🍰','kitchen',[['San Sebastian Cheesecake',190],['Sufle',190,'Dondurma ile'],['Waffle',230],['Tiramisu',180],['Brownie',160],['Dondurma (2 top)',100]]]
  ];
  menu.forEach(([name,icon,station,items],ci)=>{
    const cat={id:uid(),name,icon,order:ci};s.categories.push(cat);
    items.forEach(([n,price,desc])=>s.products.push({id:uid(),catId:cat.id,name:n,price,station,desc:desc||'',active:true,soldOut:false}));
  });
  const admin={id:uid(),name:'Poesia Yönetici',username:'poesia',role:'admin',active:true};setPin(admin,'1234');s.staff.push(admin);
  return s;
}

let state=loadState();
function loadState(){
  let s=null;try{s=JSON.parse(localStorage.getItem(KEY))}catch{s=null}
  if(!s||!Array.isArray(s.tables)||!Array.isArray(s.staff)||!s.staff.length)s=seedState();
  return normalizeState(s);
}
function normalizeState(s){
  s.settings={...DEFAULT_SETTINGS,...(s.settings||{})};
  for(const k of ['areas','tables','categories','products','orders','cashMoves','dayClosings','reservations','staff'])if(!Array.isArray(s[k]))s[k]=[];
  s.seq=s.seq||{order:1};
  s.orders.forEach(o=>{o.items=o.items||[];o.payments=o.payments||[];o.items.forEach(i=>{i.paidQty=num(i.paidQty)})});
  return s;
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{toast('Kayıt başarısız: cihaz hafızası dolu olabilir')}}
save();

/* ---------- Oturum ---------- */
let currentUserId=null;try{currentUserId=sessionStorage.getItem(KEY+'-user')}catch{}
const me=()=>state.staff.find(u=>u.id===currentUserId&&u.active)||null;
const isAdmin=()=>me()?.role==='admin';
function canPay(){return isAdmin()||(me()?.role==='waiter'&&state.settings.waiterPayment)}
function canDiscount(){return isAdmin()||(me()?.role==='waiter'&&state.settings.waiterDiscount)}
function defaultPinInUse(){const u=state.staff.find(x=>x.username==='poesia'&&x.active);return !!u&&checkPin(u,'1234')}

/* ---------- Arama yardımcıları ---------- */
const tableById=id=>state.tables.find(t=>t.id===id);
const productById=id=>state.products.find(p=>p.id===id);
const catById=id=>state.categories.find(c=>c.id===id);
const orderById=id=>state.orders.find(o=>o.id===id);
const openOrders=()=>state.orders.filter(o=>o.status==='open');
const openOrderForTable=tid=>state.orders.find(o=>o.status==='open'&&o.type==='table'&&o.tableId===tid);
const sortedCats=()=>[...state.categories].sort((a,b)=>num(a.order)-num(b.order));
const liveItems=o=>o.items.filter(i=>!i.voided);
function orderTitle(o){if(o.type==='table')return `Masa ${tableById(o.tableId)?.name||'?'}`;return `${o.type==='delivery'?'Paket':'Gel-Al'} · ${o.customer||'#'+o.no}`}

function totals(o){
  const items=liveItems(o);
  const gross=sum(items.map(i=>i.price*i.qty));
  const comp=sum(items.filter(i=>i.comp).map(i=>i.price*i.qty));
  const sub=gross-comp;
  let disc=0;if(o.discount){disc=o.discount.type==='%'?sub*num(o.discount.value)/100:num(o.discount.value)}
  disc=Math.min(Math.max(disc,0),sub);
  const net=sub-disc,service=net*num(o.serviceRate)/100,total=r2(net+service),paid=r2(sum(o.payments.map(p=>p.amount)));
  return {gross:r2(gross),comp:r2(comp),sub:r2(sub),disc:r2(disc),service:r2(service),total,paid,remaining:r2(Math.max(0,total-paid))};
}
function readyItems(){return openOrders().flatMap(o=>liveItems(o).filter(i=>i.state==='ready').map(i=>({o,i})))}

/* ---------- Arayüz durumu ---------- */
const ui={view:'tables',orderId:null,area:'Tümü',cat:null,search:'',orderTab:'menu',station:'all',range:'today',from:'',to:'',resDate:dayKey(),menuCat:null,settingsTab:'business'};

function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2600);if(NATIVE&&document.hidden)NATIVE.toast(msg)}

/* ---------- Modal ---------- */
let modalCtx=null;
function modal({title,body,actions=[],onOpen,onDismiss,wide=false}){
  const d=$('#modal');d.className=wide?'wide':'';
  d.innerHTML=`<form class="modal-card" novalidate><header><h3>${esc(title)}</h3><button type="button" class="icon-btn" data-close aria-label="Kapat">✕</button></header><div class="modal-body">${body}</div>${actions.length?`<footer>${actions.map((a,i)=>`<button type="button" class="btn ${a.cls||''}" data-i="${i}">${esc(a.label)}</button>`).join('')}</footer>`:''}</form>`;
  const f=d.querySelector('form'),ctx={f,onDismiss};modalCtx=ctx;
  // run() başka bir modal açtıysa (modalCtx değişti) onu kapatma
  const run=a=>{if(a.submit&&!f.reportValidity())return;const r=a.run?.(f);if(r!==false&&modalCtx===ctx)closeModal(false)};
  d.querySelector('[data-close]').onclick=()=>closeModal();
  f.querySelectorAll('footer [data-i]').forEach(b=>b.onclick=()=>run(actions[+b.dataset.i]));
  f.onsubmit=e=>{e.preventDefault();const a=actions.find(x=>x.submit);if(a)run(a)};
  if(d.open)d.close();
  d.showModal();onOpen?.(f,d);
  return f;
}
function closeModal(dismiss=true){const d=$('#modal'),ctx=modalCtx;modalCtx=null;if(d.open)d.close();if(dismiss)ctx?.onDismiss?.()}
$('#modal').addEventListener('cancel',e=>{e.preventDefault();closeModal()});
function ask(title,message,okLabel='Evet',cls='primary'){
  return new Promise(res=>modal({title,body:`<p class="ask">${message}</p>`,onDismiss:()=>res(false),actions:[{label:'Vazgeç',cls:'ghost',run:()=>res(false)},{label:okLabel,cls,run:()=>res(true)}]}));
}
const field=(label,input,cls='')=>`<label class="field ${cls}"><span>${esc(label)}</span>${input}</label>`;
const opts=(list,sel)=>list.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(sel)?'selected':''}>${esc(l)}</option>`).join('');

/* ---------- Dosya, paylaşım, yazdırma ---------- */
function toBase64(content){const bytes=new TextEncoder().encode(content);let bin='';for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(bin)}
function downloadFile(name,content,type='application/json'){
  if(NATIVE){const where=NATIVE.saveFile(name,toBase64(content),type);toast(where?`Kaydedildi: ${where}`:'Dosya kaydedilemedi');return}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}
function printDoc(html,{width=state.settings.receiptWidth,title=state.settings.name}={}){
  const area=$('#printArea');area.className=`print-area print-${width==='A4'?'a4':width==='58'?'58':'80'}`;area.innerHTML=html;
  let style=$('#printPageStyle');if(!style){style=document.createElement('style');style.id='printPageStyle';document.head.appendChild(style)}
  style.textContent=width==='A4'?'@page{size:A4;margin:12mm}':'@page{margin:3mm}';
  setTimeout(()=>{if(NATIVE)NATIVE.print(title);else window.print()},60);
}
function receiptHeader(){const s=state.settings;return `<div class="r-company"><b>${esc(s.name)}</b>${s.address?`<span>${esc(s.address)}</span>`:''}${s.phone?`<span>Tel: ${esc(s.phone)}</span>`:''}${s.instagram?`<span>${esc(s.instagram)}</span>`:''}</div><div class="r-sep"></div>`}
function receiptHTML(o,{title}={}){
  const t=totals(o),s=state.settings;
  const lines=liveItems(o).map(i=>`<div class="r-line"><span>${i.qty} × ${esc(i.name)}${i.comp?' (İkram)':''}</span><span>${i.comp?'0,00':money(i.price*i.qty).slice(1)}</span></div>`).join('');
  return `<div class="receipt">${receiptHeader()}
    <div class="r-title">${esc(title||(o.status==='paid'?'HESAP FİŞİ':'ADİSYON'))}</div>
    <div class="r-line"><span>${esc(orderTitle(o))}</span><span>#${o.no}</span></div>
    <div class="r-line r-muted"><span>${dateStr(o.openedAt)} ${timeStr(o.openedAt)}</span><span>${esc(o.waiter||'')}</span></div>
    <div class="r-sep"></div>${lines}<div class="r-sep"></div>
    ${t.comp?`<div class="r-line"><span>İkram</span><span>-${money(t.comp).slice(1)}</span></div>`:''}
    ${t.disc?`<div class="r-line"><span>İskonto</span><span>-${money(t.disc).slice(1)}</span></div>`:''}
    ${t.service?`<div class="r-line"><span>Servis (%${num(o.serviceRate)})</span><span>${money(t.service).slice(1)}</span></div>`:''}
    <div class="r-line r-total"><b>TOPLAM</b><b>${money(t.total)}</b></div>
    ${o.payments.map(p=>`<div class="r-line r-muted"><span>${esc(METHODS[p.method]||p.method)}</span><span>${money(p.amount).slice(1)}</span></div>`).join('')}
    ${t.paid&&t.remaining?`<div class="r-line"><b>Kalan</b><b>${money(t.remaining)}</b></div>`:''}
    ${s.wifi?`<div class="r-sep"></div><div class="r-foot">Wi-Fi: ${esc(s.wifi)}</div>`:''}
    <div class="r-sep"></div><p class="r-foot">${esc(s.footer)}</p><p class="r-foot r-muted">Bilgi fişidir, mali değeri yoktur.</p></div>`;
}
function kitchenTicketHTML(o,items){
  const groups={};items.forEach(i=>{(groups[i.station]=groups[i.station]||[]).push(i)});
  return Object.entries(groups).map(([st,list])=>`<div class="receipt ticket"><div class="r-title">${esc(STATIONS[st]||st).toUpperCase()}</div>
    <div class="r-line"><b>${esc(orderTitle(o))}</b><span>#${o.no}</span></div><div class="r-line r-muted"><span>${timeStr(new Date())}</span><span>${esc(me()?.name||'')}</span></div><div class="r-sep"></div>
    ${list.map(i=>`<div class="t-item"><b>${i.qty} × ${esc(i.name)}</b>${i.note?`<div>→ ${esc(i.note)}</div>`:''}</div>`).join('')}</div>`).join('<div class="page-break"></div>');
}

/* ---------- Giriş / Çıkış ---------- */
function showLogin(){
  $('#app').hidden=true;$('#login').hidden=false;$('#loginHint').style.display=defaultPinInUse()?'':'none';
  $('#loginTitle').textContent=state.settings.name;setTimeout(()=>$('#loginUser').focus(),50);
}
$('#loginForm').onsubmit=e=>{
  e.preventDefault();
  const username=lower($('#loginUser').value.trim()),pin=$('#loginPin').value.trim();
  const user=state.staff.find(u=>u.active&&lower(u.username)===username&&checkPin(u,pin));
  if(!user){$('#loginErr').textContent='Kullanıcı adı veya PIN hatalı.';return}
  $('#loginErr').textContent='';$('#loginPin').value='';
  currentUserId=user.id;try{sessionStorage.setItem(KEY+'-user',user.id)}catch{}
  startApp();
  if(defaultPinInUse()&&isAdmin())setTimeout(()=>toast('Güvenlik: varsayılan PIN 1234 kullanılıyor, Ayarlar → Personel bölümünden değiştir'),700);
};
function logout(){currentUserId=null;try{sessionStorage.removeItem(KEY+'-user')}catch{}closeModal();showLogin()}
function startApp(){
  const u=me();if(!u)return showLogin();
  $('#login').hidden=true;$('#app').hidden=false;
  ui.view=ROLE_VIEWS[u.role][0];render();
}

/* ---------- Ana çizim ---------- */
function render(){
  const u=me();if(!u)return showLogin();
  if(ui.view!=='order'&&!ROLE_VIEWS[u.role].includes(ui.view))ui.view=ROLE_VIEWS[u.role][0];
  $('#brandName').textContent=state.settings.name;
  $('#userName').textContent=u.name;$('#userRole').textContent=ROLES[u.role];
  $('#userInitials').textContent=u.name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toLocaleUpperCase('tr');
  renderNav();
  const fn={tables:renderTables,takeaway:renderTakeaway,kitchen:renderKitchen,reservations:renderReservations,menu:renderMenu,cash:renderCash,reports:renderReports,settings:renderSettings,order:renderOrder}[ui.view];
  const html=fn();
  $('#pageTitle').textContent=ui.view==='order'?'Adisyon':VIEWS[ui.view][1];
  $('#view').innerHTML=html;
  document.body.dataset.view=ui.view;
}
function renderNav(){
  const u=me(),kitchenCount=openOrders().reduce((n,o)=>n+liveItems(o).filter(i=>i.state==='sent').length,0),ready=readyItems().length;
  const parent=ui.view==='order'?(orderById(ui.orderId)?.type==='table'?'tables':'takeaway'):ui.view;
  $('#nav').innerHTML=ROLE_VIEWS[u.role].map(v=>{
    const badge=v==='kitchen'&&kitchenCount?kitchenCount:v==='tables'&&ready?'🔔'+ready:'';
    return `<button class="nav-btn ${parent===v?'active':''}" data-go="${v}"><span class="nav-ico">${VIEWS[v][0]}</span><span class="nav-label">${VIEWS[v][1]}</span>${badge?`<i class="nav-badge">${badge}</i>`:''}</button>`;
  }).join('');
}
function go(v){ui.view=v;cleanupOrder();render();window.scrollTo(0,0)}
function goOrder(id){ui.orderId=id;ui.view='order';ui.orderTab='menu';ui.search='';ui.cat=null;render();window.scrollTo(0,0)}
// Ürün eklenmeden bırakılan boş adisyonları sil
function cleanupOrder(){
  state.orders=state.orders.filter(o=>!(o.status==='open'&&!o.items.length&&!o.payments.length&&o.id!==(ui.view==='order'?ui.orderId:null)));save();
}
const chip=(label,active,act,value)=>`<button class="chip ${active?'active':''}" data-act="${act}" data-v="${esc(value)}">${label}</button>`;

/* ---------- Masalar ---------- */
function upcomingReservation(tid){
  const today=dayKey();
  return state.reservations.filter(r=>r.tableId===tid&&r.date===today&&r.status==='waiting').map(r=>({r,m:(new Date(`${r.date}T${r.time}`)-Date.now())/60000})).filter(x=>x.m>-30&&x.m<180).sort((a,b)=>a.m-b.m)[0]?.r;
}
function tableCard(t){
  const o=openOrderForTable(t.id),res=upcomingReservation(t.id);
  let cls='free',info=`<small>${t.seats||'-'} kişilik</small>`,flags='';
  if(o&&o.items.length){
    const tt=totals(o),live=liveItems(o);cls=o.billRequested?'bill':'busy';
    info=`<strong>${money(tt.remaining)}</strong><small>⏱ ${dur(o.openedAt)} · ${esc(o.waiter||'')}</small>`;
    const ready=live.filter(i=>i.state==='ready').length,unsent=live.filter(i=>i.state==='new').length;
    if(ready)flags+=`<i class="flag ready">🔔 ${ready} hazır</i>`;
    if(unsent)flags+=`<i class="flag warn">⚠ ${unsent} gönderilmedi</i>`;
    if(o.billRequested)flags+=`<i class="flag bill">Hesap istendi</i>`;
  }else if(res){cls='reserved';info=`<small>📅 ${esc(res.time)} · ${esc(res.name)} (${res.guests})</small>`}
  return `<button class="table-card ${cls}" data-act="openTable" data-id="${t.id}"><span class="t-name">${esc(t.name)}</span>${info}<span class="flags">${flags}</span></button>`;
}
function readyBar(){
  const list=readyItems();if(!list.length)return '';
  return `<div class="ready-bar"><b>🔔 Servise hazır</b>${list.map(({o,i})=>`<span class="ready-item">${esc(orderTitle(o))}: ${i.qty}× ${esc(i.name)} <button class="btn xs success" data-act="serve" data-o="${o.id}" data-uid="${i.uid}">Servis edildi</button></span>`).join('')}</div>`;
}
function renderTables(){
  const areas=['Tümü',...state.areas],open=openOrders().filter(o=>o.type==='table'&&o.items.length);
  const openSum=sum(open.map(o=>totals(o).remaining));
  const shown=ui.area==='Tümü'?state.areas:[ui.area];
  return `<div class="toolbar"><div class="chips">${areas.map(a=>chip(esc(a),ui.area===a,'area',a)).join('')}</div>
    <div class="stats"><span>Dolu <b>${open.length}/${state.tables.length}</b></span><span>Açık hesap <b>${money(openSum)}</b></span></div></div>
    ${readyBar()}
    ${shown.map(a=>{const ts=state.tables.filter(t=>t.area===a);return ts.length?`<h3 class="area-title">${esc(a)}</h3><div class="table-grid">${ts.map(tableCard).join('')}</div>`:''}).join('')}
    ${state.tables.length?'':`<div class="empty">Henüz masa yok. Ayarlar → Masalar bölümünden ekleyebilirsin.</div>`}
    <div class="legend"><span class="lg free"></span>Boş <span class="lg busy"></span>Dolu <span class="lg bill"></span>Hesap istendi <span class="lg reserved"></span>Rezerve</div>`;
}
function openTable(tid){
  let o=openOrderForTable(tid);
  if(!o)o=newOrder({type:'table',tableId:tid,serviceRate:num(state.settings.serviceRate)});
  goOrder(o.id);
}
function newOrder(fields){
  const o={id:uid(),no:state.seq.order++,type:'table',items:[],payments:[],discount:null,serviceRate:0,status:'open',openedAt:nowISO(),waiter:me().name,guests:0,billRequested:false,...fields};
  state.orders.push(o);save();return o;
}

/* ---------- Paket / Gel-Al ---------- */
function renderTakeaway(){
  const list=openOrders().filter(o=>o.type!=='table').sort((a,b)=>a.no-b.no);
  const today=state.orders.filter(o=>o.type!=='table'&&o.status==='paid'&&dayKey(o.closedAt)===dayKey());
  return `<div class="toolbar"><button class="btn primary" data-act="newTakeaway">＋ Yeni Paket / Gel-Al</button><div class="stats"><span>Bugün kapanan <b>${today.length}</b></span><span>Tutar <b>${money(sum(today.map(o=>totals(o).total)))}</b></span></div></div>
    ${readyBar()}
    <div class="card-grid">${list.map(o=>{const t=totals(o),live=liveItems(o);return `<button class="order-card" data-act="openOrder" data-id="${o.id}">
      <header><b>${esc(orderTitle(o))}</b><span>#${o.no}</span></header>
      <small>${o.phone?'📞 '+esc(o.phone)+' · ':''}⏱ ${dur(o.openedAt)}</small>
      ${o.address?`<small>📍 ${esc(o.address)}</small>`:''}
      <p>${live.slice(0,4).map(i=>`${i.qty}× ${esc(i.name)}`).join(', ')}${live.length>4?'…':''}</p>
      <footer><strong>${money(t.remaining)}</strong>${live.some(i=>i.state==='ready')?'<i class="flag ready">🔔 Hazır</i>':''}</footer></button>`}).join('')||'<div class="empty">Açık paket / gel-al siparişi yok.</div>'}</div>`;
}
function newTakeawayModal(){
  modal({title:'Yeni Paket / Gel-Al',body:`
    <div class="seg" id="taType"><button type="button" class="active" data-v="takeaway">🥡 Gel-Al</button><button type="button" data-v="delivery">🛵 Paket Servis</button></div>
    ${field('Müşteri adı','<input name="customer" required>')}
    ${field('Telefon','<input name="phone" type="tel" inputmode="tel">')}
    ${field('Adres','<textarea name="address" rows="2"></textarea>','addr hidden')}
    ${field('Not','<input name="note" placeholder="Örn. kapıda kartla ödeme">')}`,
    actions:[{label:'Vazgeç',cls:'ghost'},{label:'Siparişi Aç',cls:'primary',submit:true,run:f=>{
      const type=f.querySelector('#taType .active').dataset.v;
      const o=newOrder({type,customer:f.customer.value.trim(),phone:f.phone.value.trim(),address:type==='delivery'?f.address.value.trim():'',note:f.note.value.trim()});
      closeModal();goOrder(o.id);
    }}],
    onOpen:f=>{f.customer.focus();f.querySelectorAll('#taType button').forEach(b=>b.onclick=()=>{f.querySelectorAll('#taType button').forEach(x=>x.classList.toggle('active',x===b));f.querySelector('.addr').classList.toggle('hidden',b.dataset.v!=='delivery')})}});
}

/* ---------- Adisyon ---------- */
function renderOrder(){
  const o=orderById(ui.orderId);
  if(!o||o.status!=='open'){ui.view=o?.type&&o.type!=='table'?'takeaway':'tables';return ui.view==='tables'?renderTables():renderTakeaway()}
  const cats=sortedCats();if(!catById(ui.cat))ui.cat=cats[0]?.id;
  const live=liveItems(o),count=sum(live.map(i=>i.qty));
  return `<div class="order-head">
      <button class="btn ghost" data-act="backOrder">← Geri</button>
      <div class="oh-title"><h3>${esc(orderTitle(o))}</h3><small>#${o.no} · ${esc(o.waiter||'')} · ${timeStr(o.openedAt)} açıldı · ${dur(o.openedAt)}${o.phone?' · 📞 '+esc(o.phone):''}</small>${o.address?`<small>📍 ${esc(o.address)}</small>`:''}${o.note?`<small>📝 ${esc(o.note)}</small>`:''}</div>
      ${o.type==='table'?`<button class="btn ghost sm" data-act="guests">👥 ${o.guests||'Kişi'}</button>`:''}
    </div>
    <div class="seg order-tabs"><button class="${ui.orderTab==='menu'?'active':''}" data-act="orderTab" data-v="menu">📋 Menü</button><button class="${ui.orderTab==='bill'?'active':''}" data-act="orderTab" data-v="bill">🧾 Adisyon (${count}) · ${money(totals(o).remaining)}</button></div>
    <div class="order-layout show-${ui.orderTab}">
      <section class="menu-pane">
        <input class="search" type="search" placeholder="🔍 Ürün ara…" data-input="search" value="${esc(ui.search)}">
        <div class="chips scroll" id="catChips">${cats.map(c=>chip(`${esc(c.icon||'')} ${esc(c.name)}`,!ui.search&&ui.cat===c.id,'cat',c.id)).join('')}</div>
        <div class="prod-grid" id="prodGrid">${prodGrid(o)}</div>
      </section>
      <section class="bill-pane" id="billPane">${billPane(o)}</section>
    </div>`;
}
function prodGrid(o){
  const q=lower(ui.search.trim());
  const prods=state.products.filter(p=>p.active&&(q?lower(p.name).includes(q):p.catId===ui.cat));
  if(!prods.length)return `<div class="empty">${q?'Ürün bulunamadı.':'Bu kategoride ürün yok.'}</div>`;
  return prods.map(p=>{const n=sum(liveItems(o).filter(i=>i.pid===p.id).map(i=>i.qty));
    return `<button class="prod ${p.soldOut?'sold':''}" data-act="add" data-id="${p.id}"><b>${esc(p.name)}</b><span>${p.soldOut?'Tükendi':money(p.price)}</span>${n?`<i class="prod-count">${n}</i>`:''}</button>`}).join('');
}
function billPane(o){
  const t=totals(o),items=o.items,live=liveItems(o),unsent=live.filter(i=>i.state==='new');
  const rows=items.map(i=>{
    const editable=i.state==='new'&&!i.voided;
    return `<div class="bill-row st-${i.state} ${i.comp?'comp':''} ${i.voided?'voided':''}" data-act="item" data-uid="${i.uid}">
      <div class="br-main"><b>${editable?'':`${i.qty}× `}${esc(i.name)}</b>
        <small>${i.voided?`İptal: ${esc(i.voidReason||'')}`:`<span class="st">${ITEM_STATES[i.state]}</span>${i.comp?' · 🎁 İkram':''}${i.paidQty?` · ${i.paidQty}/${i.qty} ödendi`:''}`}</small>
        ${i.note?`<small class="note">📝 ${esc(i.note)}</small>`:''}</div>
      ${editable?`<div class="stepper"><button type="button" data-act="dec" data-uid="${i.uid}">−</button><b>${i.qty}</b><button type="button" data-act="inc" data-uid="${i.uid}">+</button></div>`:''}
      ${i.state==='ready'&&!i.voided?`<button class="btn xs success" data-act="serve" data-o="${o.id}" data-uid="${i.uid}">Servis</button>`:''}
      <span class="br-price">${i.comp||i.voided?`<s>${money(i.price*i.qty)}</s>`:money(i.price*i.qty)}</span></div>`;
  }).join('');
  return `<div class="bill-items">${rows||'<div class="empty">Adisyon boş. Menüden ürün seç.</div>'}</div>
    <div class="bill-totals">
      ${t.comp?`<div><span>İkram</span><span>-${money(t.comp)}</span></div>`:''}
      ${t.disc?`<div><span>İskonto ${o.discount.type==='%'?'%'+num(o.discount.value):''}</span><span>-${money(t.disc)}</span></div>`:''}
      ${t.service?`<div><span>Servis %${num(o.serviceRate)}</span><span>${money(t.service)}</span></div>`:''}
      <div class="grand"><span>Toplam</span><span>${money(t.total)}</span></div>
      ${t.paid?`<div><span>Ödenen</span><span>${money(t.paid)}</span></div><div class="grand rem"><span>Kalan</span><span>${money(t.remaining)}</span></div>`:''}
    </div>
    <div class="bill-actions">
      <button class="btn primary wide" data-act="send" ${unsent.length?'':'disabled'}>🔥 Mutfağa / Bara Gönder${unsent.length?` (${sum(unsent.map(i=>i.qty))})`:''}</button>
      ${canPay()?`<button class="btn success wide" data-act="pay" ${live.length?'':'disabled'}>💳 Ödeme Al</button>`:''}
      <button class="btn ghost" data-act="preBill" ${live.length?'':'disabled'}>🖨️ Hesap Yazdır</button>
      ${canDiscount()?`<button class="btn ghost" data-act="discount" ${live.length?'':'disabled'}>🏷️ İskonto</button>`:''}
      ${o.type==='table'?`<button class="btn ghost" data-act="moveTable">↔ Masa Taşı</button><button class="btn ghost" data-act="mergeTable">⧉ Birleştir</button>`:`<button class="btn ghost" data-act="editTakeaway">✏️ Bilgiler</button>`}
      ${isAdmin()?`<button class="btn ghost danger-text" data-act="cancelOrder">✕ Adisyonu İptal</button>`:''}
    </div>`;
}
function refreshOrderParts(){const o=orderById(ui.orderId);if(!o)return render();$('#billPane').innerHTML=billPane(o);$('#prodGrid').innerHTML=prodGrid(o);const tab=document.querySelector('.order-tabs [data-v="bill"]');if(tab)tab.textContent=`🧾 Adisyon (${sum(liveItems(o).map(i=>i.qty))}) · ${money(totals(o).remaining)}`;renderNav()}
function currentOrder(){return orderById(ui.orderId)}
function addItem(pid){
  const o=currentOrder(),p=productById(pid);if(!o||!p)return;
  if(p.soldOut)return toast(`${p.name} tükendi`);
  const ex=o.items.find(i=>i.pid===p.id&&i.state==='new'&&!i.note&&!i.comp&&!i.voided);
  if(ex)ex.qty++;else o.items.push({uid:uid(),pid:p.id,name:p.name,price:num(p.price),qty:1,note:'',station:p.station||'kitchen',state:'new',comp:false,voided:false,paidQty:0,addedBy:me().name,addedAt:nowISO()});
  o.billRequested=false;save();refreshOrderParts();
  if(navigator.vibrate)navigator.vibrate(15);
}
function sendOrder(o,{silent=false}={}){
  const items=liveItems(o).filter(i=>i.state==='new');if(!items.length)return 0;
  const t=nowISO();items.forEach(i=>{i.state='sent';i.sentAt=t});save();
  if(state.settings.kitchenTicket&&!silent)printDoc(kitchenTicketHTML(o,items),{title:'Mutfak fişi'});
  if(!silent)toast(`${sum(items.map(i=>i.qty))} ürün mutfağa / bara gönderildi`);
  return items.length;
}
function itemModal(u){
  const o=currentOrder(),i=o?.items.find(x=>x.uid===u);if(!i)return;
  if(i.voided)return toast('Bu ürün iptal edilmiş');
  const isNew=i.state==='new';
  modal({title:i.name,body:`
    <p class="muted">${money(i.price)} · ${ITEM_STATES[i.state]}${i.sentAt?' · '+timeStr(i.sentAt)+' gönderildi':''} · ${esc(i.addedBy||'')}</p>
    ${isNew?field('Adet',`<input name="qty" type="number" min="1" step="1" value="${i.qty}" inputmode="numeric">`):''}
    ${field('Not (mutfak / bar görür)',`<input name="note" value="${esc(i.note)}" placeholder="Örn. şekersiz, sütü ayrı">`)}
    <div class="chips wrap note-chips">${QUICK_NOTES.map(n=>`<button type="button" class="chip">${esc(n)}</button>`).join('')}</div>`,
    actions:[
      ...(isNew?[{label:'🗑 Sil',cls:'ghost danger-text',run:()=>{o.items=o.items.filter(x=>x!==i);save();refreshOrderParts()}}]:[{label:'✕ İptal Et',cls:'ghost danger-text',run:()=>{voidItemModal(o,i);return false}}]),
      ...(isAdmin()||state.settings.waiterDiscount?[{label:i.comp?'İkramı Kaldır':'🎁 İkram',cls:'ghost',run:()=>{if(i.paidQty)return toast('Ödenmiş ürün ikram yapılamaz'),false;i.comp=!i.comp;save();refreshOrderParts()}}]:[]),
      {label:'Kaydet',cls:'primary',submit:true,run:f=>{if(isNew)i.qty=Math.max(1,Math.round(num(f.qty.value))||1);i.note=f.note.value.trim();save();refreshOrderParts()}}
    ],
    onOpen:f=>f.querySelectorAll('.note-chips .chip').forEach(b=>b.onclick=()=>{const v=f.note.value.trim();f.note.value=v?`${v}, ${b.textContent}`:b.textContent})});
}
function voidItemModal(o,i){
  if(i.paidQty)return toast('Ödemesi alınmış ürün iptal edilemez');
  const multi=i.qty>1;
  modal({title:`İptal: ${i.name}`,body:`
    ${multi?field('İptal edilecek adet',`<input name="qty" type="number" min="1" max="${i.qty}" value="${i.qty}" inputmode="numeric">`):''}
    ${field('İptal nedeni',`<select name="reason">${opts(['Müşteri vazgeçti','Yanlış sipariş','Ürün tükendi','Hatalı / iade','Diğer'].map(x=>[x,x]),'')}</select>`)}`,
    actions:[{label:'Vazgeç',cls:'ghost'},{label:'İptal Et',cls:'danger',run:f=>{
      const q=multi?Math.min(i.qty,Math.max(1,Math.round(num(f.qty.value)))):i.qty;
      const reason=f.reason.value;
      if(q<i.qty){i.qty-=q;o.items.push({...i,uid:uid(),qty:q,voided:true,voidReason:reason,voidedBy:me().name,voidedAt:nowISO()})}
      else Object.assign(i,{voided:true,voidReason:reason,voidedBy:me().name,voidedAt:nowISO()});
      save();refreshOrderParts();toast('Ürün iptal edildi');
    }}]});
}
function serveItem(oid,u){const o=orderById(oid),i=o?.items.find(x=>x.uid===u);if(!i)return;i.state='served';i.servedAt=nowISO();save();if(ui.view==='order')refreshOrderParts();else render()}
async function backFromOrder(){
  const o=currentOrder();
  const unsent=o?liveItems(o).filter(i=>i.state==='new'):[];
  if(unsent.length){
    const yes=await ask('Gönderilmemiş ürünler var',`${sum(unsent.map(i=>i.qty))} ürün henüz mutfağa / bara gönderilmedi. Şimdi gönderilsin mi?`,'Gönder ve çık');
    if(yes)sendOrder(o);
  }
  go(o&&o.type!=='table'?'takeaway':'tables');
}
function guestsModal(){
  const o=currentOrder();
  modal({title:'Kişi sayısı',body:`<div class="num-pad">${[1,2,3,4,5,6,7,8,9,10,12,15].map(n=>`<button type="button" class="btn ${o.guests===n?'primary':'ghost'}" data-n="${n}">${n}</button>`).join('')}</div>`,
    onOpen:f=>f.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{o.guests=+b.dataset.n;save();closeModal();render()})});
}
function discountModal(){
  const o=currentOrder(),t=totals(o),d=o.discount||{type:'%',value:''};
  modal({title:'İskonto',body:`
    <p class="muted">Ara toplam (ikram hariç): <b>${money(t.sub)}</b></p>
    <div class="seg" id="discType"><button type="button" class="${d.type==='%'?'active':''}" data-v="%">% Yüzde</button><button type="button" class="${d.type==='₺'?'active':''}" data-v="₺">₺ Tutar</button></div>
    ${field('Değer',`<input name="value" type="number" min="0" step="0.01" value="${esc(d.value)}" inputmode="decimal">`)}
    <div class="chips wrap">${[5,10,15,20,25,50].map(n=>`<button type="button" class="chip" data-p="${n}">%${n}</button>`).join('')}</div>`,
    actions:[{label:'Kaldır',cls:'ghost',run:()=>{o.discount=null;save();refreshOrderParts()}},{label:'Uygula',cls:'primary',submit:true,run:f=>{
      const type=f.querySelector('#discType .active').dataset.v,value=num(f.value.value);
      if(value<=0){o.discount=null}else{if(type==='%'&&value>100)return toast('Yüzde 100\'den büyük olamaz'),false;o.discount={type,value,by:me().name}}
      save();refreshOrderParts();
    }}],
    onOpen:f=>{f.querySelectorAll('#discType button').forEach(b=>b.onclick=()=>f.querySelectorAll('#discType button').forEach(x=>x.classList.toggle('active',x===b)));
      f.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{f.querySelectorAll('#discType button').forEach(x=>x.classList.toggle('active',x.dataset.v==='%'));f.value.value=b.dataset.p})}});
}
function moveTableModal(){
  const o=currentOrder(),free=state.tables.filter(t=>t.id!==o.tableId&&!openOrderForTable(t.id)?.items.length);
  if(!free.length)return toast('Boş masa yok');
  modal({title:`${orderTitle(o)} → hangi masaya?`,wide:true,body:`<div class="pick-grid">${free.map(t=>`<button type="button" class="btn ghost" data-t="${t.id}"><b>${esc(t.name)}</b><small>${esc(t.area)}</small></button>`).join('')}</div>`,
    onOpen:f=>f.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{
      const empty=openOrderForTable(b.dataset.t);if(empty)state.orders=state.orders.filter(x=>x!==empty);
      const from=tableById(o.tableId)?.name;o.tableId=b.dataset.t;save();closeModal();render();toast(`${from} → ${tableById(o.tableId).name} taşındı`);
    })});
}
function mergeTableModal(){
  const o=currentOrder(),others=openOrders().filter(x=>x.id!==o.id&&x.type==='table'&&x.items.length);
  if(!others.length)return toast('Birleştirilecek başka dolu masa yok');
  modal({title:'Bu adisyonu hangi masaya ekleyelim?',wide:true,body:`<p class="muted">${esc(orderTitle(o))} adisyonundaki tüm ürün ve ödemeler seçilen masaya aktarılır.</p><div class="pick-grid">${others.map(x=>`<button type="button" class="btn ghost" data-o="${x.id}"><b>${esc(orderTitle(x))}</b><small>${money(totals(x).remaining)}</small></button>`).join('')}</div>`,
    onOpen:f=>f.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{
      const target=orderById(b.dataset.o);target.items.push(...o.items);target.payments.push(...o.payments);target.guests=num(target.guests)+num(o.guests);
      state.orders=state.orders.filter(x=>x!==o);save();closeModal();toast(`${orderTitle(o)} → ${orderTitle(target)} birleştirildi`);goOrder(target.id);
    })});
}
function editTakeawayModal(){
  const o=currentOrder();
  modal({title:'Sipariş bilgileri',body:`
    ${field('Tür',`<select name="type">${opts([['takeaway','Gel-Al'],['delivery','Paket Servis']],o.type)}</select>`)}
    ${field('Müşteri adı',`<input name="customer" value="${esc(o.customer)}" required>`)}
    ${field('Telefon',`<input name="phone" type="tel" value="${esc(o.phone)}">`)}
    ${field('Adres',`<textarea name="address" rows="2">${esc(o.address)}</textarea>`)}
    ${field('Not',`<input name="note" value="${esc(o.note)}">`)}`,
    actions:[{label:'Vazgeç',cls:'ghost'},{label:'Kaydet',cls:'primary',submit:true,run:f=>{Object.assign(o,{type:f.type.value,customer:f.customer.value.trim(),phone:f.phone.value.trim(),address:f.address.value.trim(),note:f.note.value.trim()});save();render()}}]});
}
async function cancelOrder(){
  const o=currentOrder();
  if(o.payments.length)return toast('Ödemesi alınmış adisyon iptal edilemez');
  if(!liveItems(o).length){state.orders=state.orders.filter(x=>x!==o);save();return go(o.type==='table'?'tables':'takeaway')}
  modal({title:'Adisyonu iptal et',body:`<p>${esc(orderTitle(o))} — ${money(totals(o).total)}</p>${field('Neden',`<select name="reason">${opts(['Müşteri vazgeçti','Hatalı açıldı','Ödemeden ayrıldı','Diğer'].map(x=>[x,x]),'')}</select>`)}`,
    actions:[{label:'Vazgeç',cls:'ghost'},{label:'İptal Et',cls:'danger',run:f=>{Object.assign(o,{status:'cancelled',closedAt:nowISO(),cancelReason:f.reason.value,cancelledBy:me().name});save();toast('Adisyon iptal edildi');go(o.type==='table'?'tables':'takeaway')}}]});
}
function preBill(){const o=currentOrder();sendOrder(o,{silent:true});o.billRequested=true;save();printDoc(receiptHTML(o,{title:'HESAP'}),{title:'Hesap'});render()}

/* ---------- Ödeme ---------- */
function payModal(){
  const o=currentOrder();if(!o)return;
  if(!canPay())return toast('Ödeme alma yetkin yok');
  sendOrder(o,{silent:true});
  const t=totals(o);
  if(t.total<=0){
    return ask('Hesabı kapat','Bu adisyonun ödenecek tutarı yok (tümü ikram). Kapatılsın mı?','Kapat').then(y=>{if(y)closeOrder(o)});
  }
  const factor=t.sub>0?t.total/t.sub:1;
  const payable=liveItems(o).filter(i=>!i.comp&&i.qty-num(i.paidQty)>0);
  let mode='all',method='cash';const sel={};
  modal({title:`Ödeme · ${orderTitle(o)}`,wide:true,body:`
    <div class="pay-summary"><div><span>Toplam</span><b>${money(t.total)}</b></div><div><span>Ödenen</span><b>${money(t.paid)}</b></div><div class="rem"><span>Kalan</span><b>${money(t.remaining)}</b></div></div>
    <div class="seg" id="payMode"><button type="button" class="active" data-v="all">Tamamı</button><button type="button" data-v="split">Eşit Böl</button>${payable.length?'<button type="button" data-v="items">Ürün Seç</button>':''}<button type="button" data-v="custom">Tutar Gir</button></div>
    <div id="payModeArea"></div>
    ${field('Alınacak tutar','<input name="amount" type="number" min="0" step="0.01" inputmode="decimal" required>')}
    <div class="seg methods" id="payMethod">${Object.entries(METHODS).map(([k,v],i)=>`<button type="button" class="${i?'':'active'}" data-v="${k}">${k==='cash'?'💵':k==='card'?'💳':'🎫'} ${v}</button>`).join('')}</div>
    <div id="cashArea">${field('Müşteriden alınan (para üstü için)','<input name="given" type="number" min="0" step="0.01" inputmode="decimal">')}<div class="chips wrap" id="cashQuick"></div><p class="change" id="changeOut"></p></div>`,
    actions:[{label:'Vazgeç',cls:'ghost'},{label:'Ödemeyi Al',cls:'success',submit:true,run:f=>{
      let amount=r2(num(f.amount.value));
      if(amount<=0)return toast('Tutar girin'),false;
      if(amount>t.remaining+0.009){if(method!=='cash')return toast('Kart / diğer ödemede tutar kalan tutardan büyük olamaz'),false;amount=t.remaining}
      if(mode==='items')payable.forEach(i=>{i.paidQty=num(i.paidQty)+num(sel[i.uid])});
      o.payments.push({id:uid(),method,amount:r2(Math.min(amount,t.remaining)),at:nowISO(),by:me().name});
      save();
      const nt=totals(o);
      if(nt.remaining<=0.009)closeOrder(o);
      else{toast(`${money(amount)} alındı · kalan ${money(nt.remaining)}`);render()}
    }}],
    onOpen:f=>{
      const area=f.querySelector('#payModeArea'),cashQuick=f.querySelector('#cashQuick');
      const setAmount=v=>{f.amount.value=r2(Math.min(v,t.remaining)).toFixed(2);updateChange();updateQuick()};
      const updateChange=()=>{const g=num(f.given.value),a=num(f.amount.value);f.querySelector('#changeOut').innerHTML=g>0?(g>=a?`Para üstü: <b>${money(g-a)}</b>`:`<span class="danger-text">Eksik: ${money(a-g)}</span>`):''};
      const updateQuick=()=>{const a=num(f.amount.value);const notes=[...new Set([a,Math.ceil(a/50)*50,Math.ceil(a/100)*100,Math.ceil(a/200)*200,Math.ceil(a/500)*500,1000].filter(x=>x>=a&&x>0))].slice(0,5);cashQuick.innerHTML=notes.map(n=>`<button type="button" class="chip" data-g="${n}">${money(n)}</button>`).join('');cashQuick.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{f.given.value=b.dataset.g;updateChange()})};
      const itemsTotal=()=>sum(payable.map(i=>num(sel[i.uid])*i.price))*factor;
      const drawMode=()=>{
        if(mode==='all'){area.innerHTML='';setAmount(t.remaining)}
        else if(mode==='custom'){area.innerHTML='';f.amount.value='';f.amount.focus();updateChange();updateQuick()}
        else if(mode==='split'){
          area.innerHTML=`<div class="split-row"><span>Kişi sayısı</span><div class="stepper big"><button type="button" data-s="-1">−</button><b id="splitN">${o.guests>1?o.guests:2}</b><button type="button" data-s="1">+</button></div><span id="splitEach"></span></div>`;
          // Kişi başı pay toplam üzerinden hesaplanır, böylece sırayla ödeyen herkes aynı tutarı öder
          const upd=()=>{const n=+area.querySelector('#splitN').textContent,each=r2(t.total/n);area.querySelector('#splitEach').innerHTML=`Kişi başı <b>${money(each)}</b>${each>t.remaining?' (kalan kadar)':''}`;setAmount(each)};
          area.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{const el=area.querySelector('#splitN');el.textContent=Math.max(2,Math.min(30,+el.textContent+ +b.dataset.s));upd()});upd();
        }else{
          area.innerHTML=`<div class="pay-items">${payable.map(i=>{const left=i.qty-num(i.paidQty);return `<div class="pay-item"><span>${esc(i.name)}<small>${money(i.price)} · ${left} adet ödenmedi</small></span><div class="stepper"><button type="button" data-u="${i.uid}" data-d="-1">−</button><b data-q="${i.uid}">${num(sel[i.uid])}</b><button type="button" data-u="${i.uid}" data-d="1">+</button></div><button type="button" class="chip" data-all="${i.uid}">Tümü</button></div>`}).join('')}</div>`;
          const upd=()=>{payable.forEach(i=>area.querySelector(`[data-q="${i.uid}"]`).textContent=num(sel[i.uid]));setAmount(itemsTotal())};
          area.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{const i=payable.find(x=>x.uid===b.dataset.u),left=i.qty-num(i.paidQty);sel[i.uid]=Math.max(0,Math.min(left,num(sel[i.uid])+ +b.dataset.d));upd()});
          area.querySelectorAll('[data-all]').forEach(b=>b.onclick=()=>{const i=payable.find(x=>x.uid===b.dataset.all);sel[i.uid]=i.qty-num(i.paidQty);upd()});upd();
        }
      };
      f.querySelectorAll('#payMode button').forEach(b=>b.onclick=()=>{mode=b.dataset.v;f.querySelectorAll('#payMode button').forEach(x=>x.classList.toggle('active',x===b));for(const k in sel)delete sel[k];drawMode()});
      f.querySelectorAll('#payMethod button').forEach(b=>b.onclick=()=>{method=b.dataset.v;f.querySelectorAll('#payMethod button').forEach(x=>x.classList.toggle('active',x===b));f.querySelector('#cashArea').classList.toggle('hidden',method!=='cash')});
      f.amount.oninput=()=>{updateChange();updateQuick()};f.given.oninput=updateChange;
      drawMode();
    }});
}
function closeOrder(o){
  Object.assign(o,{status:'paid',closedAt:nowISO(),closedBy:me().name,billRequested:false});
  liveItems(o).forEach(i=>{if(i.state!=='served'){i.state='served';i.servedAt=i.servedAt||nowISO()}});
  save();
  const back=o.type==='table'?'tables':'takeaway';
  ui.view=back;render();
  ask('Hesap kapandı ✓',`${esc(orderTitle(o))} — ${money(totals(o).total)} tahsil edildi. Fiş yazdırılsın mı?`,'🖨️ Fiş Yazdır').then(y=>{if(y)printDoc(receiptHTML(o),{title:'Fiş'})});
}

/* ---------- Mutfak & Bar ---------- */
let lastKitchenCount=null;
function beep(){try{const C=window.AudioContext||window.webkitAudioContext,c=new C(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;g.gain.value=.12;o.start();o.stop(c.currentTime+.25);setTimeout(()=>c.close(),600)}catch{}}
function renderKitchen(){
  const st=ui.station,match=i=>!i.voided&&(i.state==='sent'||i.state==='ready')&&(st==='all'||i.station===st);
  const cards=openOrders().map(o=>({o,items:o.items.filter(match)})).filter(x=>x.items.length)
    .sort((a,b)=>Math.min(...a.items.map(i=>+new Date(i.sentAt)))-Math.min(...b.items.map(i=>+new Date(i.sentAt))));
  const pending=cards.reduce((n,c)=>n+c.items.filter(i=>i.state==='sent').length,0);
  if(lastKitchenCount!==null&&pending>lastKitchenCount)beep();lastKitchenCount=pending;
  const soldOut=state.products.filter(p=>p.soldOut);
  return `<div class="toolbar"><div class="chips">${[['all','Tümü'],['kitchen','🍳 Mutfak'],['bar','☕ Bar']].map(([v,l])=>chip(l,st===v,'station',v)).join('')}</div>
    <div class="stats"><span>Bekleyen <b>${pending}</b></span><button class="btn ghost sm" data-act="soldOutModal">🚫 Tükenenler${soldOut.length?` (${soldOut.length})`:''}</button></div></div>
    <div class="kds-grid">${cards.map(({o,items})=>{
      const oldest=Math.min(...items.filter(i=>i.state==='sent').map(i=>+new Date(i.sentAt)));const m=Number.isFinite(oldest)?minsSince(oldest):0;
      const allReady=items.every(i=>i.state==='ready');
      return `<article class="kds-card ${allReady?'done':m>=20?'late':m>=10?'warn':''}">
        <header><b>${esc(orderTitle(o))}</b><span>${allReady?'✓ Hazır':`⏱ ${m} dk`}</span></header>
        <small>#${o.no} · ${esc(o.waiter||'')}</small>
        <ul>${items.map(i=>`<li class="${i.state}"><button type="button" data-act="kdsToggle" data-o="${o.id}" data-uid="${i.uid}"><b>${i.qty}×</b> ${esc(i.name)}${st==='all'?` <em>${STATIONS[i.station]||''}</em>`:''}${i.note?`<span class="note">📝 ${esc(i.note)}</span>`:''}</button></li>`).join('')}</ul>
        ${allReady?'':`<button class="btn success wide" data-act="kdsAll" data-o="${o.id}">✓ Tümü Hazır</button>`}
      </article>`}).join('')||'<div class="empty big">🌿 Bekleyen sipariş yok</div>'}</div>`;
}
function kdsToggle(oid,u){const o=orderById(oid),i=o?.items.find(x=>x.uid===u);if(!i)return;i.state=i.state==='ready'?'sent':'ready';if(i.state==='ready')i.readyAt=nowISO();save();render()}
function kdsAll(oid){const o=orderById(oid);const st=ui.station;o.items.forEach(i=>{if(!i.voided&&i.state==='sent'&&(st==='all'||i.station===st)){i.state='ready';i.readyAt=nowISO()}});save();render()}
function soldOutModal(){
  modal({title:'Tükenen ürünler',wide:true,body:`<p class="muted">Tükendi olarak işaretlenen ürünler siparişe eklenemez ve QR menüde “Tükendi” görünür.</p>
    <input class="search" type="search" placeholder="🔍 Ürün ara…" id="soSearch"><div class="so-list" id="soList"></div>`,
    actions:[{label:'Tamam',cls:'primary',run:()=>render()}],
    onOpen:f=>{const draw=()=>{const q=lower(f.querySelector('#soSearch').value);f.querySelector('#soList').innerHTML=state.products.filter(p=>p.active&&(!q||lower(p.name).includes(q))).map(p=>`<label class="so-item ${p.soldOut?'on':''}"><input type="checkbox" data-p="${p.id}" ${p.soldOut?'checked':''}> ${esc(p.name)}</label>`).join('');
      f.querySelectorAll('[data-p]').forEach(c=>c.onchange=()=>{productById(c.dataset.p).soldOut=c.checked;c.parentElement.classList.toggle('on',c.checked);save()})};
      f.querySelector('#soSearch').oninput=draw;draw()}});
}

/* ---------- Rezervasyon ---------- */
function renderReservations(){
  const list=state.reservations.filter(r=>r.date===ui.resDate).sort((a,b)=>a.time.localeCompare(b.time));
  const guests=sum(list.filter(r=>r.status!=='cancelled'&&r.status!=='noshow').map(r=>r.guests));
  return `<div class="toolbar"><div class="row-gap"><button class="btn ghost sm" data-act="resDay" data-v="-1">◀</button><input type="date" value="${ui.resDate}" data-input="resDate" class="date-in"><button class="btn ghost sm" data-act="resDay" data-v="1">▶</button><button class="btn ghost sm" data-act="resDay" data-v="0">Bugün</button></div>
    <div class="row-gap"><span class="stats"><span>${list.length} rezervasyon · <b>${guests}</b> kişi</span></span><button class="btn primary" data-act="resEdit">＋ Rezervasyon</button></div></div>
    <div class="res-list">${list.map(r=>{const t=tableById(r.tableId);return `<article class="res-card s-${r.status}">
      <div class="res-time">${esc(r.time)}</div>
      <div class="res-info"><b>${esc(r.name)}</b> <span class="pill">${r.guests} kişi</span> <span class="pill s-${r.status}">${RES_STATES[r.status]}</span>
        <small>${r.phone?`📞 <a href="tel:${esc(r.phone)}">${esc(r.phone)}</a> · `:''}${t?`🪑 ${esc(t.name)} (${esc(t.area)})`:r.area?`📍 ${esc(r.area)}`:'Masa seçilmedi'}</small>${r.note?`<small>📝 ${esc(r.note)}</small>`:''}</div>
      <div class="res-actions">${r.status==='waiting'?`<button class="btn xs success" data-act="resSeat" data-id="${r.id}">Geldi</button><button class="btn xs ghost" data-act="resStatus" data-id="${r.id}" data-v="noshow">Gelmedi</button><button class="btn xs ghost" data-act="resStatus" data-id="${r.id}" data-v="cancelled">İptal</button>`:`<button class="btn xs ghost" data-act="resStatus" data-id="${r.id}" data-v="waiting">Geri al</button>`}<button class="btn xs ghost" data-act="resEdit" data-id="${r.id}">✏️</button></div>
    </article>`}).join('')||'<div class="empty">Bu gün için rezervasyon yok.</div>'}</div>`;
}
function resEditModal(id){
  const r=state.reservations.find(x=>x.id===id)||{date:ui.resDate,time:'19:00',guests:2,name:'',phone:'',area:state.areas[0]||'',tableId:'',note:'',status:'waiting'};
  modal({title:id?'Rezervasyonu düzenle':'Yeni rezervasyon',body:`<div class="grid2">
    ${field('Ad soyad',`<input name="name" value="${esc(r.name)}" required>`)}
    ${field('Telefon',`<input name="phone" type="tel" value="${esc(r.phone)}">`)}
    ${field('Tarih',`<input name="date" type="date" value="${r.date}" required>`)}
    ${field('Saat',`<input name="time" type="time" value="${r.time}" required>`)}
    ${field('Kişi',`<input name="guests" type="number" min="1" value="${r.guests}" inputmode="numeric" required>`)}
    ${field('Alan',`<select name="area">${opts([['','Fark etmez'],...state.areas.map(a=>[a,a])],r.area)}</select>`)}
    ${field('Masa',`<select name="tableId">${opts([['','Seçilmedi'],...state.tables.map(t=>[t.id,`${t.name} · ${t.area} (${t.seats||'-'} kişilik)`])],r.tableId)}</select>`,'span2')}
    ${field('Not',`<input name="note" value="${esc(r.note)}" placeholder="Doğum günü, mama sandalyesi…">`,'span2')}</div>`,
    actions:[...(id?[{label:'Sil',cls:'ghost danger-text',run:()=>{state.reservations=state.reservations.filter(x=>x.id!==id);save();render()}}]:[]),{label:'Vazgeç',cls:'ghost'},{label:'Kaydet',cls:'primary',submit:true,run:f=>{
      const data={name:f.name.value.trim(),phone:f.phone.value.trim(),date:f.date.value,time:f.time.value,guests:Math.max(1,Math.round(num(f.guests.value))),area:f.area.value,tableId:f.tableId.value,note:f.note.value.trim()};
      if(data.tableId){const t=tableById(data.tableId);data.area=t.area}
      if(id)Object.assign(r,data);else state.reservations.push({id:uid(),status:'waiting',createdAt:nowISO(),createdBy:me().name,...data});
      ui.resDate=data.date;save();render();toast('Rezervasyon kaydedildi');
    }}]});
}
function resSeat(id){
  const r=state.reservations.find(x=>x.id===id);if(!r)return;
  r.status='seated';save();
  const seat=t=>{let o=openOrderForTable(t);if(!o)o=newOrder({type:'table',tableId:t,serviceRate:num(state.settings.serviceRate),guests:r.guests,note:`Rezervasyon: ${r.name}`});else if(!o.guests)o.guests=r.guests;save();goOrder(o.id)};
  if(r.tableId&&!openOrderForTable(r.tableId)?.items.length)return seat(r.tableId);
  const free=state.tables.filter(t=>!openOrderForTable(t.id)?.items.length&&(!r.area||t.area===r.area));
  modal({title:`${r.name} — masa seç`,wide:true,body:`<div class="pick-grid">${free.map(t=>`<button type="button" class="btn ghost" data-t="${t.id}"><b>${esc(t.name)}</b><small>${esc(t.area)} · ${t.seats||'-'} kişilik</small></button>`).join('')||'<p>Boş masa yok.</p>'}</div>`,
    actions:[{label:'Masasız devam',cls:'ghost',run:()=>render()}],
    onOpen:f=>f.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{closeModal();seat(b.dataset.t)})});
}

/* ---------- Menü yönetimi ---------- */
function renderMenu(){
  const cats=sortedCats();if(ui.menuCat!=='all'&&!catById(ui.menuCat))ui.menuCat=cats[0]?.id||'all';
  const prods=state.products.filter(p=>ui.menuCat==='all'||p.catId===ui.menuCat);
  return `<div class="toolbar"><div class="chips scroll">${chip('Tümü',ui.menuCat==='all','menuCat','all')}${cats.map(c=>chip(`${esc(c.icon||'')} ${esc(c.name)} <small>${state.products.filter(p=>p.catId===c.id).length}</small>`,ui.menuCat===c.id,'menuCat',c.id)).join('')}</div>
    <div class="row-gap"><button class="btn ghost" data-act="catEdit">＋ Kategori</button>${ui.menuCat!=='all'?`<button class="btn ghost" data-act="catEdit" data-id="${ui.menuCat}">✏️ Kategoriyi düzenle</button>`:''}<button class="btn primary" data-act="prodEdit">＋ Ürün</button></div></div>
    <div class="qr-box"><div><b>📱 QR Menü</b><small>Menüyü <code>menu.json</code> olarak indir, uygulamanın yayınlandığı klasöre (menu.html yanına) yükle. QR kodu <code>…/menu.html</code> adresine yönlendir.</small></div><div class="row-gap"><button class="btn ghost sm" data-act="exportMenu">⬇ menu.json indir</button><a class="btn ghost sm" href="menu.html" target="_blank" rel="noopener">👁 Önizle</a><button class="btn ghost sm" data-act="printMenu">🖨️ Menü yazdır</button></div></div>
    <div class="table-wrap"><table class="data"><thead><tr><th>Ürün</th><th>Kategori</th><th>Hazırlayan</th><th class="num">Fiyat</th><th>Durum</th><th></th></tr></thead><tbody>
    ${prods.map(p=>`<tr class="${p.active?'':'inactive'}"><td><b>${esc(p.name)}</b>${p.desc?`<small>${esc(p.desc)}</small>`:''}</td><td>${esc(catById(p.catId)?.name||'-')}</td><td>${STATIONS[p.station]||'-'}</td><td class="num">${money(p.price)}</td>
      <td><button class="pill-btn ${p.active?'on':''}" data-act="prodToggle" data-id="${p.id}" data-k="active">${p.active?'Satışta':'Pasif'}</button> <button class="pill-btn ${p.soldOut?'warn':''}" data-act="prodToggle" data-id="${p.id}" data-k="soldOut">${p.soldOut?'Tükendi':'Var'}</button></td>
      <td><button class="btn xs ghost" data-act="prodEdit" data-id="${p.id}">✏️</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">Ürün yok.</td></tr>'}
    </tbody></table></div>`;
}
function catEditModal(id){
  const c=catById(id)||{name:'',icon:'🍽️',order:state.categories.length};
  modal({title:id?'Kategoriyi düzenle':'Yeni kategori',body:`<div class="grid2">${field('Ad',`<input name="name" value="${esc(c.name)}" required>`)}${field('Simge (emoji)',`<input name="icon" value="${esc(c.icon)}" maxlength="4">`)}${field('Sıra',`<input name="order" type="number" value="${num(c.order)}">`)}</div>`,
    actions:[...(id?[{label:'Sil',cls:'ghost danger-text',run:()=>{if(state.products.some(p=>p.catId===id))return toast('Önce kategorideki ürünleri taşı veya sil'),false;state.categories=state.categories.filter(x=>x.id!==id);ui.menuCat=null;save();render()}}]:[]),{label:'Vazgeç',cls:'ghost'},{label:'Kaydet',cls:'primary',submit:true,run:f=>{
      const data={name:f.name.value.trim(),icon:f.icon.value.trim(),order:num(f.order.value)};
      if(id)Object.assign(c,data);else{const n={id:uid(),...data};state.categories.push(n);ui.menuCat=n.id}
      save();render();
    }}]});
}
function prodEditModal(id){
  const cats=sortedCats();if(!cats.length)return toast('Önce bir kategori ekle');
  const p=productById(id)||{name:'',catId:ui.menuCat!=='all'?ui.menuCat:cats[0].id,price:'',station:'kitchen',desc:'',active:true,soldOut:false};
  modal({title:id?'Ürünü düzenle':'Yeni ürün',body:`<div class="grid2">
    ${field('Ürün adı',`<input name="name" value="${esc(p.name)}" required>`,'span2')}
    ${field('Kategori',`<select name="catId">${opts(cats.map(c=>[c.id,`${c.icon||''} ${c.name}`]),p.catId)}</select>`)}
    ${field('Fiyat (₺)',`<input name="price" type="number" min="0" step="0.01" value="${esc(p.price)}" inputmode="decimal" required>`)}
    ${field('Hazırlayan',`<select name="station">${opts(Object.entries(STATIONS),p.station)}</select>`)}
    ${field('Durum',`<select name="active">${opts([['1','Satışta'],['0','Pasif']],p.active?'1':'0')}</select>`)}
    ${field('Açıklama (QR menüde görünür)',`<input name="desc" value="${esc(p.desc)}">`,'span2')}</div>`,
    actions:[...(id?[{label:'Sil',cls:'ghost danger-text',run:()=>{ask('Ürünü sil',`${esc(p.name)} silinsin mi? Geçmiş satış kayıtları korunur.`,'Sil','danger').then(y=>{if(y){state.products=state.products.filter(x=>x.id!==id);save();render()}});return false}}]:[]),{label:'Vazgeç',cls:'ghost'},{label:'Kaydet',cls:'primary',submit:true,run:f=>{
      const data={name:f.name.value.trim(),catId:f.catId.value,price:r2(num(f.price.value)),station:f.station.value,active:f.active.value==='1',desc:f.desc.value.trim()};
      if(id)Object.assign(p,data);else state.products.push({id:uid(),soldOut:false,...data});
      save();render();toast('Ürün kaydedildi');
    }}]});
}
function menuJSON(){
  const s=state.settings;
  return {name:s.name,phone:s.phone,address:s.address,instagram:s.instagram,wifi:s.wifi,updatedAt:nowISO(),
    categories:sortedCats().map(c=>({name:c.name,icon:c.icon,items:state.products.filter(p=>p.catId===c.id&&p.active).map(p=>({name:p.name,price:p.price,desc:p.desc,soldOut:!!p.soldOut}))})).filter(c=>c.items.length)};
}
function printMenu(){
  const m=menuJSON();
  printDoc(`<div class="menu-print"><h1>${esc(m.name)}</h1>${m.categories.map(c=>`<section><h2>${esc(c.icon||'')} ${esc(c.name)}</h2>${c.items.map(i=>`<div class="mp-row"><span><b>${esc(i.name)}</b>${i.desc?`<small>${esc(i.desc)}</small>`:''}</span><span class="mp-dots"></span><b>${money(i.price)}</b></div>`).join('')}</section>`).join('')}${m.wifi?`<p class="mp-foot">Wi-Fi: ${esc(m.wifi)}</p>`:''}</div>`,{width:'A4',title:'Menü'});
}

/* ---------- Kasa & Gün Sonu ---------- */
function dayBounds(d=new Date()){const a=new Date(d);a.setHours(0,0,0,0);const b=new Date(a);b.setDate(b.getDate()+1);return [a,b]}
function paymentsBetween(a,b){return state.orders.filter(o=>o.status!=='cancelled').flatMap(o=>o.payments.map(p=>({...p,o}))).filter(p=>{const t=new Date(p.at);return t>=a&&t<b})}
function cashSummary(a,b){
  const pays=paymentsBetween(a,b),by=m=>r2(sum(pays.filter(p=>p.method===m).map(p=>p.amount)));
  const moves=state.cashMoves.filter(m=>{const t=new Date(m.at);return t>=a&&t<b});
  const ins=r2(sum(moves.filter(m=>m.type==='in').map(m=>m.amount))),outs=r2(sum(moves.filter(m=>m.type==='out').map(m=>m.amount)));
  const cash=by('cash'),card=by('card'),other=by('other');
  return {pays,moves,cash,card,other,total:r2(cash+card+other),ins,outs,expected:r2(cash+ins-outs)};
}
function renderCash(){
  const [a,b]=dayBounds(),s=cashSummary(a,b),open=openOrders().filter(o=>liveItems(o).length);
  const closings=[...state.dayClosings].sort((x,y)=>y.at.localeCompare(x.at)).slice(0,30);
  return `<div class="kpi-grid">
      <article class="kpi accent"><span>Bugünkü tahsilat</span><strong>${money(s.total)}</strong><small>${s.pays.length} ödeme</small></article>
      <article class="kpi"><span>💵 Nakit</span><strong>${money(s.cash)}</strong></article>
      <article class="kpi"><span>💳 Kart</span><strong>${money(s.card)}</strong></article>
      <article class="kpi"><span>🎫 Diğer</span><strong>${money(s.other)}</strong></article>
      <article class="kpi"><span>Kasada olması gereken</span><strong>${money(s.expected)}</strong><small>Nakit + giriş − çıkış</small></article>
      <article class="kpi ${open.length?'warn':''}"><span>Açık hesaplar</span><strong>${money(sum(open.map(o=>totals(o).remaining)))}</strong><small>${open.length} adisyon</small></article>
    </div>
    <div class="toolbar"><div class="row-gap"><button class="btn ghost" data-act="cashMove" data-v="in">＋ Kasa Girişi</button><button class="btn ghost" data-act="cashMove" data-v="out">− Kasa Çıkışı / Gider</button></div><button class="btn primary" data-act="dayClose">🧮 Gün Sonu (Z)</button></div>
    <div class="two-col">
      <section class="panel"><h3>Bugünkü kasa hareketleri</h3>${s.moves.length?`<ul class="list">${s.moves.map(m=>`<li><span><b>${esc(m.category)}</b><small>${[timeStr(m.at),m.desc,m.by].filter(Boolean).map(esc).join(' · ')}</small></span><b class="${m.type==='in'?'pos':'neg'}">${m.type==='in'?'+':'−'}${money(m.amount)}</b>${isAdmin()?`<button class="btn xs ghost" data-act="cashDel" data-id="${m.id}">✕</button>`:''}</li>`).join('')}</ul>`:'<p class="muted">Hareket yok. Güne başlarken kasadaki parayı “Açılış / Devir” olarak gir.</p>'}</section>
      <section class="panel"><h3>Bugünkü ödemeler</h3>${s.pays.length?`<ul class="list">${[...s.pays].reverse().slice(0,40).map(p=>`<li><span><b>${esc(orderTitle(p.o))}</b><small>${timeStr(p.at)} · ${METHODS[p.method]} · ${esc(p.by)}</small></span><b>${money(p.amount)}</b></li>`).join('')}</ul>`:'<p class="muted">Henüz ödeme yok.</p>'}</section>
    </div>
    <section class="panel"><h3>Geçmiş gün sonları</h3>${closings.length?`<div class="table-wrap"><table class="data"><thead><tr><th>Tarih</th><th class="num">Toplam</th><th class="num">Nakit</th><th class="num">Kart</th><th class="num">Beklenen</th><th class="num">Sayılan</th><th class="num">Fark</th><th></th></tr></thead><tbody>${closings.map(z=>`<tr><td>${dateStr(z.at)} ${timeStr(z.at)}<small>${esc(z.by)}</small></td><td class="num">${money(z.total)}</td><td class="num">${money(z.cash)}</td><td class="num">${money(z.card)}</td><td class="num">${money(z.expected)}</td><td class="num">${money(z.counted)}</td><td class="num ${z.diff<0?'neg':z.diff>0?'pos':''}">${money(z.diff)}</td><td><button class="btn xs ghost" data-act="printZ" data-id="${z.id}">🖨️</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Henüz gün sonu alınmadı.</p>'}</section>`;
}
function cashMoveModal(type){
  const cats=type==='in'?['Açılış / Devir','Diğer Gelir','Para Ekleme']:['Gider: Market / Malzeme','Gider: Personel','Gider: Fatura','Gider: Kira','Kasadan Para Alma','Diğer Gider'];
  modal({title:type==='in'?'Kasa girişi':'Kasa çıkışı / gider',body:`${field('Tür',`<select name="category">${opts(cats.map(c=>[c,c]),cats[0])}</select>`)}${field('Tutar (₺)','<input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" required>')}${field('Açıklama','<input name="desc">')}`,
    actions:[{label:'Vazgeç',cls:'ghost'},{label:'Kaydet',cls:'primary',submit:true,run:f=>{const amount=r2(num(f.amount.value));if(amount<=0)return toast('Tutar girin'),false;state.cashMoves.push({id:uid(),type,category:f.category.value,amount,desc:f.desc.value.trim(),at:nowISO(),by:me().name});save();render();toast('Kasa hareketi kaydedildi')}}],
    onOpen:f=>f.amount.focus()});
}
function dayCloseModal(){
  const [a,b]=dayBounds(),s=cashSummary(a,b),open=openOrders().filter(o=>liveItems(o).length),todayZ=state.dayClosings.filter(z=>dayKey(z.at)===dayKey());
  modal({title:`Gün sonu · ${dateStr(new Date())}`,body:`
    ${open.length?`<p class="alert">⚠ ${open.length} açık adisyon var (${money(sum(open.map(o=>totals(o).remaining)))}). Gün sonundan önce kapatman önerilir.</p>`:''}
    ${todayZ.length?`<p class="alert">Bugün ${todayZ.length} kez gün sonu alındı. Yeni kayıt bugünün tamamını tekrar özetler.</p>`:''}
    <div class="z-grid"><span>Nakit tahsilat</span><b>${money(s.cash)}</b><span>Kart</span><b>${money(s.card)}</b><span>Diğer</span><b>${money(s.other)}</b><span>Toplam tahsilat</span><b>${money(s.total)}</b><span>Kasa girişleri</span><b>${money(s.ins)}</b><span>Kasa çıkışları</span><b>${money(s.outs)}</b><span><b>Kasada olması gereken</b></span><b>${money(s.expected)}</b></div>
    ${field('Sayılan nakit (₺)','<input name="counted" type="number" min="0" step="0.01" inputmode="decimal" required>')}
    <p class="change" id="zDiff"></p>${field('Not','<input name="note">')}`,
    actions:[{label:'Vazgeç',cls:'ghost'},{label:'Gün Sonunu Kaydet',cls:'primary',submit:true,run:f=>{
      const counted=r2(num(f.counted.value)),z={id:uid(),at:nowISO(),by:me().name,cash:s.cash,card:s.card,other:s.other,total:s.total,ins:s.ins,outs:s.outs,expected:s.expected,counted,diff:r2(counted-s.expected),note:f.note.value.trim(),orders:new Set(s.pays.map(p=>p.o.id)).size};
      state.dayClosings.push(z);save();render();toast('Gün sonu kaydedildi');printZ(z.id);
    }}],
    onOpen:f=>{f.counted.oninput=()=>{const d=r2(num(f.counted.value)-s.expected);f.querySelector('#zDiff').innerHTML=f.counted.value===''?'':d===0?'✓ Kasa tuttu':`Fark: <b class="${d<0?'neg':'pos'}">${money(d)}</b>`};f.counted.focus()}});
}
function printZ(id){
  const z=state.dayClosings.find(x=>x.id===id);if(!z)return;
  const row=(l,v)=>`<div class="r-line"><span>${l}</span><span>${money(v)}</span></div>`;
  printDoc(`<div class="receipt">${receiptHeader()}<div class="r-title">GÜN SONU (Z) RAPORU</div><div class="r-line r-muted"><span>${dateStr(z.at)} ${timeStr(z.at)}</span><span>${esc(z.by)}</span></div><div class="r-sep"></div>
    ${row('Nakit',z.cash)}${row('Kredi Kartı',z.card)}${row('Diğer',z.other)}<div class="r-line r-total"><b>TOPLAM</b><b>${money(z.total)}</b></div><div class="r-sep"></div>
    ${row('Kasa girişleri',z.ins)}${row('Kasa çıkışları',z.outs)}${row('Beklenen nakit',z.expected)}${row('Sayılan nakit',z.counted)}<div class="r-line r-total"><b>FARK</b><b>${money(z.diff)}</b></div>
    ${z.note?`<div class="r-sep"></div><p>${esc(z.note)}</p>`:''}</div>`,{title:'Gün sonu'});
}

/* ---------- Raporlar ---------- */
function rangeBounds(){
  const [d]=dayBounds();let from=new Date(d),to=new Date(d);to.setDate(to.getDate()+1);
  if(ui.range==='yesterday'){from.setDate(from.getDate()-1);to=new Date(d)}
  else if(ui.range==='week')from.setDate(from.getDate()-6);
  else if(ui.range==='month')from.setDate(1);
  else if(ui.range==='custom'){if(ui.from)from=new Date(ui.from+'T00:00');if(ui.to){to=new Date(ui.to+'T00:00');to.setDate(to.getDate()+1)}}
  return [from,to];
}
function bars(rows,fmt=money){const max=Math.max(...rows.map(r=>r[1]),0)||1;return `<div class="bars">${rows.map(([l,v,extra])=>`<div class="bar-row"><span class="bl">${esc(l)}</span><div class="bt"><div style="width:${Math.max(2,v/max*100)}%"></div></div><b>${fmt(v)}</b>${extra?`<small>${extra}</small>`:''}</div>`).join('')}</div>`}
function renderReports(){
  const [a,b]=rangeBounds(),inRange=d=>{const t=new Date(d);return t>=a&&t<b};
  const pays=paymentsBetween(a,b),revenue=r2(sum(pays.map(p=>p.amount)));
  const closed=state.orders.filter(o=>o.status==='paid'&&inRange(o.closedAt)),cancelled=state.orders.filter(o=>o.status==='cancelled'&&inRange(o.closedAt));
  const closedTotal=sum(closed.map(o=>totals(o).total)),guests=sum(closed.map(o=>o.guests));
  const items=closed.flatMap(o=>liveItems(o));
  const comp=sum(items.filter(i=>i.comp).map(i=>i.price*i.qty)),disc=sum(closed.map(o=>totals(o).disc));
  const voids=state.orders.filter(o=>o.status!=='open').flatMap(o=>o.items.filter(i=>i.voided&&inRange(i.voidedAt||o.closedAt)));
  const prod={};items.filter(i=>!i.comp).forEach(i=>{const k=i.name;prod[k]=prod[k]||{q:0,t:0,cat:catById(productById(i.pid)?.catId)?.name||'Diğer'};prod[k].q+=i.qty;prod[k].t+=i.qty*i.price});
  const top=Object.entries(prod).sort((x,y)=>y[1].q-x[1].q);
  const cat={};Object.values(prod).forEach(p=>{cat[p.cat]=(cat[p.cat]||0)+p.t});
  const hours={};closed.forEach(o=>{const h=new Date(o.closedAt).getHours();hours[h]=(hours[h]||0)+totals(o).total});
  const hourRows=Object.keys(hours).map(Number).sort((x,y)=>x-y).map(h=>[`${pad(h)}:00`,hours[h]]);
  const waiters={};closed.forEach(o=>{const w=o.waiter||'-';waiters[w]=waiters[w]||{n:0,t:0};waiters[w].n++;waiters[w].t+=totals(o).total});
  const types={table:'Masa',takeaway:'Gel-Al',delivery:'Paket'},byType={};closed.forEach(o=>{byType[types[o.type]]=(byType[types[o.type]]||0)+totals(o).total});
  return `<div class="toolbar"><div class="chips">${[['today','Bugün'],['yesterday','Dün'],['week','Son 7 gün'],['month','Bu ay'],['custom','Tarih seç']].map(([v,l])=>chip(l,ui.range===v,'range',v)).join('')}</div>
    ${ui.range==='custom'?`<div class="row-gap"><input type="date" class="date-in" data-input="from" value="${ui.from}"> – <input type="date" class="date-in" data-input="to" value="${ui.to}"></div>`:''}
    <button class="btn ghost sm" data-act="exportCSV">⬇ CSV</button></div>
    <p class="muted">${dateStr(a)} – ${dateStr(new Date(b-1))}</p>
    <div class="kpi-grid">
      <article class="kpi accent"><span>Tahsilat</span><strong>${money(revenue)}</strong><small>${pays.length} ödeme</small></article>
      <article class="kpi"><span>Kapanan hesap</span><strong>${closed.length}</strong><small>${money(closedTotal)}</small></article>
      <article class="kpi"><span>Ortalama hesap</span><strong>${money(closed.length?closedTotal/closed.length:0)}</strong><small>${guests?`Kişi başı ${money(closedTotal/guests)}`:'Kişi sayısı girilmedi'}</small></article>
      <article class="kpi"><span>🎁 İkram</span><strong>${money(comp)}</strong></article>
      <article class="kpi"><span>🏷️ İskonto</span><strong>${money(disc)}</strong></article>
      <article class="kpi ${voids.length||cancelled.length?'warn':''}"><span>İptaller</span><strong>${money(sum(voids.map(i=>i.price*i.qty)))}</strong><small>${voids.length} ürün · ${cancelled.length} adisyon</small></article>
    </div>
    <div class="two-col">
      <section class="panel"><h3>Ödeme türleri</h3>${pays.length?bars(Object.entries(METHODS).map(([k,l])=>[l,r2(sum(pays.filter(p=>p.method===k).map(p=>p.amount)))])):'<p class="muted">Veri yok.</p>'}</section>
      <section class="panel"><h3>Sipariş türü</h3>${closed.length?bars(Object.entries(byType)):'<p class="muted">Veri yok.</p>'}</section>
      <section class="panel"><h3>Kategoriler</h3>${Object.keys(cat).length?bars(Object.entries(cat).sort((x,y)=>y[1]-x[1])):'<p class="muted">Veri yok.</p>'}</section>
      <section class="panel"><h3>Saatlere göre</h3>${hourRows.length?bars(hourRows):'<p class="muted">Veri yok.</p>'}</section>
      <section class="panel"><h3>Personel</h3>${Object.keys(waiters).length?bars(Object.entries(waiters).sort((x,y)=>y[1].t-x[1].t).map(([w,v])=>[w,v.t,`${v.n} hesap`])):'<p class="muted">Veri yok.</p>'}</section>
      <section class="panel"><h3>En çok satanlar</h3>${top.length?`<div class="table-wrap"><table class="data compact"><thead><tr><th>#</th><th>Ürün</th><th class="num">Adet</th><th class="num">Tutar</th></tr></thead><tbody>${top.slice(0,15).map(([n,v],i)=>`<tr><td>${i+1}</td><td>${esc(n)}</td><td class="num">${v.q}</td><td class="num">${money(v.t)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Veri yok.</p>'}</section>
    </div>`;
}
function exportCSV(){
  const [a,b]=rangeBounds(),rows=[['No','Tür','Masa/Müşteri','Açılış','Kapanış','Garson','Kişi','Ara Toplam','İkram','İskonto','Servis','Toplam','Nakit','Kart','Diğer','Durum']];
  state.orders.filter(o=>o.status!=='open'&&new Date(o.closedAt)>=a&&new Date(o.closedAt)<b).forEach(o=>{const t=totals(o),pm=m=>r2(sum(o.payments.filter(p=>p.method===m).map(p=>p.amount)));
    rows.push([o.no,o.type,orderTitle(o),new Date(o.openedAt).toLocaleString('tr-TR'),new Date(o.closedAt).toLocaleString('tr-TR'),o.waiter,o.guests||'',t.gross,t.comp,t.disc,t.service,t.total,pm('cash'),pm('card'),pm('other'),o.status==='paid'?'Ödendi':'İptal'])});
  const csv='﻿'+rows.map(r=>r.map(v=>typeof v==='number'?String(v).replace('.',','):`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');
  downloadFile(`poesia-rapor-${dayKey(a)}_${dayKey(new Date(b-1))}.csv`,csv,'text/csv');
}

/* ---------- Ayarlar ---------- */
function renderSettings(){
  const tabs=[['business','🏡 İşletme'],['tables','🪑 Masalar'],['staff','🧑‍🍳 Personel'],['data','💾 Yedek & Veri']];
  const s=state.settings;let body='';
  if(ui.settingsTab==='business')body=`<form class="panel settings-form" id="bizForm"><div class="grid2">
      ${field('İşletme adı',`<input name="name" value="${esc(s.name)}" required>`)}
      ${field('Telefon',`<input name="phone" value="${esc(s.phone)}">`)}
      ${field('Adres',`<input name="address" value="${esc(s.address)}">`,'span2')}
      ${field('Instagram',`<input name="instagram" value="${esc(s.instagram)}" placeholder="@poesiagardencafe">`)}
      ${field('Wi-Fi (fişte ve QR menüde görünür)',`<input name="wifi" value="${esc(s.wifi)}" placeholder="Ağ adı / şifre">`)}
      ${field('Servis ücreti (masa siparişleri, %)',`<input name="serviceRate" type="number" min="0" max="30" step="0.5" value="${num(s.serviceRate)}">`)}
      ${field('Fiş genişliği',`<select name="receiptWidth">${opts([['80','80 mm termal'],['58','58 mm termal'],['A4','A4']],s.receiptWidth)}</select>`)}
      ${field('Fiş alt yazısı',`<input name="footer" value="${esc(s.footer)}">`,'span2')}
      <label class="check span2"><input type="checkbox" name="kitchenTicket" ${s.kitchenTicket?'checked':''}> Siparişi gönderince mutfak / bar fişi yazdır</label>
      <label class="check span2"><input type="checkbox" name="waiterPayment" ${s.waiterPayment?'checked':''}> Garsonlar ödeme alabilir</label>
      <label class="check span2"><input type="checkbox" name="waiterDiscount" ${s.waiterDiscount?'checked':''}> Garsonlar iskonto ve ikram yapabilir</label>
    </div><footer><button class="btn primary" data-act="saveBiz" type="button">Kaydet</button></footer></form>`;
  else if(ui.settingsTab==='tables')body=`<div class="toolbar"><div class="row-gap"><button class="btn primary" data-act="tableEdit">＋ Masa</button><button class="btn ghost" data-act="tableBulk">＋ Toplu masa ekle</button><button class="btn ghost" data-act="areaEdit">＋ Alan</button></div></div>
    ${state.areas.map(a=>`<section class="panel"><h3>${esc(a)} <button class="btn xs ghost" data-act="areaEdit" data-v="${esc(a)}">✏️</button></h3><div class="pick-grid">${state.tables.filter(t=>t.area===a).map(t=>`<button class="btn ghost" data-act="tableEdit" data-id="${t.id}"><b>${esc(t.name)}</b><small>${t.seats||'-'} kişilik</small></button>`).join('')||'<p class="muted">Bu alanda masa yok.</p>'}</div></section>`).join('')}`;
  else if(ui.settingsTab==='staff')body=`<div class="toolbar"><button class="btn primary" data-act="staffEdit">＋ Personel</button></div>
    <div class="table-wrap"><table class="data"><thead><tr><th>Ad</th><th>Kullanıcı adı</th><th>Rol</th><th>Durum</th><th></th></tr></thead><tbody>${state.staff.map(u=>`<tr class="${u.active?'':'inactive'}"><td><b>${esc(u.name)}</b>${u.id===currentUserId?' <small>(sen)</small>':''}</td><td>${esc(u.username)}</td><td>${ROLES[u.role]}</td><td>${u.active?'Aktif':'Pasif'}</td><td><button class="btn xs ghost" data-act="staffEdit" data-id="${u.id}">✏️</button></td></tr>`).join('')}</tbody></table></div>
    <p class="muted">Garson: masalar, paket, mutfak ekranı ve rezervasyon. Mutfak / Bar: yalnızca mutfak ekranı. Yönetici: tüm bölümler.</p>`;
  else body=`<section class="panel"><h3>Yedekleme</h3><p class="muted">Veriler yalnızca bu cihazda tutulur. Düzenli yedek alıp başka bir yerde sakla. ${s.lastBackupAt?`Son yedek: <b>${dateStr(s.lastBackupAt)} ${timeStr(s.lastBackupAt)}</b>`:'<b>Henüz yedek alınmadı.</b>'}</p>
      <div class="row-gap"><button class="btn primary" data-act="backup">⬇ Yedek indir</button><label class="btn ghost">⬆ Yedekten geri yükle<input type="file" accept=".json,application/json" id="restoreFile" hidden></label></div></section>
    <section class="panel"><h3>Temizlik</h3><p class="muted">Satış verilerini temizlemek menüyü, masaları ve personeli korur; adisyonları, kasa hareketlerini, gün sonlarını ve rezervasyonları siler.</p>
      <div class="row-gap"><button class="btn ghost danger-text" data-act="clearSales">Satış verilerini temizle</button><button class="btn danger" data-act="factoryReset">Fabrika ayarlarına dön</button></div></section>
    <p class="muted">Poesia Garden Cafe v${APP_VERSION}</p>`;
  return `<div class="seg settings-tabs">${tabs.map(([k,l])=>`<button class="${ui.settingsTab===k?'active':''}" data-act="settingsTab" data-v="${k}">${l}</button>`).join('')}</div>${body}`;
}
function saveBiz(){
  const f=$('#bizForm');if(!f.reportValidity())return;
  Object.assign(state.settings,{name:f.name.value.trim(),phone:f.phone.value.trim(),address:f.address.value.trim(),instagram:f.instagram.value.trim(),wifi:f.wifi.value.trim(),serviceRate:num(f.serviceRate.value),receiptWidth:f.receiptWidth.value,footer:f.footer.value.trim(),kitchenTicket:f.kitchenTicket.checked,waiterPayment:f.waiterPayment.checked,waiterDiscount:f.waiterDiscount.checked});
  save();render();toast('Ayarlar kaydedildi');
}
function tableEditModal(id){
  const t=tableById(id)||{name:'',area:state.areas[0]||'',seats:4};
  if(!state.areas.length)return toast('Önce bir alan ekle');
  modal({title:id?`Masa ${t.name}`:'Yeni masa',body:`<div class="grid2">${field('Masa adı / no',`<input name="name" value="${esc(t.name)}" required>`)}${field('Kişi',`<input name="seats" type="number" min="1" value="${t.seats}">`)}${field('Alan',`<select name="area">${opts(state.areas.map(a=>[a,a]),t.area)}</select>`,'span2')}</div>`,
    actions:[...(id?[{label:'Sil',cls:'ghost danger-text',run:()=>{if(openOrderForTable(id)?.items.length)return toast('Açık adisyonu olan masa silinemez'),false;state.tables=state.tables.filter(x=>x.id!==id);save();render()}}]:[]),{label:'Vazgeç',cls:'ghost'},{label:'Kaydet',cls:'primary',submit:true,run:f=>{
      const data={name:f.name.value.trim(),seats:Math.max(1,Math.round(num(f.seats.value))),area:f.area.value};
      if(state.tables.some(x=>x.id!==id&&lower(x.name)===lower(data.name)))return toast('Bu isimde masa var'),false;
      if(id)Object.assign(t,data);else state.tables.push({id:uid(),...data});save();render();
    }}]});
}
function tableBulkModal(){
  if(!state.areas.length)return toast('Önce bir alan ekle');
  modal({title:'Toplu masa ekle',body:`<div class="grid2">${field('Alan',`<select name="area">${opts(state.areas.map(a=>[a,a]),state.areas[0])}</select>`)}${field('Ön ek',`<input name="prefix" value="B" placeholder="Örn. B">`)}${field('Başlangıç no','<input name="from" type="number" min="1" value="1">')}${field('Bitiş no','<input name="to" type="number" min="1" value="10">')}${field('Kişi','<input name="seats" type="number" min="1" value="4">')}</div>`,
    actions:[{label:'Vazgeç',cls:'ghost'},{label:'Ekle',cls:'primary',submit:true,run:f=>{
      const a=Math.round(num(f.from.value)),b=Math.round(num(f.to.value));if(b<a||b-a>100)return toast('Geçersiz aralık'),false;let n=0;
      for(let i=a;i<=b;i++){const name=f.prefix.value.trim()+i;if(state.tables.some(t=>lower(t.name)===lower(name)))continue;state.tables.push({id:uid(),name,area:f.area.value,seats:Math.max(1,Math.round(num(f.seats.value)))});n++}
      save();render();toast(`${n} masa eklendi`);
    }}]});
}
function areaEditModal(name){
  modal({title:name?`Alan: ${name}`:'Yeni alan',body:field('Alan adı',`<input name="name" value="${esc(name||'')}" required placeholder="Örn. Havuz Başı">`),
    actions:[...(name?[{label:'Sil',cls:'ghost danger-text',run:()=>{if(state.tables.some(t=>t.area===name))return toast('Önce bu alandaki masaları sil veya taşı'),false;state.areas=state.areas.filter(a=>a!==name);if(ui.area===name)ui.area='Tümü';save();render()}}]:[]),{label:'Vazgeç',cls:'ghost'},{label:'Kaydet',cls:'primary',submit:true,run:f=>{
      const v=f.name.value.trim();if(state.areas.some(a=>a!==name&&lower(a)===lower(v)))return toast('Bu alan zaten var'),false;
      if(name){state.areas=state.areas.map(a=>a===name?v:a);state.tables.forEach(t=>{if(t.area===name)t.area=v});state.reservations.forEach(r=>{if(r.area===name)r.area=v})}else state.areas.push(v);
      save();render();
    }}]});
}
function staffEditModal(id){
  const u=state.staff.find(x=>x.id===id)||{name:'',username:'',role:'waiter',active:true};
  modal({title:id?u.name:'Yeni personel',body:`<div class="grid2">${field('Ad soyad',`<input name="name" value="${esc(u.name)}" required>`)}${field('Kullanıcı adı',`<input name="username" value="${esc(u.username)}" required autocapitalize="none">`)}
    ${field('Rol',`<select name="role">${opts(Object.entries(ROLES),u.role)}</select>`)}${field('Durum',`<select name="active">${opts([['1','Aktif'],['0','Pasif']],u.active?'1':'0')}</select>`)}
    ${field(id?'Yeni PIN (değiştirmeyeceksen boş bırak)':'PIN (en az 4 hane)',`<input name="pin" type="password" inputmode="numeric" minlength="4" ${id?'':'required'} autocomplete="new-password">`,'span2')}</div>`,
    actions:[{label:'Vazgeç',cls:'ghost'},{label:'Kaydet',cls:'primary',submit:true,run:f=>{
      const data={name:f.name.value.trim(),username:lower(f.username.value.trim()),role:f.role.value,active:f.active.value==='1'},pin=f.pin.value.trim();
      if(state.staff.some(x=>x.id!==id&&lower(x.username)===data.username))return toast('Bu kullanıcı adı kullanılıyor'),false;
      if(pin&&!/^\d{4,8}$/.test(pin))return toast('PIN 4-8 haneli rakam olmalı'),false;
      const admins=state.staff.filter(x=>x.role==='admin'&&x.active&&x.id!==id);
      if(id&&u.role==='admin'&&(data.role!=='admin'||!data.active)&&!admins.length)return toast('En az bir aktif yönetici kalmalı'),false;
      if(id===currentUserId&&!data.active)return toast('Kendi hesabını pasif yapamazsın'),false;
      if(id){Object.assign(u,data);if(pin)setPin(u,pin)}else{const n={id:uid(),...data};setPin(n,pin);state.staff.push(n)}
      save();render();toast('Personel kaydedildi');
    }}]});
}
function backup(){
  state.settings.lastBackupAt=nowISO();save();
  downloadFile(`poesia-yedek-${dayKey()}.json`,JSON.stringify(state,null,1),'application/json');render();
}
function restore(file){
  const r=new FileReader();
  r.onload=async()=>{
    let data;try{data=JSON.parse(r.result)}catch{return toast('Dosya okunamadı')}
    if(!Array.isArray(data?.tables)||!Array.isArray(data?.products)||!Array.isArray(data?.staff)||!data.staff.length)return toast('Bu dosya bir Poesia yedeği değil');
    if(!await ask('Yedekten geri yükle',`Bu cihazdaki tüm veriler yedekteki verilerle değiştirilecek (${data.orders?.length||0} adisyon, ${data.products.length} ürün). Devam edilsin mi?`,'Geri yükle','danger'))return;
    state=normalizeState(data);save();toast('Yedek geri yüklendi');if(!me())logout();else render();
  };
  r.readAsText(file);
}
async function clearSales(){
  if(!await ask('Satış verilerini temizle','Tüm adisyonlar, kasa hareketleri, gün sonları ve rezervasyonlar silinecek. Önce yedek almanı öneririz.','Temizle','danger'))return;
  Object.assign(state,{orders:[],cashMoves:[],dayClosings:[],reservations:[]});state.seq.order=1;save();render();toast('Satış verileri temizlendi');
}
async function factoryReset(){
  if(!await ask('Fabrika ayarları','Menü, masalar, personel dahil TÜM veriler silinip örnek verilerle baştan başlanacak.','Her şeyi sil','danger'))return;
  state=seedState();save();logout();
}

/* ---------- Olaylar ---------- */
const ACTIONS={
  openTable:d=>openTable(d.id),openOrder:d=>goOrder(d.id),area:d=>{ui.area=d.v;render()},
  serve:d=>serveItem(d.o,d.uid),newTakeaway:()=>newTakeawayModal(),
  backOrder:()=>backFromOrder(),orderTab:d=>{ui.orderTab=d.v;render()},
  cat:d=>{ui.cat=d.v;ui.search='';const s=document.querySelector('[data-input="search"]');if(s)s.value='';document.querySelectorAll('#catChips .chip').forEach(c=>c.classList.toggle('active',c.dataset.v===d.v));$('#prodGrid').innerHTML=prodGrid(currentOrder())},
  add:d=>addItem(d.id),item:d=>itemModal(d.uid),
  inc:d=>{const i=currentOrder()?.items.find(x=>x.uid===d.uid);if(i){i.qty++;save();refreshOrderParts()}},
  dec:d=>{const o=currentOrder(),i=o?.items.find(x=>x.uid===d.uid);if(!i)return;if(i.qty>1)i.qty--;else o.items=o.items.filter(x=>x!==i);save();refreshOrderParts()},
  send:()=>{sendOrder(currentOrder());refreshOrderParts()},pay:()=>payModal(),preBill:()=>preBill(),discount:()=>discountModal(),
  moveTable:()=>moveTableModal(),mergeTable:()=>mergeTableModal(),editTakeaway:()=>editTakeawayModal(),cancelOrder:()=>cancelOrder(),guests:()=>guestsModal(),
  station:d=>{ui.station=d.v;render()},kdsToggle:d=>kdsToggle(d.o,d.uid),kdsAll:d=>kdsAll(d.o),soldOutModal:()=>soldOutModal(),
  resDay:d=>{if(d.v==='0')ui.resDate=dayKey();else{const x=new Date(ui.resDate+'T12:00');x.setDate(x.getDate()+ +d.v);ui.resDate=dayKey(x)}render()},
  resEdit:d=>resEditModal(d.id),resSeat:d=>resSeat(d.id),resStatus:d=>{const r=state.reservations.find(x=>x.id===d.id);if(r){r.status=d.v;save();render()}},
  menuCat:d=>{ui.menuCat=d.v;render()},catEdit:d=>catEditModal(d.id),prodEdit:d=>prodEditModal(d.id),
  prodToggle:d=>{const p=productById(d.id);p[d.k]=!p[d.k];save();render()},
  exportMenu:()=>downloadFile('menu.json',JSON.stringify(menuJSON(),null,1),'application/json'),printMenu:()=>printMenu(),
  cashMove:d=>cashMoveModal(d.v),cashDel:async d=>{if(await ask('Kasa hareketini sil','Bu hareket silinsin mi?','Sil','danger')){state.cashMoves=state.cashMoves.filter(m=>m.id!==d.id);save();render()}},
  dayClose:()=>dayCloseModal(),printZ:d=>printZ(d.id),
  range:d=>{ui.range=d.v;if(d.v==='custom'&&!ui.from){ui.from=dayKey(new Date(Date.now()-6*864e5));ui.to=dayKey()}render()},exportCSV:()=>exportCSV(),
  settingsTab:d=>{ui.settingsTab=d.v;render()},saveBiz:()=>saveBiz(),tableEdit:d=>tableEditModal(d.id),tableBulk:()=>tableBulkModal(),areaEdit:d=>areaEditModal(d.v),
  staffEdit:d=>staffEditModal(d.id),backup:()=>backup(),clearSales:()=>clearSales(),factoryReset:()=>factoryReset()
};
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-go]');if(g){go(g.dataset.go);document.body.classList.remove('nav-open');return}
  const el=e.target.closest('[data-act]');if(!el||el.disabled)return;
  const fn=ACTIONS[el.dataset.act];if(fn){e.preventDefault();fn(el.dataset,el)}
});
document.addEventListener('input',e=>{
  const k=e.target.dataset?.input;if(!k)return;
  if(k==='search'){ui.search=e.target.value;document.querySelectorAll('#catChips .chip').forEach(c=>c.classList.toggle('active',!ui.search&&c.dataset.v===ui.cat));$('#prodGrid').innerHTML=prodGrid(currentOrder())}
  else if(k==='resDate'){if(e.target.value){ui.resDate=e.target.value;render()}}
  else if(k==='from'||k==='to'){ui[k]=e.target.value;render()}
});
document.addEventListener('change',e=>{if(e.target.id==='restoreFile'&&e.target.files[0]){restore(e.target.files[0]);e.target.value=''}});
$('#logoutBtn').onclick=()=>logout();
$('#themeBtn').onclick=()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';try{localStorage.setItem(KEY+'-theme',dark?'dark':'light')}catch{}};
$('#menuBtn').onclick=()=>document.body.classList.toggle('nav-open');
try{const th=localStorage.getItem(KEY+'-theme');if(th)document.documentElement.dataset.theme=th}catch{}

// Aynı cihazda başka sekmede (ör. mutfak ekranı) yapılan değişiklikleri al
window.addEventListener('storage',e=>{if(e.key!==KEY||!e.newValue||$('#modal').open)return;try{state=normalizeState(JSON.parse(e.newValue));if(me())render()}catch{}});
// Süreleri ve mutfak ekranını tazele
setInterval(()=>{if(!me()||$('#modal').open||document.activeElement?.matches('input,textarea,select'))return;if(['tables','kitchen','takeaway'].includes(ui.view))render()},30000);
setInterval(()=>{const c=$('#clock');if(c)c.textContent=new Date().toLocaleString('tr-TR',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})},1000);
// Android geri tuşu
window.poesiaBack=function(){
  if($('#modal').open){closeModal();return true}
  if(document.body.classList.contains('nav-open')){document.body.classList.remove('nav-open');return true}
  if(!me())return false;
  if(ui.view==='order'){backFromOrder();return true}
  const home=ROLE_VIEWS[me().role][0];if(ui.view!==home){go(home);return true}
  return false;
};
if(NATIVE)document.body.classList.add('android-app');
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});

if(me())startApp();else showLogin();
