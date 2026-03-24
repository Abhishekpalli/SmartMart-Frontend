export declare enum OrderStatus {
    Pending = "Pending",
    Confirmed = "Confirmed",
    Processing = "Processing",
    Shipped = "Shipped",
    Delivered = "Delivered",
    Cancelled = "Cancelled"
}
export interface OrderItem {
    id: number;
    orderId: number;
    productId: number;
    productName?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}
export interface Order {
    id: number;
    number: string;
    customer: string;
    date: string;
    items: number;
    total: number;
    status: OrderStatus;
    notes?: string;
}
export interface NewOrderRequest {
    customer: string;
    productId: number;
    quantity: number;
    notes?: string;
}
export interface InventoryItem {
    id: number;
    name: string;
    sku: string;
    category: string;
    qty: number;
    reorder: number;
}
export interface StockAdjustmentRequest {
    productId: number;
    adjType: 'add' | 'remove';
    quantity: number;
    reason: string;
}
export interface Product {
    id: number;
    name: string;
    sku: string;
    category: string;
    price: number;
}
export interface DashboardKPIs {
    totalOrdersToday: number;
    revenueToday: number;
    lowStockAlerts: number;
    pendingOrders: number;
}
export interface AppDataStore {
    orders: Order[];
    inventory: InventoryItem[];
    products: Product[];
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export declare function isValidOrderStatus(status: string): status is OrderStatus;
export declare function isLowStock(item: InventoryItem): boolean;
export declare function isCriticalStock(item: InventoryItem): boolean;
export declare function isOrder(obj: unknown): obj is Order;
export declare const validTransitions: Record<OrderStatus, OrderStatus[]>;
export declare function canTransition(current: OrderStatus, next: OrderStatus): boolean;
export type StockStatus = 'Critical' | 'Low' | 'OK';
export declare function getStockStatus(item: InventoryItem): StockStatus;
//# sourceMappingURL=interfaces.d.ts.map