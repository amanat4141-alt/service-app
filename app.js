/* ====== সেটিংস: এখানে অ্যাডমিনের ইউজারনেম ও পাসওয়ার্ড বদলান ====== */
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";
/* ================================================================== */

const KEY = "orders_v1", AUTH = "auth_v1", UL = "ulogin_v1", CK = "comuni_v2";
const COMUNI_URL = "https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json";
const PROV = ["Agrigento","Alessandria","Ancona","Aosta","Arezzo","Ascoli Piceno","Asti","Avellino","Bari","Barletta-Andria-Trani","Belluno","Benevento","Bergamo","Biella","Bologna","Bolzano","Brescia","Brindisi","Cagliari","Caltanissetta","Campobasso","Caserta","Catania","Catanzaro","Chieti","Como","Cosenza","Cremona","Crotone","Cuneo","Enna","Fermo","Ferrara","Firenze","Foggia","Forlì-Cesena","Frosinone","Genova","Gorizia","Grosseto","Imperia","Isernia","La Spezia","L'Aquila","Latina","Lecce","Lecco","Livorno","Lodi","Lucca","Macerata","Mantova","Massa-Carrara","Matera","Messina","Milano","Modena","Monza e Brianza","Napoli","Novara","Nuoro","Oristano","Padova","Palermo","Parma","Pavia","Perugia","Pesaro e Urbino","Pescara","Piacenza","Pisa","Pistoia","Pordenone","Potenza","Prato","Ragusa","Ravenna","Reggio Calabria","Reggio Emilia","Rieti","Rimini","Roma","Rovigo","Salerno","Sassari","Savona","Siena","Siracusa","Sondrio","Sud Sardegna","Taranto","Teramo","Terni","Torino","Trapani","Trento","Treviso","Trieste","Udine","Varese","Venezia","Verbano-Cusio-Ossola","Vercelli","Verona","Vibo Valentia","Vicenza","Viterbo"];
const NAME_LABEL = {"বাসা":"বাসা","রেস্টুরেন্ট":"রেস্টুরেন্টের নাম","ফ্যাক্টরি":"ফ্যাক্টরির নাম","দোকান":"দোকানের নাম"};

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
function read(k, d){ try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch(e){ return d; } }
function write(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch(e){ toast("সেভ হয়নি! জায়গা ভরে গেছে"); return false; } }
function toast(m){ const t=$("toast"); t.textContent=(typeof LANG!=="undefined" && LANG[activeLang] && LANG[activeLang][m]) ? LANG[activeLang][m] : m; t.style.display="block"; clearTimeout(t._t); t._t=setTimeout(()=>t.style.display="none",2600); }
function viewImg(src){ $("ovImg").src=src; $("ov").style.display="flex"; }

let tab = "wait", newImg = null, pending = null, curProv = "";

/* ---------- নেভিগেশন ---------- */
function go(v){
  $("user").classList.toggle("hide", v!=="user");
  $("admin").classList.toggle("hide", v!=="admin");
  $("bUser").classList.toggle("on", v==="user");
  $("bAdmin").classList.toggle("on", v==="admin");
  if(v==="user") refreshUser(); else renderAdmin();
}

/* ---------- সার্চ করার মতো ড্রপডাউন ---------- */
function combo(inp, items, onPick){
  const dd = document.createElement("div"); dd.className = "dd";
  inp.parentNode.appendChild(dd);
  function show(){
    const all = items();
    if(!all.length){ dd.style.display="none"; return; }
    const q = norm(inp.value);
    const r = all.filter(x => norm(x).includes(q)).sort((a,b) => norm(b).startsWith(q) - norm(a).startsWith(q));
    dd.innerHTML = r.slice(0,80).map(x => `<div data-v="${esc(x)}">${esc(x)}</div>`).join("") || `<div class="text-muted">কিছু পাওয়া যায়নি</div>`;
    dd.style.display = "block";
  }
  inp.addEventListener("focus", show);
  inp.addEventListener("input", show);
  inp.addEventListener("blur", () => setTimeout(() => { dd.style.display="none"; onPick && onPick(null); }, 200));
  dd.addEventListener("mousedown", e => e.preventDefault());
  dd.addEventListener("click", e => {
    const d = e.target.closest("[data-v]"); if(!d) return;
    inp.value = d.dataset.v; dd.style.display = "none"; inp.blur(); onPick && onPick(d.dataset.v);
  });
}

/* ---------- প্রভিন্স ও শহর (Comuni) ---------- */
let COMUNI = read(CK, null);
function provList(){ return COMUNI ? Object.keys(COMUNI).sort((a,b)=>a.localeCompare(b)) : PROV; }
function cityList(){ return COMUNI && COMUNI[curProv] ? COMUNI[curProv].map(x => x[0]) : []; }

async function loadComuni(){
  if(COMUNI){ hint(); return; }
  $("cittaHint").textContent = "শহরের তালিকা লোড হচ্ছে…";
  try{
    localStorage.removeItem("comuni_v1");
    const r = await fetch(COMUNI_URL); const j = await r.json(); const m = {};
    j.forEach(c => {
      const p = c.provincia && c.provincia.nome; if(!p) return;
      (m[p] = m[p] || []).push([c.nome, c.cap || []]);
    });
    Object.values(m).forEach(a => a.sort((x,y) => x[0].localeCompare(y[0])));
    if(Object.keys(m).length){ COMUNI = m; write(CK, m); }
  }catch(e){}
  hint();
}
function hint(){
  $("cittaHint").textContent = COMUNI ? "" : "শহরের তালিকা অনলাইনে লোড হয়নি, নিজে লিখুন";
}
function syncProv(v){
  const inp = $("provincia");
  const val = v ?? inp.value;
  const m = provList().find(p => norm(p) === norm(val));
  const name = m || "";
  if(m) inp.value = m;
  if(name !== curProv){ curProv = name; $("citta").value = ""; }
  $("citta").placeholder = curProv ? "লিখে খুঁজুন…" : "আগে Provincia বেছে নিন";
}
combo($("provincia"), provList, syncProv);
combo($("citta"), cityList, v => {
  if(!v) return;
  const c = (COMUNI && COMUNI[curProv] || []).find(x => x[0] === v);
  if(c && c[1].length === 1) $("cap").value = c[1][0];
});

