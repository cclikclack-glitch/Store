const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "20mb" }));

const PASSWORD  = process.env.ADMIN_PASSWORD || "aqua2026";
const KEY       = process.env.ADMIN_KEY || "clef12345";
const GH_TOKEN  = process.env.GH_TOKEN || "";
const GH_REPO   = process.env.GH_REPO || "";
const DATA      = path.join(__dirname, "data.json");

const COLORS = {
  "#f5e0c8,#e0b888": "Dore",
  "#f8c8d8,#e890a8": "Rose",
  "#ffffff,#e8e0e8": "Blanc",
  "#c8a880,#8f6a45": "Oud brun",
  "#e8c8e0,#b890c8": "Violet",
  "#c8e0d8,#88b8a8": "Vert"
};

function defaultData() {
  return {
    store: { name: "MA BOUTIQUE", tagline: "", whatsapp: "212600000000", city: "", banner: "Bienvenue", instagram: "" },
    products: [],
    cats: { misk: "Musc", rose: "Roses", oud: "Oud", care: "Soins" }
  };
}
function load() {
  try {
    const d = JSON.parse(fs.readFileSync(DATA, "utf8"));
    if (!d.cats) d.cats = defaultData().cats;
    if (!d.products) d.products = [];
    if (!d.store) d.store = defaultData().store;
    return d;
  } catch (e) { return defaultData(); }
}
function save(d) {
  fs.writeFileSync(DATA, JSON.stringify(d, null, 2));
  pushToGitHub();
}
if (!fs.existsSync(DATA)) fs.writeFileSync(DATA, JSON.stringify(defaultData(), null, 2));

const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function pushToGitHub() {
  if (!GH_TOKEN || !GH_REPO) return;
  try {
    const content = fs.readFileSync(DATA, "utf8");
    const api = "https://api.github.com/repos/" + GH_REPO + "/contents/data.json";
    const h = { "Authorization": "Bearer " + GH_TOKEN, "User-Agent": "clikclak-store", "Accept": "application/vnd.github+json" };
    const cur = await fetch(api, { headers: h }).then(r => r.json());
    const body = { message: "sync data.json", content: Buffer.from(content, "utf8").toString("base64") };
    if (cur && cur.sha) body.sha = cur.sha;
    const r = await fetch(api, { method: "PUT", headers: h, body: JSON.stringify(body) });
    console.log("GitHub sync:", r.status);
  } catch (e) { console.log("sync err:", String(e).slice(0, 100)); }
}

app.post("/admin/upload-img", async (req, res) => {
  try {
    if (req.query.k !== KEY) return res.status(403).json({ error: "Acces refuse" });
    const b64 = (req.body.data || "").split(",")[1] || "";
    const buf = Buffer.from(b64, "base64");
    if (!buf.length) return res.json({ error: "Image vide" });
    if (buf.length > 15 * 1024 * 1024) return res.json({ error: "Image trop grande (max 15 Mo)" });
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", new Blob([buf], { type: req.body.type || "image/jpeg" }), "produit.jpg");
    const r = await fetch("https://catbox.moe/user/api.php", { method: "POST", body: form });
    const url = (await r.text()).trim();
    if (!url.startsWith("http")) return res.json({ error: "Refus: " + url.slice(0, 80) });
    res.json({ url: url });
  } catch (e) { res.json({ error: "Erreur: " + String(e).slice(0, 80) }); }
});

// ================= LOGIN =================
app.get("/admin", (req, res) => {
  const err = req.query.err ? '<div style="background:#fdecea;color:#c0392b;padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:14px">Mot de passe incorrect</div>' : "";
  res.send('<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Store Admin</title><style>body{background:#fdf4f7;font-family:Segoe UI,Arial;display:flex;justify-content:center;padding-top:80px}.box{background:#fff;padding:30px;border-radius:16px;width:320px;box-shadow:0 4px 20px rgba(216,106,142,.2);text-align:center}h1{color:#d86a8e;font-size:22px;margin-bottom:6px}p{color:#a08090;font-size:13px;margin-bottom:18px}input{width:100%;padding:12px;border:2px solid #f0d0dc;border-radius:10px;font-size:15px;margin-bottom:12px;box-sizing:border-box}button{width:100%;background:#d86a8e;color:#fff;border:none;padding:13px;border-radius:10px;font-weight:bold;font-size:15px;cursor:pointer}</style></head><body><div class="box"><h1>Store Admin</h1><p>Connexion boutique</p>' + err + '<form method="post" action="/admin/login"><input type="password" name="pw" placeholder="Mot de passe" required autofocus><button>Se connecter</button></form></div></body></html>');
});
app.post("/admin/login", (req, res) => {
  if (req.body && req.body.pw === PASSWORD) res.redirect("/admin/panel?k=" + encodeURIComponent(KEY));
  else res.redirect("/admin?err=1");
});

