// =======================
// CONFIGURACIÓN GENERAL
// =======================
const CATS = ['Todos','Grifería','Sanitarios','Repuestos','Accesorios'];
const $ = id => document.getElementById(id);
const money = n => '$ ' + Number(n || 0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
const get = (k,d=[]) => JSON.parse(localStorage.getItem(k) || JSON.stringify(d));
const set = (k,v) => localStorage.setItem(k, JSON.stringify(v));

// =======================
// SESIONES
// =======================
function usuario(){ return get('bp_user', null); }
function requireUser(role){
  const u = usuario();
  if(!u || u.rol !== role){
    alert('Tenés que iniciar sesión');
    location.href = '../login.html';
  }
}
function logout(){
  localStorage.removeItem('bp_user');
  location.href = (location.pathname.includes('/cliente/') || location.pathname.includes('/admin/')) ? '../login.html' : 'login.html';
}

// =======================
// PRODUCTOS CON STOCK Y PRECIO EDITABLE
// =======================
const DEFAULT_PRODUCTS = [
  {id:1,nombre:'Grifería Monocomando',cat:'Grifería',precio:45230,precioAnterior:58500,stock:20,oferta:true,descuento:23,img:'producto.jpg'},
  {id:2,nombre:'Inodoro largo blanco',cat:'Sanitarios',precio:78450,precioAnterior:91000,stock:8,oferta:true,descuento:14,img:'producto.jpg'},
  {id:3,nombre:'Sifón flexible',cat:'Repuestos',precio:5320,precioAnterior:7200,stock:35,oferta:true,descuento:26,img:'producto.jpg'},
  {id:4,nombre:'Pegamento PVC',cat:'Accesorios',precio:4200,precioAnterior:5500,stock:50,oferta:true,descuento:24,img:'producto.jpg'},
  {id:5,nombre:'Llave esférica',cat:'Grifería',precio:9200,stock:18,oferta:false,descuento:0,img:'producto.jpg'},
  {id:6,nombre:'Codo 90° Duke',cat:'Repuestos',precio:1200,stock:60,oferta:false,descuento:0,img:'producto.jpg'},
  {id:7,nombre:'Teflón TF3',cat:'Accesorios',precio:850,stock:100,oferta:false,descuento:0,img:'producto.jpg'},
  {id:8,nombre:'Bacha de apoyo',cat:'Sanitarios',precio:36780,stock:14,oferta:false,descuento:0,img:'producto.jpg'},
  {id:9,nombre:'Válvula click clack',cat:'Sanitarios',precio:11000,stock:22,oferta:false,descuento:0,img:'producto.jpg'},
  {id:10,nombre:'Flexible mallado',cat:'Accesorios',precio:5320,stock:30,oferta:false,descuento:0,img:'producto.jpg'},
  {id:11,nombre:'Descarga mochila',cat:'Repuestos',precio:13500,stock:16,oferta:false,descuento:0,img:'producto.jpg'},
  {id:12,nombre:'Caño conexión 40mm',cat:'Repuestos',precio:3900,stock:45,oferta:false,descuento:0,img:'producto.jpg'}
];

function getProducts(){
  let productos = get('bp_products', null);
  if(!productos){
    productos = DEFAULT_PRODUCTS;
    set('bp_products', productos);
  }
  return productos;
}
function saveProducts(productos){ set('bp_products', productos); }

// =======================
// HEADER / MENÚ
// =======================
function toggleMobile(){ const m=$('mobileMenu'); if(m) m.style.display = m.style.display === 'block' ? 'none' : 'block'; }
function updateCartCount(){
  const c = cart().reduce((a,i)=>a+i.cantidad,0);
  document.querySelectorAll('.cart-count').forEach(e=>e.textContent=c);
}
function renderHeader(){ updateCartCount(); }

// =======================
// PRODUCTOS CLIENTE
// =======================
function imgPath(){ return location.pathname.includes('/cliente/') || location.pathname.includes('/admin/') ? '../img/producto.jpg' : 'img/producto.jpg'; }
function productCard(p){
  const sinStock = Number(p.stock) <= 0;
  return `
    <div class="product">
      ${p.oferta ? `<span class="badge">OFERTA</span>` : ''}
      ${p.oferta && p.descuento ? `<span class="discount">-${p.descuento}%</span>` : ''}
      <img src="${imgPath()}" alt="${p.nombre}">
      <div class="product-body">
        <h3>${p.nombre}</h3>
        <p class="muted">${p.cat}</p>
        <span class="stock ${sinStock ? 'agotado' : ''}">${sinStock ? 'AGOTADO' : 'Stock disponible: '+p.stock}</span>
        <div class="price">
          ${p.precioAnterior ? `<span class="old-price">${money(p.precioAnterior)}</span>` : ''}
          ${money(p.precio)}
        </div>
        <div class="qty">
          <input id="qty-${p.id}" type="number" min="1" max="${p.stock}" value="1" ${sinStock ? 'disabled' : ''}>
          <button class="btn btn-red" onclick="addCart(${p.id})" ${sinStock ? 'disabled' : ''}>${sinStock ? 'Sin stock' : 'Agregar'}</button>
        </div>
      </div>
    </div>`;
}
function renderProducts(){
  const cont = $('products'); if(!cont) return;
  const q = ($('search')?.value || '').toLowerCase();
  const cat = localStorage.getItem('bp_cat') || 'Todos';
  const lista = getProducts().filter(p => (cat==='Todos'||p.cat===cat) && p.nombre.toLowerCase().includes(q));
  cont.innerHTML = lista.map(productCard).join('') || '<div class="empty">No se encontraron productos.</div>';
}
function renderCats(){
  const cont = $('cats'); if(!cont) return;
  const active = localStorage.getItem('bp_cat') || 'Todos';
  cont.innerHTML = CATS.map(c=>`<button class="${c===active?'active':''}" onclick="localStorage.setItem('bp_cat','${c}');renderCats();renderProducts()">${c}</button>`).join('');
}
function renderOffers(){
  const cont = $('offers'); if(!cont) return;
  cont.innerHTML = getProducts().filter(p=>p.oferta).slice(0,4).map(productCard).join('');
}
function renderFeatured(){
  const cont = $('featured'); if(!cont) return;
  cont.innerHTML = getProducts().slice(4,8).map(productCard).join('');
}

// =======================
// CARRITO
// =======================
function cart(){ return get('bp_cart', []); }
function saveCart(c){ set('bp_cart', c); updateCartCount(); }
function addCart(id){
  const products = getProducts();
  const p = products.find(x=>x.id===id);
  const q = parseInt(($('qty-'+id)||{}).value || 1);
  if(!p) return;
  if(q <= 0) return alert('Ingresá una cantidad válida');
  if(q > p.stock) return alert('No hay suficiente stock disponible');
  let c = cart();
  let it = c.find(x=>x.id===id);
  const cantidadActual = it ? it.cantidad : 0;
  if(cantidadActual + q > p.stock) return alert('No podés agregar más unidades que el stock disponible');
  it ? it.cantidad += q : c.push({id:p.id,nombre:p.nombre,cat:p.cat,precio:p.precio,cantidad:q});
  saveCart(c);
  alert('Producto agregado al carrito');
}
function removeCart(i){ let c=cart(); c.splice(i,1); saveCart(c); renderCart(); }
function changeQty(i,q){
  let c=cart();
  const products = getProducts();
  const p = products.find(x=>x.id===c[i].id);
  let nueva = Math.max(1, parseInt(q)||1);
  if(p && nueva > p.stock){ alert('No hay más stock disponible'); nueva = p.stock; }
  c[i].cantidad = nueva;
  saveCart(c);
  renderCart();
}
function clearCart(){ saveCart([]); renderCart(); }
function renderCart(){
  const cont = $('cartItems'); if(!cont) return;
  let c = cart(), total = 0;
  if(!c.length){ cont.innerHTML='<div class="empty">El carrito está vacío.</div>'; if($('cartTotal')) $('cartTotal').textContent=money(0); return; }
  cont.innerHTML = c.map((i,idx)=>{
    const sub = i.precio*i.cantidad; total += sub;
    return `<div class="cart-item">
      <div class="row"><b>${i.nombre}</b><b>${money(sub)}</b></div>
      <p class="muted">${i.cat} - Unitario ${money(i.precio)}</p>
      <div class="row">
        <label>Cantidad <input class="field" style="width:90px" type="number" min="1" value="${i.cantidad}" onchange="changeQty(${idx},this.value)"></label>
        <button class="btn btn-light" onclick="removeCart(${idx})">Quitar</button>
      </div>
    </div>`;
  }).join('');
  if($('cartTotal')) $('cartTotal').textContent = money(total);
}

// =======================
// PERFIL CLIENTE
// =======================
function saveProfile(){
  const u = usuario();
  const profile = {razon:$('razon').value,tel:$('tel').value,calle:$('calle').value,barrio:$('barrio').value,localidad:$('localidad').value,mail:$('mail').value};
  set('bp_profile_'+u.username, profile);
  alert('Perfil guardado');
}
function loadProfile(){
  const u=usuario(); if(!u) return;
  const p=get('bp_profile_'+u.username, {});
  ['razon','tel','calle','barrio','localidad','mail'].forEach(k=>{ if($(k)) $(k).value=p[k]||''; });
}

// =======================
// PRESUPUESTOS / PEDIDOS
// =======================
function descontarStock(items){
  const products = getProducts();
  items.forEach(item=>{
    const p = products.find(x=>x.id===item.id);
    if(p) p.stock = Math.max(0, Number(p.stock) - Number(item.cantidad));
  });
  saveProducts(products);
}
function makeQuote(){
  const u = usuario();
  if(!u || u.rol !== 'cliente'){
    alert('Primero iniciá sesión como cliente');
    location.href = 'login.html';
    return;
  }
  const c = cart();
  if(!c.length) return alert('El carrito está vacío');
  const products = getProducts();
  for(const item of c){
    const p = products.find(x=>x.id===item.id);
    if(!p || item.cantidad > p.stock) return alert('El producto '+item.nombre+' no tiene stock suficiente');
  }
  const profile = get('bp_profile_'+u.username, {});
  const qs = get('bp_quotes', []);
  qs.push({
    id:Date.now(),
    cliente:u.username,
    perfil:profile,
    fecha:new Date().toLocaleString('es-AR'),
    items:c,
    total:c.reduce((a,i)=>a+i.precio*i.cantidad,0),
    estado:'Pendiente',
    obs:($('obs')?.value || '')
  });
  set('bp_quotes', qs);
  descontarStock(c);
  saveCart([]);
  alert('Presupuesto generado correctamente');
  location.href = 'cliente/mis-presupuestos.html';
}
function renderMyQuotes(){
  const cont=$('myQuotes'); if(!cont) return;
  const u=usuario();
  const qs=get('bp_quotes', []).filter(q=>q.cliente===u.username);
  cont.innerHTML = qs.map(q=>`<div class="quote-item">
    <div class="row"><h3>Presupuesto #${q.id}</h3><span class="status ${q.estado}">${q.estado}</span></div>
    <p>${q.fecha}</p><p><b>Total:</b> ${money(q.total)}</p>
    <ul>${q.items.map(i=>`<li>${i.nombre} x ${i.cantidad} - ${money(i.precio*i.cantidad)}</li>`).join('')}</ul>
  </div>`).join('') || '<div class="empty">Todavía no tenés presupuestos.</div>';
}
function renderAdminQuotes(){
  const cont=$('adminQuotes'); if(!cont) return;
  const qs=get('bp_quotes', []);
  cont.innerHTML = qs.map((q,idx)=>`<div class="quote-item">
    <div class="row"><h3>#${q.id}</h3><span class="status ${q.estado}">${q.estado}</span></div>
    <p><b>Cliente:</b> ${q.perfil?.razon || q.cliente}</p>
    <p><b>Tel:</b> ${q.perfil?.tel || '-'} | <b>Mail:</b> ${q.perfil?.mail || '-'}</p>
    <p><b>Dirección:</b> ${q.perfil?.calle || '-'}, ${q.perfil?.barrio || ''}, ${q.perfil?.localidad || ''}</p>
    <ul>${q.items.map(i=>`<li>${i.nombre} x ${i.cantidad} - ${money(i.precio*i.cantidad)}</li>`).join('')}</ul>
    <p><b>Total:</b> ${money(q.total)}</p>
    <label><b>Estado</b></label>
    <select class="field" onchange="changeStatus(${idx},this.value)">
      <option ${q.estado==='Pendiente'?'selected':''}>Pendiente</option>
      <option ${q.estado==='Preparado'?'selected':''}>Preparado</option>
      <option ${q.estado==='Entregado'?'selected':''}>Entregado</option>
      <option ${q.estado==='Cancelado'?'selected':''}>Cancelado</option>
    </select>
  </div>`).join('') || '<div class="empty">No hay presupuestos.</div>';
}
function changeStatus(idx,estado){ const qs=get('bp_quotes', []); qs[idx].estado=estado; set('bp_quotes', qs); renderAdminQuotes(); }

// =======================
// ADMIN - MODIFICAR PRECIO / STOCK / OFERTA
// =======================
function renderAdminProducts(){
  const cont = $('adminProducts'); if(!cont) return;
  const products = getProducts();
  cont.innerHTML = products.map((p,index)=>`<div class="admin-product-card">
    <img src="../img/producto.jpg" alt="${p.nombre}">
    <h3>${p.nombre}</h3>
    <p class="muted">${p.cat}</p>
    <p><b>Precio actual:</b> ${money(p.precio)}</p>
    <p><b>Stock actual:</b> ${p.stock}</p>
    <label>Modificar precio</label>
    <input class="field" type="number" min="0" value="${p.precio}" onchange="changeProductPrice(${index}, this.value)">
    <label>Modificar stock</label>
    <input class="field" type="number" min="0" value="${p.stock}" onchange="changeProductStock(${index}, this.value)">
    <div class="admin-actions">
      <label><input type="checkbox" ${p.oferta?'checked':''} onchange="changeProductOffer(${index}, this.checked)"> Oferta</label>
      <label>Desc. %<input class="field" type="number" min="0" max="90" value="${p.descuento||0}" onchange="changeProductDiscount(${index}, this.value)"></label>
    </div>
  </div>`).join('');
}
function changeProductPrice(index,value){ const products=getProducts(); products[index].precio=Number(value); saveProducts(products); renderAdminProducts(); renderProducts(); renderOffers(); }
function changeProductStock(index,value){ const products=getProducts(); products[index].stock=Number(value); saveProducts(products); renderAdminProducts(); renderProducts(); renderOffers(); }
function changeProductOffer(index,value){ const products=getProducts(); products[index].oferta=value; saveProducts(products); renderAdminProducts(); }
function changeProductDiscount(index,value){ const products=getProducts(); products[index].descuento=Number(value); saveProducts(products); renderAdminProducts(); }
function resetProducts(){ if(confirm('¿Querés restaurar los productos originales?')){ localStorage.removeItem('bp_products'); renderAdminProducts(); renderProducts(); renderOffers(); } }

window.addEventListener('DOMContentLoaded',()=>{
  renderHeader(); renderCats(); renderProducts(); renderOffers(); renderFeatured(); renderCart(); loadProfile(); renderMyQuotes(); renderAdminQuotes(); renderAdminProducts();
});