/* Cap লিখলে Provincia ও Città নিজে থেকে বসবে */
$("cap").addEventListener("input", () => {
  const v = $("cap").value.replace(/\D/g, "");
  $("cap").value = v;
  if(v.length !== 5 || !COMUNI) return;
  const hits = [];
  for(const p in COMUNI) COMUNI[p].forEach(c => { if(c[1].includes(v)) hits.push([p, c[0]]); });
  if(!hits.length){ toast("এই Cap খুঁজে পাওয়া যায়নি"); return; }
  const provs = [...new Set(hits.map(h => h[0]))];
  if(provs.length === 1){ curProv = provs[0]; $("provincia").value = curProv; $("citta").placeholder = "লিখে খুঁজুন…"; }
  if(hits.length === 1){
    $("citta").value = hits[0][1]; $("cittaHint").textContent = "";
  } else {
    $("citta").value = "";
    $("cittaHint").textContent = "এই Cap-এ একাধিক শহর আছে, একটা বেছে নিন: " + hits.map(h => h[1]).slice(0, 6).join(", ");
  }
});
loadComuni();

/* Phone input: support international country codes; keep digits only. */
["tel","lp","nn"].forEach(id => { const el=$(id); if(el) el.addEventListener("input", () => { el.value=el.value.replace(/\D/g, ""); if(id==="lp") el.value=el.value.slice(-4); }); });

/* ---------- ফর্ম: সেভ → নিশ্চিতকরণ → পাঠানো ---------- */
$("f").addEventListener("submit", e => {
  e.preventDefault();
  if(!uPhone() || !isAuth(uPhone())){ toast("আগে অনুমোদিত নম্বর দিয়ে ঢুকুন"); refreshUser(); return; }
  syncProv();
  const f = $("f");
  if(!f.checkValidity()){ f.reportValidity(); return; }
  if(!curProv){ toast("তালিকা থেকে সঠিক Provincia বেছে নিন"); $("provincia").focus(); return; }
  const cl = cityList();
  if(cl.length && !cl.includes($("citta").value.trim())){ toast("তালিকা থেকে সঠিক Città বেছে নিন"); $("citta").focus(); return; }
  const telDigits = $("tel").value.replace(/\D/g, "");
  if(telDigits.length < 6 || telDigits.length > 12){ toast("সঠিক Telefono নম্বর দিন"); $("tel").focus(); return; }
  const pt = document.querySelector("input[name=ptype]:checked");
  if(!pt){ toast("জায়গার ধরন বেছে নিন"); return; }
  const boiVal = parseInt($("boi").value, 10);
  if(!boiVal || boiVal < 1 || boiVal > 999){ toast("কতটি বই তা সঠিকভাবে দিন (কমপক্ষে ১)"); $("boi").focus(); return; }
  const old = read(KEY, []).find(o => o.owner === uPhone() && !o.released);
  const img = newImg || (old && old.img);
  if(!img){ toast("রিসিপটের ছবি দিন"); return; }
  pending = {
    nome:$("nome").value.trim(), cognome:$("cognome").value.trim(),
    indirizzo:$("indirizzo").value.trim(), civico:$("civico").value.trim(),
    provincia:curProv, citta:$("citta").value.trim(),
    cap:$("cap").value.trim(), tel:"+39 " + $("tel").value.replace(/\D/g, ""), email:$("email").value.trim(),
    ptype:pt.value, pname:$("pname").value.trim(), boi:boiVal, img, created:Date.now()
  };
  $("cfBody").innerHTML = details(pending);
  $("cf").style.display = "flex";
});

function closeConfirm(){ $("cf").style.display = "none"; }

function doSave(){
  if(!pending) return;
  const p = uPhone();
  if(!p || !isAuth(p)){ closeConfirm(); toast("এই নম্বরের অনুমোদন নেই"); refreshUser(); return; }
  const orders = read(KEY, []);
  const old = orders.find(o => o.owner === p && !o.released);
  if(old && old.status === "done"){ closeConfirm(); toast("কাজ সম্পন্ন হয়ে গেছে, আর এডিট করা যাবে না"); return; }
  const data = {...pending}; delete data.created;
  if(old){
    Object.assign(old, data, {status:"wait", updated:Date.now(), edited:true});
  } else {
    orders.unshift({id:"o" + Date.now(), owner:p, ...data, status:"wait", created:Date.now()});
  }
  if(write(KEY, orders)){
    closeConfirm(); pending = null;
    toast(old ? "✅ আবার পাঠানো হয়েছে" : "✅ অ্যাডমিনের কাছে পাঠানো হয়েছে");
    resetForm(); refreshUser();
    window.scrollTo({top:0, behavior:"smooth"});
  }
}

function resetForm(){
  $("f").reset(); $("editId").value=""; newImg=null; curProv="";
  $("recPrev").classList.add("hide"); $("recPrev").removeAttribute("src");
  $("pnameLabel").textContent="জায়গার নাম"; $("pname").placeholder="আগে জায়গার ধরন বেছে নিন";
  $("citta").placeholder="আগে Provincia বেছে নিন";
  $("formTitle").textContent="নতুন তথ্য দিন";
  $("sendBtn").textContent="💾 সেভ করুন";
  $("cancelEdit").classList.add("hide");
}

function editOrder(id){
  const o = read(KEY, []).find(x => x.id === id); if(!o) return;
  $("editId").value = id; $("formCard").classList.remove("hide");
  $("nome").value=o.nome; $("cognome").value=o.cognome; $("indirizzo").value=o.indirizzo;
  $("civico").value=o.civico;
  $("provincia").value=o.provincia; curProv=o.provincia;
  $("citta").value=o.citta; $("cap").value=o.cap; $("tel").value=o.tel.replace(/^\+39\s*/, ""); $("email").value=o.email||""; $("boi").value=o.boi||1;
  document.querySelectorAll("input[name=ptype]").forEach(r => r.checked = r.value===o.ptype);
  updateType(false); $("pname").value=o.pname;
  newImg = null; $("recPrev").src=o.img; $("recPrev").classList.remove("hide");
  $("formTitle").textContent="✏️ তথ্য এডিট করুন";
  $("sendBtn").textContent="💾 সেভ করুন";
  $("cancelEdit").classList.remove("hide");
  window.scrollTo({top:0, behavior:"smooth"});
}

