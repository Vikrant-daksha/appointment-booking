import React, { useState, useEffect } from "react";
import { CartProvider, useCart } from "../../context/CartContext.tsx";
import { apiFetch } from "../../lib/api.ts";
import { zodEnv } from "../../lib/zodEnv.ts";
import type { PublicShop } from "../../types/booking.ts";
import { ArrowRight, ShoppingBag } from "lucide-react";

export interface BookingDrawerProps {
  initialShopName?: string;
  onProceedToBooking?: () => void;
}

function BookingDrawerContent({
  initialShopName,
  onProceedToBooking,
}: BookingDrawerProps) {
  const { items, removeItem, totalAmount, totalMinutes, totalCount } =
    useCart();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shopName, setShopName] = useState<string>(initialShopName || "");

  // Load shop name if not provided
  useEffect(() => {
    if (initialShopName) {
      setShopName(initialShopName);
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const res = await apiFetch(`${zodEnv.BACKEND_URL}/admin/shop`);
        if (res.ok) {
          const json = await res.json();
          const loadedShop: PublicShop = json.shop ?? json.data ?? json;
          if (isMounted && loadedShop?.shopName) {
            setShopName(loadedShop.shopName);
          }
        }
      } catch (e) {
        // Silently fallback
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [initialShopName]);

  // If cart is empty, do not show drawer or modal
  if (!items || items.length === 0) {
    return null;
  }

  const firstItem = items[0];
  const otherCount = items.length - 1;
  const titlesSummary =
    items.length === 1
      ? firstItem.name
      : `${firstItem.name} & ${otherCount} other${otherCount > 1 ? "s" : ""}`;

  return (
    <>
      {/* STICKY BOTTOM CART DRAWER SUMMARY / FLOATING BAR */}
      <div
        id="booking-drawer"
        className="fixed bottom-6 inset-x-0 mx-auto max-w-[880px] px-4 sm:px-6 z-40 transition-transform duration-300 translate-y-0"
      >
        <div className="rounded-full p-2.5 sm:p-3 shadow-lg flex items-center justify-between gap-4 backdrop-blur-md bg-[#FFFFFF] border border-[#E4E4E7]">
          <div
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-3 pl-2 sm:pl-3 min-w-0 cursor-pointer hover:opacity-90 transition-opacity"
            title="Click to review itinerary"
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-full shrink-0 bg-[#F4F4F5] border border-[#E4E4E7]">
              <span className="material-symbols-outlined text-[20px] text-[#1b1b1e]">
                <ShoppingBag className="w-4" />
              </span>
              <span
                id="drawer-badge"
                className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-semibold text-[#ffffff] bg-[#333333]"
              >
                {totalCount}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  id="drawer-titles"
                  className="text-xs font-medium truncate max-w-[180px] sm:max-w-[280px] text-[#1b1b1e]"
                >
                  {titlesSummary}
                </span>
              </div>
              <p className="text-[11px] text-[#747878]">
                <span id="drawer-duration">{totalMinutes} mins total</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0 pr-1">
            <div className="text-right">
              <span className="block text-[10px] uppercase tracking-wider text-[#747878]">
                Total
              </span>
              <span
                id="drawer-total"
                className="font-title-md text-title-md font-semibold text-[#1b1b1e]"
              >
                ₹{totalAmount}
              </span>
            </div>
            <button
              id="open-cart-modal"
              type="button"
              onClick={() => {
                if (onProceedToBooking) {
                  onProceedToBooking();
                } else {
                  window.location.href = "/book/appointment";
                }
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[#ffffff] text-xs font-medium tracking-wide transition-colors shadow-sm bg-[#333333] hover:bg-[#1e1e1e]"
            >
              <span>Book</span>
              <span className="material-symbols-outlined text-[15px]">
                <ArrowRight className="w-4" />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* CART DETAILS MODAL OVERLAY */}
      {isModalOpen && (
        <div
          id="cart-modal"
          className="fixed inset-0 z-50 bg-[#1b1b1e]/40 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            id="cart-modal-content"
            className="bg-[#FFFFFF] rounded-lg max-w-lg w-full p-6 sm:p-7 shadow-xl space-y-5 relative transform transition-transform duration-300 border border-[#E4E4E7]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E7]">
              <div>
                <h3 className="font-headline-section text-headline-section text-[#1b1b1e]">
                  Your Cart
                </h3>
              </div>
              <button
                id="close-cart-modal"
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center text-[#1b1b1e] hover:bg-[#E4E4E7] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            {/* Item sequence */}
            <div
              id="cart-item-list"
              className="space-y-2.5 max-h-64 overflow-y-auto pr-1"
            >
              {items.length === 0 ? (
                <p className="text-xs text-[#747878] py-4 text-center">
                  No services selected yet.
                </p>
              ) : (
                items.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className="flex items-center justify-between p-3 bg-[#F4F4F5] rounded-DEFAULT border border-[#E4E4E7]"
                  >
                    <div className="min-w-0 pr-3">
                      <h4 className="text-sm font-medium text-[#1b1b1e] truncate">
                        {item.name}
                        {item.qty && item.qty > 1 && (
                          <span className="ml-1.5 text-xs text-[#747878]">
                            x{item.qty}
                          </span>
                        )}
                      </h4>
                      {item.selectedOptions &&
                        item.selectedOptions.length > 0 && (
                          <p className="text-[11px] text-[#747878] truncate">
                            {item.selectedOptions
                              .map((o: any) => o.featureName || o.name)
                              .join(", ")}
                          </p>
                        )}
                      <span className="text-xs text-[#747878]">
                        {item.time} • {item.priceDisplay || `₹${item.price}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-[#747878] hover:text-[#ba1a1a] transition-colors p-1"
                      title="Remove item"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        delete
                      </span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="bg-[#F4F4F5] rounded-DEFAULT p-4 space-y-2 border border-[#E4E4E7]">
              <div className="flex justify-between text-xs text-[#444748]">
                <span>Services Subtotal</span>
                <span
                  id="modal-subtotal"
                  className="font-medium text-[#1b1b1e]"
                >
                  ₹{totalAmount}
                </span>
              </div>

              <div className="pt-4 border-t border-[#E4E4E7] flex justify-between text-sm font-medium text-[#1b1b1e]">
                <span>Total Investment</span>
                <span id="modal-total" className="font-semibold text-base">
                  ₹{totalAmount}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  if (onProceedToBooking) {
                    onProceedToBooking();
                  } else {
                    window.location.href = "/book/appointment";
                  }
                }}
                className="w-full py-3 rounded-full bg-[#333333] text-[#ffffff] hover:bg-[#1e1e1e] text-xs font-semibold tracking-wider uppercase transition-colors shadow-sm text-center"
              >
                Book a slot
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function BookingDrawer(props: BookingDrawerProps) {
  return (
    <CartProvider>
      <BookingDrawerContent {...props} />
    </CartProvider>
  );
}
