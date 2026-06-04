/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ShoppingBag, Trash2, ArrowRight, Loader2, Info } from "lucide-react";
import { CartItem, Order } from "../types";
import { placeOrder } from "../firebase";

interface CartDrawerProps {
  cart: CartItem[];
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onOrderSuccess: (order: Order) => void;
  onClose?: () => void;
}

export default function CartDrawer({ cart, onRemoveItem, onClearCart, onOrderSuccess, onClose }: CartDrawerProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalAmount = cart.reduce((acc, item) => acc + item.totalPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    if (!customerName.trim()) {
      setErrorMsg("請輸入訂購人姓名");
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMsg("請輸入聯絡電話");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // Direct call to transactional placeOrder
      const newOrder = await placeOrder(
        customerName.trim(),
        customerPhone.trim(),
        customerNote.trim(),
        cart.map(({ id, ...rest }) => rest), // pass without unique client cart id
        totalAmount
      );
      
      // Clean up local selections and report success
      onClearCart();
      onOrderSuccess(newOrder);
      if (onClose) onClose();
    } catch (err) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("訂單提交失敗，請檢查庫存或稍後再試！");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-sm p-6 border-2 border-slate-200 shadow-sm flex flex-col h-full h-stretch min-h-[500px] select-none">
      {/* Title */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-200 mb-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
          <ShoppingBag className="w-4 h-4 text-emerald-600" />
          Shopping Cart 
          <span className="font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-sm text-slate-600 font-bold">
            {cart.length}
          </span>
        </h3>
        
        {cart.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            className="text-[10px] font-bold uppercase text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" /> Clear Cart
          </button>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
          <span className="text-4xl mb-3">🧺</span>
          <p className="font-bold text-slate-500 uppercase tracking-wider text-xs">Your Cart is Empty</p>
          <p className="text-[10px] text-slate-400 mt-1 max-w-[180px]">Please select item to customize and add to your order.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between space-y-5">
          {/* Cart list items */}
          <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-sm bg-slate-50 border border-slate-150 transition-all hover:bg-white"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-800">{item.name}</h4>
                  <div className="flex flex-wrap gap-1.5 mt-1 text-[9px] font-bold uppercase tracking-wider">
                    <span className="bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-sm">
                      {item.size} Size
                    </span>
                    <span className="bg-slate-100 text-slate-650 border border-slate-200 px-1.5 py-0.5 rounded-sm">
                      {item.ice}
                    </span>
                    <span className="bg-slate-100 text-slate-650 border border-slate-200 px-1.5 py-0.5 rounded-sm">
                      {item.sweetness}
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-250 border-emerald-200 px-1.5 py-0.5 rounded-sm font-mono">
                      x{item.quantity}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-xs text-slate-800">${item.totalPrice}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    className="p-1 rounded-sm border border-slate-200 hover:border-rose-450 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Form user info inputs */}
          <div className="space-y-2.5 pt-3 border-t border-slate-200">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer Details 填寫資訊與自取備註</h4>
            
            <div className="space-y-2 text-slate-800">
              <div>
                <input
                  type="text"
                  placeholder="訂購人姓名 (例如：王大明)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-sm border-2 border-slate-200 text-xs focus:outline-hidden focus:border-slate-800 transition-colors placeholder:text-slate-450 font-medium"
                  required
                />
              </div>

              <div>
                <input
                  type="tel"
                  placeholder="聯絡電話 / 手機 (例如：0912345678)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-sm border-2 border-slate-200 text-xs focus:outline-hidden focus:border-slate-800 transition-colors placeholder:text-slate-450 font-medium"
                  required
                />
              </div>

              <div>
                <textarea
                  placeholder="備註說明 (自取時間、發票發行載具...)"
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-sm border-2 border-slate-200 text-xs focus:outline-hidden focus:border-slate-800 transition-colors placeholder:text-slate-450 font-medium resize-none h-14"
                />
              </div>
            </div>
          </div>

          {/* Error and Checkout processing button */}
          <div className="space-y-2.5 pt-2">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-sm text-xs flex items-start gap-2">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="font-bold leading-normal">{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total amount / 總付款額</span>
              <span className="text-xl font-bold text-emerald-600 font-mono">${totalAmount}</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-sm font-bold text-xs uppercase tracking-wider border transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                isSubmitting
                  ? "bg-slate-300 border-slate-350 text-slate-500 cursor-not-allowed"
                  : "bg-slate-900 hover:bg-emerald-600 border-slate-900 hover:border-emerald-600 text-white"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing Transaction...
                </>
              ) : (
                <>
                  Checkout Order 送出茶飲點單
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
