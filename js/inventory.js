// ============================================================
//  SmartMart Retail Solutions
//  inventory.ts — Inventory Management (TypeScript)
//  User Story 7: TypeScript for client-side logic
// ============================================================
import { getStockStatus } from './interfaces.js';
// ── INVENTORY RENDERER ────────────────────────────────────────
function renderInventory(inventory) {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody)
        return;
    if (!inventory.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#718096;padding:24px">No inventory records found.</td></tr>';
        return;
    }
    tbody.innerHTML = inventory.map((i) => {
        const status = getStockStatus(i);
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
function filterInventory(query) {
    const filtered = window.AppData.inventory
        .filter((i) => i.name.toLowerCase().includes(query.toLowerCase()) ||
        i.sku.toLowerCase().includes(query.toLowerCase()) ||
        i.category.toLowerCase().includes(query.toLowerCase()));
    renderInventory(filtered);
}
// ── QUICK RESTOCK ─────────────────────────────────────────────
function quickRestock(productId) {
    const item = window.AppData.inventory
        .find((i) => i.id === productId);
    if (!item)
        return;
    item.qty += item.reorder;
    renderInventory(window.AppData.inventory);
    window.showToast(`${item.name} restocked by ${item.reorder} units ✓`);
    window.initDashboard();
}
// ── SUBMIT STOCK ADJUSTMENT ───────────────────────────────────
function submitAdjustment() {
    const productEl = document.getElementById('adj-product');
    const typeEl = document.getElementById('adj-type');
    const qtyEl = document.getElementById('adj-qty');
    const reasonEl = document.getElementById('adj-reason');
    // build typed request object
    const request = {
        productId: parseInt(productEl.value),
        adjType: typeEl.value,
        quantity: parseInt(qtyEl.value),
        reason: reasonEl.value.trim()
    };
    // validation
    if (!request.productId) {
        window.showToast('Please select a product.', 'error');
        return;
    }
    if (!request.quantity || request.quantity < 1) {
        window.showToast('Quantity must be at least 1.', 'error');
        return;
    }
    if (!request.reason) {
        window.showToast('Please enter a reason.', 'error');
        return;
    }
    const item = window.AppData.inventory
        .find((i) => i.id === request.productId);
    if (!item)
        return;
    const delta = request.adjType === 'add' ? request.quantity : -request.quantity;
    const newQty = item.qty + delta;
    // mirrors sp_AdjustInventory business rule
    if (newQty < 0) {
        window.showToast(`Cannot remove ${request.quantity} units — only ${item.qty} available.`, 'error');
        return;
    }
    item.qty = newQty;
    window.closeModal('adjust-modal');
    window.showToast(`${item.name} stock ${request.adjType === 'add' ? 'increased' : 'decreased'} by ${request.quantity} units.`);
    // reset form
    productEl.value = '';
    qtyEl.value = '1';
    reasonEl.value = '';
    renderInventory(window.AppData.inventory);
    window.initDashboard();
}
// ── EXPOSE GLOBALS ────────────────────────────────────────────
window.renderInventory = renderInventory;
window.filterInventory = filterInventory;
window.quickRestock = quickRestock;
window.submitAdjustment = submitAdjustment;
//# sourceMappingURL=inventory.js.map