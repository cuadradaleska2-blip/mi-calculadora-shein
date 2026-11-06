/* PinkCalc: asignar cotizaciones a clientes y facturas ilustradas.
   Extensión compatible con pinkcalcAccountsV1 y miCalculadoraSheinV1.
   No borra ni migra información histórica. */
(function(){
'use strict';
const el=id=>document.getElementById(id);
const fmt=n=>'C$ '+Number(n||0).toLocaleString('es-NI',{minimumFractionDigits:2,maximumFractionDigits:2});
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>String(Date.now())+'-'+Math.random().toString(36).slice(2,9);
const today=()=>{let d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
let cart=[];
const saved=el('saved');
if(!saved||typeof read!=='function'||typeof accountLoad!=='function')return;
const panel=document.createElement('div');panel.className='card';panel.id='pcQuotePanel';
panel.innerHTML=`<h2>🎀 Preparar pedido de un cliente</h2><p>Agregá productos que ya cotizaste. Podés elegir muchos y enviarlos juntos a Ale o a otro cliente.</p><div id="pcQuoteCart"></div><div class="field"><label>Asignar a</label><select id="pcQuoteClient"></select></div><div class="field"><label>O crear cliente nuevo (opcional)</label><input id="pcQuoteNewClient" placeholder="Nombre de un cliente nuevo"></div><div class="grid"><div class="field"><label>Abono ahora (C$) · opcional</label><input id="pcQuotePaid" type="number" min="0" step="0.01" value="0"></div><div class="field"><label>Método de pago</label><select id="pcQuoteMethod"><option>Efectivo</option><option>Transferencia</option><option>Depósito</option><option>Tarjeta</option><option>Otro</option></select></div></div><p class="note">Podés dejar el abono en C$ 0 y registrar los pagos más adelante.</p><button id="pcQuoteSave" class="primary">💗 Guardar productos en la cuenta</button>`;
saved.insertBefore(panel,saved.firstChild);
const css=document.createElement('style');css.textContent='.pc-quote-row{display:flex;gap:10px;border-bottom:1px solid #f7dbe5;padding:10px 0;align-items:center}.pc-quote-row img{width:54px;height:60px;object-fit:cover;border-radius:10px}.pc-quote-row .pc-quote-main{flex:1;min-width:0}.pc-quote-row .pc-quote-main b{display:block;font-size:13px}.pc-quote-row input{width:92px;max-width:100%}.pc-quote-row .pc-small{font-size:12px;color:#795c70}.pc-quote-actions{display:flex;gap:8px;align-items:end;flex-wrap:wrap}.pc-quote-actions label{margin:0}.pc-soft{padding:11px;border-radius:12px;background:#fff0f6;margin:9px 0}';document.head.appendChild(css);
function syncClients(){let v=el('pcQuoteClient').value;el('pcQuoteClient').innerHTML='<option value="">Seleccioná un cliente existente</option>'+accountLoad().map(a=>`<option value="${html(a.id)}">${html(a.name)}</option>`).join('');if(accountLoad().some(a=>a.id===v))el('pcQuoteClient').value=v}
function renderCart(){syncClients();let total=0;el('pcQuoteCart').innerHTML=cart.map((r,i)=>{let sub=r.qty*r.price;total+=sub;return `<div class="pc-quote-row" data-cart="${i}">${r.photo?`<img src="${r.photo}" alt="Foto del producto">`:'🛍️'}<div class="pc-quote-main"><b>${html(r.name)}</b><div class="pc-quote-actions"><label class="pc-small">Cantidad<input data-cart-qty="${i}" type="number" min="1" step="1" value="${r.qty}"></label><label class="pc-small">Precio por unidad C$<input data-cart-price="${i}" type="number" min="0.01" step="0.01" value="${r.price.toFixed(2)}"></label><button class="danger" data-cart-remove="${i}" title="Quitar">×</button></div></div></div>`}).join('')+`<div class="pc-soft"><b>${cart.length} producto(s) diferentes · Total: ${fmt(total)}</b></div>`+(!cart.length?'<p>En los productos guardados tocá «Agregar a cliente».</p>':'');}
const oldRender=render;
render=function(){oldRender();el('items').querySelectorAll('.item').forEach((div,i)=>{let b=div.querySelector('[data-action="edit"]');if(!b)return;let actions=div.querySelector('.actions');if(!actions||actions.querySelector('[data-pc-add]'))return;let btn=document.createElement('button');btn.className='secondary';btn.textContent='💗 Agregar a cliente';btn.dataset.pcAdd=b.dataset.id;actions.appendChild(btn)});syncClients()};
el('items').addEventListener('click',e=>{let b=e.target.closest('[data-pc-add]');if(!b)return;let p=read().find(x=>x.id===b.dataset.pcAdd);if(!p)return;let q=Math.max(1,Math.floor(Number(p.qty)||1)),price=Number(p.sale||0)/q;if(!Number.isFinite(price)||price<=0)return alert('Este producto necesita un precio de venta mayor que cero.');let existing=cart.find(x=>x.sourceId===p.id);if(existing)existing.qty+=q;else cart.push({sourceId:p.id,name:p.name,qty:q,price,photo:p.photo||''});renderCart();panel.scrollIntoView({behavior:'smooth',block:'start'})});
el('pcQuoteCart').addEventListener('input',e=>{let idx=Number(e.target.dataset.cartQty??e.target.dataset.cartPrice);if(!Number.isInteger(idx)||!cart[idx])return;if('cartQty'in e.target.dataset){let q=Number(e.target.value);if(Number.isInteger(q)&&q>0)cart[idx].qty=q}else if('cartPrice'in e.target.dataset){let p=Number(e.target.value);if(Number.isFinite(p)&&p>0)cart[idx].price=p}let total=cart.reduce((n,x)=>n+x.qty*x.price,0);let p=el('pcQuoteCart').querySelector('.pc-soft b');if(p)p.textContent=cart.length+' producto(s) diferentes · Total: '+fmt(total)});
el('pcQuoteCart').addEventListener('click',e=>{let b=e.target.closest('[data-cart-remove]');if(!b)return;cart.splice(Number(b.dataset.cartRemove),1);renderCart()});
el('pcQuoteSave').onclick=()=>{if(!cart.length)return alert('Primero agregá productos cotizados.');let name=el('pcQuoteNewClient').value.trim(),id=el('pcQuoteClient').value,accounts=accountLoad(),person;if(name){person=accounts.find(x=>x.name.toLocaleLowerCase('es').trim()===name.toLocaleLowerCase('es').trim());if(!person){person={id:uid(),name,purchases:[],payments:[]};accounts.push(person)}}else{person=accounts.find(x=>x.id===id);if(!person)return alert('Elegí un cliente existente o escribí uno nuevo.')}let total=cart.reduce((s,x)=>s+x.qty*x.price,0),paid=Number(el('pcQuotePaid').value);if(!Number.isFinite(paid)||paid<0||paid>total)return alert('El abono debe estar entre 0 y el total del pedido.');let method=el('pcQuoteMethod').value,invoice={id:uid(),date:today(),items:cart.map(x=>({...x})),paymentMethod:paid?method:'Pendiente de pago'};person.purchases.push(invoice);if(paid>0)person.payments.push({id:uid(),date:today(),amount:paid,purchaseId:invoice.id,note:'Método: '+method,created:Date.now()});try{accountSave(accounts)}catch(err){return alert('No se pudo guardar. Hacé un respaldo y revisá el espacio de almacenamiento.')}cart=[];el('pcQuoteNewClient').value='';el('pcQuotePaid').value='0';renderCart();selectedAccount=person.id;showTab('accounts');accountRender();el('accountDetail').scrollIntoView({behavior:'smooth'});alert('💗 Compra guardada para '+person.name+(paid?' con abono de '+fmt(paid):' sin abono inicial')+'\nTocá «Factura rosadita» para compartirla.')};
// La interfaz de cuentas anterior sigue funcionando. Solo añadimos la factura mejorada.
const previousAccountDetail=accountRenderDetail;
accountRenderDetail=function(){previousAccountDetail();let detail=el('accountDetail');detail.querySelectorAll('[data-account-action="sharepurchase"]').forEach(button=>{let parent=button.parentElement;if(!parent||parent.querySelector('[data-pc-invoice]'))return;let b=document.createElement('button');b.className='primary';b.style.width='auto';b.dataset.pcInvoice=button.dataset.id;b.textContent='🎀 Factura rosadita';parent.appendChild(b)});let note=el('accountPayNote');if(note&&!el('pcAccountPayMethod')){let div=document.createElement('div');div.className='field';div.innerHTML='<label>Método de pago del abono</label><select id="pcAccountPayMethod"><option>Efectivo</option><option>Transferencia</option><option>Depósito</option><option>Tarjeta</option><option>Otro</option></select>';note.closest('.field').before(div)}};
// Complementa la nota del abono sin alterar su validación ni el historial existente.
el('accountDetail').addEventListener('click',e=>{let b=e.target.closest('[data-account-action="savepayment"]');if(!b)return;let method=el('pcAccountPayMethod')?.value||'Efectivo',field=el('accountPayNote');if(field&&!field.value.startsWith('Método: '))field.value='Método: '+method+(field.value.trim()?' · '+field.value.trim():'')},true);
// Dibujo original, sin depender de imágenes externas: muñequita rosada y capibara.
function round(c,x,y,w,h,r,fill){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
function mascot(g,x,y){g.save();g.translate(x,y);
// bolsas y corazones
round(g,118,106,70,86,8,'#f5b4ce');round(g,178,121,58,71,8,'#f0a0c0');g.strokeStyle='#b65e85';g.lineWidth=5;g.beginPath();g.arc(152,106,17,Math.PI,0);g.arc(207,121,12,Math.PI,0);g.stroke();
// muñequita
round(g,26,105,94,92,30,'#e88aae');g.fillStyle='#684038';g.beginPath();g.ellipse(73,65,58,60,0,0,Math.PI*2);g.fill();g.fillStyle='#ffd9c5';g.beginPath();g.ellipse(72,75,42,49,0,0,Math.PI*2);g.fill();g.fillStyle='#684038';g.beginPath();g.ellipse(42,40,27,40,-0.5,0,Math.PI*2);g.ellipse(103,40,27,40,.5,0,Math.PI*2);g.fill();g.fillStyle='#573533';g.beginPath();g.arc(57,80,3.5,0,7);g.arc(87,80,3.5,0,7);g.fill();g.strokeStyle='#9d5c66';g.lineWidth=2;g.beginPath();g.arc(72,91,8,0,Math.PI);g.stroke();g.fillStyle='#f1a0a8';g.beginPath();g.arc(40,90,8,0,7);g.arc(103,90,8,0,7);g.fill();
// lazo
round(g,46,6,27,20,10,'#ff6da5');round(g,76,6,27,20,10,'#ff6da5');round(g,68,10,14,15,4,'#e34983');
// capibara
round(g,235,143,100,53,25,'#b87c58');round(g,265,114,64,54,22,'#c58c64');g.fillStyle='#976041';g.beginPath();g.arc(278,113,10,0,7);g.arc(315,117,9,0,7);g.fill();g.fillStyle='#44322c';g.beginPath();g.arc(309,137,3,0,7);g.fill();g.restore()}
function getPic(src){return new Promise(resolve=>{if(!src)return resolve(null);const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>resolve(null);i.src=src})}
function textWrap(g,s,x,y,width,lineH,maxLines){let words=String(s).split(/\s+/),lines=[],line='';for(let w of words){let next=line?line+' '+w:w;if(g.measureText(next).width>width&&line){lines.push(line);line=w}else line=next}if(line)lines.push(line);lines.slice(0,maxLines).forEach((v,i)=>g.fillText(v,x,y+i*lineH));return Math.min(lines.length,maxLines)}
async function invoices(a,p){
 const perPage=3,total=p.items.reduce((n,i)=>n+i.qty*i.price,0);
 const left=accountPaymentAlloc(a).find(x=>x.id===p.id)?.left??total;
 const paid=Math.max(0,total-left),pages=[];
 const bg=await getPic('./pinkcalc-factura-plantilla.jpg');
 if(!bg)throw Error('No se cargó la plantilla ilustrada de PinkCalc.');
 const method=a.payments.filter(v=>v.purchaseId===p.id&&v.note?.includes('Método: ')).map(v=>v.note.match(/Método: ([^·]+)/)?.[1]?.trim()).filter(Boolean).pop()||p.paymentMethod||'Por confirmar';
 const date=new Date(p.date+'T12:00:00').toLocaleDateString('es-NI',{day:'2-digit',month:'long',year:'numeric'});
 const max=Math.max(1,Math.ceil(p.items.length/perPage));
 for(let page=0;page<max;page++){
  const sub=p.items.slice(page*perPage,(page+1)*perPage),last=page===max-1;
  let c=document.createElement('canvas');c.width=1024;c.height=1536;let g=c.getContext('2d');g.drawImage(bg,0,0,1024,1536);
  const box=(x,y,w,h,fill='#fff2f8',stroke='#d95192',r=20)=>{g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();g.strokeStyle=stroke;g.lineWidth=2;g.stroke()};
  const tx=(s,x,y,size=25,bold=false,color='#67213f',align='left')=>{g.fillStyle=color;g.textAlign=align;g.font=(bold?'bold ':'')+size+'px sans-serif';g.fillText(String(s),x,y)};
  // El encabezado, la muñequita, las bolsas y el capibara son los de la imagen elegida.
  box(735,254,252,57,'#fff8fc','#d51a7a',18);tx('N.º '+String(p.id).replace(/\D/g,'').slice(-6).padStart(6,'0'),862,292,28,true,'#9d004e','center');
  box(31,333,635,105);box(680,333,310,105,'#ffe1ed');
  tx('Cliente:',65,375,26,true);tx(a.name.slice(0,33),195,375,25,true);
  tx('Fecha:',65,413,24,true);tx(date,166,413,23);
  tx('Estado:',711,371,25,true);tx(left<.005?'PAGADO':paid>0?'ABONANDO':'PENDIENTE',710,412,24,true,left<.005?'#26845c':'#cc5a18');
  box(31,460,960,329,'#fffafc','#e43d94');
  g.fillStyle='#e9348d';g.fillRect(33,462,956,51);
  tx('Producto',175,498,27,true,'white');tx('Cant.',554,498,25,true,'white');tx('Precio Unit.',690,498,24,true,'white');tx('Subtotal',945,498,24,true,'white','right');
  for(let j=0;j<sub.length;j++){
   let item=sub[j],y=515+j*90;
   if(j%2===0){g.fillStyle='#fff0f7';g.fillRect(34,y,954,89)}
   let pic=await getPic(item.photo);
   if(pic){g.save();g.beginPath();g.roundRect(53,y+8,92,74,12);g.clip();let k=Math.max(92/pic.width,74/pic.height);g.drawImage(pic,53+(92-pic.width*k)/2,y+8+(74-pic.height*k)/2,pic.width*k,pic.height*k);g.restore()}
   else {tx('🛍️',82,y+55,37)}
   g.textAlign='left';g.font='bold 21px sans-serif';g.fillStyle='#43162d';textWrap(g,item.name,163,y+36,315,25,2);
   tx(item.qty,558,y+52,24,true,'#43162d','center');tx(fmt(item.price),775,y+52,22,false,'#43162d','right');tx(fmt(item.qty*item.price),965,y+52,22,true,'#43162d','right');
   g.strokeStyle='#edb6d0';g.beginPath();g.moveTo(40,y+89);g.lineTo(982,y+89);g.stroke();
  }
  if(max>1)tx('Página '+(page+1)+' de '+max,505,819,21,true,'#b51b67','center');
  box(31,843,500,210,'#fff0f7');box(550,843,441,210,'#fff0f7');
  tx('Resumen del pedido',60,882,28,true,'#a30054');
  tx('Total de productos:',60,922,23);tx(p.items.reduce((n,i)=>n+i.qty,0),505,922,23,true,'#62233e','right');
  tx('Subtotal:',60,958,23);tx(fmt(total),505,958,23,true,'#62233e','right');
  tx('Abono:',60,994,23);tx(fmt(paid),505,994,23,true,'#62233e','right');
  box(44,1005,475,42,'#ffd1e7','#ffd1e7',15);tx('Saldo pendiente:',60,1035,25,true,'#a30054');tx(fmt(left),504,1035,25,true,'#a30054','right');
  tx('Método de pago',574,882,28,true,'#a30054');
  ['Efectivo','Transferencia','Depósito','Otro'].forEach((m,i)=>{let y=923+i*33;box(579,y-20,22,22,'#fff','#bf4381',4);if(method.toLowerCase().includes(m.toLowerCase())||(i===3&&!['Efectivo','Transferencia','Depósito'].some(x=>method.toLowerCase().includes(x.toLowerCase()))))tx('✓',581,y-2,22,true,'#d70075');tx(m,617,y,22)});
  box(33,1090,399,195,'#fff1f7');tx('Nota:',65,1132,27,true,'#a30054');
  tx(last?'Gracias por tu compra.':'Tu pedido continúa',62,1181,23,true);tx(last?'Tu pedido está registrado':'en la siguiente página.',62,1219,22);tx(last?'y en proceso. 💗':'PinkCalc 💗',62,1256,22);
  pages.push(c);
 }
 return pages;
}
async function shareInvoices(a,p,print){let cvs=await invoices(a,p),files=[];for(let i=0;i<cvs.length;i++){let blob=await new Promise(r=>cvs[i].toBlob(r,'image/png'));if(blob)files.push(new File([blob],'PinkCalc-'+String(p.id).slice(0,8)+'-pagina-'+(i+1)+'.png',{type:'image/png'}))}if(!files.length)return alert('No se pudo generar la factura.');if(print){let w=window.open('','_blank');if(!w)return alert('Permití ventanas emergentes para imprimir.');w.document.write('<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>Factura PinkCalc</title><style>body{margin:0;text-align:center}img{display:block;max-width:100%;width:100%;page-break-after:always}@page{margin:5mm}</style></head><body>'+cvs.map(c=>'<img src="'+c.toDataURL('image/png')+'">').join('')+'<script>window.onload=()=>window.print()<\/script></body></html>');w.document.close();return}
try{if(navigator.canShare?.({files})&&navigator.share){await navigator.share({files,title:'Factura PinkCalc de '+a.name});return}}catch(err){if(err.name==='AbortError')return}
for(let f of files){let url=URL.createObjectURL(f),link=document.createElement('a');link.href=url;link.download=f.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),15000)}alert('Factura descargada en '+files.length+' imagen(es). Podés enviarlas por WhatsApp.')}
el('accountDetail').addEventListener('click',async e=>{let b=e.target.closest('[data-pc-invoice]');if(!b)return;let a=accountLoad().find(x=>x.id===selectedAccount),p=a?.purchases.find(x=>x.id===b.dataset.pcInvoice);if(!a||!p)return;let kind=confirm('¿Querés imprimir la factura?\nAceptar: imprimir · Cancelar: compartir o descargar.');try{await shareInvoices(a,p,kind)}catch(err){console.error(err);alert('Hubo un problema al generar la factura. Revisá las fotografías de este pedido.')}});
renderCart();
})();
