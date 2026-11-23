import React, { useMemo, useCallback } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../../lib/queryClient.ts";
import { CartProvider, useCart, MAX_CART_LIMIT } from "../../context/CartContext.tsx";
import type { CartItem } from "../../context/CartContext.tsx";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Sparkles } from "lucide-react";

// ---------------------------------------------------------------------------
// Memoized Item Card — only re-renders when THIS item's own props change
// ---------------------------------------------------------------------------
interface CartItemRowProps {
  item: CartItem;
  canIncrement: boolean;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}

const CartItemRow = React.memo(function CartItemRow({
  item,
  canIncrement,
  onUpdateQty,
  onRemove,
}: CartItemRowProps) {
  const itemImage =
    item.image ||
    (item.serviceImages && item.serviceImages[0]) ||
    item.img;
  const qty = item.qty || 1;
  const lineTotal = (item.price || 0) * qty;

  return (
    <div className="w-full flex items-start gap-4 sm:gap-5 p-4 sm:p-5 rounded-DEFAULT bg-[#F4F4F5] border border-[#E4E4E7] hover:border-[#D4D4D8] transition-colors shadow-xs">
      {/* Thumbnail */}
      {itemImage ? (
        <img
          src={itemImage}
          alt={item.name}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-DEFAULT object-cover border border-[#E4E4E7] shrink-0 bg-[#E4E4E7]/40"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-DEFAULT bg-[#E4E4E7]/60 border border-[#E4E4E7] flex items-center justify-center shrink-0 text-[#71717A]">
          <Sparkles className="w-6 h-6 text-[#71717A]" />
        </div>
      )}

      {/* Info + controls */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm sm:text-base font-semibold text-[#18181B] leading-snug">
              {item.name}
            </h3>
            {item.selectedOptions && item.selectedOptions.length > 0 && (
              <p className="text-xs text-[#71717A]">
                {item.selectedOptions
                  .map((o: any) => o.featureName || o.name)
                  .join(", ")}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-[#71717A] pt-0.5">
              {item.time && <span>{item.time}</span>}
              {item.time && item.categoryRaw && <span>•</span>}
              {item.categoryRaw && (
                <span className="truncate">{item.categoryRaw}</span>
              )}
            </div>
          </div>

          {/* Delete button — top-right with Lucide trash icon */}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            title="Remove from cart"
            className="shrink-0 w-8 h-8 rounded-full bg-[#FFFFFF] border border-[#E4E4E7] flex items-center justify-center text-[#71717A] hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors shadow-xs cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom row: qty stepper + line price */}
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-[#E4E4E7]/80">
          {/* Qty stepper — pill pattern with clean spacing */}
          <div className="flex items-center gap-2 bg-[#FFFFFF] border border-[#E4E4E7] rounded-full p-1">
            <button
              type="button"
              onClick={() => onUpdateQty(item.id, qty - 1)}
              className="w-7 h-7 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center text-[#18181B] hover:bg-[#eaeaea] transition-colors cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center text-xs font-semibold text-[#18181B]">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => onUpdateQty(item.id, qty + 1)}
              disabled={!canIncrement}
              className="w-7 h-7 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center text-[#18181B] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#eaeaea] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Line total */}
          <span className="text-sm sm:text-base font-semibold text-[#18181B]">
            ₹{lineTotal}
          </span>
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Inner component — consumes CartProvider
// ---------------------------------------------------------------------------
function CartPageContent() {
  const { items, removeItem, updateQty, totalAmount, totalMinutes, totalCount } =
    useCart();

  const handleUpdateQty = useCallback(
    (id: string, newQty: number) => {
      updateQty(id, newQty);
    },
    [updateQty]
  );

  const handleRemove = useCallback(
    (id: string) => {
      removeItem(id);
    },
    [removeItem]
  );

  // Duration text
  const durationText = useMemo(() => {
    const mins = totalMinutes > 0 ? totalMinutes : 0;
    if (mins === 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h} hr${h > 1 ? "s" : ""}${m > 0 ? ` ${m} min` : ""}`;
    return `${m} min`;
  }, [totalMinutes]);

  return (
    <div className="bg-[#F4F4F5] font-body-md text-[#18181B] antialiased min-h-screen">
      <main className="w-full pt-8 md:pt-14 pb-24 bg-[#F4F4F5] min-h-[calc(100vh-5rem)] mt-[2rem]">
        <div className="max-w-[1380px] mx-auto px-6 md:px-12 py-6 w-full">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-[#71717A] mb-4">
            <a
              href="/book/services"
              className="hover:text-[#18181B] transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-4" />
              <span>Services</span>
            </a>
            <span>/</span>
            <span className="text-[#18181B] font-medium">Cart</span>
          </div>

          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="font-headline-hero-mobile md:font-headline-hero text-2xl md:text-3xl text-[#18181B] tracking-tight">
                Your Cart
              </h1>
              <p className="text-xs sm:text-sm text-[#71717A] mt-1.5">
                {totalCount > 0
                  ? `${totalCount} service${totalCount > 1 ? "s" : ""} selected`
                  : "No services added yet"}
              </p>
            </div>
          </div>

          {/* Body */}
          {items.length === 0 ? (
            /* ── Empty State ── */
            <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-DEFAULT shadow-sm flex flex-col items-center justify-center gap-4 py-20 px-6 text-center">
              <div className="w-14 h-14 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-[#71717A]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#18181B]">
                  Your cart is empty
                </p>
                <p className="text-xs text-[#71717A] mt-1 max-w-xs mx-auto">
                  Browse our treatments and add your favourites to begin
                  booking.
                </p>
              </div>
              <a
                href="/book/services"
                className="mt-2 px-5 py-2.5 rounded-full bg-[#333333] text-white text-xs font-medium uppercase tracking-wider hover:bg-[#18181B] transition-colors"
              >
                Explore Services
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* ── LEFT: Cart Items ── */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-DEFAULT shadow-sm overflow-hidden">
                  {/* Card header */}
                  <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-[#E4E4E7]">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-[#71717A] font-medium">
                        Services
                      </span>
                      <h2 className="text-base text-[#18181B] mt-0.5">
                        Selected ({totalCount})
                      </h2>
                    </div>
                    <a
                      href="/book/services"
                      className="text-xs text-[#71717A] hover:text-[#18181B] underline transition-colors"
                    >
                      Add More
                    </a>
                  </div>

                  {/* Item list with clean spacing */}
                  <div className="p-5 sm:p-7 space-y-4 sm:space-y-5 flex flex-col gap-4 sm:gap-5">
                    {items.map((item) => (
                      <CartItemRow
                        key={item.id}
                        item={item}
                        canIncrement={(item.qty || 1) < MAX_CART_LIMIT && totalCount < MAX_CART_LIMIT}
                        onUpdateQty={handleUpdateQty}
                        onRemove={handleRemove}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* ── RIGHT: Order Summary ── */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-DEFAULT p-5 sm:p-7 shadow-sm flex flex-col gap-5">
                  {/* Header */}
                  <div className="pb-3 border-b border-[#E4E4E7]">
                    <span className="text-xs uppercase tracking-wider text-[#71717A] font-medium">
                      Summary
                    </span>
                    <h3 className="text-base text-[#18181B] mt-0.5">
                      Order Total
                    </h3>
                  </div>

                  {/* Per-item breakdown */}
                  <div className="space-y-2.5">
                    {items.map((item, idx) => {
                      const qty = item.qty || 1;
                      return (
                        <div
                          key={`sum-${item.id}-${idx}`}
                          className="flex items-center justify-between text-xs text-[#71717A]"
                        >
                          <span className="truncate max-w-[65%]">
                            {item.name}
                            {qty > 1 && (
                              <span className="ml-1 text-[#A1A1AA]">
                                ×{qty}
                              </span>
                            )}
                          </span>
                          <span className="font-medium text-[#18181B] shrink-0">
                            ₹{(item.price || 0) * qty}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Duration */}
                  {durationText && (
                    <div className="flex justify-between text-xs text-[#71717A] pt-2 border-t border-[#E4E4E7]">
                      <span>Est. Duration</span>
                      <span className="font-medium text-[#18181B]">
                        {durationText}
                      </span>
                    </div>
                  )}

                  {/* Grand total */}
                  <div className="pt-3 border-t border-[#E4E4E7] flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-[#71717A] font-medium">
                      Total
                    </span>
                    <span className="text-lg font-semibold text-[#18181B]">
                      ₹{totalAmount}
                    </span>
                  </div>

                  {/* CTA */}
                  <a
                    href="/book/appointment"
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-[#333333] hover:bg-[#18181B] text-white text-xs font-semibold uppercase tracking-wider transition-colors active:scale-95"
                  >
                    Book Appointment
                  </a>
                  <a
                    href="/book/services"
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-transparent hover:bg-[#F4F4F5] text-[#71717A] hover:text-[#18181B] text-xs font-medium uppercase tracking-wider transition-colors text-center"
                  >
                    <Plus className="w-4" /> Add More Services
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default export — wraps with providers (matches DateTimeSlotPicker pattern)
// ---------------------------------------------------------------------------
export default function CartPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <CartPageContent />
      </CartProvider>
    </QueryClientProvider>
  );
}