// ================= PANEL =================
function pageStyles() {
  return '<style>*{margin:0;padding:0;box-sizing:border-box;font-family:Segoe UI,Arial}body{background:#fdf4f7;padding:16px}.wrap{max-width:520px;margin:0 auto}.card{background:#fff;border-radius:14px;padding:18px;margin-bottom:16px;box-shadow:0 2px 8px rgba(216,106,142,.12)}h1{color:#d86a8e;font-size:20px;margin-bottom:14px}h2{color:#5a3040;font-size:15px;margin-bottom:12px}label{display:block;font-size:11px;font-weight:bold;color:#a08090;margin:10px 0 4px}input,select{width:100%;padding:10px;border:2px solid #f0d0dc;border-radius:9px;font-size:14px;box-sizing:border-box}button.big{width:100%;margin-top:14px;background:#d86a8e;color:#fff;border:none;padding:12px;border-radius:10px;font-weight:bold;font-size:14px;cursor:pointer}.prod{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f8e6ec;font-size:14px}.prod b{color:#5a3040}.prod .pr{color:#d86a8e;font-weight:bold}.prod a{font-size:12px;margin-left:8px}.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ok{background:#d5f5e0;color:#1e7b3c;padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:14px}</style>';
}

function productForm(d, p, action, btnLabel) {
  const isEdit = !!p;
  const catOpts = Object.entries(d.cats).map(([k, v]) => '<option value="' + k + '"' + (isEdit && p.cat === k ? ' selected' : '') + '>' + esc(v) + '</option>').join('');
  const colOpts = Object.entries(COLORS).map(([k, v]) => '<option value="' + k + '"' + (isEdit && p.color === k ? ' selected' : '') + '>' + v + '</option>').join('');
  const curImg = isEdit && p.image ? '<label>Photo actuelle</label><img src="' + esc(p.image) + '" style="max-width:100%;border-radius:10px">' : '';
  return '<form id="fp" method="post" action="' + action + '">'
    + (isEdit ? '<input type="hidden" name="id" value="' + p.id + '">' : '')
    + '<label>Nom du produit</label><input name="name" value="' + (isEdit ? esc(p.name) : '') + '" required>'
    + '<div class="two"><div><label>Prix (DH)</label><input name="price" value="' + (isEdit ? esc(p.price) : '') + '" required></div>'
    + '<div><label>Stock</label><input name="stock" value="' + (isEdit ? esc(p.stock) : '5') + '"></div></div>'
    + '<div class="two"><div><label>Categorie</label><select name="cat">' + catOpts + '</select></div>'
    + '<div><label>Couleur</label><select name="color">' + colOpts + '</select></div></div>'
    + '<label>Emoji (si pas de photo)</label><input name="emoji" value="' + (isEdit ? esc(p.emoji) : '🧴') + '">'
    + curImg
    + '<label>Photo (facultatif)</label><input type="file" id="photo" accept="image/*" onchange="pvP(this)">'
    + '<img id="pv" style="display:none;max-width:100%;border-radius:10px;margin-top:6px">'
    + '<input type="hidden" name="image" id="imgurl" value="' + (isEdit ? esc(p.image || '') : '') + '">'
    + '<button class="big" type="button" id="btnGo" onclick="goSave()">' + btnLabel + '</button></form>'
    + '<script>var PH=null;function pvP(i){var f=i.files[0];if(!f)return;var r=new FileReader();r.onload=function(e){document.getElementById("pv").src=e.target.result;document.getElementById("pv").style.display="block";PH={data:e.target.result,type:f.type};};r.readAsDataURL(f);}'
    + 'function goSave(){var b=document.getElementById("btnGo");if(!PH){document.getElementById("fp").submit();return;}b.textContent="Envoi de la photo...";'
    + 'fetch("/admin/upload-img?k=' + encodeURIComponent(KEY) + '",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(PH)}).then(function(r){return r.json();}).then(function(j){'
    + 'if(j.url){document.getElementById("imgurl").value=j.url;PH=null;document.getElementById("fp").submit();}else{alert(j.error||"Echec envoi");b.textContent="' + btnLabel + '";}})'
    + '.catch(function(){b.textContent="' + btnLabel + '";});}</script>';
}

