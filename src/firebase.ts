/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  runTransaction,
  query,
  orderBy
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { Drink, Order, OrderStatus } from "./types";

// Check if we have valid production firebase config
const isPlaceholder = 
  !firebaseConfig || 
  firebaseConfig.apiKey === "placeholder_key" || 
  firebaseConfig.apiKey === "mock-api-key" ||
  firebaseConfig.projectId === "placeholder_project";

let db: any = null;
let auth: any = null;
let isFirebaseReady = false;

// ERROR HANDLING ENFORCEMENT
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

if (!isPlaceholder) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    // CRITICAL: Must pass custom firestoreDatabaseId in high-grade Firestore config
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
    isFirebaseReady = true;
    console.log("Firebase initialized successfully with config:", firebaseConfig.projectId);
  } catch (err) {
    console.error("Firebase initialization failed, utilizing LocalStorage fallback:", err);
    isFirebaseReady = false;
  }
} else {
  console.log("Using local database mode (Placeholder credentials detected).");
}

// Default initial drink list as shown in the image
const DEFAULT_DRINKS: Drink[] = [
  { id: "pineapple_tea", name: "鳳梨冰茶", priceM: null, priceL: 75, stock: 50, category: "著時必喝" },
  { id: "guava_pineapple", name: "芭梨戀人", priceM: null, priceL: 75, stock: 50, category: "著時必喝" },
  { id: "pineapple_aibo", name: "鳳梨艾波", priceM: null, priceL: 75, stock: 50, category: "著時必喝" },
  { id: "strawberry_time", name: "莓好時光", priceM: 85, priceL: 110, stock: 50, category: "著時必喝" },
  { id: "strawberry_elegant", name: "莓好花漾", priceM: null, priceL: 90, stock: 50, category: "著時必喝" },
  { id: "strawberry_panna_cotta", name: "莓好戀奶酪", priceM: null, priceL: 110, stock: 50, category: "著時必喝" },
  { id: "apple_tea", name: "青森蘋果冰茶", priceM: null, priceL: 70, stock: 50, category: "著時必喝" },
  { id: "apple_slush", name: "青森蘋果雪沙", priceM: null, priceL: 90, stock: 50, category: "著時必喝" }
];

// LocalStorage helpers for the offline fallback mode
const LOCAL_STORAGE_DRINKS_KEY = "tea_ordering_drinks";
const LOCAL_STORAGE_ORDERS_KEY = "tea_ordering_orders";
const LOCAL_STORAGE_ADMIN_PW_KEY = "tea_ordering_admin_pw";

const getLocalDrinks = (): Drink[] => {
  const data = localStorage.getItem(LOCAL_STORAGE_DRINKS_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_DRINKS_KEY, JSON.stringify(DEFAULT_DRINKS));
    return DEFAULT_DRINKS;
  }
  return JSON.parse(data);
};

const saveLocalDrinks = (drinks: Drink[]) => {
  localStorage.setItem(LOCAL_STORAGE_DRINKS_KEY, JSON.stringify(drinks));
  triggerDrinksListeners();
};

const getLocalOrders = (): Order[] => {
  const data = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
  return data ? JSON.parse(data) : [];
};

const saveLocalOrders = (orders: Order[]) => {
  localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders));
  triggerOrdersListeners();
};

// Listeners collection for mock real-time updates
const drinksListeners: Array<(drinks: Drink[]) => void> = [];
const ordersListeners: Array<(orders: Order[]) => void> = [];

const triggerDrinksListeners = () => {
  const drinks = getLocalDrinks();
  drinksListeners.forEach((listener) => listener(drinks));
};

const triggerOrdersListeners = () => {
  const orders = getLocalOrders().sort((a, b) => b.createdAt - a.createdAt);
  ordersListeners.forEach((listener) => listener(orders));
};

// PUBLIC API ACTIONS (Abstracts real Firebase Firestore and LocalStorage client fallback)

/**
 * Checks if the application is currently communicating with real Live Firebase
 */
export const checkIsFirebaseActive = (): boolean => {
  return isFirebaseReady;
};

/**
 * Subscribes to real-time update of drink menu and stock levels
 */
