// ============================================================
//  SmartMart Retail Solutions
//  app.ts — Main SPA Application (TypeScript)
//  User Story 7: TypeScript for client-side logic
// ============================================================

import {
  Order, OrderStatus, InventoryItem, Product,
  AppDataStore, DashboardKPIs,
  isLowStock, isCriticalStock, getStockStatus,
  canTransition
} from './interfaces.js';

// ── SHARED DATA STORE ─────────────────────────────────────────
// In production this comes from the C# API via fetch()
const AppData: AppDataStore = {
  orders: [
    { id: 1, number: 'ORD-20260301-001', customer: 'Abhishek Palli', date: '2026-03-01', items: 2, total: 349.98,  status: OrderStatus.Delivered  },
    { id: 2, number: 'ORD-20260302-002', customer: 'Sneha Reddy',    date: '2026-03-02', items: 2, total: 5049.00, status: OrderStatus.Shipped    },
    { id: 3, number: 'ORD-20260303-003', customer: 'Kiran Sharma',   date: '2026-03-03', items: 1, total: 89.00,   status: OrderStatus.Pending    },
    { id: 4, number: 'ORD-20260304-004', customer: 'Abhishek Palli', date: '2026-03-04', items: 2, total: 375.00,  status: OrderStatus.Confirmed  },
    { id: 5, number: 'ORD-20260305-005', customer: 'Sneha Reddy',    date: '2026-03-05', items: 3, total: 149.97,  status: OrderStatus.Cancelled  },
  ],

  inventory: [
    { id: 1, name: 'Wireless Mouse',       sku: 'SKU-WM-001', category: 'Electronics', qty: 100, reorder: 20 },
    { id: 2, name: 'USB Keyboard',         sku: 'SKU-KB-002', category: 'Electronics', qty: 15,  reorder: 20 },
    { id: 3, name: 'Office Chair',         sku: 'SKU-OC-003', category: 'Furniture',   qty: 5,   reorder: 10 },
    { id: 4, name: 'Notebook A4 Pack',     sku: 'SKU-NB-004', category: 'Stationery',  qty: 80,  reorder: 15 },
    { id: 5, name: 'Hand Sanitizer 500ml', sku: 'SKU-HS-005', category: 'Health',      qty: 30,  reorder: 10 },
  ],

  products: [
    { id: 1, name: 'Wireless Mouse',       sku: 'SKU-WM-001', category: 'Electronics', price: 299.99  },
    { id: 2, name: 'USB Keyboard',         sku: 'SKU-KB-002', category: 'Electronics', price: 49.99   },
    { id: 3, name: 'Office Chair',         sku: 'SKU-OC-003', category: 'Furniture',   price: 4999.00 },
    { id: 4, name: 'Notebook A4 Pack',     sku: 'SKU-NB-004', category: 'Stationery',  price: 89.00   },
    { id: 5, name: 'Hand Sanitizer 500ml', sku: 'SKU-HS-005', category: 'Health',      price: 75.00   },
  ]
};

// ── SPA NAVIGATION ────────────────────────────────────────────
function navigateTo(page: string): void {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  const titles: Record<string, string> = {
    dashboard: 'Dashboard', orders: 'Orders',
    inventory: 'Inventory', products: 'Products', reports: 'Reports'
  };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = titles[page] || page;

  if (page === 'orders')    (window as any).renderOrders(AppData.orders);
  if (page === 'inventory') (window as any).renderInventory(AppData.inventory);
  if (page === 'products')  renderProducts(AppData.products);
  if (page === 'reports')   renderReports();
}

// wire up nav links
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e: Event) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    navigateTo(target.dataset['page'] ?? '');
  });
});

// ── SIDEBAR TOGGLE ────────────────────────────────────────────
function toggleSidebar(): void {
  document.getElementById('sidebar')?.classList.toggle('collapsed');
  document.getElementById('mainContent')?.classList.toggle('expanded');
}

// ── MODAL HELPERS ─────────────────────────────────────────────
function openModal(id: string): void  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id: string): void { document.getElementById(id)?.classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e: Event) => {
    if (e.target === overlay) (overlay as HTMLElement).classList.remove('open');
  });
});

// ── TOAST NOTIFICATIONS ───────────────────────────────────────
function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}

// ── PRODUCTS RENDERER ─────────────────────────────────────────
function renderProducts(products: Product[]): void {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  grid.innerHTML = products.map((p: Product) => `
    <div class="product-card">
      <div class="product-category">${p.category}</div>
      <div class="product-name">${p.name}</div>
      <div class="product-sku">${p.sku}</div>
      <div class="product-price">₹${p.price.toFixed(2)}</div>
    </div>
  `).join('');
}