function fmt(t){ return new Date(t).toLocaleString("it-IT",{dateStyle:"short",timeStyle:"short"}); }

function details(o){
  const placeLine = o.ptype === "বাসা" ? "" : `<div class="row-i"><b>${esc(o.ptype)}</b><span>${esc(o.pname)}</span></div>`;
  return `
  <div class="row-i"><b>নাম</b><span>${esc(o.nome)} ${esc(o.cognome)}</span></div>
  ${placeLine}
  <div class="row-i"><b>ঠিকানা</b><span>${esc(o.indirizzo)} ${esc(o.civico)}, ${esc(o.cap)} ${esc(o.citta)} (${esc(o.provincia)})</span></div>
  <div class="row-i"><b>ফোন</b><span>${esc(o.tel)}</span></div>
  <div class="row-i"><b>ইমেইল</b><span>${esc(o.email)}</span></div>
  <div class="row-i"><b>সময়</b><span>${fmt(o.updated || o.created)}${o.edited?" (এডিটেড)":""}</span></div>
  <img class="thumb mt-2" src="${o.img}" onclick="viewImg(this.src)" alt="রিসিপট">`;
}

function orderHeading(o){ return o.ptype === "বাসা" ? `${activeLang === "en" ? "Books" : activeLang === "it" ? "Libri" : "বই"} ${esc(o.boi || 1)} ${activeLang === "en" ? "pcs" : activeLang === "it" ? "pz" : "টি"}` : esc(o.pname); }

function renderMine(){
  const p = uPhone();
  const list = read(KEY, []).filter(o => o.owner === p && !o.released);
  $("mine").innerHTML = list.length ? list.map(o => `
    <div class="card-x">
      <div class="d-flex justify-content-between mb-2">
        <b class="order-heading">${orderHeading(o)}</b>
        <span class="pill ${o.status==="done"?"p-done":"p-wait"}">${o.status==="done"?"সম্পন্ন":"চলমান"}</span>
      </div>
      ${details(o)}
      ${o.status==="wait" ? `<button class="btn-ghost w-100 mt-3" onclick="editOrder('${o.id}')">✏️ এডিট করে আবার পাঠান</button>` : ""}
    </div>`).join("")
    : `<div class="card-x text-center text-muted">এখনো কিছু পাঠাননি। উপরের ফর্ম পূরণ করুন।</div>`;
}

/* ---------- ইউজার লগইন (অনুমোদিত নম্বর + PIN) ---------- */
const uPhone = () => { try { return localStorage.getItem(UL) || ""; } catch(e){ return ""; } };
const authList = () => read(AUTH, []);
const isAuth = p => authList().some(a => a.phone === p);

function userLogin(){
  const last4 = $("lp").value.replace(/\D/g, "").slice(-4);
  if(last4.length !== 4){ toast("ফোন নম্বরের শেষ ৪ সংখ্যা দিন"); return; }
  const matches = authList().filter(x => String(x.phone || "").replace(/\D/g, "").endsWith(last4));
  if(matches.length === 0){ toast("এই শেষ ৪ সংখ্যার নম্বর অনুমোদিত নয়"); return; }
  if(matches.length > 1){ toast("একই শেষ ৪ সংখ্যা একাধিক নম্বরে আছে। অ্যাডমিনকে বলুন।"); return; }
  const fullPhone = String(matches[0].phone).replace(/\D/g, "");
  try { localStorage.setItem(UL, fullPhone); } catch(e){}
  $("lp").value = ""; resetForm(); refreshUser();
}
function userLogout(){
  try { localStorage.removeItem(UL); } catch(e){}
  resetForm(); refreshUser();
}
function cancelEdit(){ resetForm(); refreshUser(); }

function refreshUser(){
  let p = uPhone();
  if(p && !isAuth(p)){ try { localStorage.removeItem(UL); } catch(e){} p = ""; }
  const has = !!p && read(KEY, []).some(o => o.owner === p && !o.released);
  $("gate").classList.toggle("hide", !!p);
  $("uBar").classList.toggle("hide", !p);
  $("formCard").classList.toggle("hide", !p || (has && !$("editId").value));
  $("mineWrap").classList.toggle("hide", !has);
  if(p) $("uPh").textContent = "+" + p;
  if(has) renderMine();
}

/* ---------- অ্যাডমিন: অনুমোদিত নম্বর ---------- */
function addNum(){
  const p = $("nn").value.replace(/\D/g, "").slice(-4);
  if(p.length !== 4){ toast("ফোন নম্বরের শেষ ৪ সংখ্যা দিন"); return; }
  const l = authList();
  if(l.some(a => String(a.phone || "").replace(/\D/g, "").slice(-4) === p)){ toast("এই শেষ ৪ সংখ্যা আগেই অনুমোদিত"); return; }
  l.unshift({phone:p, at:Date.now()});
  if(write(AUTH, l)){ $("nn").value = ""; toast("✅ নম্বর অনুমোদিত হয়েছে"); renderAdmin(); }
}
function delNum(p){
  if(!confirm("এই নম্বরের অনুমোদন মুছে ফেলবেন? ইউজার আর ঢুকতে পারবে না। পরে আবার অর্ডার করতে চাইলে নতুন করে অনুমোদন দিতে হবে।")) return;
  const orders = read(KEY, []);
  orders.forEach(o => { if(o.owner === p) o.released = true; });
  write(KEY, orders);
  write(AUTH, authList().filter(a => a.phone !== p)); renderAdmin(); toast("🔒 অনুমোদন মুছে ফেলা হয়েছে");
}
function renderNums(all){
  const l = authList();
  $("numList").innerHTML = l.length ? l.map(a => {
    const sent = all.some(o => o.owner === a.phone && !o.released);
    return `<div class="card-x d-flex justify-content-between align-items-center">
      <div><b>শেষ ৪ সংখ্যা: ${esc(String(a.phone).slice(-4))}</b>
      <span class="pill ${sent ? "p-done" : "p-wait"} mt-1">${sent ? "তথ্য পাঠিয়েছে" : "এখনো পাঠায়নি"}</span></div>
      <button class="btn-ghost" onclick="delNum('${esc(a.phone)}')">🗑️</button></div>`;
  }).join("") : `<div class="card-x text-center text-muted">এখনো কোনো নম্বর অনুমোদন করা হয়নি</div>`;
}