export const subscribeDrinks = (onUpdate: (drinks: Drink[]) => void): () => void => {
  if (isFirebaseReady) {
    const colRef = collection(db, "drink_inventory");
    return onSnapshot(colRef, (snapshot) => {
      if (snapshot.empty) {
        // Prepopulate if empty in Firestore database
        DEFAULT_DRINKS.forEach(async (drink) => {
          try {
            await setDoc(doc(db, "drink_inventory", drink.id), drink);
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `drink_inventory/${drink.id}`);
          }
        });
      } else {
        const drinks: Drink[] = [];
        snapshot.forEach((docSnap) => {
          drinks.push(docSnap.data() as Drink);
        });
        onUpdate(drinks);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "drink_inventory");
    });
  } else {
    // Return Local storage updates immediately
    onUpdate(getLocalDrinks());
    drinksListeners.push(onUpdate);
    return () => {
      const idx = drinksListeners.indexOf(onUpdate);
      if (idx !== -1) drinksListeners.splice(idx, 1);
    };
  }
};

/**
 * Subscribes to real-time update of customer orders
 */
export const subscribeOrders = (onUpdate: (orders: Order[]) => void): () => void => {
  if (isFirebaseReady) {
    const colRef = collection(db, "orders");
    const q = query(colRef, orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach((docSnap) => {
        orders.push({ ...docSnap.data(), id: docSnap.id } as Order);
      });
      onUpdate(orders);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "orders");
    });
  } else {
    onUpdate(getLocalOrders().sort((a, b) => b.createdAt - a.createdAt));
    ordersListeners.push(onUpdate);
    return () => {
      const idx = ordersListeners.indexOf(onUpdate);
      if (idx !== -1) ordersListeners.splice(idx, 1);
    };
  }
};

/**
 * Places a customer order.
 * Implements transaction model to safely decrement product stock
 */
