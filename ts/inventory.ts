// ============================================================
//  SmartMart Retail Solutions
//  inventory.ts — Inventory Management (TypeScript)
//  User Story 7: TypeScript for client-side logic
// ============================================================

import {
  InventoryItem, StockAdjustmentRequest,
  getStockStatus, isLowStock
} from './interfaces.js';

// ── INVENTORY RENDERER ────────────────────────────────────────
function renderInventory(inventory: InventoryItem[]): void {
  const tbody = document.getElementById('inventory-table-body');
  if (!tbody) return;

  if (!inventory.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#718096;padding:24px">No inventory records found.</td></tr>';
    return;
  }

  tbody.innerHTML = inventory.map((i: InventoryItem) => {
    const status     = getStockStatus(i);
    const badgeClass = status === 'Critical' ? 'badge-critical' : status === 'Low' ? 'badge-low' : 'badge-ok';

    return `
      <tr>
        <td><strong>${i.name}</strong></td>
        <td><code style="font-size:12px;background:#f4f6fb;padding:2px 6px;border-radius:4px">${i.sku}</code></td>
        <td>${i.category}</td>
        <td>
          <strong style="font-size:15px">${i.qty}</strong>
          <span style="font-size:11px;color:#718096"> units</span>
        </td>
        <td>${i.reorder}</td>
        <td><span class="badge ${badgeClass}">${status}</span></td>
        <td>
          <button class="btn-sm btn-sm-success" onclick="quickRestock(${i.id})">+ Restock</button>
        </td>
      </tr>`;
  }).join('');
}

// ── FILTER INVENTORY ──────────────────────────────────────────
function filterInventory(query: string): void {
  const filtered: InventoryItem[] = (window as any).AppData.inventory
    .filter((i: InventoryItem) =>
      i.name.toLowerCase().includes(query.toLowerCase())     ||
      i.sku.toLowerCase().includes(query.toLowerCase())      ||
      i.category.toLowerCase().includes(query.toLowerCase())
    );
  renderInventory(filtered);
}

// ── QUICK RESTOCK ─────────────────────────────────────────────
function quickRestock(productId: number): void {
  const item: InventoryItem | undefined = (window as any).AppData.inventory
    .find((i: InventoryItem) => i.id === productId);
  if (!item) return;

  item.qty += item.reorder;
  renderInventory((window as any).AppData.inventory);
  (window as any).showToast(`${item.name} restocked by ${item.reorder} units ✓`);
  (window as any).initDashboard();
}

// ── SUBMIT STOCK ADJUSTMENT ───────────────────────────────────
function submitAdjustment(): void {
  const productEl = document.getElementById('adj-product') as HTMLSelectElement;
  const typeEl    = document.getElementById('adj-type')    as HTMLSelectElement;
  const qtyEl     = document.getElementById('adj-qty')     as HTMLInputElement;
  const reasonEl  = document.getElementById('adj-reason')  as HTMLInputElement;

  // build typed request object
  const request: StockAdjustmentRequest = {
    productId: parseInt(productEl.value),
    adjType:   typeEl.value as 'add' | 'remove',
    quantity:  parseInt(qtyEl.value),
    reason:    reasonEl.value.trim()
  };

  // validation
  if (!request.productId)          { (window as any).showToast('Please select a product.', 'error'); return; }
  if (!request.quantity || request.quantity < 1) { (window as any).showToast('Quantity must be at least 1.', 'error'); return; }
  if (!request.reason)             { (window as any).showToast('Please enter a reason.', 'error'); return; }

  const item: InventoryItem | undefined = (window as any).AppData.inventory
    .find((i: InventoryItem) => i.id === request.productId);
  if (!item) return;

  const delta:  number = request.adjType === 'add' ? request.quantity : -request.quantity;
  const newQty: number = item.qty + delta;

  // mirrors sp_AdjustInventory business rule
  if (newQty < 0) {
    (window as any).showToast(`Cannot remove ${request.quantity} units — only ${item.qty} available.`, 'error');
    return;
  }

  item.qty = newQty;

  (window as any).closeModal('adjust-modal');
  (window as any).showToast(`${item.name} stock ${request.adjType === 'add' ? 'increased' : 'decreased'} by ${request.quantity} units.`);

  // reset form
  productEl.value = ''; qtyEl.value = '1'; reasonEl.value = '';

  renderInventory((window as any).AppData.inventory);
  (window as any).initDashboard();
}

// ── EXPOSE GLOBALS ────────────────────────────────────────────
(window as any).renderInventory   = renderInventory;
(window as any).filterInventory   = filterInventory;
(window as any).quickRestock      = quickRestock;
(window as any).submitAdjustment  = submitAdjustment;