/* ---------- অ্যাডমিন ---------- */
function login(){
  if($("au").value.trim()===ADMIN_USER && $("ap").value===ADMIN_PASS){
    sessionStorage.setItem("adm","1"); renderAdmin();
  } else toast("ইউজারনেম বা পাসওয়ার্ড ভুল");
}
function logout(){ sessionStorage.removeItem("adm"); $("ap").value=""; renderAdmin(); }
function setTab(t){ tab=t; $("tWait").classList.toggle("on",t==="wait"); $("tDone").classList.toggle("on",t==="done"); $("tNum").classList.toggle("on",t==="num"); renderAdmin(); }

let statusAction = null;
function setStatus(id, st){
  statusAction = {id, status:st};
  const title = st === "done" ? "কাজ সম্পন্ন নিশ্চিত করবেন?" : "চলমান তালিকায় ফেরানো নিশ্চিত করবেন?";
  const msg = st === "done" ? "OK চাপলে কাজ সম্পন্ন হবে। NO চাপলে আগের অবস্থায় থাকবে।" : "OK চাপলে কাজ চলমান হবে। NO চাপলে সম্পন্ন অবস্থায় থাকবে।";
  $("statusConfirmTitle").textContent = title;
  $("statusConfirmText").textContent = msg;
  $("statusConfirm").style.display = "flex";
}
function confirmStatus(choice){
  $("statusConfirm").style.display = "none";
  if(!statusAction) return;
  if(choice === "ok"){
    const {id, status} = statusAction;
    const orders = read(KEY, []);
    const o = orders.find(x => x.id === id);
    if(o){ o.status = status; o.doneAt = status === "done" ? Date.now() : null; write(KEY, orders); renderAdmin(); toast(status === "done" ? "✅ সম্পন্ন তালিকায় গেছে" : "↩️ চলমান তালিকায় ফিরেছে"); }
  }
  statusAction = null;
}
function delOrder(id){
  if(!confirm("এটা মুছে ফেলবেন?")) return;
  write(KEY, read(KEY, []).filter(x => x.id!==id)); renderAdmin();
}

function renderAdmin(){
  const ok = sessionStorage.getItem("adm")==="1";
  $("login").classList.toggle("hide", ok);
  $("panel").classList.toggle("hide", !ok);
  if(!ok) return;
  const all = read(KEY, []);
  $("cW").textContent = all.filter(o=>o.status!=="done").length;
  $("cD").textContent = all.filter(o=>o.status==="done").length;
  $("cN").textContent = authList().length;
  $("q").classList.toggle("hide", tab === "num");
  $("list").classList.toggle("hide", tab === "num");
  $("numPanel").classList.toggle("hide", tab !== "num");
  if(tab === "num"){ renderNums(all); return; }
  const q = norm($("q").value);
  const rows = all.filter(o => (tab==="done") === (o.status==="done"))
    .filter(o => !q || norm([o.nome,o.cognome,o.pname,o.tel,o.citta,o.indirizzo,o.email,o.cap,o.provincia].join(" ")).includes(q));
  $("list").innerHTML = rows.length ? rows.map(o => `
    <div class="card-x">
      <div class="d-flex justify-content-between mb-2">
        <b class="order-heading">${orderHeading(o)}</b>
        <span class="pill ${o.status==="done"?"p-done":"p-wait"}">${o.status==="done"?"সম্পন্ন":"চলমান"}</span>
      </div>
      ${details(o)}
      <div class="d-flex gap-2 mt-3">
        ${o.status==="done"
          ? `<button class="btn-ghost flex-fill" onclick="setStatus('${o.id}','wait')">↩️ চলমানে ফেরান</button>`
          : `<button class="btn-main" onclick="setStatus('${o.id}','done')">✅ কাজ সম্পন্ন</button>`}
        <button class="btn-ghost" onclick="delOrder('${o.id}')">🗑️</button>
      </div>
      ${o.status==="done" && o.owner && isAuth(o.owner) && !o.released ? `<button class="btn-ghost w-100 mt-2" onclick="delNum('${esc(o.owner)}')">🔒 কাজ শেষ, নম্বরের অনুমোদন মুছুন</button>` : ""}
    </div>`).join("")
    : `<div class="card-x text-center text-muted">কিছু পাওয়া যায়নি</div>`;
}

refreshUser();


// আলাদা পেজে শুধু নির্দিষ্ট অংশ চালু থাকবে।
(function(){
  const page = document.body.dataset.page;
  if(page === "user") {
    document.getElementById("user").classList.remove("hide");
    document.getElementById("admin").classList.add("hide");
    refreshUser();
  } else if(page === "admin") {
    document.getElementById("user").classList.add("hide");
    document.getElementById("admin").classList.remove("hide");
    renderAdmin();
  }
})();


