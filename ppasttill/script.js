/* ============================================================
   PASTILAN NI EMIK — script.js
   Pure Vanilla JavaScript · localStorage persistence
   ============================================================ */

'use strict';

// ── Default Data ──────────────────────────────────────────────
const DEFAULT_PRODUCTS = [
  { id: 'p1', name: 'Pork Pastil',       price: 45,  available: true,  image: '', emoji: '🍱' },
  { id: 'p2', name: 'Chicken Inasal',    price: 85,  available: true,  image: '', emoji: '🍗' },
  { id: 'p3', name: 'Adobong Kangkong',  price: 35,  available: true,  image: '', emoji: '🥬' },
  { id: 'p4', name: 'Sinangag Rice',     price: 25,  available: true,  image: '', emoji: '🍚' },
  { id: 'p5', name: 'Lechon Kawali',     price: 120, available: true,  image: '', emoji: '🥩' },
  { id: 'p6', name: 'Buko Juice',        price: 30,  available: true,  image: '', emoji: '🥥' },
];

const DEFAULT_ADDONS = [
  { id: 'a1', name: 'Extra Rice', price: 10 },
  { id: 'a2', name: 'Egg',        price: 15 },
  { id: 'a3', name: 'Cheese',     price: 12 },
];

// ── State ─────────────────────────────────────────────────────
let products = [];
let addons   = [];
let orders   = [];
let currentFilter = 'all';
let currentOrderProduct = null;
let pendingImageData = ''; // base64 or URL for product modal
let imgTabMode = 'upload'; // 'upload' | 'url'

// ── localStorage Helpers ──────────────────────────────────────
const LS = {
  get:    (k)    => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set:    (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  remove: (k)    => { localStorage.removeItem(k); },
};

function loadData() {
  products = LS.get('pne_products') || null;
  addons   = LS.get('pne_addons')   || null;
  orders   = LS.get('pne_orders')   || [];

  if (!products) { products = DEFAULT_PRODUCTS.map(p => ({ ...p })); saveProducts(); }
  if (!addons)   { addons   = DEFAULT_ADDONS.map(a => ({ ...a }));   saveAddons();   }
}

function saveProducts() { LS.set('pne_products', products); }
function saveAddons()   { LS.set('pne_addons',   addons);   }
function saveOrders()   { LS.set('pne_orders',   orders);   }

// ── ID Generator ──────────────────────────────────────────────
function uid(prefix = 'x') { return prefix + Date.now() + Math.random().toString(36).slice(2, 6); }

// ── View Switcher ─────────────────────────────────────────────
function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelector(`.nav-btn[data-view="${name}"]`)?.classList.add('active');

  if (name === 'user')   renderProducts();
  if (name === 'orders') renderMyOrders();
  if (name === 'admin')  renderAdminProducts();
}

function toggleMobileNav() {
  document.getElementById('mobileNav').classList.toggle('open');
}
function closeMobileNav() {
  document.getElementById('mobileNav').classList.remove('open');
}

// ── Filter & Search ───────────────────────────────────────────
function setFilter(val, btn) {
  currentFilter = val;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderProducts();
}

// ── Render Products (User) ────────────────────────────────────
function renderProducts() {
  const grid       = document.getElementById('productsGrid');
  const emptyEl    = document.getElementById('emptyState');
  const query      = document.getElementById('searchInput').value.toLowerCase().trim();

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(query);
    if (currentFilter === 'available')   return matchSearch && p.available;
    if (currentFilter === 'unavailable') return matchSearch && !p.available;
    return matchSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  grid.innerHTML = filtered.map((p, i) => `
    <div class="product-card ${p.available ? '' : 'sold-out'}" style="animation-delay:${i * 0.05}s">
      <div class="card-img-wrap">
        ${p.image
          ? `<img src="${p.image}" alt="${esc(p.name)}" loading="lazy" />`
          : `<div class="card-emoji">${p.emoji || '🍽️'}</div>`}
        <span class="card-badge ${p.available ? 'badge-avail' : 'badge-sold'}">
          ${p.available ? '● Available' : '✕ Sold Out'}
        </span>
      </div>
      <div class="card-body">
        <div class="card-name">${esc(p.name)}</div>
        <div class="card-price">₱${p.price.toFixed(2)} <small>/ order</small></div>
        <button class="btn-order-card" ${p.available ? '' : 'disabled'}
          onclick="openOrderModal('${p.id}')">
          🛒 Order Now
        </button>
      </div>
    </div>
  `).join('');
}

