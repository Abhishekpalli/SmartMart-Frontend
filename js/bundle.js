// ============================================================
//  SmartMart Retail Solutions — bundle.js
//  Connected to C# API at http://localhost:5000
//  Data persists in SmartMartDB (SQL Server)
// ============================================================

const API = 'https://smartmart-api-hkehhzeggmhqdagq.southeastasia-01.azurewebsites.net/api';

// ── ORDER STATUS ENUM ─────────────────────────────────────────
const OrderStatus = {
  Pending:    'Pending',
  Confirmed:  'Confirmed',
  Processing: 'Processing',
  Shipped:    'Shipped',
  Delivered:  'Delivered',
  Cancelled:  'Cancelled'
};

// ── TYPE GUARDS (from interfaces.ts) ─────────────────────────
function isLowStock(item)      { return item.qty <= item.reorder; }
function isCriticalStock(item) { return item.qty <= 5; }
function getStockStatus(item) {
  if (isCriticalStock(item)) return 'Critical';
  if (isLowStock(item))      return 'Low';
  return 'OK';
}
function canTransition(current, next) {
  const validTransitions = {
    [OrderStatus.Pending]:    [OrderStatus.Confirmed,  OrderStatus.Cancelled],
    [OrderStatus.Confirmed]:  [OrderStatus.Processing, OrderStatus.Cancelled],
    [OrderStatus.Processing]: [OrderStatus.Shipped,    OrderStatus.Cancelled],
    [OrderStatus.Shipped]:    [OrderStatus.Delivered],
    [OrderStatus.Delivered]:  [],
    [OrderStatus.Cancelled]:  [],
  };
  return (validTransitions[current] ?? []).includes(next);
}

// ── API HELPERS ───────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Request failed');
    }
    return await res.json();
  } catch (e) {
    throw e;
  }
}

// ── SPA NAVIGATION ────────────────────────────────────────────
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');
  const titles = { dashboard:'Dashboard', orders:'Orders', inventory:'Inventory', products:'Products', reports:'Reports' };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = titles[page] || page;
  if (page === 'orders')    loadOrders();
  if (page === 'inventory') loadInventory();
  if (page === 'products')  loadProducts();
  if (page === 'reports')   loadReports();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(item.dataset.page);
  });
});

// ── SIDEBAR & MODALS ──────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('collapsed');
  document.getElementById('mainContent')?.classList.toggle('expanded');
}
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ── TOAST ─────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}

// ── DASHBOARD ─────────────────────────────────────────────────
async function initDashboard() {
  try {
    // Load KPIs from API
    const kpis = await apiFetch(`${API}/dashboard/kpis`);
    const kpiOrders   = document.getElementById('kpi-orders');
    const kpiRevenue  = document.getElementById('kpi-revenue');
    const kpiLowstock = document.getElementById('kpi-lowstock');
    const kpiPending  = document.getElementById('kpi-pending');
    if (kpiOrders)   kpiOrders.textContent   = kpis.totalOrders;
    if (kpiRevenue)  kpiRevenue.textContent  = `₹${Number(kpis.revenue).toLocaleString('en-IN', {maximumFractionDigits:0})}`;
    if (kpiLowstock) kpiLowstock.textContent = kpis.lowStockAlerts;
    if (kpiPending)  kpiPending.textContent  = kpis.pendingOrders;

    // Load recent orders
    const recent = await apiFetch(`${API}/dashboard/recent-orders`);
    const recentBody = document.getElementById('recent-orders-body');
    if (recentBody) {
      recentBody.innerHTML = recent.map(o => `
        <tr>
          <td><strong>${o.number.split('-').slice(-1)[0]}</strong></td>
          <td>${o.customerName || "Customer #" + o.customerId}</td>
          <td>₹${Number(o.total).toFixed(2)}</td>
          <td><span class="badge badge-${o.status.toLowerCase()}">${o.status}</span></td>
        </tr>`).join('');
    }

    // Load low stock
    const lowStock = await apiFetch(`${API}/dashboard/low-stock`);
    const lowStockEl = document.getElementById('low-stock-list');
    if (lowStockEl) {
      if (!lowStock.length) {
        lowStockEl.innerHTML = '<div style="color:#38a169;padding:12px">✓ All items are well stocked!</div>';
      } else {
        lowStockEl.innerHTML = lowStock.map(i => {
          const status = i.qty <= 5 ? 'Critical' : 'Low';
          return `<div class="low-stock-item">
            <div>
              <div class="low-stock-name">${i.name}</div>
              <div class="low-stock-qty">${i.qty} remaining (reorder at ${i.reorder})</div>
            </div>
            <span class="badge ${status === 'Critical' ? 'badge-critical' : 'badge-low'}">${status}</span>
          </div>`;
        }).join('');
      }
    }
  } catch (e) {
    showToast('Could not load dashboard data. Is the API running?', 'error');
  }
}

