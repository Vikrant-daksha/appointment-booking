import React, { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../../lib/api.ts";
import { zodEnv } from "../../lib/zodEnv.ts";
import type { PublicShop, Service } from "../../types/booking.ts";
import MyWork from "../MyWork.tsx";

export interface StudioScheduleItem {
  day: string;
  hours: string;
  isActive?: boolean;
}

export interface StudioOverviewProps {
  initialShop?: PublicShop;
  initialServices?: Service[];
  onSelectCategory?: (category: string) => void;
}

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export default function StudioOverview({
  initialShop,
  initialServices,
  onSelectCategory,
}: StudioOverviewProps) {
  const [shop, setShop] = useState<PublicShop | null>(initialShop ?? null);
  const [services, setServices] = useState<Service[]>(initialServices ?? []);
  const [isLoading, setIsLoading] = useState(!initialShop);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Fetch shop & services from backend if not passed as initial props
  useEffect(() => {
    if (initialShop) return;

    let isMounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const shopRes = await apiFetch(`${zodEnv.BACKEND_URL}/admin/shop`);
        if (!shopRes.ok) throw new Error("Failed to load shop profile");
        const shopJson = await shopRes.json();
        const loadedShop: PublicShop =
          shopJson.shop ?? shopJson.data ?? shopJson;

        if (isMounted) {
          setShop(loadedShop);
        }

        const shopId = loadedShop?.id ?? loadedShop?._id;
        if (shopId) {
          const svcRes = await apiFetch(
            `${zodEnv.BACKEND_URL}/admin/services?shopId=${shopId}`,
          );
          if (svcRes.ok) {
            const svcJson = await svcRes.json();
            if (isMounted) {
              setServices(svcJson.services ?? []);
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load studio details",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [initialShop]);

  // Today's day name to highlight in schedule
  const todayKey = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", { weekday: "long" })
      .format(new Date())
      .toLowerCase();
  }, []);

  // Compute 7-day schedule from backend shop.openingTimings
  const schedule: StudioScheduleItem[] = useMemo(() => {
    const timings = shop?.openingTimings || {};
    return DAYS_OF_WEEK.map(({ key, label }) => {
      const hours = timings[key] || "";
      return {
        day: label,
        hours,
        isActive: key === todayKey,
      };
    });
  }, [shop, todayKey]);

  // Dynamic status badge check
  const isOpenToday = useMemo(() => {
    const todayHours = shop?.openingTimings?.[todayKey];
    if (!todayHours) return true; // Default open
    return !todayHours.toLowerCase().includes("closed");
  }, [shop, todayKey]);

  // Group backend services by serviceType
  const categoryTiles = useMemo(() => {
    if (!services || services.length === 0) {
      return [];
    }

    const map: Record<
      string,
      { id: string; name: string; count: number; img: string }
    > = {};

    services.forEach((svc) => {
      const type = svc.serviceType?.trim() || "";
      if (!type) return;
      const id = type.toLowerCase().replace(/\s+/g, "-");
      if (!map[id]) {
        map[id] = {
          id,
          name: type,
          count: 0,
          img: svc.serviceImages?.[0] || "",
        };
      }
      map[id].count += 1;
    });

    return Object.values(map).map((cat) => ({
      ...cat,
      countText: `${cat.count} ${cat.count === 1 ? "Service" : "Services"}`,
    }));
  }, [services]);

  // Filtered services for the catalog view below categories
  const filteredServices = useMemo(() => {
    if (selectedCategory === "all") return services;
    return services.filter((svc) => {
      const catId = (svc.serviceType || "").toLowerCase().replace(/\s+/g, "-");
      return catId === selectedCategory || svc.serviceType === selectedCategory;
    });
  }, [services, selectedCategory]);

  const heroImage = shop?.shopImages?.[0] || "";

  if (isLoading) {
    return (
      <div className="bg-[#F4F4F5] text-[#18181B] min-h-screen py-10 px-4 sm:px-6 lg:px-8 font-body">
        <div className="max-w-[1380px] mx-auto space-y-8 animate-pulse">
          <div className="h-96 bg-[#FFFFFF] rounded-2xl border border-[#E4E4E7]"></div>
          <div className="h-64 bg-[#FFFFFF] rounded-2xl border border-[#E4E4E7]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F4F4F5] text-[#18181B] antialiased min-h-screen flex flex-col font-body">
      {/* Main Content Container */}
      <main className="w-full flex-grow py-6 sm:py-8 mt-[3rem]">
        {error && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="underline font-semibold ml-2 hover:text-amber-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* Studio Overview Section */}
        <section className="bg-[#F4f4f5] rounded-2xl p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-stretch">
            {/* Studio Hero Visual Card */}
            <div className="w-full lg:w-7/12 relative overflow-hidden rounded-xl bg-surface-container min-h-[320px] sm:min-h-[420px] border border-border flex items-center justify-center">
              {heroImage ? (
                <img
                  alt={`${shop?.shopName || ""} interior`}
                  className="w-full h-full object-cover absolute inset-0"
                  src={heroImage}
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

              {/* Badges on Image */}
              <div className="absolute bottom-4 left-4 right-4 text-white">
                {shop?.shopName ? (
                  <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl text-white font-normal drop-shadow-sm">
                    {shop.shopName}
                  </h1>
                ) : null}
              </div>
            </div>

            {/* Studio Details & Weekly Schedule Panel */}
            <div className="w-full lg:w-5/12 flex flex-col justify-between space-y-4">
              {/* Location Block */}
              {shop?.location ? (
                <div className="bg-white rounded-xl p-4 border border-border">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center shrink-0 border border-border text-[#333333] shadow-xs">
                      <span className="material-symbols-outlined text-[18px]">
                        location_on
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-0.5">
                        Location
                      </span>
                      <p className="text-sm font-medium text-foreground leading-snug">
                        {shop.location}
                      </p>
                      <a
                        className="inline-flex items-center gap-1 mt-1.5 text-xs text-[#333333] font-medium hover:underline"
                        href={`https://maps.google.com/?q=${encodeURIComponent(
                          shop.location,
                        )}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <span>Directions</span>
                        <span className="material-symbols-outlined text-[14px]">
                          arrow_outward
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Phone Contact Block */}
              {shop?.phone ? (
                <div className="bg-white rounded-xl p-4 border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center shrink-0 border border-border text-[#333333] shadow-xs">
                        <span className="material-symbols-outlined text-[18px]">
                          call
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-0.5">
                          Phone Number
                        </span>
                        <a
                          className="text-base font-semibold text-foreground hover:text-[#333333] transition-colors font-headline"
                          href={`tel:${shop.phone}`}
                        >
                          {shop.phone}
                        </a>
                      </div>
                    </div>
                    <a
                      aria-label="Call Studio"
                      className="inline-flex items-center justify-center w-8 h-8 p-3 rounded-full bg-[#333333] text-white hover:bg-black transition-colors"
                      href={`tel:${shop.phone}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        phone
                      </span>
                    </a>
                  </div>
                </div>
              ) : null}

              {/* Complete 7-Day Schedule Block */}
              {schedule.some((s) => Boolean(s.hours)) ? (
                <div className="bg-white rounded-xl p-4 border border-border flex-grow">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/80">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-muted-foreground">
                        schedule
                      </span>
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Opening Hours
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    {schedule
                      .filter((item) => Boolean(item.hours))
                      .map((item) => (
                        <div
                          key={item.day}
                          className={`flex justify-between items-center py-1 px-2 rounded-md ${
                            item.isActive
                              ? "bg-[#F4F4F5] font-medium text-foreground border border-border shadow-xs"
                              : "text-muted-foreground"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            {item.day}
                          </span>
                          <span
                            className={
                              item.isActive
                                ? "text-foreground font-medium"
                                : "text-foreground"
                            }
                          >
                            {item.hours}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Showcase Studio Photo Gallery if additional images exist */}
          {shop?.shopImages && shop.shopImages.length > 1 && (
            <div className="mt-6 pt-6 border-t border-border">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold block mb-3">
                Sanctuary Gallery
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {shop.shopImages.slice(1, 5).map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="h-24 sm:h-28 rounded-xl overflow-hidden border border-border bg-surface-container"
                  >
                    <img
                      src={imgUrl}
                      alt={`${shop.shopName} space view ${idx + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Service Categories Navigation */}
        {categoryTiles.length > 0 ? (
          <section className="bg-surface p-6 sm:px-8 sm:py-14 ">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-border">
              <div>
                <h2 className="font-headline text-2xl sm:text-3xl text-foreground font-normal mt-0.5">
                  Service Categories
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  select a category
                </p>
              </div>
            </div>

            {/* Circular Image Tiles Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-4 justify-items-center">
              {categoryTiles.map((tile) => {
                const isSelected = selectedCategory === tile.id;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => {
                      if (onSelectCategory) {
                        setSelectedCategory((prev) =>
                          prev === tile.id ? "all" : tile.id,
                        );
                        onSelectCategory(tile.id);
                      } else {
                        window.location.href = `/book/services?serviceType=${encodeURIComponent(tile.name)}`;
                      }
                    }}
                    className="group flex flex-col items-center text-center cursor-pointer transition-transform duration-200 hover:-translate-y-1 w-full max-w-[160px]"
                  >
                    <div
                      className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-surface shadow-xs border transition-all ${
                        isSelected
                          ? "ring-2 ring-[#333333] border-transparent"
                          : "border-border group-hover:border-[#333333]"
                      }`}
                    >
                      <div className="w-full h-full rounded-full overflow-hidden relative flex items-center justify-center bg-[#F4F4F5]">
                        {tile.img ? (
                          <img
                            alt={tile.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            src={tile.img}
                          />
                        ) : (
                          <span className="text-lg font-bold text-[#18181B]">
                            {tile.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`mt-3 text-xs sm:text-sm font-semibold transition-colors ${
                        isSelected
                          ? "text-[#333333] underline"
                          : "text-foreground group-hover:text-[#333333]"
                      }`}
                    >
                      {tile.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">
                      {tile.countText}
                    </span>
                  </button>
                );
              })}
            </div>
            <MyWork />
          </section>
        ) : (
          <section className="bg-surface p-6 sm:px-8 sm:py-14">
            <MyWork />
          </section>
        )}
      </main>
    </div>
  );
}
