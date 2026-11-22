import React, { useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient.ts";
import { apiFetch, getStoredAdminInfo } from "../lib/api.ts";
import { zodEnv } from "../lib/zodEnv.ts";
import {
  type PublicShop,
  type Service,
  ServiceCreateSchema,
} from "../types/booking.ts";
import { Button } from "./ui/Button.tsx";

interface OptionRow {
  groupName: string;
  name: string;
  price: string;
}

function EditServicesInner() {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Form State
  const [serviceName, setServiceName] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [serviceDuration, setServiceDuration] = useState("45 mins");
  const [basePrice, setBasePrice] = useState("");
  const [serviceDown, setServiceDown] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [optionRows, setOptionRows] = useState<OptionRow[]>([]);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setIsAuthenticated(false);
      window.location.href = "/admin/login";
    } else {
      setIsAuthenticated(true);
    }
  }, []);

  // 1. Fetch Shop details via useQuery (checks /admin/get-shop or /admin/shop)
  const {
    data: shop,
    isLoading: isShopLoading,
    error: shopError,
  } = useQuery<PublicShop>({
    queryKey: ["shop"],
    queryFn: async () => {
      let res = await apiFetch(`${zodEnv.BACKEND_URL}/admin/get-shop`).catch(() => null);
      if (!res || !res.ok) {
        res = await apiFetch(`${zodEnv.BACKEND_URL}/admin/shop`);
      }
      if (!res.ok) throw new Error("Failed to load shop details");
      const json = await res.json();
      return (json.shop ?? json.data ?? json) as PublicShop;
    },
    enabled: isAuthenticated === true,
  });

  // Multilayer shopId resolution:
  // 1. From fetched shop profile (_id / id)
  // 2. Fallback to adminId directly decoded from JWT accessToken
  const storedAdmin = typeof window !== "undefined" ? getStoredAdminInfo() : null;
  const shopId = shop?._id ?? shop?.id ?? (shop as any)?.shopId ?? storedAdmin?.adminId;

  // 2. Fetch Services catalog with key ['services'] via useQuery
  // Reads stored admin._id from login/register response
  const storedAdminId =
    typeof window !== "undefined" ? localStorage.getItem("adminId") : null;
  const effectiveShopId = storedAdminId || shopId;

  const {
    data: services = [],
    isLoading: isServicesLoading,
    error: servicesError,
  } = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const url = effectiveShopId
        ? `${zodEnv.BACKEND_URL}/admin/services?shopId=${effectiveShopId}&includeDown=true`
        : `${zodEnv.BACKEND_URL}/admin/services?includeDown=true`;

      let res = await apiFetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        res = await apiFetch(`${zodEnv.BACKEND_URL}/admin/services`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      }

      if (!res.ok) throw new Error("Failed to load services");
      const json = await res.json();
      const list = json.services ?? json.data ?? json;
      return Array.isArray(list) ? list : [];
    },
    enabled: isAuthenticated === true,
  });

  // Extract unique existing service categories so the admin can pick from them or create new
  const existingTypes = React.useMemo(() => {
    return Array.from(
      new Set(
        services
          .map((s) => s.serviceType?.trim())
          .filter((t): t is string => Boolean(t)),
      ),
    );
  }, [services]);

  // 3. Create Service via useMutation with invalidateQueries(['services'])
  const createServiceMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiFetch(`/admin/services/create`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.message || `Failed to create service (${res.status})`,
        );
      }

      return await res.json();
    },
    onSuccess: () => {
      // Invalidate queries tagged with key ['services']
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setSuccessMessage("Service created and added to catalog successfully!");
      setServiceName("");
      setServiceType("");
      setServiceDuration("45 mins");
      setBasePrice("");
      setServiceDown(false);
      setImages([]);
      setOptionRows([]);
      setFormError("");
      setTimeout(() => setSuccessMessage(""), 5000);
    },
    onError: (err: Error) => {
      setFormError(err.message || "Failed to create service");
      setSuccessMessage("");
    },
  });

  const handleAddOption = () => {
    setOptionRows((prev) => [
      ...prev,
      { groupName: "Add-ons", name: "", price: "₹" },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    setOptionRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOptionChange = (
    index: number,
    field: keyof OptionRow,
    value: string,
  ) => {
    setOptionRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    // Read admin._id stored during login/register
    const adminId =
      typeof window !== "undefined" ? localStorage.getItem("adminId") : null;
    const targetShopId = adminId || shopId;

    // 1. Client-side Zod validation with strong types
    const validation = ServiceCreateSchema.safeParse({
      shopId: targetShopId ? String(targetShopId) : undefined,
      serviceName: serviceName.trim(),
      serviceType: serviceType.trim(),
      serviceDuration: serviceDuration.trim(),
      basePrice: basePrice.trim() ? basePrice.trim() : undefined,
      serviceDown,
    });

    if (!validation.success) {
      setFormError(validation.error.issues[0]?.message ?? "Invalid service details");
      return;
    }

    const fd = new FormData();
    // Pass shopId: admin._id as required by the backend
    if (targetShopId) {
      fd.append("shopId", String(targetShopId));
    }
    fd.append("serviceName", serviceName.trim());
    fd.append("serviceType", serviceType.trim());
    fd.append("serviceDuration", serviceDuration.trim());
    if (basePrice.trim()) {
      fd.append("basePrice", basePrice.trim());
    }
    fd.append("serviceDown", String(serviceDown));

    // Append raw image files (BackendSpec supports field `images`)
    images.forEach((file) => {
      fd.append("images", file);
    });

    // Structure serviceOptions if any add-ons are specified
    if (optionRows.length > 0) {
      const optionsMap: Record<
        string,
        Array<{
          name: string;
          price: string;
          additive: boolean;
          required: boolean;
          oneOrMany: number;
        }>
      > = {};

      for (const opt of optionRows) {
        if (!opt.name.trim()) continue;
        const group = opt.groupName.trim() || "Add-ons";
        if (!optionsMap[group]) {
          optionsMap[group] = [];
        }
        optionsMap[group].push({
          name: opt.name.trim(),
          price: opt.price.trim() || "₹0",
          additive: true,
          required: false,
          oneOrMany: 1,
        });
      }

      if (Object.keys(optionsMap).length > 0) {
        fd.append("serviceOptions", JSON.stringify(optionsMap));
      }
    }

    createServiceMutation.mutate(fd);
  };

  if (isAuthenticated === false) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-center">
        <p className="font-medium">Redirecting to admin login...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* 1. Header & Shop Overview (from useQuery) */}
      <section className="bg-gradient-to-r from-rose-50 to-pink-50/50 rounded-3xl p-6 md:p-8 border border-rose-100 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-200/60 text-rose-800 text-xs font-semibold mb-2">
              <span>Admin Management</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
              Services & Pricing Catalog
            </h1>
            <p className="text-sm text-neutral-600 mt-1">
              Configure treatments, service timings, add-on features, and
              Cloudinary showcase images.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xs rounded-2xl p-4 border border-rose-100 min-w-[280px]">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Connected Shop
            </p>
            {isShopLoading ? (
              <p className="text-sm text-neutral-400 animate-pulse mt-1">
                Loading shop profile...
              </p>
            ) : shopError ? (
              <p className="text-xs text-rose-600 mt-1">Failed to load shop</p>
            ) : shop ? (
              <div className="mt-1">
                <p className="font-semibold text-neutral-900 text-base">
                  {shop.shopName}
                </p>
                <p className="text-xs text-neutral-600 truncate">
                  {shop.location} • {shop.phone}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5 font-mono truncate">
                  ID: {shop.id ?? shop._id}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 2. Create Service Form (via useMutation) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 md:p-7 border border-neutral-200 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-neutral-900">
              Create New Service
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Submits directly to{" "}
              <code className="bg-neutral-100 px-1 py-0.5 rounded text-[11px]">
                POST /admin/services/create
              </code>{" "}
              and updates the live catalog.
            </p>
          </div>

          {formError && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <span className="font-semibold">Error:</span>
              <span>{formError}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <span className="font-semibold">Success:</span>
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Service Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Classic Haircut & Blow Dry"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-700">
                  Category / Service Type <span className="text-rose-500">*</span>
                </label>
                {existingTypes.length > 0 && (
                  <span className="text-[11px] text-neutral-400">
                    {existingTypes.length} {existingTypes.length === 1 ? "category" : "categories"} in use
                  </span>
                )}
              </div>
              <input
                type="text"
                list="existing-service-types"
                placeholder="e.g. Hair Care, Nail Art, Facials, Waxing..."
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
                required
              />
              <datalist id="existing-service-types">
                {existingTypes.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>

              {/* Quick-pick existing categories or type a new one */}
              {existingTypes.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-neutral-400 font-medium">Existing:</span>
                  {existingTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setServiceType(type)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
                        serviceType.trim().toLowerCase() === type.trim().toLowerCase()
                          ? "bg-rose-100 text-rose-800 border-rose-300 shadow-2xs"
                          : "bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border-neutral-200"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Duration <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 45 mins, 1 hour"
                  value={serviceDuration}
                  onChange={(e) => setServiceDuration(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Base Price (₹)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 499 or ₹499"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
                />
              </div>
            </div>

            {/* Direct Image File Upload */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Showcase Images (Up to 10 files)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const selected = Array.from(e.target.files ?? []);
                  setImages(selected);
                }}
                className="w-full text-xs text-neutral-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-100 file:text-rose-700 hover:file:bg-rose-200 cursor-pointer"
              />
              {images.length > 0 && (
                <p className="text-[11px] text-emerald-600 mt-1">
                  ✓ {images.length} file{images.length > 1 ? "s" : ""} selected
                  for Cloudinary upload
                </p>
              )}
            </div>

            {/* Service Options / Add-ons builder */}
            <div className="pt-2 border-t border-neutral-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-neutral-700">
                  Optional Add-ons & Feature Choices
                </label>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                >
                  + Add Option
                </button>
              </div>

              {optionRows.length > 0 && (
                <div className="space-y-2 mb-3">
                  {optionRows.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Option (e.g. Blow Dry)"
                        value={row.name}
                        onChange={(e) =>
                          handleOptionChange(idx, "name", e.target.value)
                        }
                        className="flex-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Price (₹)"
                        value={row.price}
                        onChange={(e) =>
                          handleOptionChange(idx, "price", e.target.value)
                        }
                        className="w-20 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-neutral-400 hover:text-rose-600 text-sm px-1"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Service Down toggle */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
              <input
                id="serviceDownCheckbox"
                type="checkbox"
                checked={serviceDown}
                onChange={(e) => setServiceDown(e.target.checked)}
                className="h-4 w-4 rounded text-rose-500 focus:ring-rose-400 cursor-pointer"
              />
              <label
                htmlFor="serviceDownCheckbox"
                className="text-xs text-neutral-700 cursor-pointer"
              >
                <span className="font-semibold block text-neutral-800">
                  Temporarily Hide (Service Down)
                </span>
                Keep in catalog for admins, but hide from customer booking
                slots.
              </label>
            </div>

            <Button
              type="submit"
              disabled={createServiceMutation.isPending}
              className="w-full mt-2"
            >
              {createServiceMutation.isPending
                ? "Creating & Uploading..."
                : "Publish Service"}
            </Button>
          </form>
        </div>

        {/* 3. Existing Services Catalog (rendered via useQuery with key ['services']) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">
                Current Services
              </h2>
              <p className="text-xs text-neutral-500">
                Synced in real-time using TanStack Query key{" "}
                <code className="bg-neutral-100 px-1 py-0.5 rounded text-[11px]">
                  ['services']
                </code>
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-semibold">
              {services.length} Total
            </span>
          </div>

          {isServicesLoading ? (
            <div className="p-8 text-center text-sm text-neutral-400 bg-white rounded-3xl border border-neutral-200">
              Loading services list...
            </div>
          ) : servicesError ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              Failed to load services: {servicesError.message}
            </div>
          ) : services.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-neutral-300">
              <p className="text-neutral-500 text-sm font-medium">
                No services added yet.
              </p>
              <p className="text-neutral-400 text-xs mt-1">
                Use the form on the left to add your first service.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((svc) => {
                const svcId = svc.id ?? svc._id;
                return (
                  <div
                    key={svcId}
                    className="p-5 rounded-2xl bg-white border border-neutral-200 hover:border-neutral-300 shadow-2xs transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-neutral-900 text-base">
                            {svc.serviceName}
                          </h3>
                          {svc.serviceDown ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                              Hidden (Down)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Category:{" "}
                          <span className="text-neutral-700 font-medium">
                            {svc.serviceType}
                          </span>{" "}
                          • Duration:{" "}
                          <span className="text-neutral-700 font-medium">
                            {svc.serviceDuration}
                          </span>
                          {svc.basePrice !== undefined && svc.basePrice !== null && (
                            <>
                              {" "}• Base Price:{" "}
                              <span className="text-neutral-900 font-semibold">
                                {typeof svc.basePrice === "number"
                                  ? `₹${svc.basePrice}`
                                  : svc.basePrice.toString().startsWith("₹")
                                  ? svc.basePrice
                                  : `₹${svc.basePrice}`}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Display Images if present */}
                    {svc.serviceImages && svc.serviceImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {svc.serviceImages.map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt={svc.serviceName}
                            className="h-16 w-16 object-cover rounded-xl border border-neutral-200 shadow-2xs"
                          />
                        ))}
                      </div>
                    )}

                    {/* Display Options if present */}
                    {svc.serviceOptions &&
                      Object.keys(svc.serviceOptions).length > 0 && (
                        <div className="pt-2 border-t border-neutral-100 text-xs">
                          <span className="text-neutral-500 font-medium">
                            Available Options:
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {Object.entries(svc.serviceOptions).flatMap(
                              ([group, features]) =>
                                features.map((f, idx) => (
                                  <span
                                    key={`${group}-${idx}`}
                                    className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[11px]"
                                  >
                                    {f.name} ({f.price})
                                  </span>
                                )),
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EditServices() {
  return (
    <QueryClientProvider client={queryClient}>
      <EditServicesInner />
    </QueryClientProvider>
  );
}

export default EditServices;
