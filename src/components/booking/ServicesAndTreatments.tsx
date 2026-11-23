import React, { useState, useEffect, useMemo, Suspense } from "react";
import { apiFetch } from "../../lib/api.ts";
import { zodEnv } from "../../lib/zodEnv.ts";
import type {
  PublicShop,
  Service,
  ServiceFeature,
} from "../../types/booking.ts";
import ServicesAndTreatmentsMobile from "./ServicesAndTreatmentsMobile.tsx";
import {
  DesktopCategoryNavSkeleton,
  DesktopServicesListSkeleton,
} from "./ServicesSkeleton.tsx";
import {
  useCart,
  MAX_CART_LIMIT,
  type CartItem,
  type CartOption,
} from "../../context/CartContext.tsx";
import BookingDrawer from "./BookingDrawer.tsx";
import {
  ArrowLeft,
  Check,
  Clock,
  LayoutGridCircles,
  Minus,
  Plus,
  Search,
  SearchXIcon,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";

export { default as ServicesAndTreatmentsMobile } from "./ServicesAndTreatmentsMobile.tsx";
export { default as ServicesSkeleton } from "./ServicesSkeleton.tsx";
export { default as BookingDrawer } from "./BookingDrawer.tsx";

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

export interface CategoryTab {
  id: string;
  title: string;
  count: number;
  img: string;
}

import {
  FeatureSelectionModal,
  hasServiceFeatures,
} from "./FeatureSelectionModal.tsx";

export interface ServicesAndTreatmentsProps {
  initialShop?: PublicShop;
  initialServices?: Service[];
  onProceedToBooking?: () => void;
}

export default function ServicesAndTreatments({
  initialShop,
  initialServices,
  onProceedToBooking,
}: ServicesAndTreatmentsProps) {
  const [shop, setShop] = useState<PublicShop | null>(initialShop ?? null);
  const [backendServices, setBackendServices] = useState<Service[]>(
    initialServices ?? [],
  );
  const [isLoading, setIsLoading] = useState(!initialServices);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [durationFilter, setDurationFilter] = useState<string>("all");
  const { items: cart, addItem, getItemQty, totalCount } = useCart();
  const [configuringService, setConfiguringService] =
    useState<ServiceItem | null>(null);

  // 1. Sync active category with URL Query string (e.g. ?serviceType=hair or ?serviceType=Color%20%26%20Gloss)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryType =
        params.get("serviceType") ||
        params.get("type") ||
        params.get("category");
      if (queryType) {
        const slug = queryType.toLowerCase().trim().replace(/\s+/g, "-");
        setActiveCategory(slug);
      }
    }
  }, []);

  // 2. Fetch live shop and services catalog from backend if not provided as initial props
  useEffect(() => {
    if (initialServices && initialServices.length > 0) return;

    let isMounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const shopRes = await apiFetch(`${zodEnv.BACKEND_URL}/admin/shop`);
        if (!shopRes.ok) throw new Error("Failed to load shop");
        const shopJson = await shopRes.json();
        const loadedShop: PublicShop =
          shopJson.shop ?? shopJson.data ?? shopJson;

        if (isMounted) setShop(loadedShop);

        const shopId = loadedShop?.id ?? loadedShop?._id;
        if (shopId) {
          const svcRes = await apiFetch(
            `${zodEnv.BACKEND_URL}/admin/services?shopId=${shopId}`,
          );
          if (svcRes.ok) {
            const svcJson = await svcRes.json();
            if (isMounted) {
              setBackendServices(svcJson.services ?? []);
            }
          }
        }
      } catch (err) {
        console.warn(
          "Could not fetch backend services, using fallback catalogue:",
          err,
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [initialServices]);

  // 3. Transform backend services into normalized ServiceItems
  const allServices: ServiceItem[] = useMemo(() => {
    if (!backendServices || backendServices.length === 0) {
      return [];
    }

    return backendServices
      .filter((s) => !s.serviceDown) // Customers only see active services
      .map((s, idx) => {
        const typeRaw = s.serviceType?.trim() || "Treatments";
        const catSlug = typeRaw.toLowerCase().replace(/\s+/g, "-");

        let priceNum = 0;
        let priceStr = "Pricing upon inquiry";
        if (s.basePrice !== undefined && s.basePrice !== null) {
          if (typeof s.basePrice === "number") {
            priceNum = s.basePrice;
            priceStr = `₹${s.basePrice}`;
          } else {
            const cleanStr = String(s.basePrice).trim();
            const extracted = parseFloat(cleanStr.replace(/[^0-9.]/g, ""));
            priceNum = isNaN(extracted) ? 0 : extracted;
            priceStr = cleanStr.startsWith("₹") ? cleanStr : `₹${cleanStr}`;
          }
        }

        return {
          id: s._id ?? s.id ?? `svc-${idx}`,
          name: s.serviceName,
          category: catSlug,
          categoryRaw: typeRaw,
          price: priceNum,
          priceDisplay: priceStr,
          time: s.serviceDuration || "",
          description: (s as any).description || "",
          image: s.serviceImages?.[0] || "",
          options: s.serviceOptions,
        };
      });
  }, [backendServices]);

  // 4. Derive Category tabs dynamically from the services catalog
  const categories: CategoryTab[] = useMemo(() => {
    const map: Record<string, CategoryTab> = {};

    allServices.forEach((s) => {
      if (!map[s.category]) {
        map[s.category] = {
          id: s.category,
          title: s.categoryRaw,
          count: 0,
          img: s.image,
        };
      }
      map[s.category].count += 1;
    });

    return Object.values(map);
  }, [allServices]);

  // 5. Handle Category selection and update URL parameter
  const handleCategorySelect = (categoryId: string, categoryTitle?: string) => {
    setActiveCategory(categoryId);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (categoryId === "all") {
        url.searchParams.delete("serviceType");
      } else {
        url.searchParams.set("serviceType", categoryTitle || categoryId);
      }
      window.history.replaceState({}, "", url.toString());
    }
  };

  // 6. Filter services by Category, Search Query, and Duration
  const filteredServices = useMemo(() => {
    return allServices.filter((svc) => {
      // Category match
      if (activeCategory !== "all" && svc.category !== activeCategory) {
        return false;
      }

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = svc.name.toLowerCase().includes(q);
        const matchesCategory = svc.categoryRaw.toLowerCase().includes(q);
        const matchesDesc = svc.description.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCategory && !matchesDesc) return false;
      }

      // Duration filter match
      if (durationFilter !== "all") {
        const mins = parseInt(svc.time) || 45;
        if (durationFilter === "quick" && mins > 45) return false;
        if (durationFilter === "standard" && (mins <= 45 || mins > 75))
          return false;
        if (durationFilter === "extended" && mins <= 75) return false;
      }

      return true;
    });
  }, [allServices, activeCategory, searchQuery, durationFilter]);

  // Multi-add & Feature Option handling
  const handleServiceAddClick = (service: ServiceItem) => {
    if (hasServiceFeatures(service)) {
      // Service provides features/options -> open customization modal
      setConfiguringService(service);
    } else {
      // Service does not have options -> directly add/increment quantity in cart
      addItem({
        id: service.id,
        serviceId: service.id,
        name: service.name,
        price: service.price,
        priceDisplay: service.priceDisplay,
        time: service.time,
        category: service.category,
        categoryRaw: service.categoryRaw,
        description: service.description,
        image: service.image,
        qty: 1,
      });
    }
  };

  return (
    <>
      {/* Mobile version: Rendered on screens smaller than md (< 768px) */}
      <div className="block md:hidden">
        <ServicesAndTreatmentsMobile
          initialShop={initialShop}
          initialServices={initialServices}
          onProceedToBooking={onProceedToBooking}
        />
      </div>

      {/* Desktop version: Rendered on screens md and larger (>= 768px) */}
      <div className="hidden md:block font-body-md text-[#1b1b1e] antialiased bg-[#fbf8fc] min-h-screen">
        <main className="w-full pt-8 md:pt-12 pb-32">
          <div className="flex flex-col w-full">
            {/* Top Curatorial Banner / Header Anchor */}
            <section className="w-full max-w-[1380px] mx-auto px-6 md:px-12 pt-4 pb-6 mt-[2rem]">
              {/* Breadcrumb strip */}
              <div className="flex items-center gap-1.5 text-[11px] text-[#747878] mb-4">
                <a
                  href="/book"
                  className="hover:text-[#1b1b1e] transition-colors flex items-center gap-0.5"
                >
                  <span className="max-w-6 max-h-6 text-[8px]">
                    <ArrowLeft className="w-4" />
                  </span>
                  <span className="truncate max-w-[130px]">
                    {shop?.shopName || ""}
                  </span>
                </a>
                <span>/</span>
                <span className="text-[#1b1b1e] font-medium">Services</span>
              </div>

              {/* Header: Title on left, Search input shifted to the right side */}
              <div className="flex items-center justify-between leading-none gap-2 pb-3 mb-4">
                <div className="text-xl sm:text-2xl tracking-tight leading-0 text-[#1b1b1e] shrink-0 font-semibold">
                  Services
                </div>

                {/* Shifted search input to the right side of the layout */}
                <div className="relative w-56 sm:w-72 flex items-center">
                  <span className="absolute left-2.5 text-[16px] text-[#747878] pointer-events-none">
                    <Search className="w-4" />
                  </span>
                  <input
                    id="service-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-8 pr-7 py-1.5 bg-[#F4F4F5] rounded-full text-xs text-[#1b1b1e] placeholder:text-[#747878] border border-[#E4E4E7] focus:outline-none focus:bg-[#FFFFFF] focus:border-[#333333] transition-colors shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 text-[#747878] hover:text-[#1b1b1e]"
                    >
                      <span className="text-[14px]">
                        <XCircle className="w-4" />
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Main Split Architecture */}
            <div className="w-full max-w-[1380px] mx-auto px-6 md:px-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* LEFT-SIDED STICKY NAVIGATION RAIL (Categories) */}
                <aside className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24 z-20 space-y-6">
                  <div className="bg-[#FFFFFF] rounded-DEFAULT p-4 sm:p-5 shadow-sm space-y-3 border border-[#E4E4E7]">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E4E4E7]">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#444748]">
                        Categories
                      </span>
                    </div>

                    {/* Vertical Category Navigation Items */}
                    <nav
                      id="category-nav"
                      className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-none"
                    >
                      {/* All Categories Option */}
                      <button
                        type="button"
                        onClick={() => handleCategorySelect("all", "")}
                        className={`cat-nav-btn group flex items-center gap-3 p-2 rounded-DEFAULT transition-all duration-200 text-left w-full shrink-0 lg:shrink select-none ${
                          activeCategory === "all"
                            ? "bg-[#333333] text-[#ffffff] shadow-sm"
                            : "hover:bg-[#F4F4F5] text-[#1b1b1e]"
                        }`}
                      >
                        <div
                          className={`relative w-11 h-11 rounded-full overflow-hidden shrink-0 border flex items-center justify-center bg-[#F4F4F5] ${
                            activeCategory === "all"
                              ? "border-white/30 text-white bg-neutral-800"
                              : "border-[#E4E4E7] text-[#333333]"
                          }`}
                        >
                          <span className="text-[20px]">
                            <LayoutGridCircles className="w-5" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 hidden sm:block">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate leading-tight">
                              All
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* Dynamic API Category Items wrapped in Suspense */}
                      <Suspense fallback={<DesktopCategoryNavSkeleton />}>
                        {isLoading ? (
                          <DesktopCategoryNavSkeleton />
                        ) : (
                          categories.map((cat) => {
                            const isActive = activeCategory === cat.id;
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() =>
                                  handleCategorySelect(cat.id, cat.title)
                                }
                                className={`cat-nav-btn group flex items-center gap-3 p-2 rounded-DEFAULT transition-all duration-200 text-left w-full shrink-0 lg:shrink select-none ${
                                  isActive
                                    ? "bg-[#333333] text-[#ffffff] shadow-sm"
                                    : "hover:bg-[#F4F4F5] text-[#1b1b1e]"
                                }`}
                              >
                                <div
                                  className={`relative w-11 h-11 rounded-full overflow-hidden shrink-0 border bg-[#F4F4F5] ${
                                    isActive
                                      ? "border-[#E4E4E7]/40"
                                      : "border-[#E4E4E7]"
                                  }`}
                                >
                                  <img
                                    src={cat.img}
                                    alt={cat.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0 flex-1 hidden sm:block">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium truncate leading-tight">
                                      {cat.title}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </Suspense>
                    </nav>
                  </div>
                </aside>

                {/* RIGHT-SIDED SERVICES LIST */}
                <div className="lg:col-span-8 xl:col-span-9 space-y-12">
                  <Suspense fallback={<DesktopServicesListSkeleton />}>
                    {isLoading ? (
                      <DesktopServicesListSkeleton />
                    ) : filteredServices.length === 0 ? (
                      <div className="bg-white rounded-DEFAULT p-10 border border-[#E4E4E7] text-center space-y-3">
                        <span className="text-[#747878] flex justify-center">
                          <SearchXIcon className="w-9 h-9" />
                        </span>
                        <h3 className="font-headline text-xl text-[#1b1b1e]">
                          No services found
                        </h3>
                        <p className="text-xs text-[#747878] max-w-md mx-auto">
                          No services match your current filter.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setActiveCategory("all");
                            setDurationFilter("all");
                            handleCategorySelect("all");
                          }}
                          className="px-4 py-2 rounded-full bg-[#333333] text-white text-xs font-medium hover:bg-[#1e1e1e] transition-colors"
                        >
                          Clear Filter
                        </button>
                      </div>
                    ) : (
                      categories
                        .filter(
                          (cat) =>
                            activeCategory === "all" ||
                            cat.id === activeCategory,
                        )
                        .map((cat) => {
                          const catServices = filteredServices.filter(
                            (s) => s.category === cat.id,
                          );
                          if (catServices.length === 0) return null;

                          return (
                            <section
                              key={cat.id}
                              id={cat.id}
                              className="service-category-block space-y-4 scroll-mt-24"
                            >
                              <div className="flex items-center justify-between pb-2 border-b border-[#E4E4E7]">
                                <div className="flex items-center gap-2">
                                  <h2 className="font-headline-section text-headline-section text-[#1b1b1e]">
                                    {cat.title}
                                  </h2>
                                  <span className="px-1.5 py-0.2 rounded-full bg-[#F4F4F5] text-[#444748] border border-[#E4E4E7] text-[10px]">
                                    {catServices.length}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-4">
                                {catServices.map((service) => {
                                  const serviceQty = getItemQty(service.id);
                                  const hasOptions =
                                    hasServiceFeatures(service);

                                  return (
                                    <article
                                      key={service.id}
                                      className="service-item bg-[#FFFFFF] rounded-DEFAULT p-4 sm:p-5 border border-[#E4E4E7] shadow-sm transition-all duration-200 flex flex-col sm:flex-row gap-5 items-start sm:items-center"
                                    >
                                      {service.image ? (
                                        <div className="w-full sm:w-36 h-36 rounded-DEFAULT overflow-hidden shrink-0 bg-[#F4F4F5] border border-[#E4E4E7] relative">
                                          <img
                                            src={service.image}
                                            alt={service.name}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      ) : null}

                                      <div className="flex-1 min-w-0 space-y-2 w-full">
                                        <div className="flex items-start justify-between gap-3">
                                          <h3 className="font-title-md text-title-md text-[#1b1b1e] font-medium">
                                            {service.name}
                                          </h3>
                                          <div className="text-right shrink-0">
                                            <span className="font-title-md text-title-md text-[#1b1b1e] font-semibold">
                                              {service.priceDisplay}
                                            </span>
                                          </div>
                                        </div>

                                        {service.description ? (
                                          <p className="text-sm text-[#444748] line-clamp-2">
                                            {service.description}
                                          </p>
                                        ) : null}

                                        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#F4F4F5]">
                                          <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1 text-xs text-[#444748] bg-[#F4F4F5] border border-[#E4E4E7] px-2.5 py-1 rounded-full">
                                              <Clock className="w-3.5 h-3.5" />
                                              {service.time}
                                            </span>
                                          </div>

                                          {/* Add / Choose Options Button */}
                                          {(() => {
                                            const isMaxed =
                                              serviceQty >= MAX_CART_LIMIT ||
                                              totalCount >= MAX_CART_LIMIT;

                                            return (
                                              <button
                                                type="button"
                                                disabled={isMaxed}
                                                onClick={() =>
                                                  handleServiceAddClick(service)
                                                }
                                                className={`add-to-cart-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all duration-150 shadow-sm ${
                                                  isMaxed
                                                    ? "bg-[#E4E4E7] text-[#71717A] cursor-not-allowed opacity-75"
                                                    : "bg-[#333333] hover:bg-[#18181B] text-[#ffffff] cursor-pointer active:scale-95"
                                                }`}
                                              >
                                                <Plus className="w-4 h-4" />
                                                <span>
                                                  {serviceQty > 0
                                                    ? `Add (${serviceQty})`
                                                    : hasOptions
                                                      ? "Choose Options"
                                                      : "Add"}
                                                </span>
                                              </button>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    </article>
                                  );
                                })}
                              </div>
                            </section>
                          );
                        })
                    )}
                  </Suspense>
                </div>
              </div>
            </div>

            {/* GLOBAL STICKY BOTTOM CART DRAWER & MODAL */}
            <BookingDrawer
              initialShopName={shop?.shopName}
              onProceedToBooking={onProceedToBooking}
            />

            {/* Feature Customization Modal */}
            {configuringService && (
              <FeatureSelectionModal
                service={configuringService}
                onClose={() => setConfiguringService(null)}
                onAddToCart={(item) => {
                  addItem(item);
                  setConfiguringService(null);
                }}
              />
            )}
          </div>
        </main>
      </div>
    </>
  );
}
