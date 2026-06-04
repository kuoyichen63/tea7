/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Drink {
  id: string;
  name: string;
  priceM: number | null;
  priceL: number;
  stock: number;
  category: string;
}

export interface CartItem {
  id: string; // unique item id in cart (e.g., drinkId + size + ice + sweetness)
  drinkId: string;
  name: string;
  size: "M" | "L";
  ice: string;
  sweetness: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export enum OrderStatus {
  PENDING = "pending", // 待處理
  PREPARING = "preparing", // 製作中
  COMPLETED = "completed", // 已完成
  CANCELLED = "cancelled" // 已取消
}

export interface Order {
  id: string;
  orderNumber: string; // E.g., #1001
  customerName: string;
  customerPhone: string;
  customerNote?: string;
  items: Omit<CartItem, "id">[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: number; // TS or serialised date
  updatedAt: number;
}

export interface AdminConfig {
  passwordHash: string; // Simple check since we are running without auth
}

export type IceLevel = "正常冰" | "少冰" | "微冰" | "去冰" | "溫熱";
export type SweetnessLevel = "正常甜" | "少糖" | "半糖" | "微糖" | "無糖";