// ── ORDERS ────────────────────────────────────────────────────
let allOrders = [];

async function loadOrders() {
  const tbody = document.getElementById('orders-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px">Loading...</td></tr>';
  try {
    allOrders = await apiFetch(`${API}/orders`);
    renderOrders(allOrders);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:red;padding:24px">Failed to load orders.</td></tr>';
  }
}

function renderOrders(orders) {
  const tbody = document.getElementById('orders-table-body');
  if (!tbody) return;
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#718096;padding:24px">No orders found.</td></tr>';
    return;
  }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><strong>${o.number}</strong></td>
      <td>${o.customerName || "Customer #" + o.customerId}</td>
      <td>${o.date}</td>
      <td>${o.products || '-'}</td>
      <td>${o.items} item${o.items > 1 ? 's' : ''}</td>
      <td>₹${Number(o.total).toFixed(2)}</td>
      <td><span class="badge badge-${o.status.toLowerCase()}">${o.status}</span></td>
      <td>
        ${o.status === OrderStatus.Pending    ? `<button class="btn-sm btn-sm-success" onclick="updateStatus(${o.id},'${OrderStatus.Confirmed}')">Confirm</button>`  : ''}
        ${o.status === OrderStatus.Confirmed  ? `<button class="btn-sm btn-sm-info"    onclick="updateStatus(${o.id},'${OrderStatus.Processing}')">Process</button>` : ''}
        ${o.status === OrderStatus.Processing ? `<button class="btn-sm btn-sm-info"    onclick="updateStatus(${o.id},'${OrderStatus.Shipped}')">Ship</button>`       : ''}
        ${[OrderStatus.Pending, OrderStatus.Confirmed, OrderStatus.Processing].includes(o.status)
          ? `<button class="btn-sm btn-sm-danger" style="margin-left:4px" onclick="updateStatus(${o.id},'${OrderStatus.Cancelled}')">Cancel</button>` : ''}
      </td>
    </tr>`).join('');
}

function filterOrders(query) {
  const filtered = allOrders.filter(o =>
    o.number.toLowerCase().includes(query.toLowerCase()) ||
    o.status.toLowerCase().includes(query.toLowerCase())
  );
  renderOrders(filtered);
}

async function updateStatus(orderId, newStatus) {
  try {
    await apiFetch(`${API}/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });
    showToast(`Order updated to "${newStatus}" ✓`);
    await loadOrders();
    await initDashboard();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function submitOrder() {
  const customerEl = document.getElementById('order-customer');
  const productEl  = document.getElementById('order-product');
  const qtyEl      = document.getElementById('order-qty');
  const customer   = customerEl.value.trim();
  const productId  = parseInt(productEl.value);
  const qty        = parseInt(qtyEl.value);

  document.getElementById('err-customer').textContent = '';
  document.getElementById('err-product').textContent  = '';
  document.getElementById('err-qty').textContent      = '';

  let valid = true;
  if (!customer)       { document.getElementById('err-customer').textContent = 'Customer name is required.'; valid = false; }
  if (!productId)      { document.getElementById('err-product').textContent  = 'Please select a product.';  valid = false; }
  if (!qty || qty < 1) { document.getElementById('err-qty').textContent      = 'Quantity must be at least 1.'; valid = false; }
  if (!valid) return;

  try {
    const result = await apiFetch(`${API}/orders`, {
      method: 'POST',
      body: JSON.stringify({ customerId: 1, customerName: customer, storeId: 1, productId, quantity: qty })
    });
    closeModal('order-modal');
    showToast(`Order ${result.orderNumber} placed successfully! ✓`);
    customerEl.value = ''; productEl.value = ''; qtyEl.value = '1';
    await loadOrders();
    await initDashboard();
  } catch (e) {
    document.getElementById('err-qty').textContent = e.message;
  }
}