// ── REPORTS RENDERER ──────────────────────────────────────────
function renderReports(): void {
  const salesData = AppData.products.map((p: Product) => ({
    name:    p.name,
    revenue: Math.random() * 5000 + 500
  }));

  const maxRev: number = Math.max(...salesData.map(s => s.revenue));
  const salesEl = document.getElementById('sales-chart');
  if (salesEl) {
    salesEl.innerHTML = `
      <div class="bar-chart">
        ${salesData.map(s => `
          <div class="bar-item">
            <div class="bar-label">${s.name.length > 18 ? s.name.substring(0,18)+'...' : s.name}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${(s.revenue/maxRev*100).toFixed(0)}%"></div></div>
            <div class="bar-value">₹${(s.revenue/1000).toFixed(1)}k</div>
          </div>
        `).join('')}
      </div>`;
  }

  const stockEl = document.getElementById('stock-chart');
  if (stockEl) {
    stockEl.innerHTML = `
      <div class="bar-chart">
        ${AppData.inventory.map((i: InventoryItem) => {
          const pct: number = Math.min((i.qty / (i.reorder * 5)) * 100, 100);
          const color: string = isCriticalStock(i) ? '#e53e3e' : isLowStock(i) ? '#d69e2e' : '#38a169';
          return `
            <div class="bar-item">
              <div class="bar-label">${i.name.length > 18 ? i.name.substring(0,18)+'...' : i.name}</div>
              <div class="bar-track"><div class="bar-fill" style="width:${pct.toFixed(0)}%;background:${color}"></div></div>
              <div class="bar-value">${i.qty} units</div>
            </div>`;
        }).join('')}
      </div>`;
  }
}

// ── PRODUCT FORM SUBMIT ───────────────────────────────────────
function submitProduct(): void {
  const nameEl  = document.getElementById('prod-name')  as HTMLInputElement;
  const skuEl   = document.getElementById('prod-sku')   as HTMLInputElement;
  const catEl   = document.getElementById('prod-category') as HTMLSelectElement;
  const priceEl = document.getElementById('prod-price') as HTMLInputElement;

  const name:  string = nameEl.value.trim();
  const sku:   string = skuEl.value.trim();
  const price: number = parseFloat(priceEl.value);

  let valid = true;
  const errName  = document.getElementById('err-prod-name');
  const errSku   = document.getElementById('err-prod-sku');
  const errPrice = document.getElementById('err-prod-price');

  if (errName)  errName.textContent  = '';
  if (errSku)   errSku.textContent   = '';
  if (errPrice) errPrice.textContent = '';

  if (!name)             { if (errName)  errName.textContent  = 'Product name is required.'; valid = false; }
  if (!sku)              { if (errSku)   errSku.textContent   = 'SKU is required.';           valid = false; }
  if (!price || price < 0) { if (errPrice) errPrice.textContent = 'Enter a valid price.';   valid = false; }
  if (!valid) return;

  const newProduct: Product = {
    id: AppData.products.length + 1,
    name, sku,
    category: catEl.value || 'General',
    price
  };

  AppData.products.push(newProduct);
  closeModal('product-modal');
  showToast(`Product "${name}" added successfully!`);

  nameEl.value = ''; skuEl.value = ''; priceEl.value = ''; catEl.value = '';
  renderProducts(AppData.products);
}

// ── DASHBOARD INIT ────────────────────────────────────────────
function initDashboard(): void {
  const kpis: DashboardKPIs = {
    totalOrdersToday: AppData.orders.length,
    revenueToday:     AppData.orders.filter(o => o.status !== OrderStatus.Cancelled).reduce((s, o) => s + o.total, 0),
    lowStockAlerts:   AppData.inventory.filter(isLowStock).length,
    pendingOrders:    AppData.orders.filter(o => o.status === OrderStatus.Pending).length,
  };

  // update KPI cards
  const kpiOrders   = document.getElementById('kpi-orders');
  const kpiRevenue  = document.getElementById('kpi-revenue');
  const kpiLowstock = document.getElementById('kpi-lowstock');
  const kpiPending  = document.getElementById('kpi-pending');

  if (kpiOrders)   kpiOrders.textContent   = String(kpis.totalOrdersToday);
  if (kpiRevenue)  kpiRevenue.textContent  = `₹${kpis.revenueToday.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  if (kpiLowstock) kpiLowstock.textContent = String(kpis.lowStockAlerts);
  if (kpiPending)  kpiPending.textContent  = String(kpis.pendingOrders);

  // recent orders table
  const recentBody = document.getElementById('recent-orders-body');
  if (recentBody) {
    recentBody.innerHTML = AppData.orders.slice(0, 4).map((o: Order) => `
      <tr>
        <td><strong>${o.number.split('-').slice(-1)[0]}</strong></td>
        <td>${o.customer}</td>
        <td>₹${o.total.toFixed(2)}</td>
        <td><span class="badge badge-${o.status.toLowerCase()}">${o.status}</span></td>
      </tr>
    `).join('');
  }

  // low stock list
  const lowStockEl = document.getElementById('low-stock-list');
  if (lowStockEl) {
    const lowItems: InventoryItem[] = AppData.inventory.filter(isLowStock);
    lowStockEl.innerHTML = lowItems.map((i: InventoryItem) => {
      const status = getStockStatus(i);
      return `
        <div class="low-stock-item">
          <div>
            <div class="low-stock-name">${i.name}</div>
            <div class="low-stock-qty">${i.qty} remaining (reorder at ${i.reorder})</div>
          </div>
          <span class="badge ${status === 'Critical' ? 'badge-critical' : 'badge-low'}">${status}</span>
        </div>`;
    }).join('');
  }
}

// ── EXPOSE GLOBALS (needed by HTML onclick handlers) ──────────
(window as any).navigateTo    = navigateTo;
(window as any).toggleSidebar = toggleSidebar;
(window as any).openModal     = openModal;
(window as any).closeModal    = closeModal;
(window as any).showToast     = showToast;
(window as any).submitProduct = submitProduct;
(window as any).initDashboard = initDashboard;
(window as any).AppData       = AppData;

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', (): void => {
  initDashboard();
});
