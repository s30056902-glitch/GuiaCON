(function(){
  var CATS = {
    land:{label:"Terrestre",code:"TIE"},
    air:{label:"Aéreo",code:"AIR"},
    sea:{label:"Naval",code:"MAR"},
    msl:{label:"Misiles",code:"MIS"}
  };
  var STATS = [
    {k:"atk",label:"Ataque",unit:"",scale:function(v){return v/100;}},
    {k:"def",label:"Defensa",unit:"",scale:function(v){return v/100;}},
    {k:"spd",label:"Velocidad",unit:" km/h",scale:function(v){return Math.sqrt(v/2500);}},
    {k:"rng",label:"Alcance",unit:" km",scale:function(v){return Math.sqrt(v/5000);}}
  ];
  var BASE = [];
  var KEY = "manual-de-campo-v1";
  var edits = {};
  try { edits = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch(e) { edits = {}; }
  function persist(){ try { localStorage.setItem(KEY, JSON.stringify(edits)); } catch(e) {} }

  var units = BASE.map(function(u){ return merged(u); });
  function merged(u){
    var o = {}, k, e = edits[u.id] || {};
    for (k in u) o[k] = u[k];
    for (k in e) o[k] = e[k];
    o.verified = (e.verified !== undefined) ? !!e.verified : !!u.verified;
    return o;
  }
  function refresh(){ units = BASE.map(merged); }
  function byId(id){ for (var i=0;i<units.length;i++) if (units[i].id===id) return units[i]; return null; }

  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
  function fmt(n){ return Number(n).toLocaleString("es-CO"); }

  var state = {q:"",cat:"all",picked:[]};
  var $ = function(id){ return document.getElementById(id); };
  var chipsEl=$("chips"), listEl=$("list"), countEl=$("count"), barEl=$("bar"), sheetEl=$("sheet"), scrim=$("scrim");
  var lastFocus = null;

  function renderChips(){
    var items = [["all","Todas"]].concat(Object.keys(CATS).map(function(k){ return [k,CATS[k].label]; }));
    chipsEl.innerHTML = items.map(function(it){
      return '<button type="button" class="chip" data-cat="'+it[0]+'" aria-pressed="'+(state.cat===it[0])+'">'+it[1]+'</button>';
    }).join("");
  }

  function renderList(){
    var q = state.q.trim().toLowerCase();
    var shown = units.filter(function(u){
      return (state.cat==="all" || u.cat===state.cat) && (!q || (u.name+" "+CATS[u.cat].label+" "+u.note).toLowerCase().indexOf(q)>-1);
    });
    countEl.textContent = shown.length + " de " + units.length + " unidades";
    if (!shown.length){
      listEl.innerHTML = '<li class="empty">Ninguna unidad coincide con la búsqueda.</li>';
      return;
    }
    listEl.innerHTML = shown.map(function(u){
      var c = CATS[u.cat];
      var picked = state.picked.indexOf(u.id)>-1;
      return '<li class="card">'+
        '<button type="button" class="open" data-open="'+u.id+'">'+
          '<span class="row"><span class="tag cat-'+u.cat+'">'+c.code+'</span>'+
          '<span class="state'+(u.verified?' ok':'')+'">'+(u.verified?'Verificada':'Ejemplo')+'</span></span>'+
          '<span class="name">'+esc(u.name)+'</span>'+
          '<span class="mini"><span>ATQ '+fmt(u.atk)+'</span><span>DEF '+fmt(u.def)+'</span><span>'+fmt(u.spd)+' km/h</span></span>'+
        '</button>'+
        '<label class="cmp"><input type="checkbox" data-pick="'+u.id+'"'+(picked?' checked':'')+'> Comparar</label>'+
      '</li>';
    }).join("");
  }

  function renderBar(){
    var n = state.picked.length;
    barEl.hidden = n===0 || !scrim.hidden;
    $("barText").textContent = n + " de 2 seleccionadas";
    $("barGo").disabled = n<2;
  }

  function statBars(u){
    return '<div class="stats">'+STATS.map(function(s){
      var w = Math.max(2, Math.min(100, s.scale(u[s.k])*100));
      return '<div class="stat"><span class="lab">'+s.label+'</span><div class="track"><div class="fill" style="width:'+w+'%"></div></div><span class="val">'+fmt(u[s.k])+s.unit+'</span></div>';
    }).join("")+'</div>';
  }

  function openSheet(html){
    sheetEl.innerHTML = html;
    scrim.hidden = false;
    barEl.hidden = true;
    sheetEl.scrollTop = 0;
    var f = sheetEl.querySelector("[data-close]");
    if (f) f.focus();
  }
  function closeSheet(){
    scrim.hidden = true;
    renderBar();
    if (lastFocus && document.contains(lastFocus)) { try { lastFocus.focus(); } catch(e){} }
  }

  function showUnit(id){
    var u = byId(id); if (!u) return;
    var c = CATS[u.cat];
    openSheet(
      '<div class="sheet-top"><div style="display:flex;flex-direction:column;gap:8px;min-width:0">'+
        '<div class="row"><span class="tag cat-'+u.cat+'">'+c.code+'</span><span class="eyebrow">'+c.label+' · '+(u.verified?'Verificada':'Datos de ejemplo')+'</span></div>'+
        '<h2 id="sheetTitle">'+esc(u.name)+'</h2></div>'+
        '<button type="button" class="x" data-close aria-label="Cerrar">×</button></div>'+
      statBars(u)+
      '<dl><dt>Costo</dt><dd>'+esc(u.cost)+'</dd><dt>Producción</dt><dd>'+esc(u.time)+'</dd><dt>Requisito</dt><dd>'+esc(u.req)+'</dd></dl>'+
      (u.note?'<p class="note">'+esc(u.note)+'</p>':'')+
      '<div class="actions"><button type="button" class="btn" data-edit="'+u.id+'">Editar datos</button>'+
      '<button type="button" class="btn ghost" data-pickfrom="'+u.id+'">'+(state.picked.indexOf(u.id)>-1?'Quitar de comparar':'Añadir a comparar')+'</button></div>'
    );
  }

  function field(id,label,val,type){
    return '<div class="field"><label for="f-'+id+'">'+label+'</label><input id="f-'+id+'" name="'+id+'" type="'+(type||"text")+'" value="'+esc(val)+'"'+(type==="number"?' inputmode="decimal" min="0"':'')+'></div>';
  }
  function showEdit(id){
    var u = byId(id); if (!u) return;
    openSheet(
      '<div class="sheet-top"><h2 id="sheetTitle">Editar '+esc(u.name)+'</h2><button type="button" class="x" data-close aria-label="Cerrar">×</button></div>'+
      '<form class="form" id="editForm" data-id="'+u.id+'">'+
        field("name","Nombre",u.name)+
        '<div class="grid2">'+field("atk","Ataque",u.atk,"number")+field("def","Defensa",u.def,"number")+field("spd","Velocidad (km/h)",u.spd,"number")+field("rng","Alcance (km)",u.rng,"number")+'</div>'+
        field("cost","Costo",u.cost)+
        '<div class="grid2">'+field("time","Producción",u.time)+field("req","Requisito",u.req)+'</div>'+
        field("note","Nota",u.note)+
        '<div class="actions"><button type="submit" class="btn">Guardar como verificada</button>'+
        '<button type="button" class="btn ghost" data-view="'+u.id+'">Cancelar</button>'+
        '<button type="button" class="btn ghost" data-reset="'+u.id+'">Restablecer ejemplo</button></div>'+
      '</form>'
    );
  }

  function showCompare(){
    if (state.picked.length<2) return;
    var a = byId(state.picked[0]), b = byId(state.picked[1]);
    var rows = STATS.map(function(s){
      var av=a[s.k], bv=b[s.k];
      return '<div class="cmp-row"><span class="lab">'+s.label+'</span><div class="cmp-cols">'+
        cell(av,bv,s)+cell(bv,av,s)+'</div></div>';
    }).join("");
    function cell(v,other,s){
      var w = Math.max(2, Math.min(100, s.scale(v)*100));
      return '<div class="'+(v>other?'win':'')+'"><span class="v">'+fmt(v)+s.unit+'</span><div class="track"><div class="fill" style="width:'+w+'%"></div></div></div>';
    }
    function txt(label,k){
      return '<div class="cmp-row"><span class="lab">'+label+'</span><div class="cmp-cols"><div><span class="v">'+esc(a[k])+'</span></div><div><span class="v">'+esc(b[k])+'</span></div></div></div>';
    }
    openSheet(
      '<div class="sheet-top"><span class="eyebrow">Comparación</span><button type="button" class="x" data-close aria-label="Cerrar">×</button></div>'+
      '<div class="vs" id="sheetTitle">'+
        '<div><span class="tag cat-'+a.cat+'">'+CATS[a.cat].code+'</span><h3>'+esc(a.name)+'</h3></div>'+
        '<div><span class="tag cat-'+b.cat+'">'+CATS[b.cat].code+'</span><h3>'+esc(b.name)+'</h3></div>'+
      '</div>'+rows+txt("Costo","cost")+txt("Producción","time")+txt("Requisito","req")+
      '<div class="actions"><button type="button" class="btn ghost" data-close>Volver</button></div>'
    );
  }

  function togglePick(id){
    var i = state.picked.indexOf(id);
    if (i>-1) state.picked.splice(i,1);
    else { if (state.picked.length>=2) state.picked.shift(); state.picked.push(id); }
    renderList(); renderBar();
  }

  $("q").addEventListener("input", function(e){ state.q = e.target.value; renderList(); });
  chipsEl.addEventListener("click", function(e){
    var b = e.target.closest("[data-cat]"); if (!b) return;
    state.cat = b.getAttribute("data-cat"); renderChips(); renderList();
  });
  listEl.addEventListener("click", function(e){
    var o = e.target.closest("[data-open]");
    if (o){ lastFocus = o; showUnit(o.getAttribute("data-open")); }
  });
  listEl.addEventListener("change", function(e){
    var p = e.target.closest("[data-pick]"); if (p) togglePick(p.getAttribute("data-pick"));
  });
  $("barGo").addEventListener("click", function(e){ lastFocus = e.currentTarget; showCompare(); });
  $("barClear").addEventListener("click", function(){ state.picked = []; renderList(); renderBar(); });

  scrim.addEventListener("click", function(e){
    if (e.target===scrim) { closeSheet(); return; }
    var t = e.target;
    if (t.closest("[data-close]")) { closeSheet(); return; }
    var ed = t.closest("[data-edit]"); if (ed) { showEdit(ed.getAttribute("data-edit")); return; }
    var vw = t.closest("[data-view]"); if (vw) { showUnit(vw.getAttribute("data-view")); return; }
    var pf = t.closest("[data-pickfrom]"); if (pf) { togglePick(pf.getAttribute("data-pickfrom")); showUnit(pf.getAttribute("data-pickfrom")); return; }
    var rs = t.closest("[data-reset]");
    if (rs) { var id = rs.getAttribute("data-reset"); delete edits[id]; persist(); refresh(); renderList(); showUnit(id); return; }
  });
  scrim.addEventListener("submit", function(e){
    e.preventDefault();
    var f = e.target, id = f.getAttribute("data-id");
    var d = {verified:true};
    ["name","cost","time","req","note"].forEach(function(k){ d[k] = f.elements[k].value.trim(); });
    ["atk","def","spd","rng"].forEach(function(k){
      var n = parseFloat(String(f.elements[k].value).replace(",","."));
      d[k] = isFinite(n) && n>=0 ? n : byId(id)[k];
    });
    if (!d.name) d.name = byId(id).name;
    edits[id] = d; persist(); refresh(); renderList(); showUnit(id);
  });
  document.addEventListener("keydown", function(e){ if (e.key==="Escape" && !scrim.hidden) closeSheet(); });

  renderChips();
  fetch("data/units.json").then(function(r){
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }).then(function(data){
    BASE = data; refresh(); renderList(); renderBar();
  }).catch(function(){
    countEl.textContent = "";
    listEl.innerHTML = '<li class="empty">No se pudieron cargar los datos. Revisa tu conexión y recarga.</li>';
  });
})();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function(){ navigator.serviceWorker.register("sw.js").catch(function(){}); });
}
