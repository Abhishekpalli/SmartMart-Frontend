// ============================================================
//  SmartMart Retail Solutions
//  TypeScript Interfaces — User Story 7: Type-Safe Frontend
//  All domain models, enums, type guards, and transitions
// ============================================================
// ── ORDER STATUS ENUM ─────────────────────────────────────────
export var OrderStatus;
(function (OrderStatus) {
    OrderStatus["Pending"] = "Pending";
    OrderStatus["Confirmed"] = "Confirmed";
    OrderStatus["Processing"] = "Processing";
    OrderStatus["Shipped"] = "Shipped";
    OrderStatus["Delivered"] = "Delivered";
    OrderStatus["Cancelled"] = "Cancelled";
})(OrderStatus || (OrderStatus = {}));
// ── TYPE GUARDS ───────────────────────────────────────────────
export function isValidOrderStatus(status) {
    return Object.values(OrderStatus).includes(status);
}
export function isLowStock(item) {
    return item.qty <= item.reorder;
}
export function isCriticalStock(item) {
    return item.qty <= 5;
}
export function isOrder(obj) {
    return (typeof obj === 'object' && obj !== null &&
        'id' in obj && 'number' in obj && 'status' in obj);
}
// ── VALID STATUS TRANSITIONS ──────────────────────────────────
export const validTransitions = {
    [OrderStatus.Pending]: [OrderStatus.Confirmed, OrderStatus.Cancelled],
    [OrderStatus.Confirmed]: [OrderStatus.Processing, OrderStatus.Cancelled],
    [OrderStatus.Processing]: [OrderStatus.Shipped, OrderStatus.Cancelled],
    [OrderStatus.Shipped]: [OrderStatus.Delivered],
    [OrderStatus.Delivered]: [],
    [OrderStatus.Cancelled]: [],
};
export function canTransition(current, next) {
    return validTransitions[current]?.includes(next) ?? false;
}
export function getStockStatus(item) {
    if (isCriticalStock(item))
        return 'Critical';
    if (isLowStock(item))
        return 'Low';
    return 'OK';
}
//# sourceMappingURL=interfaces.js.map