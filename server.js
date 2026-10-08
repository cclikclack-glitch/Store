const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.urlencoded({ extended: true }));

const PASSWORD = process.env.ADMIN_PASSWORD || "aqua2026"; // <-- change dans Railway Variables
const DATA = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, "data.json")
                                 : path.join(__dirname, "data.json");
const CATS = { misk:"Musc", rose:"Roses", oud:"Oud", care:"Soins" };
const COLORS = { "#f5e0c8,#e0b888":"Dore", "#f8c8d8,#e890a8":"Rose", "#ffffff,#e8e0e8":"Blanc",
  "#c8a880,#8f6a45":"Oud brun", "#e8c8e0,#b890c8":"Violet", "#c8e0d8,#88b8a8":"Vert" };

function load(){ try { return JSON.parse(fs.readFileSync(DATA,"utf8")); } catch(e){ return {store:{},products:[]}; } }
function save(d){ fs.writeFileSync(DATA, JSON.stringify(d,null,2)); }
if(!fs.existsSync(DATA)) save({store:{name:"MA BOUTIQUE",tagline:"",whatsapp:"212600000000",city:"",banner:"Bienvenue",instagram:""},products:[]});

const esc = s => String(s??"").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

// ===== ADMIN =====
app.get("/admin", (req,res)=>{
  if(req.query.logout){ res.redirect("/admin"); return; }
  res.send(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Store Admin</title><style>body{background:#fdf4f7;font-family:Segoe UI,Arial;display:flex;justify-content:center;padding-top:80px}
.box{background:#fff;padding:30px;border-radius:16px;width:320px;box-shadow:0 4px 20px rgba(216,106,142,.2);text-align:center}
h1{color:#d86a8e;font-size:22px;margin-bottom:6px}p{color:#a08090;font-size:13px;margin-bottom:18px}
input{width:100%;padding:12px;border:2px solid #f0d0dc;border-radius:10px;font-size:15px;margin-bottom:12px}
button{width:100%;background:#d86a8e;color:#fff;border:none;padding:13px;border-radius:10px;font-weight:bold;font-size:15px}</style></head><body>
<div class="box"><h1>Store Admin</h1><p>Connexion boutique</p>
<form method="post" action="/admin/login"><input type="password" name="pw" placeholder="Mot de passe" required><button>Se connecter</button></form>
</div></body></html>`);
});
app.post("/admin/login", (req,res)=>{
  if(req.body.pw === PASSWORD){ res.cookie = null; res.redirect("/admin/panel"); }
  else res.redirect("/admin");
});
// session simple via query key
const KEY = process.env.ADMIN_KEY || "clef12345";
app.get("/admin/panel", (req,res)=>{
  if(req.query.k !== KEY) return res.redirect("/admin");
  const d = load(); const s = d.store;
  let list = d.products.map(p=>`<div class="prod"><span><b>${esc(p.emoji)} ${esc(p.name)}</b><br>
    <span style="font-size:12px;color:#a08090">${CATS[p.cat]||p.cat} · stock: ${esc(p.stock)}</span></span>
    <span><span class="pr">${esc(p.price)} DH</span>
    <a href="/admin/del?id=${p.id}&k=${KEY}" onclick="return confirm('Supprimer ?')">Suppr.</a></span></div>`).join("");
  res.send(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin — ${esc(s.name)}</title><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:Segoe UI,Arial}body{background:#fdf4f7;padding:16px}
.wrap{max-width:520px;margin:0 auto}.card{background:#fff;border-radius:14px;padding:18px;margin-bottom:16px;box-shadow:0 2px 8px rgba(216,106,142,.12)}
h1{color:#d86a8e;font-size:20px;margin-bottom:14px}h2{color:#5a3040;font-size:15px;margin-bottom:12px}
label{display:block;font-size:11px;font-weight:bold;color:#a08090;margin:10px 0 4px}
input,select{width:100%;padding:10px;border:2px solid #f0d0dc;border-radius:9px;font-size:14px}
button.big{width:100%;margin-top:14px;background:#d86a8e;color:#fff;border:none;padding:12px;border-radius:10px;font-weight:bold;font-size:14px}
.prod{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f8e6ec;font-size:14px}
.prod b{color:#5a3040}.prod .pr{color:#d86a8e;font-weight:bold}.prod a{font-size:12px;color:#d86a8e;margin-left:10px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}</style></head><body><div class="wrap">
<h1>⚙️ ${esc(s.name)}</h1>
<div class="card"><h2>+ Ajouter un produit</h2>
<form method="post" action="/admin/add?k=${KEY}">
<label>Nom du produit</label><input name="name" required>
<div class="two"><div><label>Prix (DH)</label><input name="price" required></div>
<div><label>Stock</label><input name="stock" value="5"></div></div>
<div class="two"><div><label>Categorie</label><select name="cat">${Object.entries(CATS).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select></div>
<div><label>Couleur</label><select name="color">${Object.entries(COLORS).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select></div></div>
<label>Emoji</label><input name="emoji" value="🧴">
<button class="big">Ajouter</button></form></div>
<div class="card"><h2>Mes produits (${d.products.length})</h2>${list}</div>
<div class="card"><h2>Informations boutique</h2>
<form method="post" action="/admin/store?k=${KEY}">
<label>Nom</label><input name="name" value="${esc(s.name)}">
<label>Slogan</label><input name="tagline" value="${esc(s.tagline)}">
<div class="two"><div><label>WhatsApp (indicatif)</label><input name="whatsapp" value="${esc(s.whatsapp)}"></div>
<div><label>Ville</label><input name="city" value="${esc(s.city)}"></div></div>
<label>Banniere</label><input name="banner" value="${esc(s.banner)}">
<label>Instagram</label><input name="instagram" value="${esc(s.instagram)}">
<button class="big">Enregistrer</button></form></div>
</div></body></html>`);
});
app.post("/admin/add",(req,res)=>{ if(req.query.k!==KEY) return res.redirect("/admin");
  const d=load(); d.products.push({id:Date.now(),name:req.body.name,price:req.body.price,cat:req.body.cat,color:req.body.color,emoji:req.body.emoji||"🧴",stock:req.body.stock||"5"});
  save(d); res.redirect("/admin/panel?k="+KEY); });
app.get("/admin/del",(req,res)=>{ if(req.query.k!==KEY) return res.redirect("/admin");
  const d=load(); d.products=d.products.filter(p=>p.id!=req.query.id); save(d); res.redirect("/admin/panel?k="+KEY); });
app.post("/admin/store",(req,res)=>{ if(req.query.k!==KEY) return res.redirect("/admin");
  const d=load(); d.store={name:req.body.name,tagline:req.body.tagline,whatsapp:req.body.whatsapp.replace(/[^0-9]/g,""),city:req.body.city,banner:req.body.banner,instagram:req.body.instagram};
  save(d); res.redirect("/admin/panel?k="+KEY); });

// ===== BOUTIQUE =====
app.get("/", (req,res)=>{
  const d=load(); const s=d.store;
  const wa=(s.whatsapp||"").replace(/[^0-9]/g,"");
  const cats={}; d.products.forEach(p=>{ if(!cats[p.cat]) cats[p.cat]=CATS[p.cat]||p.cat; });
  const cards=d.products.map(p=>`<div class="p" data-c="${p.cat}">
    <div class="img" style="background:linear-gradient(135deg,${p.color||"#f5e0c8,#e0b888"})">${esc(p.emoji)}</div>
    <div class="info"><div class="name">${esc(p.name)}</div><div class="price">${esc(p.price)} DH</div>
    <a class="btn" target="_blank" href="https://wa.me/${wa}?text=${encodeURIComponent("Bonjour, je veux commander: "+p.name+" — "+p.price+" DH. C'est disponible ?")}">Je le veux</a>
    <div class="stock">En stock (${esc(p.stock)})</div></div></div>`).join("");
  res.send(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.name)}</title><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:Segoe UI,Tahoma,sans-serif}body{background:#fdf4f7}
.wrap{max-width:440px;margin:0 auto;background:#fff;min-height:100vh;box-shadow:0 0 20px rgba(216,106,142,.12)}
.head{background:linear-gradient(135deg,#d86a8e,#e8a0bf);color:#fff;padding:18px}
h1{font-size:20px;letter-spacing:1px}.sub{font-size:12px;color:#ffe4ee;margin-top:3px}
.meta{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.chip{background:rgba(255,255,255,.2);font-size:11px;padding:4px 12px;border-radius:12px}
.banner{background:#d4a03c;color:#5a3a10;text-align:center;padding:10px;font-size:13px;font-weight:bold}
.cats{display:flex;gap:8px;padding:12px 14px 4px;overflow-x:auto}
.cat{white-space:nowrap;background:#fbe3ec;color:#a4446c;font-size:12px;font-weight:bold;padding:7px 16px;border-radius:16px;cursor:pointer}
.cat.active{background:#d86a8e;color:#fff}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:14px}
.p{background:#fff;border:1px solid #f5d7e2;border-radius:14px;overflow:hidden}
.img{height:110px;display:flex;align-items:center;justify-content:center;font-size:36px}
.info{padding:9px 11px}.name{font-size:12.5px;font-weight:bold;color:#5a3040}
.price{color:#d86a8e;font-weight:bold;font-size:15px;margin:3px 0 7px}
.btn{display:block;text-align:center;background:#d86a8e;color:#fff;text-decoration:none;font-size:12.5px;font-weight:bold;padding:9px;border-radius:10px}
.stock{font-size:10px;color:#b08020;margin-top:5px}.p.hide{display:none}
.contact{background:#fff0f5;margin:6px 14px 0;border-radius:14px;padding:14px;text-align:center}
.contact a{color:#d86a8e;font-weight:bold;text-decoration:none;font-size:16px}
.footer{text-align:center;font-size:11px;color:#d8a8bc;padding:16px}</style></head><body><div class="wrap">
<div class="head"><h1>${esc(s.name)}</h1><div class="sub">${esc(s.tagline)} · ${esc(s.city)}</div>
<div class="meta"><span class="chip">🚚 Livraison 24-48h</span><span class="chip">💵 Paiement a la livraison</span></div></div>
<div class="banner">✨ ${esc(s.banner)}</div>
<div class="cats"><span class="cat active" onclick="flt('all',this)">Tous</span>${Object.entries(cats).map(([k,v])=>`<span class="cat" onclick="flt('${k}',this)">${esc(v)}</span>`).join("")}</div>
<div class="grid">${cards}</div>
<div class="contact">📞 <a href="tel:+${wa}">0${wa.slice(3)}</a><br><span style="font-size:11px;color:#c090a8">${esc(s.instagram)}</span></div>
<div class="footer">Propulsé par <b style="color:#d86a8e">Store</b> — clikclak.ma</div></div>
<script>function flt(c,el){document.querySelectorAll('.cat').forEach(x=>x.classList.remove('active'));el.classList.add('active');
document.querySelectorAll('.p').forEach(p=>{p.classList.toggle('hide',c!=='all'&&p.dataset.c!==c);});}</script></body></html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("Store OK sur port "+PORT));
