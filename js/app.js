const $ = id => document.getElementById(id);
const money = n => '$ ' + Number(n || 0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const rootPrefix = () => (location.pathname.includes('/cliente/') || location.pathname.includes('/admin/')) ? '../' : '';
const cartKey = 'ndb_cart';
const NDB_BRANDS = ['Duke','Egoplast','Bonomini','Dealer','TF3','Faplas','Fusiogas','Medio Giro','Otros'];
const NDB_TYPES = ['Calefones','Termofusión y caños','Herramientas','Polipropileno','Polietileno','Flexibles','Accesorios PVC','Accesorios PVC 3,2','Caños PVC','Grifería, canillas y llaves','Fusión','Epoxi','Accesorios de bronce','Depósitos y mochilas','Botones y repuestos','Válvulas de descarga de agua','Brazos','Boyas','Manijas y palancas','Codos para depósitos','Conexiones para inodoro','Tapas y sobretapas','Asientos','Tornillos','Aros para inodoro','Mangueras','Diafragmas y válvulas','Sopapas y conexiones corrugadas','Sifones para pileta','Varios','Válvulas','Acoples','Química','Grasas','Cintas'];
const localCart = () => JSON.parse(localStorage.getItem(cartKey) || '[]');
const saveLocalCart = c => { localStorage.setItem(cartKey, JSON.stringify(c)); updateCartCount(); };
let PRODUCTS = [], PROFILE = null, CURRENT_USER = null, CURRENT_ROLE = null;

function configWarning(){
  if(window.ndbConfigured) return;
  const box=document.createElement('div'); box.className='config-warning';
  box.innerHTML='<b>Firebase todavía no está configurado.</b> Revisá <code>js/config.js</code>.'; document.body.prepend(box);
}

function waitForAuth(){
  return new Promise(resolve => {
    if(!window.auth) return resolve(null);
    const off=auth.onAuthStateChanged(user=>{off(); resolve(user || null);});
  });
}

async function session(){
  if(!window.auth || !window.db) return null;
  const user = auth.currentUser || await waitForAuth();
  if(!user) { CURRENT_USER=null; CURRENT_ROLE=null; return null; }
  CURRENT_USER=user;
  try {
    const snap=await db.collection('usuarios').doc(user.uid).get();
    CURRENT_ROLE=snap.exists ? (snap.data().rol || null) : null;
  } catch(e){ console.error(e); CURRENT_ROLE=null; }
  return {user,role:CURRENT_ROLE};
}

async function requireUser(role){
  const s=await session();
  if(!s || (role && s.role!==role)){
    alert('Tenés que iniciar sesión con una cuenta autorizada.');
    location.href=rootPrefix()+'login.html'; return false;
  }
  return true;
}

async function logout(){ if(window.auth) await auth.signOut(); location.href=rootPrefix()+'login.html'; }

async function doLogin(){
  if(!window.auth) return alert('Firebase no está disponible.');
  const email=$('email').value.trim(), password=$('pass').value, btn=$('loginBtn');
  if(!email || !password) return alert('Ingresá email y contraseña.');
  btn.disabled=true; btn.textContent='Ingresando...';
  try{
    await auth.signInWithEmailAndPassword(email,password);
    const s=await session();
    if(!s?.role){ await auth.signOut(); throw new Error('La cuenta no tiene un perfil habilitado en Firestore.'); }
    location.href=s.role==='admin'?'admin/presupuestos.html':'cliente/inicio.html';
  }catch(e){ btn.disabled=false; btn.textContent='Ingresar'; alert('No se pudo ingresar: '+friendlyAuthError(e)); }
}
function friendlyAuthError(e){
  const c=e?.code||'';
  if(c.includes('invalid-credential')||c.includes('wrong-password')||c.includes('user-not-found')) return 'email o contraseña incorrectos.';
  if(c.includes('too-many-requests')) return 'demasiados intentos. Probá más tarde.';
  return e?.message||'Error desconocido.';
}
async function redirectIfLogged(){ const s=await session(); if(s?.role) location.href=s.role==='admin'?'admin/presupuestos.html':'cliente/inicio.html'; }
function toggleMobile(){ const m=$('mobileMenu'); if(m) m.style.display=m.style.display==='block'?'none':'block'; }
function updateCartCount(){ const c=localCart().reduce((a,i)=>a+Number(i.cantidad||0),0); document.querySelectorAll('.cart-count').forEach(e=>e.textContent=c); }

function normalizeProduct(doc){ const p=doc.data(); return {id:doc.id,...p}; }
async function loadProducts(){
  if(!window.db){PRODUCTS=[]; renderProducts(); renderOffers(); renderFeatured(); return;}
  const s=await session();
  if(!s){ PRODUCTS=[]; renderCats(); renderProducts(); renderOffers(); renderFeatured(); return; }
  try{
    const snap=await db.collection('productos').where('active','==',true).get();
    PRODUCTS=snap.docs.map(normalizeProduct).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'es'));
  }catch(e){ console.error(e); PRODUCTS=[]; }
  renderCats(); renderProducts(); renderOffers(); renderFeatured();
}
function productCard(p){
  const sinStock=Number(p.stock)<=0, img=p.image_url||rootPrefix()+'img/producto.jpg';
  return `<article class="product">${p.on_sale?'<span class="badge">OFERTA</span>':''}${p.on_sale&&p.discount_percent?`<span class="discount">-${Number(p.discount_percent)}%</span>`:''}<img src="${esc(img)}" alt="${esc(p.name)}" onerror="this.src='${rootPrefix()}img/producto.jpg'"><div class="product-body"><div class="code">${esc(p.code||'')}${p.brand?' · '+esc(p.brand):''}</div><h3>${esc(p.name)}</h3><p class="muted">${esc(p.category||'Sin categoría')}</p><span class="stock ${sinStock?'agotado':''}">${sinStock?'AGOTADO':'Stock disponible: '+p.stock}</span><div class="price">${p.previous_price?`<span class="old-price">${money(p.previous_price)}</span>`:''}${money(p.price)}</div><div class="qty"><input id="qty-${p.id}" type="number" min="1" max="${p.stock}" value="1" ${sinStock?'disabled':''}><button class="btn btn-red" onclick="addCart('${p.id}')" ${sinStock?'disabled':''}>${sinStock?'Sin stock':'Agregar'}</button></div></div></article>`;
}
function filteredProducts(){ const q=($('search')?.value||'').trim().toLowerCase(),cat=$('categoryFilter')?.value||'Todos',brand=$('brandFilter')?.value||'Todas',stockOnly=$('stockFilter')?.checked||false; return PRODUCTS.filter(p=>{const h=`${p.name||''} ${p.code||''} ${p.brand||''} ${p.category||''}`.toLowerCase();return(!q||h.includes(q))&&(cat==='Todos'||p.category===cat)&&(brand==='Todas'||p.brand===brand)&&(!stockOnly||Number(p.stock)>0);}); }
function renderProducts(){ const cont=$('products'); if(!cont)return; if(!CURRENT_USER){cont.innerHTML='<div class="empty">Iniciá sesión para ver el catálogo y realizar pedidos.</div>';return;} cont.innerHTML=filteredProducts().map(productCard).join('')||'<div class="empty">No se encontraron productos.</div>'; }
function renderOffers(){ const cont=$('offers'); if(!cont)return; if(!CURRENT_USER){cont.innerHTML='<div class="empty">Ingresá a tu cuenta para ver las ofertas.</div>';return;} cont.innerHTML=PRODUCTS.filter(p=>p.on_sale).slice(0,4).map(productCard).join('')||'<div class="empty">No hay ofertas activas.</div>'; }
function renderFeatured(){ const cont=$('featured'); if(!cont)return; if(!CURRENT_USER){cont.innerHTML='<div class="empty">Ingresá a tu cuenta para ver los productos.</div>';return;} cont.innerHTML=(PRODUCTS.filter(p=>p.featured).slice(0,4).length?PRODUCTS.filter(p=>p.featured).slice(0,4):PRODUCTS.slice(0,4)).map(productCard).join(''); }
function renderCats(){ const dbCats=[...new Set(PRODUCTS.map(p=>p.category).filter(Boolean))],dbBrands=[...new Set(PRODUCTS.map(p=>p.brand).filter(Boolean))]; const cats=[...NDB_TYPES,...dbCats.filter(v=>!NDB_TYPES.includes(v)).sort((a,b)=>a.localeCompare(b,'es'))],brands=[...NDB_BRANDS,...dbBrands.filter(v=>!NDB_BRANDS.includes(v)).sort((a,b)=>a.localeCompare(b,'es'))]; if($('categoryFilter'))$('categoryFilter').innerHTML='<option value="Todos">Todos los tipos</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join(''); if($('brandFilter'))$('brandFilter').innerHTML='<option value="Todas">Todas las marcas</option>'+brands.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join(''); }
function addCart(id){ if(!CURRENT_USER)return alert('Iniciá sesión para agregar productos.'); const p=PRODUCTS.find(x=>String(x.id)===String(id));if(!p)return;const q=Math.max(1,parseInt($('qty-'+id)?.value||1));let c=localCart(),it=c.find(x=>String(x.id)===String(id)),current=it?Number(it.cantidad):0;if(current+q>Number(p.stock))return alert('No hay suficiente stock disponible.');if(it)it.cantidad+=q;else c.push({id:p.id,code:p.code,name:p.name,price:Number(p.price),cantidad:q});saveLocalCart(c);alert('Producto agregado al carrito.'); }
function removeCart(i){let c=localCart();c.splice(i,1);saveLocalCart(c);renderCart();}
function changeQty(i,q){let c=localCart();const p=PRODUCTS.find(x=>String(x.id)===String(c[i].id));let n=Math.max(1,parseInt(q)||1);if(p&&n>Number(p.stock)){alert('No hay más stock disponible.');n=Number(p.stock);}c[i].cantidad=n;saveLocalCart(c);renderCart();}
function clearCart(){saveLocalCart([]);renderCart();}
function renderCart(){const cont=$('cartItems');if(!cont)return;const c=localCart();let total=0;if(!c.length){cont.innerHTML='<div class="empty">El carrito está vacío.</div>';if($('cartTotal'))$('cartTotal').textContent=money(0);return;}cont.innerHTML=c.map((i,idx)=>{const sub=Number(i.price)*Number(i.cantidad);total+=sub;return `<div class="cart-item"><div class="row"><div><b>${esc(i.name)}</b><div class="code">${esc(i.code||'')}</div></div><b>${money(sub)}</b></div><p class="muted">Unitario ${money(i.price)}</p><div class="row"><label>Cantidad <input class="field qty-small" type="number" min="1" value="${i.cantidad}" onchange="changeQty(${idx},this.value)"></label><button class="btn btn-light" onclick="removeCart(${idx})">Quitar</button></div></div>`}).join('');$('cartTotal').textContent=money(total);}

async function loadProfile(){
  if(!$('razon')&&!$('clientName'))return;if(!(await requireUser('cliente')))return;
  try{const snap=await db.collection('usuarios').doc(CURRENT_USER.uid).get();if(!snap.exists)return;const data=snap.data();PROFILE=data;const map={razon:'business_name',tel:'phone',calle:'address',barrio:'neighborhood',localidad:'city',mail:'email'};for(const [id,key] of Object.entries(map))if($(id))$(id).value=data[key]||'';if($('clientName'))$('clientName').textContent=data.business_name||data.nombre||CURRENT_USER.email;}catch(e){console.error(e);}
}
async function saveProfile(){if(!(await requireUser('cliente')))return;const payload={business_name:$('razon').value.trim(),phone:$('tel').value.trim(),address:$('calle').value.trim(),neighborhood:$('barrio').value.trim(),city:$('localidad').value.trim(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()};try{await db.collection('usuarios').doc(CURRENT_USER.uid).update(payload);alert('Perfil guardado.');}catch(e){alert('No se pudo guardar: '+e.message);}}

function orderNumber(order){return order.numero||`NDB-${String(order.id).slice(0,8).toUpperCase()}`;}
function dateText(v){if(!v)return '';const d=v.toDate?v.toDate():new Date(v);return d.toLocaleString('es-AR');}
async function makeOrder(){
  if(!(await requireUser('cliente')))return;const c=localCart();if(!c.length)return alert('El carrito está vacío.');
  const btn=$('confirmOrderBtn');btn.disabled=true;btn.textContent='Confirmando...';
  try{
    const userSnap=await db.collection('usuarios').doc(CURRENT_USER.uid).get();const u=userSnap.data()||{};
    const fresh=[];
    for(const i of c){const ps=await db.collection('productos').doc(String(i.id)).get();if(!ps.exists)throw new Error(`El producto ${i.name} ya no existe.`);const p=ps.data();if(!p.active||Number(p.stock)<Number(i.cantidad))throw new Error(`No hay stock suficiente de ${p.name||i.name}.`);fresh.push({product_id:ps.id,product_code:p.code||'',product_name:p.name||i.name,quantity:Number(i.cantidad),unit_price:Number(p.price||0)});}
    const total=fresh.reduce((a,i)=>a+i.unit_price*i.quantity,0), ref=db.collection('pedidos').doc();
    const numero='NDB-'+Date.now().toString().slice(-8);
    await ref.set({numero,clienteUid:CURRENT_USER.uid,cliente:{business_name:u.business_name||'',nombre:u.nombre||'',email:u.email||CURRENT_USER.email||'',phone:u.phone||'',address:u.address||'',neighborhood:u.neighborhood||'',city:u.city||''},items:fresh,total,estado:'pendiente',observaciones:$('obs')?.value.trim()||'',createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
    saveLocalCart([]);await downloadOrderPdf(ref.id);alert('Pedido confirmado. En breve nos comunicaremos con vos.');location.href='cliente/mis-presupuestos.html';
  }catch(e){alert('No se pudo crear el pedido: '+e.message);btn.disabled=false;btn.textContent='Confirmar pedido y descargar PDF';}
}
async function getOrderFull(orderId){const snap=await db.collection('pedidos').doc(orderId).get();if(!snap.exists)throw new Error('Pedido no encontrado.');const order={id:snap.id,...snap.data()};return {order,items:order.items||[]};}
async function downloadOrderPdf(orderId){if(!window.jspdf)return alert('No se pudo cargar el generador de PDF.');try{const {order,items}=await getOrderFull(orderId),{jsPDF}=window.jspdf,doc=new jsPDF();let y=16;doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('NDB Sanitarios',15,y);y+=8;doc.setFontSize(12);doc.text(`Pedido ${orderNumber(order)}`,15,y);y+=7;doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text(`Fecha: ${dateText(order.createdAt)||new Date().toLocaleString('es-AR')}`,15,y);y+=6;doc.text(`Cliente: ${order.cliente?.business_name||order.cliente?.nombre||order.cliente?.email||''}`,15,y);y+=6;if(order.cliente?.address){doc.text(`Dirección: ${order.cliente.address}, ${order.cliente.city||''}`,15,y);y+=8;}doc.setFont('helvetica','bold');doc.text('Productos',15,y);y+=7;doc.setFont('helvetica','normal');for(const i of items){if(y>270){doc.addPage();y=18;}const line=`${i.product_code||''} ${i.product_name} x ${i.quantity}  ${money(Number(i.unit_price)*Number(i.quantity))}`,lines=doc.splitTextToSize(line,180);doc.text(lines,15,y);y+=5*lines.length+2;}y+=3;doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text(`TOTAL: ${money(order.total)}`,15,y);y+=7;doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(`Estado: ${order.estado||''}`,15,y);y+=5;if(order.observaciones)doc.text(doc.splitTextToSize(`Observaciones: ${order.observaciones}`,180),15,y);doc.save(`${orderNumber(order)}.pdf`);}catch(e){alert('No se pudo generar el PDF: '+e.message);}}
async function renderMyOrders(){const cont=$('myQuotes');if(!cont)return;if(!(await requireUser('cliente')))return;try{const snap=await db.collection('pedidos').where('clienteUid','==',CURRENT_USER.uid).get();const data=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));cont.innerHTML=data.map(q=>`<div class="quote-item"><div class="row"><h3>${esc(orderNumber(q))}</h3><span class="status ${esc(q.estado)}">${esc(q.estado)}</span></div><p>${dateText(q.createdAt)}</p><p><b>Total:</b> ${money(q.total)}</p><div class="order-actions"><button class="btn btn-light" onclick="downloadOrderPdf('${q.id}')">Descargar PDF</button>${['pendiente','preparacion'].includes(q.estado)?`<button class="btn btn-outline" onclick="openEditOrder('${q.id}')">Modificar</button>`:''}${q.estado==='pendiente'?`<button class="btn btn-danger" onclick="cancelOrder('${q.id}')">Cancelar</button>`:''}</div></div>`).join('')||'<div class="empty">Todavía no tenés pedidos.</div>';}catch(e){console.error(e);cont.innerHTML='<div class="empty">No se pudieron cargar los pedidos.</div>';}}
async function cancelOrder(id){if(!confirm('¿Cancelar este pedido?'))return;try{const ref=db.collection('pedidos').doc(id),snap=await ref.get(),o=snap.data();if(o.clienteUid!==CURRENT_USER.uid||o.estado!=='pendiente')return alert('Solo podés cancelar pedidos pendientes.');await ref.update({estado:'cancelado',updatedAt:firebase.firestore.FieldValue.serverTimestamp()});await renderMyOrders();}catch(e){alert(e.message);}}
async function openEditOrder(id){const {order,items}=await getOrderFull(id);if(!['pendiente','preparacion'].includes(order.estado))return alert('Este pedido ya no se puede modificar.');const rows=items.map(i=>`<div class="edit-row"><div><b>${esc(i.product_name)}</b><div class="code">${esc(i.product_code||'')}</div></div><input class="field" id="edit-${i.product_id}" type="number" min="0" value="${i.quantity}"></div>`).join('');$('orderEditBody').innerHTML=rows;$('orderEditModal').classList.add('show');$('saveOrderEdit').onclick=()=>saveOrderEdit(id,items,order);}
function closeEditOrder(){$('orderEditModal')?.classList.remove('show');}
async function saveOrderEdit(id,items,order){try{const payload=items.map(i=>({...i,quantity:Math.max(0,parseInt($('edit-'+i.product_id).value)||0)})).filter(i=>i.quantity>0);if(!payload.length)return alert('El pedido debe tener al menos un producto.');const total=payload.reduce((a,i)=>a+Number(i.unit_price)*Number(i.quantity),0);await db.collection('pedidos').doc(id).update({items:payload,total,estado:order.estado,clienteUid:order.clienteUid,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});closeEditOrder();await renderMyOrders();alert('Pedido actualizado.');}catch(e){alert('No se pudo actualizar: '+e.message);}}

async function renderAdmin(){if(!$('adminQuotes'))return;if(!(await requireUser('admin')))return;await Promise.all([renderAdminOrders(),renderAdminProducts(),renderAdminClients(),renderDashboard()]);}
async function allOrders(){const snap=await db.collection('pedidos').get();return snap.docs.map(d=>({id:d.id,...d.data()}));}
async function renderDashboard(){if(!$('statPending'))return;const all=await allOrders();$('statPending').textContent=all.filter(x=>x.estado==='pendiente').length;$('statPrepared').textContent=all.filter(x=>x.estado==='preparacion').length;$('statDelivered').textContent=all.filter(x=>x.estado==='entregado').length;$('statTotal').textContent=money(all.filter(x=>x.estado!=='cancelado').reduce((a,x)=>a+Number(x.total||0),0));}
function statusLabel(s){return ({pendiente:'Pendiente',preparacion:'Preparado',entregado:'Entregado',cancelado:'Cancelado'})[s]||s;}
async function renderAdminOrders(){const all=(await allOrders()).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));const raw=$('adminStatusFilter')?.value||'Todos',map={Pendiente:'pendiente',Preparado:'preparacion',Entregado:'entregado',Cancelado:'cancelado'},filter=map[raw]||'Todos',q=($('adminOrderSearch')?.value||'').toLowerCase();const rows=all.filter(o=>(filter==='Todos'||o.estado===filter)&&(!q||`${o.numero||''} ${o.cliente?.business_name||''} ${o.cliente?.nombre||''} ${o.cliente?.email||''}`.toLowerCase().includes(q)));$('adminQuotes').innerHTML=rows.map(o=>`<div class="quote-item"><div class="row"><div><h3>${esc(orderNumber(o))}</h3><p>${esc(o.cliente?.business_name||o.cliente?.nombre||o.cliente?.email||'')}</p></div><span class="status ${esc(o.estado)}">${esc(statusLabel(o.estado))}</span></div><p>${dateText(o.createdAt)} · <b>${money(o.total)}</b></p><div class="order-actions"><button class="btn btn-light" onclick="downloadOrderPdf('${o.id}')">PDF</button><select class="field status-select" onchange="changeStatus('${o.id}',this.value)">${[['pendiente','Pendiente'],['preparacion','Preparado'],['entregado','Entregado'],['cancelado','Cancelado']].map(([v,l])=>`<option value="${v}" ${o.estado===v?'selected':''}>${l}</option>`).join('')}</select></div></div>`).join('')||'<div class="empty">No hay pedidos.</div>';}
async function changeStatus(id,status){try{await db.collection('pedidos').doc(id).update({estado:status,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});await renderAdminOrders();await renderDashboard();}catch(e){alert('No se pudo cambiar el estado: '+e.message);}}
function initAdminProductSelectors(){const brand=$('newProductBrand'),category=$('newProductCategory');if(brand&&!brand.dataset.ready){brand.innerHTML='<option value="">Marca *</option>'+NDB_BRANDS.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');brand.dataset.ready='1';}if(category&&!category.dataset.ready){category.innerHTML='<option value="">Tipo de producto *</option>'+NDB_TYPES.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');category.dataset.ready='1';}}
async function createAdminProduct(){if(!(await requireUser('admin')))return;const code=$('newProductCode')?.value.trim(),name=$('newProductName')?.value.trim(),brand=$('newProductBrand')?.value||'',category=$('newProductCategory')?.value||'',price=Number($('newProductPrice')?.value),stock=Number($('newProductStock')?.value),minStock=Number($('newProductMinStock')?.value||0),previousRaw=$('newProductPreviousPrice')?.value,previousPrice=previousRaw===''?null:Number(previousRaw);if(!code||!name||!brand||!category||!Number.isFinite(price)||price<0||!Number.isInteger(stock)||stock<0)return alert('Completá código, nombre, marca, tipo, precio y stock con valores válidos.');const payload={code,name,brand,category,price,stock,min_stock:Math.max(0,Math.trunc(minStock||0)),previous_price:Number.isFinite(previousPrice)?previousPrice:null,image_url:$('newProductImage')?.value.trim()||null,description:$('newProductDescription')?.value.trim()||null,on_sale:!!$('newProductSale')?.checked,featured:!!$('newProductFeatured')?.checked,active:true,createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()};const btn=$('createProductBtn');if(btn){btn.disabled=true;btn.textContent='Agregando...';}try{const dup=await db.collection('productos').where('code','==',code).get();if(!dup.empty)throw new Error('Ya existe un producto con ese código.');await db.collection('productos').add(payload);['newProductCode','newProductName','newProductPrice','newProductStock','newProductMinStock','newProductPreviousPrice','newProductImage','newProductDescription'].forEach(id=>{if($(id))$(id).value='';});if($('newProductBrand'))$('newProductBrand').value='';if($('newProductCategory'))$('newProductCategory').value='';if($('newProductSale'))$('newProductSale').checked=false;if($('newProductFeatured'))$('newProductFeatured').checked=false;alert('Producto agregado correctamente.');await renderAdminProducts();}catch(e){alert('No se pudo agregar el producto: '+e.message);}finally{if(btn){btn.disabled=false;btn.textContent='+ Agregar producto';}}}
async function renderAdminProducts(){initAdminProductSelectors();if(!$('adminProducts'))return;try{const snap=await db.collection('productos').get();PRODUCTS=snap.docs.map(normalizeProduct).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'es'));$('adminProducts').innerHTML=PRODUCTS.map(p=>`<div class="admin-product-card"><div class="row"><div><h3>${esc(p.name)}</h3><div class="code">${esc(p.code||'')} ${p.brand?'· '+esc(p.brand):''}</div></div><span class="stock ${Number(p.stock)<=Number(p.min_stock||0)?'low-stock':''}">Stock ${p.stock}</span></div><label>Precio</label><input class="field" id="price-${p.id}" type="number" min="0" step="0.01" value="${p.price}"><label>Stock</label><input class="field" id="stock-${p.id}" type="number" min="0" value="${p.stock}"><label>Stock mínimo</label><input class="field" id="min-${p.id}" type="number" min="0" value="${p.min_stock||0}"><div class="check-row"><label><input id="sale-${p.id}" type="checkbox" ${p.on_sale?'checked':''}> Oferta</label><label><input id="featured-${p.id}" type="checkbox" ${p.featured?'checked':''}> Destacado</label></div><button class="btn btn-red full-btn" onclick="saveAdminProduct('${p.id}')">Guardar</button></div>`).join('')||'<div class="empty">Todavía no hay productos.</div>';}catch(e){console.error(e);}}
async function saveAdminProduct(id){try{const payload={price:Number($('price-'+id).value),stock:Math.max(0,parseInt($('stock-'+id).value)||0),min_stock:Math.max(0,parseInt($('min-'+id).value)||0),on_sale:$('sale-'+id).checked,featured:$('featured-'+id).checked,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};await db.collection('productos').doc(id).update(payload);alert('Producto actualizado.');await renderAdminProducts();}catch(e){alert('No se pudo guardar: '+e.message);}}
async function renderAdminClients(){if(!$('adminClients'))return;try{const snap=await db.collection('usuarios').where('rol','==','cliente').get();const data=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.business_name||a.nombre||'').localeCompare(String(b.business_name||b.nombre||''),'es'));$('adminClients').innerHTML=data.map(c=>`<div class="quote-item"><div class="row"><div><h3>${esc(c.business_name||c.nombre||c.email||'Cliente')}</h3><p>${esc(c.email||'')} ${c.phone?'· '+esc(c.phone):''}</p></div><span class="status">Cliente</span></div><p>${esc(c.city||'')}${Number(c.discount_percent||0)>0?' · Descuento '+Number(c.discount_percent)+'%':''}</p></div>`).join('')||'<div class="empty">Todavía no hay clientes.</div>';}catch(e){console.error(e);}}
async function createClient(){
  if(!(await requireUser('admin')))return;
  const email=$('newClientEmail')?.value.trim(),password=$('newClientPassword')?.value||'',business_name=$('newClientBusiness')?.value.trim(),nombre=$('newClientName')?.value.trim(),phone=$('newClientPhone')?.value.trim(),city=$('newClientCity')?.value.trim(),discount_percent=Math.max(0,Math.min(100,Number($('newClientDiscount')?.value||0)));
  if(!business_name||!email||password.length<6)return alert('Completá razón social, email y una contraseña de al menos 6 caracteres.');
  const btn=$('createClientBtn');if(btn){btn.disabled=true;btn.textContent='Creando...';}
  let secondaryApp=null;
  try{
    secondaryApp=firebase.initializeApp(window.NDB_CONFIG.firebaseConfig,'crear-cliente-'+Date.now());
    const secondaryAuth=secondaryApp.auth(),cred=await secondaryAuth.createUserWithEmailAndPassword(email,password),uid=cred.user.uid;
    const secondaryDb=secondaryApp.firestore();
    await secondaryDb.collection('usuarios').doc(uid).set({rol:'cliente',email,business_name,nombre,phone,city,discount_percent,active:true,createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
    await secondaryAuth.signOut();
    ['newClientEmail','newClientPassword','newClientBusiness','newClientName','newClientPhone','newClientCity'].forEach(id=>{if($(id))$(id).value='';});if($('newClientDiscount'))$('newClientDiscount').value='0';
    alert('Cliente creado correctamente. Ya puede ingresar desde la página.');await renderAdminClients();
  }catch(e){alert('No se pudo crear el cliente: '+friendlyAuthError(e));}
  finally{if(secondaryApp){try{await secondaryApp.delete();}catch(e){}}if(btn){btn.disabled=false;btn.textContent='+ Agregar cliente';}}
}
function showAdminSection(id){document.querySelectorAll('.admin-section').forEach(s=>s.classList.add('hidden'));$(id)?.classList.remove('hidden');document.querySelectorAll('[data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===id));}

window.addEventListener('DOMContentLoaded',async()=>{
  configWarning();updateCartCount();renderCart();
  await waitForAuth();
  if($('loginPage'))await redirectIfLogged();
  if($('products')||$('offers')||$('featured'))await loadProducts();
  if($('profilePage')||$('clientName'))await loadProfile();
  if($('myQuotes'))await renderMyOrders();
  if($('adminQuotes'))await renderAdmin();
  if($('adminProducts') && !$('adminQuotes')){ if(await requireUser('admin')) await renderAdminProducts(); }
  if($('adminClients') && !$('adminQuotes')){ if(await requireUser('admin')) await renderAdminClients(); }
});
