import React, { useState, useMemo } from "react";
import type { ServiceFeature } from "../../types/booking.ts";
import { useCart, MAX_CART_LIMIT } from "../../context/CartContext.tsx";
import type { CartItem, CartOption } from "../../context/CartContext.tsx";
import { Check, Minus, Plus, X } from "lucide-react";

export interface ServiceItem {
  id: string;
  name: string;
  category: string;
  categoryRaw: string;
  price: number;
  priceDisplay: string;
  time: string;
  description: string;
  image: string;
  options?: Record<string, ServiceFeature[]>;
}

/**
 * Checks if a service provides customizable option groups with at least one feature
 */
export function hasServiceFeatures(service: ServiceItem): boolean {
  if (!service.options) return false;
  return Object.values(service.options).some(
    (features) => Array.isArray(features) && features.length > 0
  );
}

/**
 * Feature Selection Modal for customizing services with add-on options and selecting quantity
 */
export function FeatureSelectionModal({
  service,
  onClose,
  onAddToCart,
}: {
  service: ServiceItem;
  onClose: () => void;
  onAddToCart: (configuredItem: CartItem) => void;
}) {
  const { totalCount, getItemQty } = useCart();
  const currentItemQty = getItemQty(service.id);
  const maxAllowedQty = Math.max(
    0,
    Math.min(
      MAX_CART_LIMIT,
      MAX_CART_LIMIT - totalCount,
      MAX_CART_LIMIT - currentItemQty
    )
  );

  const [qty, setQty] = useState(() => (maxAllowedQty > 0 ? 1 : 0));

  // Initialize selections with required single-choice defaults if present
  const [selectedOptions, setSelectedOptions] = useState<Record<string, ServiceFeature[]>>(() => {
    const initial: Record<string, ServiceFeature[]> = {};
    if (service.options) {
      Object.entries(service.options).forEach(([groupName, features]) => {
        if (Array.isArray(features) && features.length > 0) {
          const required = features.some((f) => f.required);
          const isSingle = features.every((f) => f.oneOrMany === 1);
          if (required && isSingle) {
            initial[groupName] = [features[0]];
          } else {
            initial[groupName] = [];
          }
        }
      });
    }
    return initial;
  });

  const toggleFeature = (
    groupName: string,
    feature: ServiceFeature,
    isSingle: boolean,
    isRequired: boolean
  ) => {
    setSelectedOptions((prev) => {
      const currentList = prev[groupName] || [];
      const isAlreadySelected = currentList.some((f) => f.name === feature.name);

      if (isSingle) {
        if (isAlreadySelected) {
          // If required, prevent deselecting the single active selection
          return isRequired ? prev : { ...prev, [groupName]: [] };
        }
        return { ...prev, [groupName]: [feature] };
      } else {
        if (isAlreadySelected) {
          return {
            ...prev,
            [groupName]: currentList.filter((f) => f.name !== feature.name),
          };
        }
        const maxAllowed = feature.oneOrMany || 99;
        if (currentList.length >= maxAllowed) {
          return prev;
        }
        return {
          ...prev,
          [groupName]: [...currentList, feature],
        };
      }
    });
  };

  // Calculate unit price based on additive vs non-additive features
  const unitPrice = useMemo(() => {
    let price = service.price || 0;
    Object.values(selectedOptions).forEach((features) => {
      features.forEach((f) => {
        const val = parseFloat(String(f.price).replace(/[^0-9.]/g, "")) || 0;
        if (f.additive !== false) {
          price += val;
        } else {
          price = val;
        }
      });
    });
    return price;
  }, [service.price, selectedOptions]);

  const totalPrice = unitPrice * qty;

  // Check validation (all required groups must have at least 1 feature selected)
  const isValidationPassing = useMemo(() => {
    if (!service.options) return true;
    for (const [groupName, features] of Object.entries(service.options)) {
      if (Array.isArray(features) && features.some((f) => f.required)) {
        const selectedInGroup = selectedOptions[groupName] || [];
        if (selectedInGroup.length === 0) return false;
      }
    }
    return true;
  }, [service.options, selectedOptions]);

  const handleConfirm = () => {
    const flattenedOptions: CartOption[] = [];
    Object.entries(selectedOptions).forEach(([groupName, features]) => {
      features.forEach((f) => {
        flattenedOptions.push({
          groupName,
          featureName: f.name,
          name: f.name,
          price: f.price,
          additive: f.additive !== false,
          priceNum: parseFloat(String(f.price).replace(/[^0-9.]/g, "")) || 0,
        });
      });
    });

    // Create unique deterministic ID based on service ID + option names
    const optionFingerprint = flattenedOptions
      .map((o) => `${o.groupName}:${o.featureName}`)
      .sort()
      .join("|");

    const cartItemId = optionFingerprint
      ? `${service.id}-${optionFingerprint}`
      : service.id;

    onAddToCart({
      id: cartItemId,
      serviceId: service.id,
      name: service.name,
      price: unitPrice,
      basePrice: service.price,
      priceDisplay: `₹${unitPrice}`,
      time: service.time,
      category: service.category,
      categoryRaw: service.categoryRaw,
      description: service.description,
      image: service.image,
      qty,
      selectedOptions: flattenedOptions,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1b1b1e]/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E4E4E7] flex items-center justify-between bg-[#F4F4F5]/60">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <img
              src={service.image}
              alt={service.name}
              className="w-12 h-12 rounded-xl object-cover border border-[#E4E4E7] shrink-0 bg-[#F4F4F5]"
            />
            <div className="min-w-0">
              <h3 className="font-headline text-sm sm:text-base font-semibold text-[#18181B] truncate">
                {service.name}
              </h3>
              <p className="text-[11px] sm:text-xs text-[#71717A] mt-0.5">
                Base Price: ₹{service.price}{" "}
                {service.time ? `• ${service.time}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FFFFFF] border border-[#E4E4E7] flex items-center justify-center text-[#71717A] hover:text-[#18181B] hover:bg-[#E4E4E7] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {service.options &&
            Object.entries(service.options).map(([groupName, features]) => {
              if (!Array.isArray(features) || features.length === 0) return null;
              const isRequired = features.some((f) => f.required);
              const isSingle = features.every((f) => f.oneOrMany === 1);
              const groupSelected = selectedOptions[groupName] || [];

              return (
                <div key={groupName} className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-[#F4F4F5]">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#18181B]">
                      {groupName}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        isRequired
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : "bg-[#F4F4F5] text-[#71717A] border border-[#E4E4E7]"
                      }`}
                    >
                      {isRequired
                        ? "Required"
                        : isSingle
                        ? "Choose 1"
                        : "Optional"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {features.map((feat) => {
                      const isSelected = groupSelected.some(
                        (f) => f.name === feat.name
                      );
                      return (
                        <button
                          key={feat.name}
                          type="button"
                          onClick={() =>
                            toggleFeature(groupName, feat, isSingle, isRequired)
                          }
                          className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                            isSelected
                              ? "bg-[#333333] text-white border-[#333333] shadow-xs"
                              : "bg-[#F4F4F5] text-[#18181B] border border-[#E4E4E7] hover:bg-[#eaeaea]"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-1">
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center border shrink-0 ${
                                isSelected
                                  ? "border-white bg-white text-[#333333]"
                                  : "border-[#A1A1AA] bg-transparent"
                              }`}
                            >
                              {isSelected && (
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              )}
                            </div>
                            <span className="text-xs font-medium truncate">
                              {feat.name}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] sm:text-[11px] font-semibold shrink-0 ${
                              isSelected ? "text-white" : "text-[#71717A]"
                            }`}
                          >
                            {feat.price &&
                            feat.price !== "₹0" &&
                            feat.price !== "0"
                              ? `+${
                                  feat.price.startsWith("₹")
                                    ? feat.price
                                    : `₹${feat.price}`
                                }`
                              : "Included"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

          {/* Multiples / Quantity Stepper */}
          <div className="pt-2 border-t border-[#E4E4E7] flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#18181B]">Quantity</p>
              <p className="text-[11px] text-[#71717A]">
                Add multiple guests or service repetitions
              </p>
            </div>
            <div className="flex items-center gap-2 bg-[#F4F4F5] border border-[#E4E4E7] rounded-full p-1">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className="w-7 h-7 rounded-full bg-[#FFFFFF] border border-[#E4E4E7] flex items-center justify-center text-[#18181B] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#eaeaea] transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-xs font-semibold text-[#18181B]">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(maxAllowedQty, q + 1))}
                disabled={qty >= maxAllowedQty || maxAllowedQty === 0}
                className="w-7 h-7 rounded-full bg-[#FFFFFF] border border-[#E4E4E7] flex items-center justify-center text-[#18181B] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#eaeaea] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F4F4F5] border-t border-[#E4E4E7] flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#71717A] font-medium block">
              Total Package
            </span>
            <span className="text-base font-semibold text-[#18181B]">
              ₹{totalPrice}
            </span>
          </div>

          <button
            type="button"
            disabled={!isValidationPassing || maxAllowedQty === 0 || qty < 1}
            onClick={handleConfirm}
            className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm ${
              isValidationPassing && maxAllowedQty > 0 && qty >= 1
                ? "bg-[#333333] hover:bg-[#18181B] text-white active:scale-95 cursor-pointer"
                : "bg-[#D4D4D8] text-[#71717A] cursor-not-allowed"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add to Cart • ₹{totalPrice}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

