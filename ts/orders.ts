// ============================================================
//  SmartMart Retail Solutions
//  orders.ts — Order Management (TypeScript)
//  User Story 7: TypeScript for client-side logic
// ============================================================

import {
  Order, OrderStatus, InventoryItem,
  canTransition, isValidOrderStatus
} from './interfaces.js';

// ── ORDER RENDERER ────────────────────────────────────────────
function renderOrders(orders: Order[]): void {
  const tbody = document.getElementById('orders-table-body');
  if (!tbody) return;

  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#718096;padding:24px">No orders found.</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map((o: Order) => `
    <tr>
      <td><strong>${o.number}</strong></td>
      <td>${o.customer}</td>
      <td>${o.date}</td>
      <td>${o.items} item${o.items > 1 ? 's' : ''}</td>
      <td>₹${o.total.toFixed(2)}</td>
      <td><span class="badge badge-${o.status.toLowerCase()}">${o.status}</span></td>
      <td>
        ${o.status === OrderStatus.Pending    ? `<button class="btn-sm btn-sm-success" onclick="updateStatus(${o.id}, '${OrderStatus.Confirmed}')">Confirm</button>` : ''}
        ${o.status === OrderStatus.Confirmed  ? `<button class="btn-sm btn-sm-info"    onclick="updateStatus(${o.id}, '${OrderStatus.Processing}')">Process</button>` : ''}
        ${o.status === OrderStatus.Processing ? `<button class="btn-sm btn-sm-info"    onclick="updateStatus(${o.id}, '${OrderStatus.Shipped}')">Ship</button>` : ''}
        ${[OrderStatus.Pending, OrderStatus.Confirmed, OrderStatus.Processing].includes(o.status)
          ? `<button class="btn-sm btn-sm-danger" style="margin-left:4px" onclick="cancelOrder(${o.id})">Cancel</button>` : ''}
      </td>
    </tr>
  `).join('');
}

// ── FILTER ORDERS ─────────────────────────────────────────────
function filterOrders(query: string): void {
  const filtered: Order[] = (window as any).AppData.orders.filter((o: Order) =>
    o.number.toLowerCase().includes(query.toLowerCase())   ||
    o.customer.toLowerCase().includes(query.toLowerCase()) ||
    o.status.toLowerCase().includes(query.toLowerCase())
  );
  renderOrders(filtered);
}

// ── UPDATE ORDER STATUS ───────────────────────────────────────
function updateStatus(orderId: number, newStatusStr: string): void {
  const order: Order | undefined = (window as any).AppData.orders.find((o: Order) => o.id === orderId);
  if (!order) return;

  if (!isValidOrderStatus(newStatusStr)) {
    (window as any).showToast(`Invalid status: ${newStatusStr}`, 'error');
    return;
  }

  const newStatus: OrderStatus = newStatusStr as OrderStatus;

  // Use TypeScript canTransition type guard — mirrors backend OrderStatusTransitionValidator
  if (!canTransition(order.status, newStatus)) {
    (window as any).showToast(`Cannot change status from ${order.status} to ${newStatus}`, 'error');
    return;
  }

  order.status = newStatus;
  renderOrders((window as any).AppData.orders);
  (window as any).showToast(`Order ${order.number} updated to "${newStatus}"`);
  (window as any).initDashboard();
}

// ── CANCEL ORDER ──────────────────────────────────────────────
function cancelOrder(orderId: number): void {
  updateStatus(orderId, OrderStatus.Cancelled);
}

// ── SUBMIT NEW ORDER ──────────────────────────────────────────
function submitOrder(): void {
  const customerEl  = document.getElementById('order-customer') as HTMLInputElement;
  const productEl   = document.getElementById('order-product')  as HTMLSelectElement;
  const qtyEl       = document.getElementById('order-qty')      as HTMLInputElement;
  const errCustomer = document.getElementById('err-customer');
  const errProduct  = document.getElementById('err-product');
  const errQty      = document.getElementById('err-qty');

  const customer:  string = customerEl.value.trim();
  const productId: number = parseInt(productEl.value);
  const qty:       number = parseInt(qtyEl.value);

  // clear previous errors
  if (errCustomer) errCustomer.textContent = '';
  if (errProduct)  errProduct.textContent  = '';
  if (errQty)      errQty.textContent      = '';

  // validation with TypeScript strict types
  let valid = true;
  if (!customer)        { if (errCustomer) errCustomer.textContent = 'Customer name is required.'; valid = false; }
  if (!productId)       { if (errProduct)  errProduct.textContent  = 'Please select a product.';  valid = false; }
  if (!qty || qty < 1)  { if (errQty)      errQty.textContent      = 'Quantity must be at least 1.'; valid = false; }
  if (!valid) return;

  // stock check using typed InventoryItem
  const invItem: InventoryItem | undefined = (window as any).AppData.inventory
    .find((i: InventoryItem) => i.id === productId);

  if (invItem && invItem.qty < qty) {
    if (errQty) errQty.textContent = `Only ${invItem.qty} units available in stock.`;
    return;
  }

  // get price from selected option text
  const selectedText: string = productEl.options[productEl.selectedIndex].text;
  const price: number = parseFloat(selectedText.split('₹')[1]) || 0;

  // create typed Order object
  const newOrder: Order = {
    id:       (window as any).AppData.orders.length + 1,
    number:   `ORD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String((window as any).AppData.orders.length+1).padStart(3,'0')}`,
    customer,
    date:     new Date().toISOString().slice(0,10),
    items:    qty,
    total:    price * qty,
    status:   OrderStatus.Pending
  };

  (window as any).AppData.orders.unshift(newOrder);

  // deduct stock
  if (invItem) invItem.qty -= qty;

  (window as any).closeModal('order-modal');
  (window as any).showToast(`Order ${newOrder.number} placed successfully!`);

  // reset form
  customerEl.value = ''; productEl.value = ''; qtyEl.value = '1';

  renderOrders((window as any).AppData.orders);
  (window as any).initDashboard();
}

// ── EXPOSE GLOBALS ────────────────────────────────────────────
(window as any).renderOrders  = renderOrders;
(window as any).filterOrders  = filterOrders;
(window as any).updateStatus  = updateStatus;
(window as any).cancelOrder   = cancelOrder;
(window as any).submitOrder   = submitOrder;
