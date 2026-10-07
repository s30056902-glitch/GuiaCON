/* Service worker de Manual de Campo.
   Para publicar cambios: sube el número de VERSION. Al cambiarlo, se crea una
   caché nueva y se borran las anteriores. */
var VERSION = "v1";
var CACHE = "manual-de-campo-" + VERSION;
var FONTS = "manual-de-campo-fonts";
var SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./data/units.json",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){
        return k.indexOf("manual-de-campo-") === 0 && k !== CACHE && k !== FONTS;
      }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  // Tipografías de Google: se guardan al verlas por primera vez.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com"){
    e.respondWith(
      caches.open(FONTS).then(function(c){
        return c.match(req).then(function(hit){
          var net = fetch(req).then(function(res){ if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; }).catch(function(){ return hit; });
          return hit || net;
        });
      })
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // Datos: primero la red (para ver cambios), si no hay red, la copia guardada.
  if (url.pathname.slice(-10) === "units.json"){
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){ return caches.match(req); })
    );
    return;
  }

  // Resto: primero la caché; las páginas caen a index.html sin red.
  e.respondWith(
    caches.match(req, {ignoreSearch:true}).then(function(hit){
      return hit || fetch(req).catch(function(){
        if (req.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});
