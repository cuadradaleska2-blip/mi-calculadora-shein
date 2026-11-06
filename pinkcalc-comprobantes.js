/* PinkCalc V10 - presentacion ilustrada de comprobantes. No escribe en almacenamiento. */
(function(){'use strict';
const image=new Image(); image.src='./pinkcalc-factura-plantilla.jpg';
const ready=new Promise(resolve=>{if(image.complete&&image.naturalWidth)resolve(true);else{image.onload=()=>resolve(true);image.onerror=()=>resolve(false)}});
const money=n=>'C$ '+Number(n||0).toLocaleString('es-NI',{minimumFractionDigits:2,maximumFractionDigits:2});
const W=1024,H=1536,rose='#a00053',dark='#583449';
const safe=s=>String(s??'');
function text(g,s,x,y,size=25,bold=false,color=dark,align='left',max=920){g.fillStyle=color;g.textAlign=align;g.font=(bold?'bold ':'')+size+'px Arial,sans-serif';g.fillText(safe(s),x,y,max)}
function box(g,x,y,w,h){g.fillStyle='#fff0f7';g.strokeStyle='#e65a9d';g.lineWidth=2;g.beginPath();g.roundRect(x,y,w,h,18);g.fill();g.stroke()}
function canvasBase(title,number){const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.fillStyle='#fff8fb';g.fillRect(0,0,W,H);if(image.complete&&image.naturalWidth)g.drawImage(image,0,0,W,H);else{g.fillStyle='#f9d6e6';g.fillRect(0,0,W,310);text(g,'PinkCalc 💗',512,115,72,true,rose,'center');text(g,'Calculá fácil. Vendé mejor.',512,180,29,false,dark,'center');g.fillStyle='#fce2ed';g.fillRect(0,1320,W,216)}
// Cover the fixed sample title and sample number, preserving the illustrations.
g.fillStyle='#fbd2e6';g.fillRect(105,252,620,65);g.fillRect(730,254,265,61);
text(g,title,132,297,42,true,rose,'left',580);text(g,'N.º '+safe(number).slice(-9),860,298,30,true,rose,'center',245);return {c,g}}
function splitText(g,value,maxWidth,size=24){g.font=size+'px Arial,sans-serif';const out=[];for(let raw of safe(value).split('\n')){let line='';for(const word of raw.split(/\s+/)){let next=line?line+' '+word:word;if(g.measureText(next).width>maxWidth&&line){out.push(line);line=word}else line=next}out.push(line)}return out}
function rowsPage(title,client,rows,number,pg,pages){let {c,g}=canvasBase(title,number);box(g,32,335,960,104);text(g,'Cliente: '+client,56,383,31,true,rose,'left',910);text(g,'Página '+(pg+1)+' de '+pages,56,420,21,false,dark);let y=477;for(let [key,val] of rows){const label=splitText(g,key,650,23);const h=Math.max(57,27*label.length+18);if(y+h>1050)break;g.fillStyle=y%2?'#fff8fb':'#fff0f6';g.fillRect(35,y-28,952,h);label.forEach((s,i)=>text(g,s,55,y+i*27,23,false,dark,'left',640));text(g,val,972,y,24,true,rose,'right',265);g.strokeStyle='#f2cada';g.beginPath();g.moveTo(42,y+h-32);g.lineTo(983,y+h-32);g.stroke();y+=h}text(g,'💗 Gracias por confiar en PinkCalc',50,1195,25,true,rose,'left',385);return c}
function paginate(d){const rows=(d.rows||[]).map(r=>[safe(r[0]),safe(r[1])]);const pages=[];let chunk=[];let units=0;for(const row of rows){const count=Math.max(1,Math.ceil(row[0].length/49));if(units+count>9&&chunk.length){pages.push(chunk);chunk=[];units=0}chunk.push(row);units+=count}if(chunk.length||!pages.length)pages.push(chunk);return pages.map((part,i)=>rowsPage(d.title||'COMPROBANTE',d.client||'',part,(d.id||'000001'),i,pages.length))}
async function filesFor(d){await ready;const pages=paginate(d),files=[];for(let i=0;i<pages.length;i++){let blob=await new Promise(resolve=>pages[i].toBlob(resolve,'image/png'));if(blob)files.push(new File([blob],`PinkCalc-${(d.title||'comprobante').toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${i+1}.png`,{type:'image/png'}))}return {pages,files}}
async function share(d){let {files}=await filesFor(d);if(!files.length)return alert('No se pudo crear el comprobante.');try{if(navigator.canShare?.({files})&&navigator.share){await navigator.share({files,title:'PinkCalc - '+d.title});return}}catch(e){if(e.name==='AbortError')return}for(const file of files){let u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(u),15000)}alert('Comprobante guardado como imagen para compartir.')}
async function print(d){let {pages}=await filesFor(d);let w=window.open('','_blank');if(!w)return alert('Permití ventanas emergentes para imprimir.');w.document.write('<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>PinkCalc</title><style>body{margin:0;text-align:center}img{display:block;width:100%;page-break-after:always}@page{margin:5mm}</style></head><body>'+pages.map(c=>'<img src="'+c.toDataURL('image/png')+'">').join('')+'<script>window.onload=()=>window.print()<\/script></body></html>');w.document.close()}
// The original account handlers call these global functions, so existing buttons keep working.
if(typeof accountShare==='function')window.accountShare=share;
if(typeof accountPrint==='function')window.accountPrint=print;
// Include payment method and prior balance without changing stored payments.
if(typeof accountReceiptData==='function'){
 const previous=accountReceiptData;
 window.accountReceiptData=function(a,kind,id){let d=previous(a,kind,id);if(!d)return d;d.id=id||a.id;
 if(kind==='payment'){let pay=a.payments.find(x=>x.id===id);if(pay){const after=typeof accountBalanceAt==='function'?accountBalanceAt(a,id):0;d.rows.splice(2,0,['Método de pago',pay.method||(pay.note?.match(/Método:\s*([^·]+)/)?.[1]?.trim())||'No especificado'],['Saldo antes del abono',money(after+Number(pay.amount||0))]);if(pay.note)d.rows.push(['Nota',pay.note])}}
 return d}
}
// Reuse the illustrated style for legacy vouchers too (sale, client and credit).
function legacyData(x){const total=Number(x.total||0),paid=Number(x.paid||0);let rows=[['Fecha',x.date||new Date().toLocaleDateString('es-NI')]];if(x.name||x.detail)rows.push(['Producto / detalle',x.name||x.detail]);if(x.qty)rows.push(['Cantidad',String(x.qty)]);if(x.unit)rows.push(['Precio unitario',money(x.unit)]);rows.push(['Total',money(total)],['Abonado',money(paid)],['Saldo pendiente',money(Math.max(0,total-paid))]);if(x.method)rows.push(['Método de pago',x.method]);return {title:'BAUCHER DE COMPRA',client:x.client||x.name||'Cliente',rows,id:x.id}}
if(typeof shareReceipt==='function')window.shareReceipt=async x=>share(legacyData(x));
if(typeof printReceipt==='function')window.printReceipt=x=>print(legacyData(x));
// Also provide an explicit voucher button for each account payment, next to its existing actions.
const detail=document.getElementById('accountDetail');if(detail){detail.addEventListener('click',e=>{let b=e.target.closest('[data-pc-voucher]');if(!b)return;let a=accountLoad().find(x=>x.id===selectedAccount);if(!a)return;let d=accountReceiptData(a,'payment',b.dataset.pcVoucher);if(d)share(d)});
const old=window.accountRenderDetail;if(typeof old==='function'){window.accountRenderDetail=function(){old();detail.querySelectorAll('[data-account-action="sharepayment"]').forEach(b=>{if(b.parentElement.querySelector('[data-pc-voucher]'))return;let n=document.createElement('button');n.className='secondary';n.textContent='🎀 Baucher rosado';n.dataset.pcVoucher=b.dataset.id;b.parentElement.appendChild(n)})}}}
})();
