// ============================================================
//  SmartMart Retail Solutions
//  TypeScript Interfaces — User Story 7: Type-Safe Frontend
//  All domain models, enums, type guards, and transitions
// ============================================================

// ── ORDER STATUS ENUM ─────────────────────────────────────────
export enum OrderStatus {
  Pending    = 'Pending',
  Confirmed  = 'Confirmed',
  Processing = 'Processing',
  Shipped    = 'Shipped',
  Delivered  = 'Delivered',
  Cancelled  = 'Cancelled'
}

// ── ORDER INTERFACES ──────────────────────────────────────────
export interface OrderItem {
  id:          number;
  orderId:     number;
  productId:   number;
  productName?: string;
  quantity:    number;
  unitPrice:   number;
  lineTotal:   number;  // quantity * unitPrice
}

export interface Order {
  id:       number;
  number:   string;
  customer: string;
  date:     string;
  items:    number;
  total:    number;
  status:   OrderStatus;
  notes?:   string;
}

export interface NewOrderRequest {
  customer:  string;
  productId: number;
  quantity:  number;
  notes?:    string;
}

// ── INVENTORY INTERFACES ──────────────────────────────────────
export interface InventoryItem {
  id:       number;
  name:     string;
  sku:      string;
  category: string;
  qty:      number;
  reorder:  number;
}

export interface StockAdjustmentRequest {
  productId:  number;
  adjType:    'add' | 'remove';
  quantity:   number;
  reason:     string;
}

// ── PRODUCT INTERFACES ────────────────────────────────────────
export interface Product {
  id:       number;
  name:     string;
  sku:      string;
  category: string;
  price:    number;
}

// ── DASHBOARD INTERFACES ──────────────────────────────────────
export interface DashboardKPIs {
  totalOrdersToday: number;
  revenueToday:     number;
  lowStockAlerts:   number;
  pendingOrders:    number;
}

// ── APP DATA STORE ────────────────────────────────────────────
export interface AppDataStore {
  orders:    Order[];
  inventory: InventoryItem[];
  products:  Product[];
}

// ── API RESPONSE WRAPPER ──────────────────────────────────────
export interface ApiResponse<T> {
  success:  boolean;
  data?:    T;
  error?:   string;
  message?: string;
}

// ── TYPE GUARDS ───────────────────────────────────────────────
export function isValidOrderStatus(status: string): status is OrderStatus {
  return Object.values(OrderStatus).includes(status as OrderStatus);
}

export function isLowStock(item: InventoryItem): boolean {
  return item.qty <= item.reorder;
}

export function isCriticalStock(item: InventoryItem): boolean {
  return item.qty <= 5;
}

export function isOrder(obj: unknown): obj is Order {
  return (
    typeof obj === 'object' && obj !== null &&
    'id' in obj && 'number' in obj && 'status' in obj
  );
}

// ── VALID STATUS TRANSITIONS ──────────────────────────────────
export const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.Pending]:    [OrderStatus.Confirmed,  OrderStatus.Cancelled],
  [OrderStatus.Confirmed]:  [OrderStatus.Processing, OrderStatus.Cancelled],
  [OrderStatus.Processing]: [OrderStatus.Shipped,    OrderStatus.Cancelled],
  [OrderStatus.Shipped]:    [OrderStatus.Delivered],
  [OrderStatus.Delivered]:  [],
  [OrderStatus.Cancelled]:  [],
};

export function canTransition(current: OrderStatus, next: OrderStatus): boolean {
  return validTransitions[current]?.includes(next) ?? false;
}

// ── STOCK STATUS HELPER ───────────────────────────────────────
export type StockStatus = 'Critical' | 'Low' | 'OK';

export function getStockStatus(item: InventoryItem): StockStatus {
  if (isCriticalStock(item)) return 'Critical';
  if (isLowStock(item))      return 'Low';
  return 'OK';
}