// ── Order Modal ───────────────────────────────────────────────
function openOrderModal(productId) {
  const p = products.find(x => x.id === productId);
  if (!p) return;
  currentOrderProduct = p;

  // Product info bar
  document.getElementById('orderModalTitle').textContent = 'Place Your Order';
  document.getElementById('orderProductSub').textContent = p.name;
  document.getElementById('orderProductName').textContent = p.name;
  document.getElementById('orderProductPrice').textContent = '₱' + p.price.toFixed(2);

  const imgEl = document.getElementById('orderProductImg');
  imgEl.innerHTML = p.image
    ? `<img src="${p.image}" alt="${esc(p.name)}" />`
    : p.emoji || '🍽️';

  // Reset form
  document.getElementById('orderCustomerName').value = '';
  document.getElementById('orderQty').value = 1;
  document.querySelectorAll('input[name="payment"]')[0].checked = true;

  // Render add-ons
  const addonsEl = document.getElementById('orderAddonsList');
  if (addons.length === 0) {
    addonsEl.innerHTML = '<p style="font-size:.85rem;color:var(--gray400);font-weight:600;">No add-ons available.</p>';
  } else {
    addonsEl.innerHTML = addons.map(a => `
      <label class="addon-check-item" id="aitem-${a.id}">
        <div class="addon-checkbox"></div>
        <input type="checkbox" class="real-checkbox" name="addon" value="${a.id}"
          data-price="${a.price}" data-name="${esc(a.name)}"
          onchange="toggleAddonItem(this)" />
        <span class="addon-check-label">${esc(a.name)}</span>
        <span class="addon-check-price">+₱${a.price}</span>
      </label>
    `).join('');
  }

  updateOrderTotal();
  openModal('orderModal');
}

function toggleAddonItem(cb) {
  const label = cb.closest('.addon-check-item');
  label.classList.toggle('checked', cb.checked);
  updateOrderTotal();
}

function changeQty(delta) {
  const input = document.getElementById('orderQty');
  let val = parseInt(input.value) || 1;
  val = Math.max(1, Math.min(50, val + delta));
  input.value = val;
  updateOrderTotal();
}

function updateOrderTotal() {
  if (!currentOrderProduct) return;
  const qty      = Math.max(1, parseInt(document.getElementById('orderQty').value) || 1);
  const base     = currentOrderProduct.price;
  let addonsSum  = 0;
  document.querySelectorAll('input[name="addon"]:checked').forEach(cb => {
    addonsSum += parseFloat(cb.dataset.price) || 0;
  });
  const total = (base + addonsSum) * qty;

  document.getElementById('sumBase').textContent   = '₱' + (base * qty).toFixed(2);
  document.getElementById('sumQty').textContent    = '×' + qty;
  document.getElementById('sumAddons').textContent = '₱' + (addonsSum * qty).toFixed(2);
  document.getElementById('sumTotal').textContent  = '₱' + total.toFixed(2);

  // Show/hide addons row
  document.getElementById('sumAddonsRow').style.display = addonsSum > 0 ? '' : 'none';
}
function sendTelegram(order) {
  const token = "8183092011:AAFh8FCLFEdhIeD3k77xAkHGgSqEWZR9qlc";
  const chatId = "6958159806";

  const addonText = order.addons.length
    ? order.addons.map(a => `${a.name} (+₱${a.price})`).join(', ')
    : 'None';

  const message = `📦 NEW ORDER - PASTILAN NI EMIK

Order ID: ${order.id}
Customer: ${order.customer}
Product: ${order.product}
Quantity: ${order.qty}
Add-ons: ${addonText}
Payment: ${order.payment}
Total: ₱${order.total.toFixed(2)}
Date: ${order.date}`;

  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: message
    })
  })
  .then(response => response.json())
  .then(data => {
    console.log("Telegram response:", data);
  })
  .catch(error => {
    console.error("Telegram send error:", error);
  });
}
function submitOrder(e) {
  e.preventDefault();
  const name     = document.getElementById('orderCustomerName').value.trim();
  const qty      = parseInt(document.getElementById('orderQty').value) || 1;
  const payment  = document.querySelector('input[name="payment"]:checked')?.value || 'Cash';

  if (!name) {
    showToast('Please enter your name.', 'error');
    return;
  }

  if (!currentOrderProduct) return;

  const base = currentOrderProduct.price;
  const selectedAddons = [];
  let addonsSum = 0;

  document.querySelectorAll('input[name="addon"]:checked').forEach(cb => {
    selectedAddons.push({
      id: cb.value,
      name: cb.dataset.name,
      price: parseFloat(cb.dataset.price)
    });
    addonsSum += parseFloat(cb.dataset.price) || 0;
  });

  const total = (base + addonsSum) * qty;

  const order = {
    id:        uid('ORD'),
    productId: currentOrderProduct.id,
    product:   currentOrderProduct.name,
    customer:  name,
    qty,
    addons:    selectedAddons,
    basePrice: base,
    total,
    payment,
    status:    'Pending',
    date:      new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
  };

  sendTelegram(order);

  orders.unshift(order);
  saveOrders();
  closeModal('orderModal');
  renderMyOrders();
  renderAdminOrders();
  showToast(`✅ Order placed! Total: ₱${total.toFixed(2)}`, 'success');
}

