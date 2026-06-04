/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  Settings, 
  HelpCircle, 
  Compass, 
  Check, 
  FileText, 
  Info,
  Clock,
  Sparkles,
  RefreshCw,
  X
} from "lucide-react";

import { Drink, CartItem, Order, OrderStatus } from "./types";
import { subscribeDrinks, subscribeOrders, checkIsFirebaseActive } from "./firebase";

import DrinkCard from "./components/DrinkCard";
import CustomizationModal from "./components/CustomizationModal";
import CartDrawer from "./components/CartDrawer";
import OrderLookup from "./components/OrderLookup";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  // Global Realtime States of products & orders
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isFirebaseLoaded, setIsFirebaseLoaded] = useState(false);

  // Client Interface Selections
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState<"menu" | "cart" | "lookup" | "admin">("menu");

  // Visual success alert state
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);

  // Subscribe to core data collections from firebase.ts
  useEffect(() => {
    // 1. Subscribe to beverage menu & stock
    const unsubscribeDrinks = subscribeDrinks((updatedDrinks) => {
      setDrinks(updatedDrinks);
    });

    // 2. Subscribe to order logs
    const unsubscribeOrders = subscribeOrders((updatedOrders) => {
      setOrders(updatedOrders);
    });

    // Determine if we are on live active Firebase or local fallback
    setIsFirebaseLoaded(checkIsFirebaseActive());

    return () => {
      unsubscribeDrinks();
      unsubscribeOrders();
    };
  }, []);

  // Sync client cart with local storage to prevent loss on reload
  useEffect(() => {
    const savedCart = localStorage.getItem("tea_customer_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Cart retrieval failed", e);
      }
    }
  }, []);

  const saveCartToLocalStorage = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem("tea_customer_cart", JSON.stringify(newCart));
  };

  // Cart operations
  const handleAddToCart = (item: CartItem) => {
    const existingIndex = cart.findIndex(c => c.id === item.id);
    let updatedCart = [...cart];

    const targetDrink = drinks.find(d => d.id === item.drinkId);
    if (!targetDrink) return;

    if (existingIndex !== -1) {
      // Check if consolidated quantity exceeds stock
      const newQty = updatedCart[existingIndex].quantity + item.quantity;
      if (newQty > targetDrink.stock) {
        alert(`無法加入！購物車累計數量 (${newQty}杯) 已超過該商品目前剩餘庫存 (${targetDrink.stock}杯)`);
        return;
      }
      updatedCart[existingIndex].quantity = newQty;
      updatedCart[existingIndex].totalPrice = updatedCart[existingIndex].quantity * item.unitPrice;
    } else {
      updatedCart.push(item);
    }

    saveCartToLocalStorage(updatedCart);
    setSelectedDrink(null); // close customization modal
    
    // Quick soft alert feedback inside viewport
    const banner = document.getElementById("cart-notification-banner");
    if (banner) {
      banner.classList.remove("hidden", "opacity-0");
      banner.classList.add("opacity-100");
      setTimeout(() => {
        banner.classList.remove("opacity-100");
        banner.classList.add("opacity-0", "hidden");
      }, 2500);
    }
  };

  const handleRemoveFromCart = (id: string) => {
    const filtered = cart.filter(c => c.id !== id);
    saveCartToLocalStorage(filtered);
  };

  const handleClearCart = () => {
    saveCartToLocalStorage([]);
  };

  const handleOrderSuccess = (order: Order) => {
    setLastPlacedOrder(order);
    
    // Add placed Order ID to local browser session storage so lookups tracking finds it automatically
    const savedIds = localStorage.getItem("my_placed_order_ids") || "[]";
    try {
      const parsed = JSON.parse(savedIds);
      parsed.push(order.id);
      localStorage.setItem("my_placed_order_ids", JSON.stringify(parsed));
    } catch (e) {
      console.error(e);
    }
    
    // Move layout tab to track status
    setActiveTab("lookup");
  };

  const activeCategory = "著時必喝";

  return (
    <div className="min-h-screen bg-[#fdfdfd] text-slate-800 font-sans leading-relaxed flex flex-col justify-between">
      
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 px-6 sm:px-8 py-4 flex items-center justify-between shrink-0 shadow-lg select-none">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-emerald-500 rounded-sm flex items-center justify-center font-bold text-lg italic text-slate-900">
            T
          </div>
          <div>
            <h1 className="text-xl font-light tracking-widest uppercase flex items-center gap-1.5 font-sans">
              TeaFlow <span className="font-bold text-emerald-400">System</span>
              <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
            </h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">即時點單與庫存連動系統</p>
          </div>
        </div>

        {/* Database connection active banner */}
        <div className="flex items-center gap-6 text-sm font-medium">
          <div className={`hidden sm:flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-sm border ${
            isFirebaseLoaded 
              ? "bg-slate-800 text-emerald-400 border-emerald-800/40" 
              : "bg-slate-800 text-slate-400 border-slate-700"
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isFirebaseLoaded ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
            }`}></span>
            <span>{isFirebaseLoaded ? "Firebase Connected" : "Local Standby Mode"}</span>
          </div>

          <div className="hidden sm:block h-4 w-px bg-slate-700"></div>

          <button
            onClick={() => setActiveTab(activeTab === "admin" ? "menu" : "admin")}
            className={`px-4 py-1.5 rounded-sm text-xs font-bold border transition-colors cursor-pointer tracking-wider ${
              activeTab === "admin"
                ? "bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700"
                : "bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200"
            }`}
          >
            {activeTab === "admin" ? "返回前台" : "Admin Console"}
          </button>
        </div>
      </header>

      {/* 2. Main Layout Shell */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Dynamic Cart Soft Notification Toast */}
        <div 
          id="cart-notification-banner"
          className="hidden opacity-0 fixed top-20 right-4 z-50 bg-slate-900 text-white font-bold text-xs px-5 py-3 rounded-sm shadow-xl flex items-center gap-2 transition-all duration-300 border border-slate-700"
        >
          <span className="text-sm text-emerald-400">⚡</span>
          已加入購物車，快進行結帳囉！
        </div>

        {/* Global Banner: Order Placing Success Feedback */}
        {lastPlacedOrder && (
          <div className="mb-6 p-5 bg-emerald-50/50 border border-emerald-300 rounded-sm text-emerald-900 space-y-2 relative overflow-hidden shadow-xs animate-fadeIn">
            <button
              onClick={() => setLastPlacedOrder(null)}
              className="absolute top-4 right-4 text-emerald-600 hover:text-emerald-800 p-1 rounded-sm cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎉</span>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-slate-900 uppercase tracking-wider">恭喜！您的茶飲訂單已成功送出</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  單號為 <span className="font-mono bg-emerald-100 px-2 py-0.5 rounded text-emerald-800 font-bold">{lastPlacedOrder.orderNumber}</span>，現正為您製作中。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Responsive Layout Division on Big Screens vs Small Tabs */}
        {/* Desktop View Sidebar/Tab system */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-8">
          
          {/* Menu area: grid-cols-8 */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-250 border-slate-200 pb-4">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                Tea Selection
                <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 text-xs rounded-sm border border-slate-200 font-bold tracking-widest uppercase">
                  {activeCategory}
                </span>
              </h2>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("menu")}
                  className={`px-4 py-2 border rounded-sm text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    activeTab === "menu"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Pure Tea & Specials
                </button>
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {drinks.map((drink) => (
                <DrinkCard
                  key={drink.id}
                  drink={drink}
                  onSelect={(d) => setSelectedDrink(d)}
                />
              ))}
              
              {drinks.length === 0 && (
                <div className="col-span-3 py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-sm">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-350 mb-3" />
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">正在載入即時鮮萃菜單中...</p>
                </div>
              )}
            </div>
          </div>

          {/* Checkout & Actions sidebar: grid-cols-4 */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex gap-1 p-1 bg-slate-100 rounded-sm border border-slate-200">
              <button
                onClick={() => { if (activeTab === "admin") setActiveTab("menu"); }}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all outline-hidden cursor-pointer rounded-xs ${
                  activeTab !== "lookup" && activeTab !== "admin" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                1. Current Cart ({cart.length})
              </button>
              <button
                onClick={() => { setActiveTab("lookup"); }}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all outline-hidden cursor-pointer rounded-xs ${
                  activeTab === "lookup" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                2. Live Tracker
              </button>
            </div>

            {/* Conditional Views in side drawer */}
            {activeTab === "admin" ? (
              <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm">
                <div className="flex justify-between items-center pb-4 border-b border-slate-200 mb-5">
                  <h4 className="font-bold text-slate-800 tracking-wider uppercase text-sm">Console Control</h4>
                  <button onClick={() => setActiveTab("menu")} className="text-xs font-bold text-slate-400 hover:text-slate-650 cursor-pointer border border-slate-200 px-2 py-1 rounded" style={{color: '#94a3b8'}}>Return</button>
                </div>
                <AdminPanel drinks={drinks} orders={orders} />
              </div>
            ) : activeTab === "lookup" ? (
              <OrderLookup recentOrdersList={orders} />
            ) : (
              <CartDrawer
                cart={cart}
                onRemoveItem={handleRemoveFromCart}
                onClearCart={handleClearCart}
                onOrderSuccess={handleOrderSuccess}
              />
            )}
          </div>

        </div>

        {/* Mobile View with responsive bottom-tabs or top-tabs */}
        <div className="lg:hidden space-y-6">
          {/* Mobile subtabs select bar */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-sm text-[11px] sm:text-xs border border-slate-200">
            <button
              onClick={() => setActiveTab("menu")}
              className={`py-3 rounded-sm font-bold tracking-wider transition-all cursor-pointer ${
                activeTab === "menu" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
              }`}
            >
              著時茶單
            </button>
            <button
              onClick={() => setActiveTab("cart")}
              className={`py-3 rounded-sm font-bold tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === "cart" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
              }`}
            >
              購物車 ({cart.length})
            </button>
            <button
              onClick={() => setActiveTab("lookup")}
              className={`py-3 rounded-sm font-bold tracking-wider transition-all cursor-pointer ${
                activeTab === "lookup" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
              }`}
            >
              進度查詢
            </button>
            <button
              onClick={() => setActiveTab("admin")}
              className={`py-3 rounded-sm font-bold tracking-wider transition-all cursor-pointer ${
                activeTab === "admin" ? "bg-slate-900 text-white shadow-xs" : "text-slate-500"
              }`}
            >
              商家後台
            </button>
          </div>

          {/* Content displays based on tab selections */}
          {activeTab === "menu" && (
            <div className="space-y-4 animate-fadeIn">
              <h2 className="text-base font-bold text-slate-900 tracking-wider flex items-center gap-2">
                著時精選特調 
                <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wider">
                  {activeCategory}
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {drinks.map((drink) => (
                  <DrinkCard
                    key={drink.id}
                    drink={drink}
                    onSelect={(d) => setSelectedDrink(d)}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === "cart" && (
            <div className="animate-fadeIn">
              <CartDrawer
                cart={cart}
                onRemoveItem={handleRemoveFromCart}
                onClearCart={handleClearCart}
                onOrderSuccess={handleOrderSuccess}
              />
            </div>
          )}

          {activeTab === "lookup" && (
            <div className="animate-fadeIn">
              <OrderLookup recentOrdersList={orders} />
            </div>
          )}

          {activeTab === "admin" && (
            <div className="animate-fadeIn">
              <AdminPanel drinks={drinks} orders={orders} />
            </div>
          )}
        </div>

      </main>

      {/* 3. Customizations Floating Context Overlay Drawer */}
      {selectedDrink && (
        <CustomizationModal
          drink={selectedDrink}
          onClose={() => setSelectedDrink(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* 4. Humble professional footer */}
      <footer className="bg-slate-100 border-t border-slate-200 py-6 px-8 text-[10px] font-medium text-slate-500 uppercase tracking-widest flex flex-col sm:flex-row items-center justify-between gap-2 mt-12 select-none">
        <span>© 著時必喝 Real-Time Tea Ordering System</span>
        <div className="flex gap-4">
          <span>Station: Counter_01</span>
          <span>Last Sync: Just now</span>
        </div>
      </footer>

    </div>
  );
}