app.get("/admin/panel", (req, res) => {
  if (req.query.k !== KEY) return res.redirect("/admin");
  const d = load(); const s = d.store;
  const catsChips = Object.entries(d.cats).map(([k, v]) => '<span style="display:inline-block;background:#fbe3ec;color:#a4446c;font-size:12px;font-weight:bold;padding:5px 12px;border-radius:12px;margin:0 6px 8px 0">' + esc(v) + ' <a href="/admin/delcat?c=' + k + '&k=' + encodeURIComponent(KEY) + '" onclick="return confirm(\'Supprimer cette categorie ?\')" style="color:#c0392b;text-decoration:none">×</a></span>').join('');
  const list = d.products.map(p => '<div class="prod"><span>'
    + (p.image ? '<img src="' + esc(p.image) + '" style="width:44px;height:44px;object-fit:cover;border-radius:8px;vertical-align:middle;margin-right:8px">' : '')
    + '<b>' + esc(p.emoji) + ' ' + esc(p.name) + '</b><br><span style="font-size:12px;color:#a08090">' + esc(d.cats[p.cat] || p.cat) + ' · stock: ' + esc(p.stock) + '</span></span>'
    + '<span><span class="pr">' + esc(p.price) + ' DH</span>'
    + '<a href="/admin/edit?id=' + p.id + '&k=' + encodeURIComponent(KEY) + '" style="color:#d86a8e">Modifier</a>'
    + '<a href="/admin/del?id=' + p.id + '&k=' + encodeURIComponent(KEY) + '" style="color:#c0392b" onclick="return confirm(\'Supprimer ce produit ?\')">Suppr.</a></span></div>').join('') || '<p style="color:#a08090;font-size:13px">Aucun produit.</p>';

  res.send('<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin — ' + esc(s.name) + '</title>' + pageStyles() + '</head><body><div class="wrap"><h1>⚙️ ' + esc(s.name) + '</h1>'
    + (req.query.ok ? '<div class="ok">Enregistre avec succes</div>' : '')
    + '<div class="card"><h2>+ Ajouter un produit</h2>' + productForm(d, null, '/admin/add?k=' + encodeURIComponent(KEY), 'Ajouter le produit') + '</div>'
    + '<div class="card"><h2>Categories</h2><form method="post" action="/admin/addcat?k=' + encodeURIComponent(KEY) + '" style="display:flex;gap:8px;margin-bottom:12px"><input name="label" placeholder="Nouvelle categorie" required style="flex:1"><button class="big" style="width:auto;margin:0;padding:10px 14px">+ Ajouter</button></form>' + catsChips + '</div>'
    + '<div class="card"><h2>Mes produits (' + d.products.length + ')</h2>' + list + '</div>'
    + '<div class="card"><h2>Informations boutique</h2><form id="fstore" method="post" action="/admin/store?k=' + encodeURIComponent(KEY) + '">'
    + '<label>Nom</label><input name="name" value="' + esc(s.name) + '">'
    + '<label>Slogan</label><input name="tagline" value="' + esc(s.tagline) + '">'
    + '<div class="two"><div><label>WhatsApp</label><input name="whatsapp" value="' + esc(s.whatsapp) + '"></div>'
    + '<div><label>Ville</label><input name="city" value="' + esc(s.city) + '"></div></div>'
    + '<label>Banniere promo</label><input name="banner" value="' + esc(s.banner) + '">'
    + '<label>Instagram</label><input name="instagram" value="' + esc(s.instagram) + '">'
    + (s.photo ? '<label>Photo du magasin actuelle</label><img src="' + esc(s.photo) + '" style="max-width:100%;border-radius:10px">' : '')
    + '<label>Photo du magasin (en-tete)</label><input type="file" id="sphoto" accept="image/*" onchange="pvS(this)">'
    + '<img id="spv" style="display:none;max-width:100%;border-radius:10px;margin-top:6px">'
    + '<input type="hidden" name="photo" id="sphotourl" value="' + esc(s.photo || '') + '">'
    + '<button class="big" type="button" onclick="goStore()">Enregistrer</button></form></div></div>'
    + '<script>var PHS=null;function pvS(i){var f=i.files[0];if(!f)return;var r=new FileReader();r.onload=function(e){document.getElementById("spv").src=e.target.result;document.getElementById("spv").style.display="block";PHS={data:e.target.result,type:f.type};};r.readAsDataURL(f);}'
    + 'function goStore(){var b=event.target;if(!PHS){document.getElementById("fstore").submit();return;}b.textContent="Envoi de la photo...";'
    + 'fetch("/admin/upload-img?k=' + encodeURIComponent(KEY) + '",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(PHS)}).then(function(r){return r.json();}).then(function(j){'
    + 'if(j.url){document.getElementById("sphotourl").value=j.url;PHS=null;document.getElementById("fstore").submit();}else{alert(j.error||"Echec envoi");b.textContent="Enregistrer";}})'
    + '.catch(function(){b.textContent="Enregistrer";});}</script></body></html>');
});

