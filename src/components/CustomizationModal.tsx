/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { X, Plus, Minus, Flame, Snowflake, Check } from "lucide-react";
import { motion } from "motion/react";
import { Drink, CartItem, IceLevel, SweetnessLevel } from "../types";

interface CustomizationModalProps {
  drink: Drink | null;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

const ICE_LEVELS: IceLevel[] = ["正常冰", "少冰", "微冰", "去冰", "溫熱"];
const SWEET_LEVELS: SweetnessLevel[] = ["正常甜", "少糖", "半糖", "微糖", "無糖"];

export default function CustomizationModal({ drink, onClose, onAddToCart }: CustomizationModalProps) {
  if (!drink) return null;

  const [selectedSize, setSelectedSize] = useState<"M" | "L">("L");
  const [selectedIce, setSelectedIce] = useState<IceLevel>("少冰");
  const [selectedSweetness, setSelectedSweetness] = useState<SweetnessLevel>("半糖");
  const [quantity, setQuantity] = useState<number>(1);

  // If Medium size is not available, default to Large
  useEffect(() => {
    if (drink) {
      if (drink.priceM === null) {
        setSelectedSize("L");
      } else {
        setSelectedSize("M");
      }
      setQuantity(1);
    }
  }, [drink]);

  const currentPrice = selectedSize === "M" ? (drink.priceM || drink.priceL) : drink.priceL;
  const totalPrice = currentPrice * quantity;

  const handleIncrement = () => {
    if (quantity < drink.stock) {
      setQuantity(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleConfirm = () => {
    const cartItemId = `${drink.id}-${selectedSize}-${selectedIce}-${selectedSweetness}`;
    const cartItem: CartItem = {
      id: cartItemId,
      drinkId: drink.id,
      name: drink.name,
      size: selectedSize,
      ice: selectedIce,
      sweetness: selectedSweetness,
      quantity,
      unitPrice: currentPrice,
      totalPrice
    };
    onAddToCart(cartItem);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-lg bg-white rounded-sm shadow-xl overflow-hidden border border-slate-300 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4.5 border-b border-slate-200 bg-slate-50 select-none">
          <div>
            <h3 className="text-lg font-bold text-slate-800 tracking-wider uppercase">{drink.name}</h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">客製化您的健康配方 · Customize Recipe</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-800 border border-slate-200 hover:border-slate-400 rounded-sm transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Configurations content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
          
          {/* Capacity Size Selection */}
          {drink.priceM !== null && (
            <div className="space-y-2 select-none">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                杯型容量 / Size Selection
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSize("M")}
                  className={`flex flex-col items-center py-3 px-4 rounded-sm border-2 transition-all cursor-pointer ${
                    selectedSize === "M"
                      ? "border-emerald-600 bg-emerald-50/10 text-emerald-800"
                      : "border-slate-200 text-slate-650 hover:border-slate-300"
                  }`}
                >
                  <span className="text-xl mb-1 mt-0.5">🥤</span>
                  <span className="font-bold text-xs uppercase tracking-wider">中杯 M</span>
                  <span className="text-xs font-mono font-bold text-slate-500 mt-1">${drink.priceM}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSize("L")}
                  className={`flex flex-col items-center py-3 px-4 rounded-sm border-2 transition-all cursor-pointer ${
                    selectedSize === "L"
                      ? "border-emerald-600 bg-emerald-50/10 text-emerald-800"
                      : "border-slate-200 text-slate-650 hover:border-slate-300"
                  }`}
                >
                  <span className="text-xl mb-1 mt-0.5">🧋</span>
                  <span className="font-bold text-xs uppercase tracking-wider">大杯 L</span>
                  <span className="text-xs font-mono font-bold text-slate-500 mt-1">${drink.priceL}</span>
                </button>
              </div>
            </div>
          )}

          {/* Ice Temperature Levels */}
          <div className="space-y-2 select-none">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Snowflake className="w-3.5 h-3.5 text-sky-500" />
              冰度調整 / Temperature
            </label>
            <div className="flex flex-wrap gap-2">
              {ICE_LEVELS.map((ice) => {
                const isActive = selectedIce === ice;
                const isWarm = ice === "溫熱";
                return (
                  <button
                    key={ice}
                    type="button"
                    onClick={() => setSelectedIce(ice)}
                    className={`px-3 py-2 rounded-sm border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 bg-slate-50/50"
                    }`}
                  >
                    {isWarm && <Flame className="w-3 h-3 text-orange-400" />}
                    {ice}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sweetness Sweetness Levels */}
          <div className="space-y-2 select-none">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-emerald-500">🍬</span>
              甜度調整 / Sweetness
            </label>
            <div className="flex flex-wrap gap-2">
              {SWEET_LEVELS.map((sweet) => {
                const isActive = selectedSweetness === sweet;
                return (
                  <button
                    key={sweet}
                    type="button"
                    onClick={() => setSelectedSweetness(sweet)}
                    className={`px-3 py-2 rounded-sm border text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 text-slate-650 hover:border-slate-300 bg-slate-50/50"
                    }`}
                  >
                    {sweet}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-between py-3.5 border-t border-b border-slate-200 select-none">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">購買數量 / Quantity</span>
              <span className="text-[10px] text-slate-400 font-mono">在庫：{drink.stock} 杯</span>
            </div>
            
            <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-sm border border-slate-200">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={quantity <= 1}
                className={`p-1.5 rounded-sm transition-colors cursor-pointer ${
                  quantity <= 1 ? "text-slate-300 pointer-events-none" : "text-slate-600 hover:bg-white shadow-xs"
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              
              <span className="font-mono font-bold text-base w-6 text-center text-slate-800">{quantity}</span>
              
              <button
                type="button"
                onClick={handleIncrement}
                disabled={quantity >= drink.stock}
                className={`p-1.5 rounded-sm transition-colors cursor-pointer ${
                  quantity >= drink.stock ? "text-slate-300 pointer-events-none" : "text-slate-600 hover:bg-white shadow-xs"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between select-none">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">應付金額 Total Cup Price</span>
            <span className="text-xl font-bold text-emerald-600 font-mono">${totalPrice}</span>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-sm border border-slate-900 hover:border-emerald-600 transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" /> Add To Cart
          </button>
        </div>
      </motion.div>
    </div>
  );
}