// ── INVENTORY ─────────────────────────────────────────────────
let allInventory = [];

async function loadInventory() {
  const tbody = document.getElementById('inventory-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px">Loading...</td></tr>';
  try {
    allInventory = await apiFetch(`${API}/inventory`);
    renderInventory(allInventory);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:red;padding:24px">Failed to load inventory.</td></tr>';
  }
}

function renderInventory(inventory) {
  const tbody = document.getElementById('inventory-table-body');
  if (!tbody) return;
  if (!inventory.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#718096;padding:24px">No records found.</td></tr>';
    return;
  }
  tbody.innerHTML = inventory.map(i => {
    const status     = getStockStatus(i);
    const badgeClass = status === 'Critical' ? 'badge-critical' : status === 'Low' ? 'badge-low' : 'badge-ok';
    return `<tr>
      <td><strong>${i.name}</strong></td>
      <td><code style="font-size:12px;background:#f4f6fb;padding:2px 6px;border-radius:4px">${i.sku}</code></td>
      <td>${i.category}</td>
      <td><strong style="font-size:15px">${i.qty}</strong><span style="font-size:11px;color:#718096"> units</span></td>
      <td>${i.reorder}</td>
      <td><span class="badge ${badgeClass}">${status}</span></td>
      <td><button class="btn-sm btn-sm-success" onclick="quickRestock(${i.id},${i.storeId},${i.reorder})">+ Restock</button></td>
    </tr>`;
  }).join('');
}

function filterInventory(query) {
  const filtered = allInventory.filter(i =>
    i.name.toLowerCase().includes(query.toLowerCase()) ||
    i.sku.toLowerCase().includes(query.toLowerCase())  ||
    i.category.toLowerCase().includes(query.toLowerCase())
  );
  renderInventory(filtered);
}

async function quickRestock(productId, storeId, reorderQty) {
  try {
    await apiFetch(`${API}/inventory/adjust`, {
      method: 'POST',
      body: JSON.stringify({ productId, storeId, adjType: 'add', quantity: reorderQty, reason: 'Quick restock' })
    });
    showToast(`Restocked by ${reorderQty} units ✓`);
    await loadInventory();
    await initDashboard();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function submitAdjustment() {
  const productId = parseInt(document.getElementById('adj-product').value);
  const adjType   = document.getElementById('adj-type').value;
  const qty       = parseInt(document.getElementById('adj-qty').value);
  const reason    = document.getElementById('adj-reason').value.trim();

  if (!productId)      { showToast('Please select a product.', 'error'); return; }
  if (!qty || qty < 1) { showToast('Quantity must be at least 1.', 'error'); return; }
  if (!reason)         { showToast('Please enter a reason.', 'error'); return; }

  try {
    await apiFetch(`${API}/inventory/adjust`, {
      method: 'POST',
      body: JSON.stringify({ productId, storeId: 1, adjType, quantity: qty, reason })
    });
    closeModal('adjust-modal');
    showToast(`Stock ${adjType === 'add' ? 'increased' : 'decreased'} by ${qty} units ✓`);
    document.getElementById('adj-product').value = '';
    document.getElementById('adj-qty').value = '1';
    document.getElementById('adj-reason').value = '';
    await loadInventory();
    await initDashboard();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ── PRODUCTS ──────────────────────────────────────────────────
async function loadProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  grid.innerHTML = '<div style="padding:24px;color:#718096">Loading...</div>';
  try {
    const products = await apiFetch(`${API}/products`);
    renderProducts(products);
  } catch (e) {
    grid.innerHTML = '<div style="padding:24px;color:red">Failed to load products.</div>';
  }
}

function renderProducts(products) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  grid.innerHTML = products.map(p => `
    <div class="product-card">
      <div class="product-category">${p.category}</div>
      <div class="product-name">${p.name}</div>
      <div class="product-sku">${p.sku}</div>
      <div class="product-price">₹${Number(p.price).toFixed(2)}</div>
    </div>`).join('');
}

async function submitProduct() {
  const nameEl  = document.getElementById('prod-name');
  const skuEl   = document.getElementById('prod-sku');
  const catEl   = document.getElementById('prod-category');
  const priceEl = document.getElementById('prod-price');
  const name    = nameEl.value.trim();
  const sku     = skuEl.value.trim();
  const price   = parseFloat(priceEl.value);

  document.getElementById('err-prod-name').textContent  = '';
  document.getElementById('err-prod-sku').textContent   = '';
  document.getElementById('err-prod-price').textContent = '';

  let valid = true;
  if (!name)              { document.getElementById('err-prod-name').textContent  = 'Product name is required.'; valid = false; }
  if (!sku)               { document.getElementById('err-prod-sku').textContent   = 'SKU is required.';          valid = false; }
  if (!price || price < 0){ document.getElementById('err-prod-price').textContent = 'Enter a valid price.';      valid = false; }
  if (!valid) return;

  try {
    await apiFetch(`${API}/products`, {
      method: 'POST',
      body: JSON.stringify({ name, sku, category: catEl.value || 'General', price })
    });
    closeModal('product-modal');
    showToast(`Product "${name}" added successfully! ✓`);
    nameEl.value = ''; skuEl.value = ''; priceEl.value = ''; catEl.value = '';
    await loadProducts();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ── REPORTS ───────────────────────────────────────────────────
async function loadReports() {
  try {
    const inventory = await apiFetch(`${API}/inventory`);
    const orders    = await apiFetch(`${API}/orders`);
    const products  = await apiFetch(`${API}/products`);

    // Sales chart
    const salesData = products.map(p => {
      const rev = orders
        .filter(o => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + (o.total / products.length), 0);
      return { name: p.name, revenue: rev };
    });
    const maxRev = Math.max(...salesData.map(s => s.revenue), 1);
    const salesEl = document.getElementById('sales-chart');
    if (salesEl) salesEl.innerHTML = `<div class="bar-chart">${salesData.map(s => `
      <div class="bar-item">
        <div class="bar-label">${s.name.length > 18 ? s.name.substring(0,18)+'...' : s.name}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(s.revenue/maxRev*100).toFixed(0)}%"></div></div>
        <div class="bar-value">₹${(s.revenue/1000).toFixed(1)}k</div>
      </div>`).join('')}</div>`;

    // Stock chart
    const stockEl = document.getElementById('stock-chart');
    if (stockEl) stockEl.innerHTML = `<div class="bar-chart">${inventory.map(i => {
      const pct   = Math.min((i.qty / (i.reorder * 5)) * 100, 100);
      const color = isCriticalStock(i) ? '#e53e3e' : isLowStock(i) ? '#d69e2e' : '#38a169';
      return `<div class="bar-item">
        <div class="bar-label">${i.name.length > 18 ? i.name.substring(0,18)+'...' : i.name}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct.toFixed(0)}%;background:${color}"></div></div>
        <div class="bar-value">${i.qty} units</div>
      </div>`;}).join('')}</div>`;
  } catch (e) {
    showToast('Could not load reports.', 'error');
  }
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await initDashboard();
});