// ================= EDIT =================
app.get("/admin/edit", (req, res) => {
  if (req.query.k !== KEY) return res.redirect("/admin");
  const d = load();
  const p = d.products.find(x => String(x.id) === String(req.query.id));
  if (!p) return res.redirect("/admin/panel?k=" + encodeURIComponent(KEY));
  res.send('<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Modifier</title>' + pageStyles() + '</head><body><div class="wrap"><h1>✏️ Modifier le produit</h1><div class="card">'
    + productForm(d, p, '/admin/edit?k=' + encodeURIComponent(KEY), 'Enregistrer')
    + '<p style="margin-top:12px"><a href="/admin/panel?k=' + encodeURIComponent(KEY) + '" style="color:#a08090;font-size:13px">← Retour au panneau</a></p>'
    + '</div></div></body></html>');
});
app.post("/admin/edit", (req, res) => {
  if (req.query.k !== KEY) return res.redirect("/admin");
  const d = load();
  const i = d.products.findIndex(x => String(x.id) === String(req.body.id));
  if (i >= 0) {
    const p = d.products[i];
    p.name = req.body.name || p.name;
    p.price = req.body.price || p.price;
    p.stock = req.body.stock || p.stock;
    p.cat = req.body.cat || p.cat;
    p.color = req.body.color || p.color;
    p.emoji = req.body.emoji || p.emoji;
    if (req.body.image) p.image = req.body.image;
    save(d);
  }
  res.redirect("/admin/panel?k=" + encodeURIComponent(KEY) + "&ok=1");
});

// ================= ACTIONS =================
app.post("/admin/add", (req, res) => {
  if (req.query.k !== KEY) return res.redirect("/admin");
  const d = load();
  d.products.push({ id: Date.now(), name: req.body.name || "Produit", price: req.body.price || "0", cat: req.body.cat || "misk", color: req.body.color || "#f5e0c8,#e0b888", emoji: req.body.emoji || "🧴", stock: req.body.stock || "5", image: req.body.image || "" });
  save(d);
  res.redirect("/admin/panel?k=" + encodeURIComponent(KEY) + "&ok=1");
});
app.get("/admin/del", (req, res) => {
  if (req.query.k !== KEY) return res.redirect("/admin");
  const d = load();
  d.products = d.products.filter(p => String(p.id) !== String(req.query.id));
  save(d);
  res.redirect("/admin/panel?k=" + encodeURIComponent(KEY));
});
app.post("/admin/addcat", (req, res) => {
  if (req.query.k !== KEY) return res.redirect("/admin");
  const d = load();
  const label = (req.body.label || "").trim();
  const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || ("cat" + Date.now());
  if (label) { d.cats[key] = label; save(d); }
  res.redirect("/admin/panel?k=" + encodeURIComponent(KEY) + "&ok=1");
});
app.get("/admin/delcat", (req, res) => {
  if (req.query.k !== KEY) return res.redirect("/admin");
  const d = load();
  delete d.cats[req.query.c];
  save(d);
  res.redirect("/admin/panel?k=" + encodeURIComponent(KEY));
});
app.post("/admin/store", (req, res) => {
  if (req.query.k !== KEY) return res.redirect("/admin");
  const d = load();
  d.store = { name: req.body.name || "Boutique", tagline: req.body.tagline || "", whatsapp: (req.body.whatsapp || "").replace(/[^0-9]/g, ""), city: req.body.city || "", banner: req.body.banner || "", instagram: req.body.instagram || "", photo: req.body.photo || (d.store && d.store.photo) || "" };
  save(d);
  res.redirect("/admin/panel?k=" + encodeURIComponent(KEY) + "&ok=1");
});

