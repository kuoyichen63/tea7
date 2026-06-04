/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Sparkles, Ban } from "lucide-react";
import { Drink } from "../types";

interface DrinkCardProps {
  key?: React.Key | string | number;
  drink: Drink;
  onSelect: (drink: Drink) => void;
}

export default function DrinkCard({ drink, onSelect }: DrinkCardProps) {
  const isSoldOut = drink.stock <= 0;
  const isLowStock = drink.stock > 0 && drink.stock < 10;

  // Let's analyze if the item has specific accents
  const isSpecial = drink.name === "莓好時光" || drink.name === "青森蘋果雪沙";

  return (
    <div
      id={`drink-card-${drink.id}`}
      onClick={() => !isSoldOut && onSelect(drink)}
      className={`group cursor-pointer border-2 p-5 flex flex-col items-center justify-between gap-3 transition-all duration-300 rounded-sm select-none ${
        isSoldOut
          ? "border-dashed border-slate-200 bg-slate-50/50 opacity-60 cursor-not-allowed"
          : isSpecial
            ? "border-emerald-500 bg-emerald-50/15 hover:border-emerald-600 hover:bg-emerald-50/30"
            : "border-slate-100 hover:border-emerald-500 hover:bg-emerald-50/20 bg-white"
      }`}
    >
      {/* Dynamic Handcrafted Tea Cup Graphic - Geometric Balance Style */}
      <div className="w-24 h-24 bg-slate-50/80 flex items-center justify-center rounded-sm border border-slate-200 mb-1 relative overflow-hidden group-hover:bg-white transition-colors duration-300">
        {isSoldOut ? (
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase text-slate-400 bg-slate-100/60 tracking-wider">
            SOLD OUT
          </span>
        ) : isLowStock ? (
          <span className="absolute top-1 right-1 bg-rose-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-xs animate-pulse">
            LOW
          </span>
        ) : isSpecial ? (
          <span className="absolute top-1 right-1 bg-emerald-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-xs">
            HOT
          </span>
        ) : (
          <span className="absolute top-1 right-1 text-[10px] font-mono text-slate-400">
            #{drink.stock}
          </span>
        )}

        {/* Minimalist illustration cup with level lines and straw */}
        <div className="w-10 h-14 border-2 border-slate-450 rounded-b-lg relative flex items-end justify-center overflow-hidden border-slate-400">
          {/* Liquidor tea level */}
          <div className={`absolute left-0 right-0 h-[65%] transition-all duration-500 ${
            drink.name.includes("莓") 
              ? "bg-rose-100/85" 
              : drink.name.includes("蘋果") 
                ? "bg-amber-100/80" 
                : drink.name.includes("鳳梨") 
                  ? "bg-yellow-100/90" 
                  : "bg-emerald-100/80"
          }`}></div>
          
          {/* Boba inside cup if milk tea/specialty */}
          {!drink.name.includes("冰茶") && (
            <div className="absolute bottom-1.5 flex gap-0.5 z-10 justify-center w-full">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
            </div>
          )}

          {/* Ice / Hot symbol inside cup */}
          <div className="absolute top-2 w-full text-[10px] text-center font-bold text-slate-350 pointer-events-none uppercase">
            {drink.name.includes("雪沙") ? "ICE" : "TEA"}
          </div>
        </div>
      </div>

      {/* Title & Customization Note */}
      <div className="text-center w-full">
        <h3 className="font-bold text-sm text-slate-800 tracking-tight flex items-center justify-center gap-1">
          {drink.name}
          {isSpecial && <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />}
        </h3>
        <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">
          {drink.category} · 鮮萃現泡
        </p>
      </div>

      {/* Pricing and Action */}
      <div className="w-full mt-2 pt-2 border-t border-dashed border-slate-200/50 flex items-center justify-between">
        <div className="flex flex-col text-left">
          {drink.priceM && (
            <span className="text-[10px] text-slate-400 font-mono">
              M: ${drink.priceM}
            </span>
          )}
          <span className="text-sm font-mono text-emerald-600 font-bold text-lg">
            ${drink.priceL} <span className="text-[9px] text-slate-400 font-normal">L</span>
          </span>
        </div>

        {!isSoldOut ? (
          <button
            id={`btn-select-${drink.id}`}
            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 border border-slate-200 rounded-sm hover:border-emerald-500 hover:bg-emerald-600 hover:text-white transition-all bg-slate-50/50 text-slate-650"
          >
            Select
          </button>
        ) : (
          <span className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">
            Sold Out
          </span>
        )}
      </div>
    </div>
  );
}