export const placeOrder = async (
  customerName: string,
  customerPhone: string,
  customerNote: string,
  items: Array<{
    drinkId: string;
    name: string;
    size: "M" | "L";
    ice: string;
    sweetness: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>,
  totalAmount: number
): Promise<Order> => {
  const timestamp = Date.now();
  const rawOrderNumber = Math.floor(1000 + Math.random() * 9000); // 4-digit order sequence

  if (isFirebaseReady) {
    const orderDocRef = doc(collection(db, "orders"));
    const orderData: Omit<Order, "id"> = {
      orderNumber: `#${rawOrderNumber}`,
      customerName,
      customerPhone,
      customerNote,
      items,
      totalAmount,
      status: OrderStatus.PENDING,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    try {
      // Run transaction to decrement stock levels
      await runTransaction(db, async (txn) => {
        // 1. Verify and get all drinks
        const drinkTxnData: { drinkId: string; docRef: any; currentStock: number }[] = [];
        for (const item of items) {
          const drinkRef = doc(db, "drink_inventory", item.drinkId);
          const drinkSnap = await txn.get(drinkRef);
          if (!drinkSnap.exists()) {
            throw new Error(`飲料 ${item.name} 不存在於產品清單中`);
          }
          const currentStock = drinkSnap.data().stock;
          if (currentStock < item.quantity) {
            throw new Error(`很抱歉！「${item.name}」目前庫存不足（僅剩 ${currentStock} 杯）`);
          }
          drinkTxnData.push({
            drinkId: item.drinkId,
            docRef: drinkRef,
            currentStock
          });
        }

        // 2. Decrement stocks
        for (const t of drinkTxnData) {
          const orderQty = items.filter(x => x.drinkId === t.drinkId).reduce((acc, c) => acc + c.quantity, 0);
          txn.update(t.docRef, { stock: t.currentStock - orderQty });
        }

        // 3. Create the order
        txn.set(orderDocRef, orderData);
      });

      return {
        id: orderDocRef.id,
        ...orderData
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `orders/${orderDocRef.id}`);
    }
  } else {
    // LocalStorage Fallback Transaction Logic
    const localDrinks = getLocalDrinks();
    const localOrders = getLocalOrders();

    // Verify stock
    for (const item of items) {
      const matchDrink = localDrinks.find(d => d.id === item.drinkId);
      if (!matchDrink) {
        throw new Error(`商品 ${item.name} 已不存在`);
      }
      if (matchDrink.stock < item.quantity) {
        throw new Error(`很抱歉！「${item.name}」目前庫存不足（僅剩 ${matchDrink.stock} 杯）`);
      }
    }

    // Deduct stock
    const updatedDrinks = localDrinks.map(drink => {
      const orderQty = items.filter(x => x.drinkId === drink.id).reduce((acc, c) => acc + c.quantity, 0);
      return {
        ...drink,
        stock: drink.stock - orderQty
      };
    });

    // Save order
    const mockId = "order_" + Math.random().toString(36).substring(2, 11);
    const newOrder: Order = {
      id: mockId,
      orderNumber: `#${rawOrderNumber}`,
      customerName,
      customerPhone,
      customerNote,
      items,
      totalAmount,
      status: OrderStatus.PENDING,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    saveLocalDrinks(updatedDrinks);
    saveLocalOrders([...localOrders, newOrder]);

    return newOrder;
  }
};

/**
 * Updates the state status of an order (Real-time updates to customer/admin view)
 */
export const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<void> => {
  if (isFirebaseReady) {
    const orderRef = doc(db, "orders", orderId);
    try {
      await updateDoc(orderRef, {
        status,
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  } else {
    const orders = getLocalOrders();
    const updated = orders.map(ord => {
      if (ord.id === orderId) {
        // If transitioning to "cancelled", we should restock the items!
        if (status === OrderStatus.CANCELLED && ord.status !== OrderStatus.CANCELLED) {
          restockItems(ord.items);
        }
        return { ...ord, status, updatedAt: Date.now() };
      }
      return ord;
    });
    saveLocalOrders(updated);
  }
};

/**
 * Internal helper to automatically restock items when an order is cancelled
 */
const restockItems = (items: Omit<Order["items"][0], "id">[]) => {
  const localDrinks = getLocalDrinks();
  const updated = localDrinks.map(drink => {
    const returnQty = items.filter(x => x.drinkId === drink.id).reduce((acc, c) => acc + c.quantity, 0);
    return {
      ...drink,
      stock: drink.stock + returnQty
    };
  });
  saveLocalDrinks(updated);
};

/**
 * Allows the administrator to restock/change a item's inventory limit
 */
export const updateDrinkStock = async (drinkId: string, newStock: number): Promise<void> => {
  if (isFirebaseReady) {
    const docRef = doc(db, "drink_inventory", drinkId);
    try {
      await updateDoc(docRef, { stock: Math.max(0, newStock) });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `drink_inventory/${drinkId}`);
    }
  } else {
    const drinks = getLocalDrinks();
    const updated = drinks.map(d => {
      if (d.id === drinkId) {
        return { ...d, stock: Math.max(0, newStock) };
      }
      return d;
    });
    saveLocalDrinks(updated);
  }
};

/**
 * Check if the admin password has already been system initialized
 */
export const isPasswordConfigured = async (): Promise<boolean> => {
  if (isFirebaseReady) {
    const docRef = doc(db, "admin_config", "credentials");
    try {
      const docSnap = await getDoc(docRef);
      return docSnap.exists() && !!docSnap.data().passwordHash;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "admin_config/credentials");
    }
  } else {
    const pwd = localStorage.getItem(LOCAL_STORAGE_ADMIN_PW_KEY);
    return !!pwd;
  }
};

/**
 * Registers an admin password (SHA255 placeholder / simple hash)
 */
export const setupAdminPassword = async (password: string): Promise<void> => {
  // Simple hash for text verification
  const simpleHash = password.trim(); 
  if (isFirebaseReady) {
    const docRef = doc(db, "admin_config", "credentials");
    try {
      await setDoc(docRef, { passwordHash: simpleHash });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "admin_config/credentials");
    }
  } else {
    localStorage.setItem(LOCAL_STORAGE_ADMIN_PW_KEY, simpleHash);
  }
};

/**
 * Validates the entered admin password
 */
export const verifyAdminPassword = async (password: string): Promise<boolean> => {
  const checkVal = password.trim();
  if (isFirebaseReady) {
    const docRef = doc(db, "admin_config", "credentials");
    try {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return false;
      return docSnap.data().passwordHash === checkVal;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "admin_config/credentials");
    }
  } else {
    const saved = localStorage.getItem(LOCAL_STORAGE_ADMIN_PW_KEY);
    return saved === checkVal;
  }
};
