// ============================================================
//  SmartMart Retail Solutions
//  orders.ts — Order Management (TypeScript)
//  User Story 7: TypeScript for client-side logic
// ============================================================
import { OrderStatus, canTransition, isValidOrderStatus } from './interfaces.js';
// ── ORDER RENDERER ────────────────────────────────────────────
function renderOrders(orders) {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody)
        return;
    if (!orders.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#718096;padding:24px">No orders found.</td></tr>';
        return;
    }
    tbody.innerHTML = orders.map((o) => `
    <tr>
      <td><strong>${o.number}</strong></td>
      <td>${o.customer}</td>
      <td>${o.date}</td>
      <td>${o.items} item${o.items > 1 ? 's' : ''}</td>
      <td>₹${o.total.toFixed(2)}</td>
      <td><span class="badge badge-${o.status.toLowerCase()}">${o.status}</span></td>
      <td>
        ${o.status === OrderStatus.Pending ? `<button class="btn-sm btn-sm-success" onclick="updateStatus(${o.id}, '${OrderStatus.Confirmed}')">Confirm</button>` : ''}
        ${o.status === OrderStatus.Confirmed ? `<button class="btn-sm btn-sm-info"    onclick="updateStatus(${o.id}, '${OrderStatus.Processing}')">Process</button>` : ''}
        ${o.status === OrderStatus.Processing ? `<button class="btn-sm btn-sm-info"    onclick="updateStatus(${o.id}, '${OrderStatus.Shipped}')">Ship</button>` : ''}
        ${[OrderStatus.Pending, OrderStatus.Confirmed, OrderStatus.Processing].includes(o.status)
        ? `<button class="btn-sm btn-sm-danger" style="margin-left:4px" onclick="cancelOrder(${o.id})">Cancel</button>` : ''}
      </td>
    </tr>
  `).join('');
}
// ── FILTER ORDERS ─────────────────────────────────────────────
function filterOrders(query) {
    const filtered = window.AppData.orders.filter((o) => o.number.toLowerCase().includes(query.toLowerCase()) ||
        o.customer.toLowerCase().includes(query.toLowerCase()) ||
        o.status.toLowerCase().includes(query.toLowerCase()));
    renderOrders(filtered);
}
// ── UPDATE ORDER STATUS ───────────────────────────────────────
function updateStatus(orderId, newStatusStr) {
    const order = window.AppData.orders.find((o) => o.id === orderId);
    if (!order)
        return;
    if (!isValidOrderStatus(newStatusStr)) {
        window.showToast(`Invalid status: ${newStatusStr}`, 'error');
        return;
    }
    const newStatus = newStatusStr;
    // Use TypeScript canTransition type guard — mirrors backend OrderStatusTransitionValidator
    if (!canTransition(order.status, newStatus)) {
        window.showToast(`Cannot change status from ${order.status} to ${newStatus}`, 'error');
        return;
    }
    order.status = newStatus;
    renderOrders(window.AppData.orders);
    window.showToast(`Order ${order.number} updated to "${newStatus}"`);
    window.initDashboard();
}
// ── CANCEL ORDER ──────────────────────────────────────────────
function cancelOrder(orderId) {
    updateStatus(orderId, OrderStatus.Cancelled);
}
// ── SUBMIT NEW ORDER ──────────────────────────────────────────
function submitOrder() {
    const customerEl = document.getElementById('order-customer');
    const productEl = document.getElementById('order-product');
    const qtyEl = document.getElementById('order-qty');
    const errCustomer = document.getElementById('err-customer');
    const errProduct = document.getElementById('err-product');
    const errQty = document.getElementById('err-qty');
    const customer = customerEl.value.trim();
    const productId = parseInt(productEl.value);
    const qty = parseInt(qtyEl.value);
    // clear previous errors
    if (errCustomer)
        errCustomer.textContent = '';
    if (errProduct)
        errProduct.textContent = '';
    if (errQty)
        errQty.textContent = '';
    // validation with TypeScript strict types
    let valid = true;
    if (!customer) {
        if (errCustomer)
            errCustomer.textContent = 'Customer name is required.';
        valid = false;
    }
    if (!productId) {
        if (errProduct)
            errProduct.textContent = 'Please select a product.';
        valid = false;
    }
    if (!qty || qty < 1) {
        if (errQty)
            errQty.textContent = 'Quantity must be at least 1.';
        valid = false;
    }
    if (!valid)
        return;
    // stock check using typed InventoryItem
    const invItem = window.AppData.inventory
        .find((i) => i.id === productId);
    if (invItem && invItem.qty < qty) {
        if (errQty)
            errQty.textContent = `Only ${invItem.qty} units available in stock.`;
        return;
    }
    // get price from selected option text
    const selectedText = productEl.options[productEl.selectedIndex].text;
    const price = parseFloat(selectedText.split('₹')[1]) || 0;
    // create typed Order object
    const newOrder = {
        id: window.AppData.orders.length + 1,
        number: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(window.AppData.orders.length + 1).padStart(3, '0')}`,
        customer,
        date: new Date().toISOString().slice(0, 10),
        items: qty,
        total: price * qty,
        status: OrderStatus.Pending
    };
    window.AppData.orders.unshift(newOrder);
    // deduct stock
    if (invItem)
        invItem.qty -= qty;
    window.closeModal('order-modal');
    window.showToast(`Order ${newOrder.number} placed successfully!`);
    // reset form
    customerEl.value = '';
    productEl.value = '';
    qtyEl.value = '1';
    renderOrders(window.AppData.orders);
    window.initDashboard();
}
// ── EXPOSE GLOBALS ────────────────────────────────────────────
window.renderOrders = renderOrders;
window.filterOrders = filterOrders;
window.updateStatus = updateStatus;
window.cancelOrder = cancelOrder;
window.submitOrder = submitOrder;
//# sourceMappingURL=orders.js.map