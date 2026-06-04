/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Search, Compass, CheckCircle2, Clock, PlayCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Order, OrderStatus } from "../types";

interface OrderLookupProps {
  recentOrdersList: Order[];
}

export default function OrderLookup({ recentOrdersList }: OrderLookupProps) {
  const [phoneSearch, setPhoneSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Order[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Get locally recorded order IDs placed by this user during this session
  const [localPlacedOrderIds, setLocalPlacedOrderIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("my_placed_order_ids");
    if (saved) {
      try {
        setLocalPlacedOrderIds(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, [recentOrdersList]); // reload whenever order list updates

  // Dynamic filter for active tracking items
  const myTrackedOrders = recentOrdersList.filter(o => localPlacedOrderIds.includes(o.id));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneSearch.trim()) return;

    const queryStr = phoneSearch.trim();
    // Search the orders matching either phone number or customer name
    const matches = recentOrdersList.filter(
      (o) => o.customerPhone.includes(queryStr) || o.customerName.includes(queryStr) || o.orderNumber.toLowerCase().includes(queryStr.toLowerCase())
    );
    setSearchResults(matches);
    setHasSearched(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return (
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2 py-1 rounded-sm font-bold uppercase tracking-wider">
            <Clock className="w-3 h-3" /> PENDING
          </span>
        );
      case OrderStatus.PREPARING:
        return (
          <span className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-700 border border-sky-200 text-[10px] px-2 py-1 rounded-sm font-bold animate-pulse uppercase tracking-wider">
            <PlayCircle className="w-3 h-3" /> PREPARING
          </span>
        );
      case OrderStatus.COMPLETED:
        return (
          <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-[10px] px-2 py-1 rounded-sm font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-3 h-3" /> READY
          </span>
        );
      case OrderStatus.CANCELLED:
        return (
          <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-500 border border-slate-200 text-[10px] px-2 py-1 rounded-sm font-bold uppercase tracking-wider">
            <XCircle className="w-3 h-3" /> CANCELLED
          </span>
        );
    }
  };

  const statusProgressWidth = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return "w-1/3";
      case OrderStatus.PREPARING: return "w-2/3";
      case OrderStatus.COMPLETED: return "w-full";
      case OrderStatus.CANCELLED: return "w-full bg-slate-300";
      default: return "w-0";
    }
  };

  const renderOrderCard = (order: Order) => {
    const isExpanded = expandedOrders[order.id];
    const formattedTime = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = new Date(order.createdAt).toLocaleDateString([], { month: '2-digit', day: '2-digit' });

    return (
      <div key={order.id} className="bg-white border-2 border-slate-200 rounded-sm p-4.5 space-y-3.5 hover:shadow-xs transition-shadow">
        
        {/* Header inside card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-250 border-slate-200 px-2 py-0.5 rounded-sm uppercase tracking-wide">
              NO. {order.orderNumber}
            </span>
            <span className="text-[11px] text-slate-400 font-mono font-medium">
              {formattedDate} {formattedTime}
            </span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="font-mono font-bold text-slate-800 text-sm">TOTAL: ${order.totalAmount}</span>
            {getStatusBadge(order.status)}
          </div>
        </div>

        {/* Real-time Order workflow diagram */}
        {order.status !== OrderStatus.CANCELLED && (
          <div className="space-y-1.5 py-0.5">
            <div className="relative w-full h-1 bg-slate-100 rounded-xs overflow-hidden">
              <div className={`h-full bg-slate-900 transition-all duration-700 ${statusProgressWidth(order.status)}`}></div>
            </div>
            
            <div className="flex justify-between text-[9px] font-bold text-slate-400 font-sans tracking-wider uppercase px-0.5 select-none">
              <span className={order.status === OrderStatus.PENDING ? "text-slate-900 font-extrabold" : "text-slate-400"}>1. Pending</span>
              <span className={order.status === OrderStatus.PREPARING ? "text-emerald-600 font-extrabold" : "text-slate-400"}>2. Preparing</span>
              <span className={order.status === OrderStatus.COMPLETED ? "text-emerald-700 font-extrabold" : "text-slate-400"}>3. Enjoy Tea</span>
            </div>
          </div>
        )}

        {/* Toggle Details button */}
        <div>
          <button
            type="button"
            onClick={() => toggleExpand(order.id)}
            className="w-full py-1.5 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-sm border border-slate-200 flex items-center justify-center gap-1 transition-colors hover:bg-slate-100 cursor-pointer uppercase tracking-wider"
          >
            {isExpanded ? (
              <>
                Hide Details <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Show Items ({order.items.reduce((acc, c) => acc + c.quantity, 0)} Pcs) <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Order Details segment */}
        {isExpanded && (
          <div className="bg-slate-50/55 rounded-sm p-3 border border-slate-250 border-slate-200 text-xs space-y-2.5">
            <div className="space-y-1.5">
              {order.items.map((item, id) => (
                <div key={id} className="flex justify-between text-xs text-slate-700 pb-1.5 border-b border-dashed border-slate-200 last:border-0 last:pb-0">
                  <div>
                    <span className="font-bold text-slate-950">{item.name}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">
                      ({item.size} Size | {item.ice} | {item.sweetness})
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-600">x{item.quantity}  ${item.totalPrice}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 text-[10px] uppercase tracking-wider grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-500 border-t border-slate-200 select-none font-bold">
              <div>
                <span className="text-slate-400">Name:</span> {order.customerName}
              </div>
              <div>
                <span className="text-slate-400">Phone:</span> {order.customerPhone}
              </div>
              {order.customerNote && (
                <div className="col-span-1 sm:col-span-2 normal-case font-medium text-slate-600">
                  <span className="font-bold text-slate-400 uppercase">Note:</span> {order.customerNote}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    );
  };

  return (
    <div className="space-y-5 select-none">
      
      {/* Real-time Current Orders tracking */}
      <div className="space-y-3.5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-emerald-500 animate-pulse" />
          Live Orders Tracker 訂單進度
        </h3>

        {myTrackedOrders.length === 0 ? (
          <div className="p-6 rounded-sm bg-slate-50 border-2 border-dashed border-slate-200 text-center text-slate-400">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">No Active Orders Found</p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto">Your placed orders will automatically be updated and tracked here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myTrackedOrders.map(o => renderOrderCard(o))}
          </div>
        )}
      </div>

      {/* Query/Search Segment */}
      <div className="bg-slate-50 border-2 border-slate-200 rounded-sm p-4.5 space-y-3">
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Search Order Order History</h4>
          <p className="text-[10px] text-slate-400 mt-0.5">Enter Name, Phone or Order number to inquiry records.</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="姓名 / 手機 / 單號..."
            value={phoneSearch}
            onChange={(e) => setPhoneSearch(e.target.value)}
            className="flex-1 px-3 py-2 rounded-sm border-2 border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-hidden focus:border-slate-800 placeholder:text-slate-400"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer border border-slate-900 transition-colors"
          >
            <Search className="w-3 h-3" /> Go
          </button>
        </form>

        {hasSearched && (
          <div className="space-y-2.5 pt-1.5 border-t border-slate-200">
            <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-0.5">
              Search Results / 搜尋結果 ({searchResults.length})
            </h5>
            
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                No orders matched your search criteria.
              </div>
            ) : (
              <div className="space-y-2.5">
                {searchResults.map(o => renderOrderCard(o))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