// ── My Orders (User) ─────────────────────────────────────────
function renderMyOrders() {
  const el = document.getElementById('myOrdersList');
  if (orders.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="display:block">
        <span>📋</span><p>No orders yet. Start ordering!</p>
        <br><button class="btn-primary" onclick="switchView('user')">🛒 Browse Menu</button>
      </div>`;
    return;
  }
  el.innerHTML = orders.map(o => `
    <div class="order-card">
      <div class="order-card-header">
        <span class="order-card-id">${o.id}</span>
        <span class="order-status status-${o.status.toLowerCase()}">${o.status}</span>
        <span class="order-card-time">${o.date}</span>
      </div>
      <div class="order-card-product">${esc(o.product)}</div>
      <div class="order-card-details">
        👤 ${esc(o.customer)} &nbsp;·&nbsp; ×${o.qty} &nbsp;·&nbsp; ${esc(o.payment)}
        ${o.addons.length ? '<br>➕ ' + o.addons.map(a => esc(a.name)).join(', ') : ''}
      </div>
      <div class="order-card-total">Total: ₱${o.total.toFixed(2)}</div>
    </div>
  `).join('');
}

// ── Admin: Products ───────────────────────────────────────────
function renderAdminProducts() {
  const el = document.getElementById('adminProductList');
  if (products.length === 0) {
    el.innerHTML = '<p style="color:var(--gray400);font-weight:600;font-size:.9rem;">No products yet. Click "+ Add Product" to get started.</p>';
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
        <button class="btn-del"  onclick="deleteProduct('${p.id}')">🗑️ Delete</button>
      </div>
    </div>
  `).join('');
}

function openProductModal(editId = null) {
  document.getElementById('productModalTitle').textContent = editId ? 'Edit Product' : 'Add Product';
  document.getElementById('editProductId').value = editId || '';
  document.getElementById('pName').value  = '';
  document.getElementById('pPrice').value = '';
  document.getElementById('pAvail').value = 'true';
  pendingImageData = '';
  resetImgPreview();
  switchImgTab('upload', document.querySelector('.img-tab'));
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
  const name  = document.getElementById('pName').value.trim();
  const price = parseFloat(document.getElementById('pPrice').value);
  const avail = document.getElementById('pAvail').value === 'true';
  const editId = document.getElementById('editProductId').value;

  if (!name)       { showToast('Product name is required.', 'error'); return; }
  if (isNaN(price) || price <= 0) { showToast('Enter a valid price.', 'error'); return; }

  if (editId) {
    const idx = products.findIndex(p => p.id === editId);
    if (idx !== -1) {
      products[idx] = { ...products[idx], name, price, available: avail, image: pendingImageData };
    }
  } else {
    const emojis = ['🍽️','🍜','🍛','🥘','🍲','🫕','🥗','🍖','🍤','🧆'];
    products.push({ id: uid('p'), name, price, available: avail, image: pendingImageData, emoji: emojis[Math.floor(Math.random()*emojis.length)] });
  }

  saveProducts();
  renderAdminProducts();
  closeModal('productModal');
  showToast(editId ? '✅ Product updated!' : '✅ Product added!', 'success');
}

function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  products = products.filter(p => p.id !== id);
  saveProducts();
  renderAdminProducts();
  showToast('Product deleted.', 'error');
}

// ── Admin: Add-ons ────────────────────────────────────────────
function renderAdminAddons() {
  const el = document.getElementById('adminAddonsList');
  if (addons.length === 0) {
    el.innerHTML = '<p style="color:var(--gray400);font-weight:600;font-size:.9rem;">No add-ons yet.</p>';
    return;
  }
  el.innerHTML = addons.map(a => `
    <div class="admin-addon-card">
      <div class="addon-card-name">🧂 ${esc(a.name)}</div>
      <div class="addon-card-price">+₱${a.price}</div>
      <div class="addon-card-actions">
        <button class="btn-edit" onclick="openEditAddonModal('${a.id}')">✏️ Edit</button>
        <button class="btn-del"  onclick="deleteAddon('${a.id}')">🗑️ Delete</button>
      </div>
    </div>
  `).join('');
}

function openAddonModal() {
  document.getElementById('addonModalTitle').textContent = 'Add Add-on';
  document.getElementById('editAddonId').value = '';
  document.getElementById('addonName').value  = '';
  document.getElementById('addonPrice').value = '';
  openModal('addonModal');
}

function openEditAddonModal(id) {
  const a = addons.find(x => x.id === id);
  if (!a) return;
  document.getElementById('addonModalTitle').textContent = 'Edit Add-on';
  document.getElementById('editAddonId').value = id;
  document.getElementById('addonName').value  = a.name;
  document.getElementById('addonPrice').value = a.price;
  openModal('addonModal');
}

