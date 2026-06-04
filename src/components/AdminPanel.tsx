/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Lock, 
  Key, 
  LayoutDashboard, 
  ClipboardList, 
  Warehouse, 
  TrendingUp, 
  X, 
  Loader2, 
  LogOut, 
  Plus, 
  Minus,
  RefreshCw,
  BellRing
} from "lucide-react";
import { Drink, Order, OrderStatus } from "../types";
import { 
  isPasswordConfigured, 
  setupAdminPassword, 
  verifyAdminPassword, 
  updateOrderStatus, 
  updateDrinkStock 
} from "../firebase";

interface AdminPanelProps {
  drinks: Drink[];
  orders: Order[];
}

export default function AdminPanel({ drinks, orders }: AdminPanelProps) {
  // Authentication states
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [setupPasswordInput, setSetupPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  
  // Verification loading and messages
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [prevOrdersCount, setPrevOrdersCount] = useState<number>(0);
  const [newOrderAlert, setNewOrderAlert] = useState<boolean>(false);

  // Active Admin Sub-tab
  const [activeTab, setActiveTab] = useState<"orders" | "inventory" | "reports">("orders");

  // Check state of security verification on load
  const checkDatabaseConfig = async () => {
    try {
      const configured = await isPasswordConfigured();
      setHasPassword(configured);
    } catch (e) {
      console.error("Config check failed", e);
      setHasPassword(false); // fallback to local storage format
    }
  };

  useEffect(() => {
    checkDatabaseConfig();
    const sessionAuth = sessionStorage.getItem("admin_session_active");
    if (sessionAuth === "true") {
      setIsAuthorized(true);
    }
  }, []);

  // Real-time sound notification when a new order lands
  useEffect(() => {
    if (isAuthorized && orders.length > 0) {
      if (prevOrdersCount > 0 && orders.length > prevOrdersCount) {
        // Find if the incoming is PENDING
        const latestOrder = orders[0];
        if (latestOrder && latestOrder.status === OrderStatus.PENDING) {
          setNewOrderAlert(true);
          // Try playing an elegant notification chime
          try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.connect(gain);
            gain.connect(context.destination);
            osc.frequency.setValueAtTime(587.33, context.currentTime); // D5
            gain.gain.setValueAtTime(0.08, context.currentTime);
            osc.start();
            osc.stop(context.currentTime + 0.15);
            
            setTimeout(() => {
              const osc2 = context.createOscillator();
              const gain2 = context.createGain();
              osc2.connect(gain2);
              gain2.connect(context.destination);
              osc2.frequency.setValueAtTime(880, context.currentTime); // A5
              gain2.gain.setValueAtTime(0.08, context.currentTime);
              osc2.start();
              osc2.stop(context.currentTime + 0.25);
            }, 180);
          } catch (e) {
            console.log("Audio notifier blocked by client browser autoplay permissions.");
          }
        }
      }
      setPrevOrdersCount(orders.length);
    } else {
      setPrevOrdersCount(orders.length);
    }
  }, [orders, isAuthorized]);

  // Handle first time password registrations
  const handleSetupPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (setupPasswordInput.length < 4) {
      setErrorMessage("管理者密碼至少需要 4 位字元！");
      return;
    }

    if (setupPasswordInput !== confirmPasswordInput) {
      setErrorMessage("兩次輸入的密碼不相同！");
      return;
    }

    setLoading(true);
    try {
      await setupAdminPassword(setupPasswordInput);
      setSuccessMessage("密碼初始化設定成功！請再次登入。");
      setHasPassword(true);
      setSetupPasswordInput("");
      setConfirmPasswordInput("");
    } catch (err) {
      setErrorMessage("密碼儲存失敗，請確認 Firebase 資料夾寫入授權。");
    } finally {
      setLoading(false);
    }
  };

  // Handle subsequent login credentials check
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const isValid = await verifyAdminPassword(passwordInput);
      if (isValid) {
        setIsAuthorized(true);
        sessionStorage.setItem("admin_session_active", "true");
        setPasswordInput("");
      } else {
        setErrorMessage("密碼輸入錯誤！請確認大小寫後重試。");
      }
    } catch (err) {
      setErrorMessage("連線失敗，請檢查網路連線狀態");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthorized(false);
    sessionStorage.removeItem("admin_session_active");
  };

  // Status transitions
  const handleNextStatus = async (orderId: string, current: OrderStatus) => {
    let next: OrderStatus = current;
    if (current === OrderStatus.PENDING) next = OrderStatus.PREPARING;
    else if (current === OrderStatus.PREPARING) next = OrderStatus.COMPLETED;
    
    setLoading(true);
    try {
      await updateOrderStatus(orderId, next);
    } catch (e) {
      alert("訂單狀態更新失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (confirm("是否確定取消此筆訂單？\n取消後庫存量將自動回補！")) {
      setLoading(true);
      try {
        await updateOrderStatus(orderId, OrderStatus.CANCELLED);
      } catch (e) {
        alert("訂單取消失敗");
      } finally {
        setLoading(false);
      }
    }
  };

  // Quick Restock Operations
  const handleAdjustStock = async (drinkId: string, current: number, delta: number) => {
    try {
      await updateDrinkStock(drinkId, Math.max(0, current + delta));
    } catch (e) {
      alert("商品庫存變更失敗");
    }
  };

  const handleFullRestockAll = async () => {
    if (confirm("是否將全品項（8 款飲料）庫存皆重置補滿至 100 杯？")) {
      setLoading(true);
      try {
        const promises = drinks.map(d => updateDrinkStock(d.id, 100));
        await Promise.all(promises);
        alert("全品項補滿成功！現正皆備有 100 杯產品量。");
      } catch (e) {
        alert("補庫存過程發生錯誤");
      } finally {
        setLoading(false);
      }
    }
  };

  // Analytics helper calculations
  const completedOrders = orders.filter(o => o.status === OrderStatus.COMPLETED);
  const totalRevenue = completedOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalCupsSold = completedOrders.reduce((acc, o) => 
    acc + o.items.reduce((sum, item) => sum + item.quantity, 0), 0
  );

  // Find Best Sellers (Sales quantity ranking)
  const getBestsellers = () => {
    const counts: Record<string, number> = {};
    drinks.forEach(d => { counts[d.name] = 0; });

    completedOrders.forEach(o => {
      o.items.forEach(item => {
        if (counts[item.name] !== undefined) {
          counts[item.name] += item.quantity;
        } else {
          counts[item.name] = item.quantity;
        }
      });
    });

    return Object.entries(counts)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);
  };

  const bestsellerList = getBestsellers();

  // AUTH UI STAGE 1: Not Authenticated State
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center p-6 bg-white border-2 border-slate-200 rounded-sm min-h-[450px] select-none">
        {hasPassword === null ? (
          <div className="flex flex-col items-center justify-center gap-2.5 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-slate-900" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Checking Firebase Admin Parameters...</p>
          </div>
        ) : !hasPassword ? (
          /* PASSWORD INITIALIZATION FORM */
          <form onSubmit={handleSetupPasswordSubmit} className="w-full max-w-sm space-y-5">
            <div className="text-center">
              <span className="inline-flex p-3 bg-red-50 text-red-600 rounded-sm border border-red-200 mb-3.5">
                <Key className="w-5 h-5 text-red-700" />
              </span>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Initialize Admin Passcode / 設定後台密碼</h3>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Configure a persistent code to secure the master inventory terminal.</p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-sm text-xs font-bold">
                {errorMessage}
              </div>
            )}

            <div className="space-y-3.5 text-slate-700">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">設定管理者密碼 (Passcode)</label>
                <input
                  type="password"
                  value={setupPasswordInput}
                  onChange={(e) => setSetupPasswordInput(e.target.value)}
                  placeholder="請自行設定管理者新密碼..."
                  className="w-full px-3 py-2 rounded-sm border-2 border-slate-200 text-xs focus:outline-hidden focus:border-slate-800"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">確認輸入密碼 (Confirm)</label>
                <input
                  type="password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="請再次輸入密碼以利核對..."
                  className="w-full px-3 py-2 rounded-sm border-2 border-slate-200 text-xs focus:outline-hidden focus:border-slate-800"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest rounded-sm border border-slate-900 hover:border-emerald-600 transition-colors cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              Create Admin Passcode 創建後台密碼
            </button>
          </form>
        ) : (
          /* RE-ENTER PASSWORD FOR LOGIN */
          <form onSubmit={handleLoginSubmit} className="w-full max-w-sm space-y-5">
            <div className="text-center">
              <span className="inline-flex p-3 bg-slate-50 border border-slate-200 text-slate-750 rounded-sm mb-3.5">
                <Lock className="w-5 h-5 text-slate-800" />
              </span>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Admin Passcode Validation 後台密碼核驗</h3>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Verification is required to modify menu setups or view sales charts.</p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-sm text-xs font-bold">
                {errorMessage}
              </div>
            )}
            
            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-xs font-bold">
                {successMessage}
              </div>
            )}

            <div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="通行密碼 Passcode"
                className="w-full px-4 py-3.5 rounded-sm border-2 border-slate-200 text-center text-sm font-black focus:outline-hidden focus:border-slate-800 tracking-widest placeholder:tracking-normal placeholder:font-medium text-slate-800 bg-slate-50/50"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest rounded-sm border border-slate-900 hover:border-emerald-600 transition-colors cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              Access Dashboard 驗證登入
            </button>
          </form>
        )}
      </div>
    );
  }

  // MAIN ADMIN CONSOLE UI (AUTHORIZED)
  return (
    <div className="space-y-5 select-none">
      
      {/* Top Console header & SubTabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-250">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <LayoutDashboard className="w-4 h-4 text-slate-900" />
            Admin Operations Panel / 商家後台管理
          </h3>
          <p className="text-[10.5px] text-slate-400 font-medium uppercase mt-0.5 tracking-wider">Real-time status updates & instant stock synchronization.</p>
        </div>

        {/* Hot Realtime Audio Notification Badge */}
        {newOrderAlert && (
          <div className="bg-slate-900 text-white text-[10px] uppercase tracking-wider font-bold border-l-4 border-emerald-500 px-3 py-1.5 rounded-sm flex items-center gap-1.5 animate-bounce">
            <BellRing className="w-3.5 h-3.5 text-emerald-400" /> NEW ORDER RECEIVED!
            <button onClick={() => setNewOrderAlert(false)} className="hover:text-emerald-300 p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Sub-tabs menu */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-sm border border-slate-200 self-start lg:self-center">
          <button
            type="button"
            onClick={() => { setActiveTab("orders"); setNewOrderAlert(false); }}
            className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === "orders" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Orders ({orders.filter(o => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED).length})
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === "inventory" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Warehouse className="w-3.5 h-3.5" />
            Inventory
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === "reports" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Reports
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 text-slate-450 hover:text-rose-600 rounded-sm hover:bg-slate-200/50 cursor-pointer"
            title="登出管理者模式"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}

      {/* A. REAL-TIME ORDERS PROCESSING TAB */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-0.5">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Culinary Slips (Pending / Processing)</h4>
            <span className="text-[10px] text-slate-400 font-mono font-bold flex items-center gap-1 uppercase tracking-widest">
              <RefreshCw className="w-3 h-3 animate-spin text-slate-400" /> Firestore Synced
            </span>
          </div>

          {orders.filter(o => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED).length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-sm text-slate-450 font-bold select-none">
              <span className="text-4xl">🍵</span>
              <p className="mt-2 text-xs uppercase tracking-wider text-slate-500">No active orders left in loop</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-[260px] mx-auto normal-case font-medium">When customers submit customizations, orders appear live instantly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders
                .filter(o => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED)
                .map((order) => {
                  const formattedTime = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const isPending = order.status === OrderStatus.PENDING;
                  return (
                    <div 
                      key={order.id} 
                      className={`rounded-sm p-4.5 border-2 bg-white flex flex-col justify-between transition-all ${
                        isPending 
                          ? "border-amber-400" 
                          : "border-slate-800"
                      }`}
                    >
                      <div>
                        {/* Upper Header info */}
                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                          <div>
                            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-sm font-mono uppercase tracking-wider">
                              SLIP NO. {order.orderNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-2 font-mono font-medium">{formattedTime}</span>
                          </div>
                          
                          <span className={`text-[9px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider border ${
                            isPending 
                              ? "bg-amber-50 text-amber-700 border-amber-200" 
                              : "bg-emerald-50 text-emerald-800 border-emerald-200 animate-pulse"
                          }`}>
                            {isPending ? "Pending 接單" : "Preparing 製作"}
                          </span>
                        </div>

                        {/* Customer data */}
                        <div className="py-2 text-[11px] font-medium text-slate-500 grid grid-cols-2 gap-1 uppercase tracking-wider select-none font-sans">
                          <div>
                            <span className="text-slate-400 font-bold">Cust:</span> {order.customerName}
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold">Tel:</span> {order.customerPhone}
                          </div>
                        </div>

                        {/* Order nested custom items */}
                        <div className="bg-slate-50 rounded-sm p-3 border border-slate-200 space-y-2 mt-2">
                          {order.items.map((item, id) => (
                            <div key={id} className="text-xs text-slate-700 flex justify-between pb-1.5 border-b border-dashed border-slate-200 last:border-0 last:pb-0">
                              <div>
                                <span className="font-bold text-slate-900">{item.name}</span>
                                <span className="text-[9px] text-slate-400 ml-1.5 font-bold uppercase tracking-wider">
                                  ({item.size} | {item.ice} | {item.sweetness})
                                </span>
                              </div>
                              <span className="font-mono font-bold text-slate-650">x{item.quantity} ${item.totalPrice}</span>
                            </div>
                          ))}
                        </div>

                        {order.customerNote && (
                          <div className="text-[10px] text-rose-600 bg-rose-50/40 p-2 rounded-sm mt-2 border border-rose-100/50 font-medium">
                            <strong>Note:</strong> {order.customerNote}
                          </div>
                        )}
                      </div>

                      {/* Control Trigger Area */}
                      <div className="mt-4.5 pt-3 border-t border-slate-200 flex gap-2">
                        {/* Cancel order and auto-restock */}
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(order.id)}
                          className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-450 hover:bg-rose-50/50 text-[10px] uppercase tracking-wide font-bold rounded-sm transition-colors cursor-pointer"
                        >
                          Cancel / 取消
                        </button>

                        {/* Progression action */}
                        <button
                          type="button"
                          onClick={() => handleNextStatus(order.id, order.status)}
                          className={`flex-1 py-2.5 border rounded-sm text-[10px] uppercase font-bold tracking-widest text-white transition-all cursor-pointer ${
                            isPending 
                              ? "bg-slate-900 border-slate-950 hover:bg-emerald-600 hover:border-emerald-600" 
                              : "bg-emerald-600 border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700"
                          }`}
                        >
                          {isPending ? "Confirm Order 確認接單" : "Mark Ready 製作完成"}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* HISTORIC ORDERS ARCHIVE LIST */}
          <div className="pt-5.5 border-t border-slate-200 space-y-2.5 font-sans">
            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">History Archive 歷史已結封存單據庫</h4>
            
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {orders
                .filter(o => o.status === OrderStatus.COMPLETED || o.status === OrderStatus.CANCELLED)
                .map(order => (
                  <div key={order.id} className="flex justify-between items-center p-3 rounded-sm bg-slate-50 border border-slate-200 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] font-bold bg-white border border-slate-200 px-1.5 py-0.5 rounded-sm">
                        SLIP {order.orderNumber}
                      </span>
                      <span className="font-medium text-[11px] text-slate-700">{order.customerName}（{order.items.reduce((acc, c) => acc + c.quantity, 0)} 杯）</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-slate-800">${order.totalAmount}</span>
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold border rounded-sm uppercase tracking-wider ${
                        order.status === OrderStatus.COMPLETED 
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        {order.status === OrderStatus.COMPLETED ? "Completed" : "Cancelled"}
                      </span>
                    </div>
                  </div>
                ))}

              {orders.filter(o => o.status === OrderStatus.COMPLETED || o.status === OrderStatus.CANCELLED).length === 0 && (
                <p className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3">No historic log found.</p>
              )}
            </div>
          </div>

        </div>
      )}

      {/* B. INVENTORY MONITORING & CONTROL TAB */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inventory Metrics & Master Controls</h4>
              <p className="text-[10px] text-slate-400 font-mono">STOCK OUT AUTOMATICALLY DISPENSES WARNING FILTERS AT CUSTOMER STOREFRONTS.</p>
            </div>

            <button
              type="button"
              onClick={handleFullRestockAll}
              className="px-4 py-2 bg-slate-900 border border-slate-950 hover:bg-emerald-600 hover:border-emerald-650 hover:border-emerald-600 text-white rounded-sm text-[10px] uppercase tracking-wider font-extrabold transition-colors cursor-pointer self-start sm:self-center"
            >
              Full Restock All (100) / 全品項補貨
            </button>
          </div>

          <div className="overflow-hidden border-2 border-slate-200 rounded-sm bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase font-sans border-b border-slate-200 select-none">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">Tea Selection (產品名稱)</th>
                    <th scope="col" className="px-6 py-3.5">Retail Price (售價)</th>
                    <th scope="col" className="px-6 py-3.5 text-center">In Stock (在庫量)</th>
                    <th scope="col" className="px-6 py-3.5">Status (販售狀態)</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Adjustment Operation (實體盤點進貨)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-sans font-medium text-slate-800">
                  {drinks.map((drink) => {
                    const isSoldOut = drink.stock <= 0;
                    const isLowStock = drink.stock > 0 && drink.stock < 10;
                    return (
                      <tr key={drink.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3.5 font-bold text-slate-900">{drink.name}</td>
                        <td className="px-6 py-3.5 text-slate-500 font-bold font-mono">${drink.priceL}</td>
                        <td className="px-6 py-3.5 text-center font-bold font-mono">{drink.stock}</td>
                        <td className="px-6 py-3.5">
                          {isSoldOut ? (
                            <span className="inline-flex px-1.5 py-0.5 bg-red-100 text-red-800 text-[9px] font-extrabold border border-red-200 rounded-sm uppercase tracking-wide">
                              Sold Out 售完
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex px-1.5 py-0.5 bg-amber-55 text-white bg-amber-500 text-[9px] font-extrabold rounded-sm uppercase tracking-wide animate-pulse">
                              Low Stock 警戒
                            </span>
                          ) : (
                            <span className="inline-flex px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold border border-emerald-200 rounded-sm uppercase tracking-wide">
                              In Supply 供應
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1 rounded-sm border border-slate-200 select-none">
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(drink.id, drink.stock, -1)}
                              className="p-1 hover:bg-white rounded-sm text-slate-500 cursor-pointer border border-transparent hover:border-slate-250 transition-colors"
                              title="扣除 1 杯"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(drink.id, drink.stock, 1)}
                              className="p-1 hover:bg-white rounded-sm text-slate-500 cursor-pointer border border-transparent hover:border-slate-250 transition-colors"
                              title="加入 1 杯"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(drink.id, drink.stock, 10)}
                              className="px-1.5 py-0.5 hover:bg-white rounded-sm text-[9px] font-extrabold text-slate-755 border border-transparent hover:border-slate-250 cursor-pointer transition-colors"
                              title="進貨 10 杯"
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(drink.id, drink.stock, 50)}
                              className="px-1.5 py-0.5 hover:bg-white rounded-sm text-[9px] font-extrabold text-slate-755 border border-transparent hover:border-slate-250 cursor-pointer transition-colors"
                              title="進貨 50 杯"
                            >
                              +50
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* C. MANAGEMENT REPORTS & COFFEE SALES TAB */}
      {activeTab === "reports" && (
        <div className="space-y-5">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Turnover Metrics & Operational Ledger</h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans uppercase tracking-wider">
            {/* Stat Card 1 */}
            <div className="p-4 bg-white border-2 border-slate-200 rounded-sm relative overflow-hidden select-none">
              <span className="text-[10px] font-bold block text-slate-400">Total Profit / 營業總額</span>
              <span className="text-2xl font-bold font-mono mt-1 block text-slate-900">${totalRevenue}</span>
              <span className="text-[9px] text-slate-400 font-bold block mt-1.5 font-sans">Accumulated sales cashflow</span>
            </div>

            {/* Stat Card 2 */}
            <div className="p-4 bg-white border-2 border-slate-200 rounded-sm relative overflow-hidden select-none">
              <span className="text-[10px] font-bold block text-slate-400">Total volume / 累計銷售數</span>
              <span className="text-2xl font-bold font-mono mt-1 block text-emerald-600">{totalCupsSold} Cups</span>
              <span className="text-[9px] text-slate-400 font-bold block mt-1.5 font-sans">Total customized portion cups</span>
            </div>

            {/* Stat Card 3 */}
            <div className="p-4 bg-white border-2 border-slate-200 rounded-sm relative overflow-hidden select-none">
              <span className="text-[10px] font-bold block text-slate-400">Leader Rank / 熱銷冠軍</span>
              <span className="text-xs font-bold mt-1.5 block text-slate-900 truncate">
                {bestsellerList[0] && bestsellerList[0].qty > 0 ? bestsellerList[0].name : "N/A Pending"}
              </span>
              <span className="text-[9px] text-emerald-700 font-bold block mt-1">
                {bestsellerList[0] && bestsellerList[0].qty > 0 ? `Sold: ${bestsellerList[0].qty} Cups` : "—"}
              </span>
            </div>
          </div>

          {/* Leaderboard ranking chart */}
          <div className="bg-white border-2 border-slate-200 p-4.5 rounded-sm space-y-4">
            <div>
              <h5 className="text-xs font-bold uppercase tracking-widest text-slate-400">Cup Sales Rankings Chart / 鮮果特調排行榜</h5>
              <p className="text-[10px] text-slate-400 mt-0.5 select-none font-mono">AUTOMATIC CALCULATION COMPILED DIRECTLY FROM CONFIRMED TRANSACTS.</p>
            </div>

            <div className="space-y-3">
              {bestsellerList.map((item, idx) => {
                const maxQty = bestsellerList[0] ? (bestsellerList[0].qty || 1) : 1;
                // calculate width ratio
                const percentage = Math.max(6, Math.min(100, (item.qty / maxQty) * 100));
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                      <span className="text-slate-800 flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-4.5 h-4.5 bg-slate-900 text-[10px] font-bold text-white rounded-sm">
                          {idx + 1}
                        </span>
                        {item.name}
                      </span>
                      <span className="font-bold text-slate-900 font-mono">{item.qty} Pcs</span>
                    </div>

                    <div className="relative w-full h-2 bg-slate-100 rounded-sm overflow-hidden border border-slate-200/50">
                      <div 
                        style={{ width: `${percentage}%` }}
                        className={`h-full rounded-sm transition-all duration-500 uppercase ${
                          idx === 0 
                            ? "bg-slate-900" 
                            : idx === 1 
                              ? "bg-emerald-600" 
                              : idx === 2 
                                ? "bg-emerald-500/80"
                                : "bg-slate-400"
                        }`}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
