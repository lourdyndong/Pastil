/* ============================================================
   PASTILAN NI EMIK — admin.js  (Admin Panel)
   Pure Vanilla JavaScript · shares localStorage with script.js
   ============================================================ */

'use strict';

// ── State ─────────────────────────────────────────────────────
let products = [];
let addons   = [];
let orders   = [];
let pendingImageData = '';  // base64 or URL
let _confirmCallback = null;

// ── localStorage Helpers ──────────────────────────────────────
const LS = {
  get:  k     => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set:  (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

function loadData() {
  products = LS.get('pne_products') || [];
  addons   = LS.get('pne_addons')   || [];
  orders   = LS.get('pne_orders')   || [];
}
function saveProducts() { LS.set('pne_products', products); }
function saveAddons()   { LS.set('pne_addons',   addons);   }
function saveOrders()   { LS.set('pne_orders',   orders);   }

// ── Utility ───────────────────────────────────────────────────
function uid(pfx = 'x') { return pfx + Date.now() + Math.random().toString(36).slice(2, 6); }
function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// ── Stats Bar ─────────────────────────────────────────────────
function updateStats() {
  document.getElementById('statProducts').textContent = products.length;
  document.getElementById('statAddons').textContent   = addons.length;
  document.getElementById('statOrders').textContent   = orders.length;
  document.getElementById('statPending').textContent  = orders.filter(o => o.status === 'Pending').length;
}

// ── Admin Tab Switcher ────────────────────────────────────────
function switchAdminTab(name, btn) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('admin-' + name).classList.add('active');
  btn.classList.add('active');
  if (name === 'products') renderAdminProducts();
  if (name === 'addons')   renderAdminAddons();
  if (name === 'orders')   renderAdminOrders();
}

// ══════════════════════════════════════════════════════════════
//   PRODUCTS
// ══════════════════════════════════════════════════════════════

function renderAdminProducts() {
  const el = document.getElementById('adminProductList');
  if (!products.length) {
    el.innerHTML = `<div class="empty-state" style="display:block">
      <span>🛒</span><p>No products yet.</p>
      <br><button class="btn-primary" style="margin-top:12px" onclick="openProductModal()">+ Add First Product</button>
    </div>`;
    return;
  }
  el.innerHTML = products.map(p => `
    <div class="admin-product-card">
      <div class="admin-prod-img">
        ${p.image ? `<img src="${p.image}" alt="${esc(p.name)}" />` : p.emoji || '🍽️'}
      </div>
      <div class="admin-prod-info">
        <div class="admin-prod-name">${esc(p.name)}</div>
        <div class="admin-prod-price">₱${p.price.toFixed(2)}</div>
        <span class="admin-prod-status ${p.available ? 'status-avail' : 'status-unavail'}">
          ${p.available ? '✅ Available' : '❌ Unavailable'}
        </span>
      </div>
      <div class="admin-prod-actions">
        <button class="btn-edit" onclick="openEditProductModal('${p.id}')">✏️ Edit</button>
        <button class="btn-del"  onclick="confirmDelete('Delete product &quot;${esc(p.name)}&quot;?', () => deleteProduct('${p.id}'))">🗑️ Delete</button>
      </div>
    </div>`).join('');
}

function openProductModal() {
  document.getElementById('productModalTitle').textContent = 'Add Product';
  document.getElementById('editProductId').value = '';
  document.getElementById('pName').value  = '';
  document.getElementById('pPrice').value = '';
  document.getElementById('pAvail').value = 'true';
  pendingImageData = '';
  resetImgPreview();
  // Reset img tab to upload
  document.querySelectorAll('.img-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.img-tab')[0].classList.add('active');
  document.getElementById('imgUploadArea').style.display = '';
  document.getElementById('imgUrlArea').style.display    = 'none';
  openModal('productModal');
}

function openEditProductModal(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('productModalTitle').textContent = 'Edit Product';
  document.getElementById('editProductId').value = id;
  document.getElementById('pName').value  = p.name;
  document.getElementById('pPrice').value = p.price;
  document.getElementById('pAvail').value = p.available ? 'true' : 'false';
  pendingImageData = p.image || '';
  if (pendingImageData) {
    document.getElementById('imgPreview').src = pendingImageData;
    document.getElementById('imgPreviewWrap').style.display = 'block';
  } else {
    resetImgPreview();
  }
  openModal('productModal');
}

function saveProduct() {
  const name   = document.getElementById('pName').value.trim();
  const price  = parseFloat(document.getElementById('pPrice').value);
  const avail  = document.getElementById('pAvail').value === 'true';
  const editId = document.getElementById('editProductId').value;

  if (!name)              { showToast('Product name is required.', 'error'); return; }
  if (isNaN(price) || price <= 0) { showToast('Enter a valid price.', 'error'); return; }

  const emojis = ['🍽️','🍜','🍛','🥘','🍲','🫕','🥗','🍖','🍤','🧆'];

  if (editId) {
    const idx = products.findIndex(p => p.id === editId);
    if (idx !== -1) products[idx] = { ...products[idx], name, price, available: avail, image: pendingImageData };
  } else {
    products.push({
      id:        uid('p'),
      name, price,
      available: avail,
      image:     pendingImageData,
      emoji:     emojis[Math.floor(Math.random() * emojis.length)],
    });
  }

  saveProducts();
  renderAdminProducts();
  updateStats();
  closeModal('productModal');
  showToast(editId ? '✅ Product updated!' : '✅ Product added!', 'success');
}

function deleteProduct(id) {
  products = products.filter(p => p.id !== id);
  saveProducts();
  renderAdminProducts();
  updateStats();
  showToast('Product deleted.', 'error');
}

// ══════════════════════════════════════════════════════════════
//   ADD-ONS
// ══════════════════════════════════════════════════════════════

function renderAdminAddons() {
  const el = document.getElementById('adminAddonsList');
  if (!addons.length) {
    el.innerHTML = `<div class="empty-state" style="display:block">
      <span>🧂</span><p>No add-ons yet.</p>
      <br><button class="btn-primary" style="margin-top:12px" onclick="openAddonModal()">+ Add First Add-on</button>
    </div>`;
    return;
  }
  el.innerHTML = addons.map(a => `
    <div class="admin-addon-card">
      <div class="addon-card-name">🧂 ${esc(a.name)}</div>
      <div class="addon-card-price">+₱${parseFloat(a.price).toFixed(2)}</div>
      <div class="addon-card-actions">
        <button class="btn-edit" onclick="openEditAddonModal('${a.id}')">✏️ Edit</button>
        <button class="btn-del"  onclick="confirmDelete('Delete add-on &quot;${esc(a.name)}&quot;?', () => deleteAddon('${a.id}'))">🗑️ Delete</button>
      </div>
    </div>`).join('');
}

function openAddonModal() {
  document.getElementById('addonModalTitle').textContent = 'Add Add-on';
  document.getElementById('editAddonId').value  = '';
  document.getElementById('addonName').value    = '';
  document.getElementById('addonPrice').value   = '';
  openModal('addonModal');
}

function openEditAddonModal(id) {
  const a = addons.find(x => x.id === id);
  if (!a) return;
  document.getElementById('addonModalTitle').textContent = 'Edit Add-on';
  document.getElementById('editAddonId').value  = id;
  document.getElementById('addonName').value    = a.name;
  document.getElementById('addonPrice').value   = a.price;
  openModal('addonModal');
}

function saveAddon() {
  const name   = document.getElementById('addonName').value.trim();
  const price  = parseFloat(document.getElementById('addonPrice').value);
  const editId = document.getElementById('editAddonId').value;

  if (!name)           { showToast('Add-on name is required.', 'error'); return; }
  if (isNaN(price) || price < 0) { showToast('Enter a valid price.', 'error'); return; }

  if (editId) {
    const idx = addons.findIndex(a => a.id === editId);
    if (idx !== -1) addons[idx] = { ...addons[idx], name, price };
  } else {
    addons.push({ id: uid('a'), name, price });
  }

  saveAddons();
  renderAdminAddons();
  updateStats();
  closeModal('addonModal');
  showToast(editId ? '✅ Add-on updated!' : '✅ Add-on added!', 'success');
}

function deleteAddon(id) {
  addons = addons.filter(a => a.id !== id);
  saveAddons();
  renderAdminAddons();
  updateStats();
  showToast('Add-on deleted.', 'error');
}

// ══════════════════════════════════════════════════════════════
//   ORDERS
// ══════════════════════════════════════════════════════════════

function renderAdminOrders() {
  const el     = document.getElementById('adminOrdersList');
  const filter = document.getElementById('orderFilterSelect')?.value || 'all';
  const list   = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  if (!list.length) {
    el.innerHTML = `<div class="empty-state" style="display:block">
      <span>📦</span><p>${filter === 'all' ? 'No orders yet.' : 'No ' + filter.toLowerCase() + ' orders.'}</p>
    </div>`;
    return;
  }

  el.innerHTML = list.map(o => `
    <div class="admin-order-card">
      <div class="admin-order-header">
        <span class="admin-order-id">${o.id}</span>
        <span class="order-status status-${o.status.toLowerCase()}">${o.status}</span>
      </div>
      <div class="admin-order-customer">👤 ${esc(o.customer)}</div>
      <div class="admin-order-meta">
        🛒 <strong>${esc(o.product)}</strong> &nbsp;·&nbsp; ×${o.qty}
        &nbsp;·&nbsp; 💳 ${esc(o.payment)}<br>
        ${o.addons && o.addons.length ? '➕ ' + o.addons.map(a => esc(a.name)).join(', ') + '<br>' : ''}
        🕐 ${o.date}
      </div>
      <div class="admin-order-total">Total: ₱${o.total.toFixed(2)}</div>
      <div class="admin-order-footer">
        <select class="status-select" onchange="updateOrderStatus('${o.id}', this.value)">
          ${['Pending','Completed','Cancelled'].map(s =>
            `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
        <button class="btn-del" onclick="confirmDelete('Remove order ${o.id}?', () => deleteOrder('${o.id}'))">🗑️ Remove</button>
      </div>
    </div>`).join('');
}

function updateOrderStatus(id, status) {
  const o = orders.find(x => x.id === id);
  if (o) {
    o.status = status;
    saveOrders();
    updateStats();
    showToast('Status → ' + status, 'success');
  }
}

function deleteOrder(id) {
  orders = orders.filter(o => o.id !== id);
  saveOrders();
  renderAdminOrders();
  updateStats();
  showToast('Order removed.', 'error');
}

function clearAllOrders() {
  confirmDelete('Clear ALL orders? This cannot be undone.', () => {
    orders = [];
    saveOrders();
    renderAdminOrders();
    updateStats();
    showToast('All orders cleared.', 'error');
  });
}

// ══════════════════════════════════════════════════════════════
//   IMAGE HANDLING
// ══════════════════════════════════════════════════════════════

function switchImgTab(mode, btn) {
  document.querySelectorAll('.img-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('imgUploadArea').style.display = mode === 'upload' ? '' : 'none';
  document.getElementById('imgUrlArea').style.display    = mode === 'url'    ? '' : 'none';
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    pendingImageData = ev.target.result;
    document.getElementById('imgPreview').src = pendingImageData;
    document.getElementById('imgPreviewWrap').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function previewImgUrl() {
  const url = document.getElementById('pImgUrl').value.trim();
  pendingImageData = url;
  if (url) {
    document.getElementById('imgPreview').src = url;
    document.getElementById('imgPreviewWrap').style.display = 'block';
  } else {
    resetImgPreview();
  }
}

function removeImagePreview() {
  pendingImageData = '';
  resetImgPreview();
  document.getElementById('pImgFile').value = '';
  document.getElementById('pImgUrl').value  = '';
}

function resetImgPreview() {
  document.getElementById('imgPreviewWrap').style.display = 'none';
  document.getElementById('imgPreview').src = '';
}

// ══════════════════════════════════════════════════════════════
//   CONFIRM DELETE MODAL
// ══════════════════════════════════════════════════════════════

function confirmDelete(msg, callback) {
  document.getElementById('confirmMsg').innerHTML = msg;
  _confirmCallback = callback;
  openModal('confirmModal');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('confirmOkBtn').addEventListener('click', () => {
    if (typeof _confirmCallback === 'function') _confirmCallback();
    _confirmCallback = null;
    closeModal('confirmModal');
  });
});

// ══════════════════════════════════════════════════════════════
//   MODAL HELPERS
// ══════════════════════════════════════════════════════════════

function openModal(id)  { document.getElementById(id).classList.add('open');    document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow = ''; }
function handleOverlayClick(e, id) { if (e.target === e.currentTarget) closeModal(id); }

document.addEventListener('keydown', e => {
  if (e.key === 'Escape')
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      m.classList.remove('open'); document.body.style.overflow = '';
    });
});

// ══════════════════════════════════════════════════════════════
//   TOAST
// ══════════════════════════════════════════════════════════════

let _toastTimer = null;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3400);
}

// ══════════════════════════════════════════════════════════════
//   INIT
// ══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  updateStats();
  renderAdminProducts();
  document.getElementById('footerYear').textContent = new Date().getFullYear();
});