function saveAddon() {
  const name  = document.getElementById('addonName').value.trim();
  const price = parseFloat(document.getElementById('addonPrice').value);
  const editId = document.getElementById('editAddonId').value;

  if (!name)       { showToast('Add-on name is required.', 'error'); return; }
  if (isNaN(price) || price < 0) { showToast('Enter a valid price.', 'error'); return; }

  if (editId) {
    const idx = addons.findIndex(a => a.id === editId);
    if (idx !== -1) addons[idx] = { ...addons[idx], name, price };
  } else {
    addons.push({ id: uid('a'), name, price });
  }

  saveAddons();
  renderAdminAddons();
  closeModal('addonModal');
  showToast(editId ? '✅ Add-on updated!' : '✅ Add-on added!', 'success');
}

function deleteAddon(id) {
  if (!confirm('Delete this add-on?')) return;
  addons = addons.filter(a => a.id !== id);
  saveAddons();
  renderAdminAddons();
  showToast('Add-on deleted.', 'error');
}

// ── Admin: Orders ─────────────────────────────────────────────
function renderAdminOrders() {
  const el = document.getElementById('adminOrdersList');
  if (orders.length === 0) {
    el.innerHTML = '<div class="empty-state" style="display:block"><span>📦</span><p>No orders yet.</p></div>';
    return;
  }
  el.innerHTML = orders.map(o => `
    <div class="admin-order-card">
      <div class="admin-order-header">
        <span class="admin-order-id">${o.id}</span>
        <span class="order-status status-${o.status.toLowerCase()}">${o.status}</span>
      </div>
      <div class="admin-order-customer">👤 ${esc(o.customer)}</div>
      <div class="admin-order-meta">
        🛒 ${esc(o.product)} &nbsp;·&nbsp; ×${o.qty} &nbsp;·&nbsp; ${esc(o.payment)}<br>
        ${o.addons.length ? '➕ ' + o.addons.map(a => esc(a.name)).join(', ') + '<br>' : ''}
        🕐 ${o.date}
      </div>
      <div class="admin-order-total">Total: ₱${o.total.toFixed(2)}</div>
      <div class="admin-order-footer">
        <select class="status-select" onchange="updateOrderStatus('${o.id}', this.value)">
          ${['Pending','Completed','Cancelled'].map(s =>
            `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
        <button class="btn-del" onclick="deleteOrder('${o.id}')">🗑️ Remove</button>
      </div>
    </div>
  `).join('');
}

function updateOrderStatus(id, status) {
  const o = orders.find(x => x.id === id);
  if (o) { o.status = status; saveOrders(); showToast('Status updated to ' + status, 'success'); }
}

function deleteOrder(id) {
  if (!confirm('Remove this order?')) return;
  orders = orders.filter(o => o.id !== id);
  saveOrders();
  renderAdminOrders();
  showToast('Order removed.', 'error');
}

function clearAllOrders() {
  if (!confirm('Clear ALL orders? This cannot be undone.')) return;
  orders = [];
  saveOrders();
  renderAdminOrders();
  showToast('All orders cleared.', 'error');
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

// ── Image Handling (Product Modal) ───────────────────────────
function switchImgTab(mode, btn) {
  imgTabMode = mode;
  document.querySelectorAll('.img-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('imgUploadArea').style.display = mode === 'upload' ? '' : 'none';
  document.getElementById('imgUrlArea').style.display    = mode === 'url'    ? '' : 'none';
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    pendingImageData = ev.target.result;
    document.getElementById('imgPreview').src = pendingImageData;
    document.getElementById('imgPreviewWrap').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function previewImgUrl() {
  const url = document.getElementById('pImgUrl').value.trim();
  if (url) {
    pendingImageData = url;
    document.getElementById('imgPreview').src = url;
    document.getElementById('imgPreviewWrap').style.display = 'block';
  } else {
    pendingImageData = '';
    document.getElementById('imgPreviewWrap').style.display = 'none';
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

// ── Modal Helpers ─────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

function handleOverlayClick(e, id) {
  if (e.target === e.currentTarget) closeModal(id);
}

// ── Toast ─────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); }, 3400);
}

// ── Escape HTML ───────────────────────────────────────────────
function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ── Keyboard: close modals on Escape ─────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      m.classList.remove('open');
      document.body.style.overflow = '';
    });
  }
});

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderProducts();
  document.getElementById('footerYear').textContent = new Date().getFullYear();

  // Sync qty input on direct edit
  document.getElementById('orderQty').addEventListener('change', function() {
    let v = parseInt(this.value) || 1;
    if (v < 1)  v = 1;
    if (v > 50) v = 50;
    this.value = v;
    updateOrderTotal();
  });
});
