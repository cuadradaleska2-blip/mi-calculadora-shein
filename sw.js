/* PinkCalc V8: incorpora el modulo de facturas sin editar index.html.
   Mantiene los datos existentes del navegador. */
const CACHE='pinkcalc-v8-listo-20261105';
const FILES=['./','./index.html','./pinkcalc-pedidos.js','./catalogo.html','./catalogo.json','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
async function pageWithPinkCalc(request){
 let response;
 try{response=await fetch(request)}catch{response=await caches.match(request)||await caches.match('./index.html')}
 if(!response)return Response.error();
 if(!response.ok)return response;
 const type=response.headers.get('content-type')||'';
 if(!type.includes('text/html'))return response;
 let html=await response.text();
 const tag='<script src="./pinkcalc-pedidos.js"></script>';
 if(!html.includes('pinkcalc-pedidos.js')){
   html=html.includes('</body>')?html.replace('</body>',tag+'</body>'):html+tag;
 }
 const headers=new Headers(response.headers);
 headers.delete('content-length');headers.delete('content-encoding');headers.set('content-type','text/html; charset=utf-8');
 return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 if(e.request.mode==='navigate'){e.respondWith(pageWithPinkCalc(e.request));return}
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
