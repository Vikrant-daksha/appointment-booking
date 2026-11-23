import React, { createContext, useContext, useMemo, useSyncExternalStore } from "react";

export const MAX_CART_LIMIT = 30;

export interface CartOption {
  groupName?: string;
  featureName?: string;
  name?: string;
  price?: string;
  additive?: boolean;
  priceNum?: number;
}

export interface CartItem {
  id: string;
  serviceId?: string;
  name: string;
  price: number;
  basePrice?: number;
  priceDisplay?: string;
  time?: string;
  category?: string;
  categoryRaw?: string;
  description?: string;
  image?: string;
  qty?: number;
  selectedOptions?: CartOption[];
  [key: string]: any;
}

export interface CartContextType {
  items: CartItem[];
  addItem: (product: CartItem) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  toggleItem: (product: CartItem) => void;
  clearCart: () => void;
  isInCart: (id: string) => boolean;
  getItemQty: (id: string) => number;
  totalAmount: number;
  totalMinutes: number;
  totalCount: number;
}

const CART_STORAGE_KEY = "cart";
const SYNC_EVENT_NAME = "cart-sync";

// ---------------------------------------------------------------------------
// External Store with React 18+ useSyncExternalStore for instant reactivity
// across separate Astro islands without page reload
// ---------------------------------------------------------------------------

function getSavedCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

let cartMemoryStore: CartItem[] = typeof window !== "undefined" ? getSavedCart() : [];
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function updateStore(newItems: CartItem[], broadcast = true) {
  cartMemoryStore = newItems;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newItems));
      if (broadcast) {
        window.dispatchEvent(new Event(SYNC_EVENT_NAME));
      }
    } catch (e) {
      console.warn("Failed to persist cart:", e);
    }
  }
  notifyListeners();
}

// Listen for window storage and cart-sync events to sync across tabs & islands
if (typeof window !== "undefined") {
  const handleWindowSync = () => {
    const saved = getSavedCart();
    if (JSON.stringify(saved) !== JSON.stringify(cartMemoryStore)) {
      cartMemoryStore = saved;
      notifyListeners();
    }
  };
  window.addEventListener("storage", handleWindowSync);
  window.addEventListener(SYNC_EVENT_NAME, handleWindowSync);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): CartItem[] {
  return cartMemoryStore;
}

const emptySnapshot: CartItem[] = [];
function getServerSnapshot(): CartItem[] {
  return emptySnapshot;
}

// ---------------------------------------------------------------------------
// CartContext & Hook
// ---------------------------------------------------------------------------

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = (): CartContextType => {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addItem = (product: CartItem) => {
    const rawAddQty = product.qty && product.qty > 0 ? product.qty : 1;
    const currentTotalCount = cartMemoryStore.reduce(
      (sum, item) => sum + (item.qty || 1),
      0
    );

    // Hard limit: total cart count cannot exceed MAX_CART_LIMIT (30)
    const availableTotalCapacity = MAX_CART_LIMIT - currentTotalCount;
    if (availableTotalCapacity <= 0) return;

    const existing = cartMemoryStore.find((item) => item.id === product.id);
    const existingQty = existing ? existing.qty || 1 : 0;

    // Hard limit: no single item can exceed MAX_CART_LIMIT (30)
    const availableItemCapacity = MAX_CART_LIMIT - existingQty;
    if (availableItemCapacity <= 0) return;

    // The actual allowed quantity without violating either ceiling
    const addQty = Math.min(rawAddQty, availableTotalCapacity, availableItemCapacity);
    if (addQty <= 0) return;

    let next: CartItem[];
    if (existing) {
      next = cartMemoryStore.map((item) =>
        item.id === product.id ? { ...item, qty: existingQty + addQty } : item
      );
    } else {
      next = [...cartMemoryStore, { ...product, qty: addQty }];
    }
    updateStore(next);
  };

  const removeItem = (id: string) => {
    const next = cartMemoryStore.filter((item) => item.id !== id);
    updateStore(next);
  };

  const updateQty = (id: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(id);
      return;
    }
    const existing = cartMemoryStore.find((item) => item.id === id);
    if (!existing) return;

    const currentItemQty = existing.qty || 1;
    const currentTotalCount = cartMemoryStore.reduce(
      (sum, item) => sum + (item.qty || 1),
      0
    );
    const otherItemsCount = currentTotalCount - currentItemQty;

    // Must not exceed MAX_CART_LIMIT for this item, and must not cause total to exceed MAX_CART_LIMIT
    const maxAllowedForItem = Math.min(
      MAX_CART_LIMIT,
      Math.max(1, MAX_CART_LIMIT - otherItemsCount)
    );
    const clampedQty = Math.min(maxAllowedForItem, Math.max(1, newQty));

    const next = cartMemoryStore.map((item) =>
      item.id === id ? { ...item, qty: clampedQty } : item
    );
    updateStore(next);
  };

  const toggleItem = (product: CartItem) => {
    const exists = cartMemoryStore.some((item) => item.id === product.id);
    if (exists) {
      const next = cartMemoryStore.filter((item) => item.id !== product.id);
      updateStore(next);
    } else {
      addItem(product);
    }
  };

  const clearCart = () => {
    updateStore([]);
  };

  const isInCart = (id: string) => {
    return items.some((item) => item.id === id || item.serviceId === id);
  };

  const getItemQty = (id: string) => {
    return items
      .filter((item) => item.id === id || item.serviceId === id)
      .reduce((sum, item) => sum + (item.qty || 1), 0);
  };

  const totalAmount = useMemo(() => {
    return items.reduce((acc, item) => {
      const qty = item.qty || 1;
      return acc + (item.price || 0) * qty;
    }, 0);
  }, [items]);

  const totalMinutes = useMemo(() => {
    return items.reduce((acc, item) => {
      const qty = item.qty || 1;
      const mins = parseInt(item.time || "0") || 0;
      return acc + mins * qty;
    }, 0);
  }, [items]);

  const totalCount = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.qty || 1), 0);
  }, [items]);

  return {
    items,
    addItem,
    removeItem,
    updateQty,
    toggleItem,
    clearCart,
    isInCart,
    getItemQty,
    totalAmount,
    totalMinutes,
    totalCount,
  };
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const cart = useCart();
  return (
    <CartContext.Provider value={cart}>
      {children}
    </CartContext.Provider>
  );
}