// ================= BOUTIQUE =================
app.get("/", (req, res) => {
  const d = load(); const s = d.store;
  const wa = (s.whatsapp || "").replace(/[^0-9]/g, "");
  const cats = {};
  d.products.forEach(p => { if (!cats[p.cat]) cats[p.cat] = d.cats[p.cat] || p.cat; });
  const cards = d.products.map(p => {
    const c = p.color || "#f5e0c8,#e0b888";
    const link = "https://wa.me/" + wa + "?text=" + encodeURIComponent("Bonjour, je veux commander: " + p.name + " — " + p.price + " DH. C'est disponible ?");
    const media = p.image ? '<img src="' + esc(p.image) + '" style="width:100%;height:100%;object-fit:cover" loading="lazy">' : esc(p.emoji);
    return '<div class="p" data-c="' + esc(p.cat) + '"><div class="img" style="background:linear-gradient(135deg,' + c + ');overflow:hidden">' + media + '</div><div class="info"><div class="name">' + esc(p.name) + '</div><div class="price">' + esc(p.price) + ' DH</div><a class="btn" target="_blank" href="' + link + '">Je le veux</a><div class="stock">En stock (' + esc(p.stock) + ')</div></div></div>';
  }).join("");
  const catTabs = Object.entries(cats).map(([k, v]) => '<span class="cat" onclick="flt(\'' + k + '\',this)">' + esc(v) + '</span>').join('');
  res.send('<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(s.name) + '</title><style>*{margin:0;padding:0;box-sizing:border-box;font-family:Segoe UI,Tahoma,sans-serif}body{background:#fdf4f7}.wrap{max-width:440px;margin:0 auto;background:#fff;min-height:100vh;box-shadow:0 0 20px rgba(216,106,142,.12)}.head{background:linear-gradient(135deg,#d86a8e,#e8a0bf);color:#fff;padding:18px}h1{font-size:20px;letter-spacing:1px}.sub{font-size:12px;color:#ffe4ee;margin-top:3px}.meta{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.chip{background:rgba(255,255,255,.2);font-size:11px;padding:4px 12px;border-radius:12px}.banner{background:#d4a03c;color:#5a3a10;text-align:center;padding:10px;font-size:13px;font-weight:bold}.cats{display:flex;gap:8px;padding:12px 14px 4px;overflow-x:auto}.cat{white-space:nowrap;background:#fbe3ec;color:#a4446c;font-size:12px;font-weight:bold;padding:7px 16px;border-radius:16px;cursor:pointer}.cat.active{background:#d86a8e;color:#fff}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:14px}.p{background:#fff;border:1px solid #f5d7e2;border-radius:14px;overflow:hidden}.img{height:110px;display:flex;align-items:center;justify-content:center;font-size:36px}.info{padding:9px 11px}.name{font-size:12.5px;font-weight:bold;color:#5a3040}.price{color:#d86a8e;font-weight:bold;font-size:15px;margin:3px 0 7px}.btn{display:block;text-align:center;background:#d86a8e;color:#fff;text-decoration:none;font-size:12.5px;font-weight:bold;padding:9px;border-radius:10px}.stock{font-size:10px;color:#b08020;margin-top:5px}.p.hide{display:none}.contact{background:#fff0f5;margin:6px 14px 0;border-radius:14px;padding:14px;text-align:center}.contact a{color:#d86a8e;font-weight:bold;text-decoration:none;font-size:16px}.footer{text-align:center;font-size:11px;color:#d8a8bc;padding:16px}</style></head><body><div class="wrap"><div class="head"><h1>' + esc(s.name) + '</h1><div class="sub">' + esc(s.tagline) + ' · ' + esc(s.city) + '</div><div class="meta"><span class="chip">🚚 Livraison 24-48h</span><span class="chip">💵 Paiement a la livraison</span></div>' + (s.photo ? '<img src="' + esc(s.photo) + '" style="width:100%;height:210px;object-fit:cover;display:block">' : '') + '</div><div class="banner">✨ ' + esc(s.banner) + '</div><div class="cats"><span class="cat active" onclick="flt(\'all\',this)">Tous</span>' + catTabs + '</div><div class="grid">' + (cards || '<p style="padding:20px;color:#a08090">Bientot disponible.</p>') + '</div><div class="contact">📞 <a href="tel:+' + wa + '">0' + wa.slice(3) + '</a><br><span style="font-size:11px;color:#c090a8">' + esc(s.instagram) + '</span></div><div class="footer">Propulsé par <b style="color:#d86a8e">Store</b> — clikclak.ma</div></div><script>function flt(c,el){document.querySelectorAll(".cat").forEach(function(x){x.classList.remove("active")});el.classList.add("active");document.querySelectorAll(".p").forEach(function(p){p.classList.toggle("hide",c!=="all"&&p.dataset.c!==c);});}</script></body></html>');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Store OK - port " + PORT));