/* ===== তিন ভাষার সম্পূর্ণ UI অনুবাদ ===== */
const LANG = {
 bn: {},
 en: {
  "✦ সার্ভিস ম্যানেজমেন্ট":"✦ Service Management", "সহজে তথ্য জমা দিন · দ্রুত অর্ডার পরিচালনা করুন":"Submit details easily · Manage orders quickly",
  "ইউজার":"User", "অ্যাডমিন":"Admin", "🔑 ঢুকুন":"🔑 Sign in", "অ্যাডমিনের অনুমোদন করা ফোন নম্বর দিয়ে ঢুকুন।":"Enter the last 4 digits of your approved phone number.",
  "বের হন":"Log out", "নতুন তথ্য দিন":"Enter new details", "নাম":"Name", "পদবি":"Surname", "ঠিকানা":"Address", "জায়গার ধরন":"Place type", "জায়গার নাম":"Place name", "কতটি বই":"Number of books", "রিসিপটের ছবি":"Receipt photo", "💾 সেভ করুন":"💾 Save", "এডিট বাতিল":"Cancel edit", "আপনার পাঠানো তথ্য":"Your submitted details", "এখনো কিছু পাঠাননি। উপরের ফর্ম পূরণ করুন।":"Nothing submitted yet. Fill in the form above.",
  "বাসা":"Home", "রেস্টুরেন্ট":"Restaurant", "ফ্যাক্টরি":"Factory", "দোকান":"Shop", "রেস্টুরেন্টের নাম":"Restaurant name", "ফ্যাক্টরির নাম":"Factory name", "দোকানের নাম":"Shop name", "লিখে খুঁজুন…":"Type to search…", "আগে Provincia বেছে নিন":"Select Provincia first", "শহরের তালিকা লোড হচ্ছে…":"Loading city list…", "শহরের তালিকা অনলাইনে লোড হয়নি, নিজে লিখুন":"City list could not be loaded. Enter manually.",
  "এডিট করে আবার পাঠান":"Edit and resubmit", "চলমান":"In progress", "সম্পন্ন":"Completed", "নাম":"Name", "ফোন":"Phone", "ইমেইল":"Email", "সময়":"Time", "বই":"Books", "রিসিপট":"Receipt", "তথ্যগুলো ঠিক আছে তো?":"Are these details correct?", "নিচের সব তথ্য দেখে নিন, তারপর পাঠান।":"Review all details below, then submit.", "✏️ ঠিক করব":"✏️ Edit", "✅ ঠিক আছে, পাঠান":"✅ Confirm & submit",
  "🔐 অ্যাডমিন লগইন":"🔐 Admin login", "ইউজারনেম":"Username", "পাসওয়ার্ড":"Password", "লগইন":"Log in", "অ্যাডমিন প্যানেল":"Admin panel", "লগআউট":"Log out", "🔍 নাম, ফোন, দোকানের নাম, শহর দিয়ে খুঁজুন":"🔍 Search by name, phone, shop or city", "নম্বর":"Numbers", "নতুন নম্বর অনুমোদন করুন":"Approve a new number", "ইউজারের নম্বর":"Last 4 digits of phone number", "":"", "➕ অনুমোদন দিন":"➕ Approve number", "তথ্য পাঠিয়েছে":"Submitted details", "এখনো পাঠায়নি":"Not submitted yet", "কিছু পাওয়া যায়নি":"No results found", "কাজ সম্পন্ন":"Mark completed", "↩️ চলমানে ফেরান":"Return to in progress", "🗑️":"🗑️", "কাজ শেষ, নম্বরের অনুমোদন মুছুন":"Work done; revoke number approval",
  "কাজ সম্পন্ন নিশ্চিত করবেন?":"Confirm completion?", "চলমান তালিকায় ফেরানো নিশ্চিত করবেন?":"Return to in-progress?", "OK চাপলে কাজ সম্পন্ন হবে। NO চাপলে আগের অবস্থায় থাকবে।":"Press OK to mark as completed. NO keeps the current status.", "OK চাপলে কাজ চলমান হবে। NO চাপলে সম্পন্ন অবস্থায় থাকবে।":"Press OK to return it to in progress. NO keeps it completed.", "✕ NO":"✕ NO", "✓ OK":"✓ OK", "Nome (নাম)":"Name", "Cognome (পদবি)":"Surname", "Telefono":"Phone", "Indirizzo":"Address", "N° civico":"House number", "Provincia":"Province", "Città":"City", "Cap":"Postal code", "Email":"Email", "আগে জায়গার ধরন বেছে নিন":"Select a place type first", "Casa":"Home", "রিসিপটের ছবি":"Receipt photo",
  "তথ্য পাঠানো হয়েছে":"Details submitted", "কাজ সম্পন্ন হয়েছে":"Work completed", "এডিটেড":"Edited", "কিছু পাওয়া যায়নি":"No results found"
 },
 it: {
  "✦ সার্ভিস ম্যানেজমেন্ট":"✦ Gestione servizi", "সহজে তথ্য জমা দিন · দ্রুত অর্ডার পরিচালনা করুন":"Invia i dati facilmente · Gestisci gli ordini rapidamente",
  "ইউজার":"Utente", "অ্যাডমিন":"Amministratore", "🔑 ঢুকুন":"🔑 Accedi", "অ্যাডমিনের অনুমোদন করা ফোন নম্বর দিয়ে ঢুকুন।":"Inserisci le ultime 4 cifre del numero autorizzato.",
  "বের হন":"Esci", "নতুন তথ্য দিন":"Inserisci nuovi dati", "নাম":"Nome", "পদবি":"Cognome", "ঠিকানা":"Indirizzo", "জায়গার ধরন":"Tipo di luogo", "জায়গার নাম":"Nome del luogo", "কতটি বই":"Numero di libri", "রিসিপটের ছবি":"Foto della ricevuta", "💾 সেভ করুন":"💾 Salva", "এডিট বাতিল":"Annulla modifica", "আপনার পাঠানো তথ্য":"I tuoi dati inviati", "এখনো কিছু পাঠাননি। উপরের ফর্ম পূরণ করুন।":"Non hai ancora inviato nulla. Compila il modulo sopra.",
  "বাসা":"Casa", "রেস্টুরেন্ট":"Ristorante", "ফ্যাক্টরি":"Fabbrica", "দোকান":"Negozio", "রেস্টুরেন্টের নাম":"Nome del ristorante", "ফ্যাক্টরির নাম":"Nome della fabbrica", "দোকানের নাম":"Nome del negozio", "লিখে খুঁজুন…":"Scrivi per cercare…", "আগে Provincia বেছে নিন":"Seleziona prima la provincia", "শহরের তালিকা লোড হচ্ছে…":"Caricamento elenco città…", "শহরের তালিকা অনলাইনে লোড হয়নি, নিজে লিখুন":"Elenco città non disponibile. Inserisci manualmente.",
  "এডিট করে আবার পাঠান":"Modifica e invia di nuovo", "চলমান":"In corso", "সম্পন্ন":"Completato", "নাম":"Nome", "ফোন":"Telefono", "ইমেইল":"Email", "সময়":"Data e ora", "বই":"Libri", "রিসিপট":"Ricevuta", "তথ্যগুলো ঠিক আছে তো?":"I dati sono corretti?", "নিচের সব তথ্য দেখে নিন, তারপর পাঠান।":"Controlla i dati qui sotto, poi invia.", "✏️ ঠিক করব":"✏️ Modifica", "✅ ঠিক আছে, পাঠান":"✅ Conferma e invia",
  "🔐 অ্যাডমিন লগইন":"🔐 Accesso amministratore", "ইউজারনেম":"Nome utente", "পাসওয়ার্ড":"Password", "লগইন":"Accedi", "অ্যাডমিন প্যানেল":"Pannello amministratore", "লগআউট":"Esci", "🔍 নাম, ফোন, দোকানের নাম, শহর দিয়ে খুঁজুন":"🔍 Cerca per nome, telefono, negozio o città", "নম্বর":"Numeri", "নতুন নম্বর অনুমোদন করুন":"Autorizza un nuovo numero", "ইউজারের নম্বর":"Ultime 4 cifre del numero di telefono", "":"", "➕ অনুমোদন দিন":"➕ Autorizza", "তথ্য পাঠিয়েছে":"Dati inviati", "এখনো পাঠায়নি":"Non ha ancora inviato", "কিছু পাওয়া যায়নি":"Nessun risultato", "কাজ সম্পন্ন":"Completa lavoro", "↩️ চলমানে ফেরান":"Riporta in corso", "কাজ শেষ, নম্বরের অনুমোদন মুছুন":"Lavoro completato; revoca numero",
  "কাজ সম্পন্ন নিশ্চিত করবেন?":"Confermi il completamento?", "চলমান তালিকায় ফেরানো নিশ্চিত করবেন?":"Confermi il ritorno allo stato in corso?", "OK চাপলে কাজ সম্পন্ন হবে। NO চাপলে আগের অবস্থায় থাকবে।":"Premi OK per completare. NO mantiene lo stato attuale.", "OK চাপলে কাজ চলমান হবে। NO চাপলে সম্পন্ন অবস্থায় থাকবে।":"Premi OK per riportare in corso. NO mantiene lo stato completato.", "✕ NO":"✕ NO", "✓ OK":"✓ OK", "Nome (নাম)":"Name", "Cognome (পদবি)":"Surname", "Telefono":"Phone", "Indirizzo":"Address", "N° civico":"House number", "Provincia":"Province", "Città":"City", "Cap":"Postal code", "Email":"Email", "আগে জায়গার ধরন বেছে নিন":"Select a place type first", "Casa":"Home", "রিসিপটের ছবি":"Receipt photo", "এডিটেড":"Modificato"
 }
};
// Complete shared translations for both User and Admin pages.
Object.assign(LANG.bn, {
  "✦ সার্ভিস ম্যানেজমেন্ট":"✦ সার্ভিস ম্যানেজমেন্ট", "সহজে তথ্য জমা দিন · দ্রুত অর্ডার পরিচালনা করুন":"সহজে তথ্য জমা দিন · দ্রুত অর্ডার পরিচালনা করুন",
  "Telefono":"ফোন", "Provincia":"প্রদেশ", "Città":"শহর", "Cap":"পোস্টাল কোড", "Nome (নাম)":"নাম", "Cognome (পদবি)":"পদবি", "Indirizzo":"ঠিকানা", "N° civico":"বাড়ি/নম্বর", "Email":"ইমেইল",
  "চলমান":"চলমান", "সম্পন্ন":"সম্পন্ন", "নাম":"নাম", "ফোন":"ফোন", "ইমেইল":"ইমেইল", "সময়":"সময়", "এডিটেড":"সম্পাদিত", "রিসিপট":"রসিদ", "বই":"বই",
  "অ্যাডমিন লগইন":"অ্যাডমিন লগইন", "🔐 অ্যাডমিন লগইন":"🔐 অ্যাডমিন লগইন", "ইউজারনেম":"ইউজারনেম", "পাসওয়ার্ড":"পাসওয়ার্ড", "লগইন":"লগইন", "অ্যাডমিন প্যানেল":"অ্যাডমিন প্যানেল", "লগআউট":"লগআউট",
  "চলমান (":"চলমান (", "সম্পন্ন (":"সম্পন্ন (", "নম্বর (":"নম্বর (", "নম্বর":"নম্বর", "নতুন নম্বর অনুমোদন করুন":"নতুন নম্বর অনুমোদন করুন", "ইউজারের নম্বর":"ইউজারের নম্বর", "":"", "➕ অনুমোদন দিন":"➕ অনুমোদন দিন",
  "তথ্য পাঠিয়েছে":"তথ্য পাঠিয়েছে", "এখনো পাঠায়নি":"এখনো পাঠায়নি", "কিছু পাওয়া যায়নি":"কিছু পাওয়া যায়নি", "কাজ সম্পন্ন":"কাজ সম্পন্ন", "↩️ চলমানে ফেরান":"↩️ চলমানে ফেরান", "কাজ শেষ, নম্বরের অনুমোদন মুছুন":"কাজ শেষ, নম্বরের অনুমোদন মুছুন", "কাজ সম্পন্ন নিশ্চিত করবেন?":"কাজ সম্পন্ন নিশ্চিত করবেন?", "চলমান তালিকায় ফেরানো নিশ্চিত করবেন?":"চলমান তালিকায় ফেরানো নিশ্চিত করবেন?", "OK চাপলে কাজ সম্পন্ন হবে। NO চাপলে আগের অবস্থায় থাকবে।":"OK চাপলে কাজ সম্পন্ন হবে। NO চাপলে আগের অবস্থায় থাকবে।", "OK চাপলে কাজ চলমান হবে। NO চাপলে সম্পন্ন অবস্থায় থাকবে।":"OK চাপলে কাজ চলমান হবে। NO চাপলে সম্পন্ন অবস্থায় থাকবে।",
  "এই ফোন নম্বরটি অনুমোদিত নয়":"এই ফোন নম্বরটি অনুমোদিত নয়", "ফোন নম্বরের শেষ ৪ সংখ্যা":"ফোন নম্বরের শেষ ৪ সংখ্যা", "শেষ ৪ সংখ্যা":"শেষ ৪ সংখ্যা", "ফোন নম্বরের শেষ ৪ সংখ্যা দিন":"ফোন নম্বরের শেষ ৪ সংখ্যা দিন", "এই শেষ ৪ সংখ্যার নম্বর অনুমোদিত নয়":"এই শেষ ৪ সংখ্যার নম্বর অনুমোদিত নয়", "একই শেষ ৪ সংখ্যা একাধিক নম্বরে আছে। অ্যাডমিনকে বলুন।":"একই শেষ ৪ সংখ্যা একাধিক নম্বরে আছে। অ্যাডমিনকে বলুন।", "দেশের কোডসহ সঠিক ফোন নম্বর দিন":"দেশের কোডসহ সঠিক ফোন নম্বর দিন", "এই শেষ ৪ সংখ্যা অন্য অনুমোদিত নম্বরে আছে। অন্য নম্বর যাচাই করুন।":"এই শেষ ৪ সংখ্যা অন্য অনুমোদিত নম্বরে আছে। অন্য নম্বর যাচাই করুন।", "সঠিক নম্বর দিন":"সঠিক নম্বর দিন", "এই নম্বর আগেই অনুমোদিত":"এই নম্বর আগেই অনুমোদিত", "":"", "✅ নম্বর অনুমোদিত হয়েছে":"✅ নম্বর অনুমোদিত হয়েছে", "🔒 অনুমোদন মুছে ফেলা হয়েছে":"🔒 অনুমোদন মুছে ফেলা হয়েছে",
  "🔍 নাম, ফোন, দোকানের নাম, শহর দিয়ে খুঁজুন":"🔍 নাম, ফোন, দোকানের নাম, শহর দিয়ে খুঁজুন", "তথ্যগুলো ঠিক আছে তো?":"তথ্যগুলো ঠিক আছে তো?", "নিচের সব তথ্য দেখে নিন, তারপর পাঠান।":"নিচের সব তথ্য দেখে নিন, তারপর পাঠান।", "✏️ ঠিক করব":"✏️ ঠিক করব", "✅ ঠিক আছে, পাঠান":"✅ ঠিক আছে, পাঠান"
});
Object.assign(LANG.en, {
  "Telefono":"Phone", "Provincia":"Province", "Città":"City", "Cap":"Postal code", "Nome (নাম)":"Name", "Cognome (পদবি)":"Surname", "Indirizzo":"Address", "N° civico":"House / street number",
  "এডিটেড":"Edited", "Casa":"Home", "তথ্য পাঠানো হয়েছে":"Details submitted", "কাজ সম্পন্ন হয়েছে":"Work completed", "এই ফোন নম্বরটি অনুমোদিত নয়":"This phone number is not approved", "ফোন নম্বরের শেষ ৪ সংখ্যা":"Last 4 digits of phone number", "শেষ ৪ সংখ্যা":"Last 4 digits", "ফোন নম্বরের শেষ ৪ সংখ্যা দিন":"Enter the last 4 digits of your phone number", "এই শেষ ৪ সংখ্যার নম্বর অনুমোদিত নয়":"No approved number matches these last 4 digits", "একই শেষ ৪ সংখ্যা একাধিক নম্বরে আছে। অ্যাডমিনকে বলুন।":"More than one approved number has these last 4 digits. Contact admin.", "দেশের কোডসহ সঠিক ফোন নম্বর দিন":"Enter a valid phone number with country code", "এই শেষ ৪ সংখ্যা অন্য অনুমোদিত নম্বরে আছে। অন্য নম্বর যাচাই করুন।":"These last 4 digits are already used by another approved number.",
  "আগে অনুমোদিত নম্বর দিয়ে ঢুকুন":"Sign in with an approved number first", "কাজ সম্পন্ন হয়ে গেছে, আর এডিট করা যাবে না":"This work is completed and can no longer be edited", "এই নম্বরের অনুমোদন নেই":"This number is not approved", "সেভ হয়নি! জায়গা ভরে গেছে":"Could not save: storage is full",
  "সঠিক নম্বর দিন":"Enter a valid phone number", "":"PIN must contain 4 to 6 digits", "এই নম্বর আগেই অনুমোদিত":"This number is already approved", "✅ নম্বর অনুমোদিত হয়েছে":"✅ Number approved", "🔒 অনুমোদন মুছে ফেলা হয়েছে":"🔒 Approval removed",
  "তথ্য পাঠিয়েছে":"Submitted", "এখনো পাঠায়নি":"Not submitted yet", "নতুন নম্বর অনুমোদন করুন":"Approve a new number", "ইউজারের নম্বর":"Last 4 digits of phone number", "নম্বর":"Numbers", "লগইন":"Log in", "লগআউট":"Log out",
  "চলমান (":"In progress (", "সম্পন্ন (":"Completed (", "নম্বর (":"Numbers (", "নাম":"Name", "ঠিকানা":"Address", "ফোন":"Phone", "ইমেইল":"Email", "সময়":"Time", "এডিটেড":"Edited", "রিসিপট":"Receipt",
  "কাজ সম্পন্ন নিশ্চিত করবেন?":"Confirm completion?", "চলমান তালিকায় ফেরানো নিশ্চিত করবেন?":"Confirm return to in progress?", "OK চাপলে কাজ সম্পন্ন হবে। NO চাপলে আগের অবস্থায় থাকবে।":"Press OK to mark as completed. NO leaves it unchanged.", "OK চাপলে কাজ চলমান হবে। NO চাপলে সম্পন্ন অবস্থায় থাকবে।":"Press OK to return it to in progress. NO leaves it completed.",
  "এই নম্বরের অনুমোদন মুছে ফেলবেন? ইউজার আর ঢুকতে পারবে না। পরে আবার অর্ডার করতে চাইলে নতুন করে অনুমোদন দিতে হবে।":"Remove approval for this number? The user will no longer be able to sign in. Approve it again if they need to order later.", "এটা মুছে ফেলবেন?":"Delete this item?", "কাজ সম্পন্ন হয়ে গেছে, আর এডিট করা যাবে না":"This work is completed and can no longer be edited", "কিছু পাওয়া যায়নি":"No results found"
});
Object.assign(LANG.it, {
  "Telefono":"Telefono", "Provincia":"Provincia", "Città":"Città", "Cap":"CAP", "Nome (নাম)":"Nome", "Cognome (পদবি)":"Cognome", "Indirizzo":"Indirizzo", "N° civico":"Numero civico",
  "এডিটেড":"Modificato", "Casa":"Casa", "তথ্য পাঠানো হয়েছে":"Dati inviati", "কাজ সম্পন্ন হয়েছে":"Lavoro completato", "এই ফোন নম্বরটি অনুমোদিত নয়":"Numero non autorizzato", "ফোন নম্বরের শেষ ৪ সংখ্যা":"Ultime 4 cifre del telefono", "শেষ ৪ সংখ্যা":"Ultime 4 cifre", "ফোন নম্বরের শেষ ৪ সংখ্যা দিন":"Inserisci le ultime 4 cifre", "এই শেষ ৪ সংখ্যার নম্বর অনুমোদিত নয়":"Nessun numero autorizzato corrisponde alle ultime 4 cifre", "একই শেষ ৪ সংখ্যা একাধিক নম্বরে আছে। অ্যাডমিনকে বলুন।":"Più numeri autorizzati hanno queste ultime 4 cifre. Contatta l’amministratore.", "দেশের কোডসহ সঠিক ফোন নম্বর দিন":"Inserisci un numero valido con prefisso internazionale", "এই শেষ ৪ সংখ্যা অন্য অনুমোদিত নম্বরে আছে। অন্য নম্বর যাচাই করুন।":"Queste ultime 4 cifre sono già associate a un altro numero autorizzato.",
  "আগে অনুমোদিত নম্বর দিয়ে ঢুকুন":"Accedi prima con un numero autorizzato", "কাজ সম্পন্ন হয়ে গেছে, আর এডিট করা যাবে না":"Il lavoro è completato e non può più essere modificato", "এই নম্বরের অনুমোদন নেই":"Questo numero non è autorizzato", "সেভ হয়নি! জায়গা ভরে গেছে":"Salvataggio non riuscito: spazio esaurito",
  "সঠিক নম্বর দিন":"Inserisci un numero valido", "":"Il PIN deve contenere da 4 a 6 cifre", "এই নম্বর আগেই অনুমোদিত":"Questo numero è già autorizzato", "✅ নম্বর অনুমোদিত হয়েছে":"✅ Numero autorizzato", "🔒 অনুমোদন মুছে ফেলা হয়েছে":"🔒 Autorizzazione rimossa",
  "তথ্য পাঠিয়েছে":"Dati inviati", "এখনো পাঠায়নি":"Non ha ancora inviato", "নতুন নম্বর অনুমোদন করুন":"Autorizza un nuovo numero", "ইউজারের নম্বর":"Ultime 4 cifre del numero di telefono", "নম্বর":"Numeri", "লগইন":"Accedi", "লগআউট":"Esci",
  "চলমান (":"In corso (", "সম্পন্ন (":"Completati (", "নম্বর (":"Numeri (", "নাম":"Nome", "ঠিকানা":"Indirizzo", "ফোন":"Telefono", "ইমেইল":"Email", "সময়":"Data e ora", "রিসিপট":"Ricevuta",
  "কাজ সম্পন্ন নিশ্চিত করবেন?":"Confermi il completamento?", "চলমান তালিকায় ফেরানো নিশ্চিত করবেন?":"Confermi il ritorno allo stato in corso?", "OK চাপলে কাজ সম্পন্ন হবে। NO চাপলে আগের অবস্থায় থাকবে।":"Premi OK per completare. NO lascia invariato lo stato.", "OK চাপলে কাজ চলমান হবে। NO চাপলে সম্পন্ন অবস্থায় থাকবে।":"Premi OK per riportare il lavoro in corso. NO lascia lo stato completato.",
  "এই নম্বরের অনুমোদন মুছে ফেলবেন? ইউজার আর ঢুকতে পারবে না। পরে আবার অর্ডার করতে চাইলে নতুন করে অনুমোদন দিতে হবে।":"Rimuovere l’autorizzazione per questo numero? L’utente non potrà più accedere. Autorizzalo di nuovo se dovrà inviare un ordine.", "এটা মুছে ফেলবেন?":"Eliminare questo elemento?", "কিছু পাওয়া যায়নি":"Nessun risultato"
});
const langKey = "service_app_language";
let activeLang = localStorage.getItem(langKey) || "bn";
const originalText = new WeakMap(), originalAttr = new WeakMap();
function translateTree(root=document.body){
 const dict = LANG[activeLang] || {};
 const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
 let n; while((n=walker.nextNode())){
   if(!originalText.has(n)) originalText.set(n,n.nodeValue);
   const original=originalText.get(n), trimmed=original.trim();
   if(!trimmed) continue;
   const translated=dict[trimmed];
   if(translated) n.nodeValue=original.replace(trimmed,translated);
   else n.nodeValue=original;
 }
 root.querySelectorAll?.('input,textarea,button,option,[aria-label]').forEach(el=>{
   ['placeholder','aria-label','title'].forEach(a=>{
     if(!el.hasAttribute(a)) return;
     let m=originalAttr.get(el); if(!m){m={};originalAttr.set(el,m)}
     if(m[a]===undefined)m[a]=el.getAttribute(a);
     el.setAttribute(a,dict[m[a]] || m[a]);
   });
 });
}
function setLanguage(lang){
 activeLang = LANG[lang] ? lang : 'bn';
 localStorage.setItem(langKey,activeLang);
 document.documentElement.lang=activeLang;
 translateTree();
 const sel=document.getElementById('languageSelect'); if(sel) sel.value=activeLang;
 // Dynamic content is redrawn in the selected language.
 if(typeof renderAdmin==='function' && document.getElementById('panel') && !document.getElementById('panel').classList.contains('hide')) renderAdmin();
 if(typeof renderMine==='function' && document.getElementById('mine')) renderMine();
}
document.addEventListener('DOMContentLoaded',()=>{
 const sel=document.getElementById('languageSelect');
 if(sel){sel.value=activeLang;sel.addEventListener('change',()=>setLanguage(sel.value));}
 translateTree();
 const observer=new MutationObserver(records=>records.forEach(r=>{r.addedNodes.forEach(n=>{if(n.nodeType===Node.TEXT_NODE) translateTree(n.parentElement||document.body); else if(n.nodeType===Node.ELEMENT_NODE) translateTree(n);});}));
 observer.observe(document.body,{childList:true,subtree:true});
});
