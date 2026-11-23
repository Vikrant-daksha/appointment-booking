import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient.ts";
import { apiFetch, getStoredAdminInfo } from "../lib/api.ts";
import { zodEnv } from "../lib/zodEnv.ts";
import type { PublicShop } from "../types/booking.ts";
import {
  SortableImageGrid,
  type SortableImageItem,
} from "./ui/SortableImageGrid.tsx";
import {
  Store,
  Clock,
  MapPin,
  Phone,
  Mail,
  UploadCloud,
  Trash2,
  Check,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  Calendar,
  Image as ImageIcon,
  ExternalLink,
  X,
  ShieldCheck,
  Save,
  RotateCcw,
  Copy,
} from "lucide-react";

export const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
] as const;

type DayKey = (typeof DAYS_OF_WEEK)[number]["key"];

interface ShopFormData {
  shopName: string;
  phone: string;
  location: string;
  openingTimings: Record<string, string>;
}

const DEFAULT_TIMINGS: Record<string, string> = {
  monday: "10:00 AM – 07:00 PM",
  tuesday: "10:00 AM – 07:00 PM",
  wednesday: "10:00 AM – 07:00 PM",
  thursday: "10:00 AM – 07:00 PM",
  friday: "10:00 AM – 07:00 PM",
  saturday: "10:00 AM – 07:00 PM",
  sunday: "Closed",
};

function EditShopInner() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Local Form State
  const [formData, setFormData] = useState<ShopFormData>({
    shopName: "Cherrybrush |  Booking Service",
    phone: "",
    location: "Jaipur, Rajasthan, India",
    openingTimings: { ...DEFAULT_TIMINGS },
  });
  const [stagedImages, setStagedImages] = useState<SortableImageItem[]>([]);

  // Feedback State
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Check Admin Authentication
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      setIsAuthenticated(false);
      window.location.href = "/admin/login";
    } else {
      setIsAuthenticated(true);
    }
  }, []);

  // 1. Fetch Shop details via useQuery using key ["shop"]
  const {
    data: shop,
    isLoading: isShopLoading,
    error: shopQueryError,
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

  // Populate local form state when query data arrives
  useEffect(() => {
    if (shop) {
      setFormData({
        shopName: shop.shopName || "Cherrybrush |  Booking Service",
        phone: shop.phone || "",
        location: shop.location || "Jaipur, Rajasthan, India",
        openingTimings: {
          ...DEFAULT_TIMINGS,
          ...(shop.openingTimings || {}),
        },
      });
      const initialImages: SortableImageItem[] = (shop.shopImages || []).map(
        (url, i) => ({
          id: `shop-existing-${url}-${i}`,
          url,
          isExisting: true,
          name: `Studio ${i + 1}`,
        })
      );
      setStagedImages(initialImages);
    }
  }, [shop]);

  // 2. Mutation for updating shop via PUT /admin/shop and invalidating ["shop"]
  const updateShopMutation = useMutation({
    mutationFn: async () => {
      const newFilesToUpload = stagedImages
        .filter((it) => it.file && !it.isExisting)
        .map((it) => it.file as File);
      const retainedImages = stagedImages
        .filter((it) => it.isExisting && it.url)
        .map((it) => it.url);

      if (newFilesToUpload.length > 0) {
        // Multipart/form-data for uploading raw images directly to Cloudinary
        const fd = new FormData();
        fd.append("shopName", formData.shopName.trim());
        fd.append("phone", formData.phone.trim());
        fd.append("location", formData.location.trim());
        fd.append("openingTimings", JSON.stringify(formData.openingTimings));

        // Append retained existing Cloudinary images in current reordered sequence
        retainedImages.forEach((imgUrl) => {
          fd.append("shopImages", imgUrl);
        });

        // Append new image files in current reordered sequence (field 'images' per BackendSpec)
        newFilesToUpload.forEach((file) => {
          fd.append("images", file);
        });

        const res = await apiFetch(`${zodEnv.BACKEND_URL}/admin/shop`, {
          method: "PUT",
          body: fd,
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.message || `Failed to update shop (${res.status})`);
        }

        return await res.json();
      } else {
        // JSON payload when no new image files are uploaded
        const res = await apiFetch(`${zodEnv.BACKEND_URL}/admin/shop`, {
          method: "PUT",
          body: JSON.stringify({
            shopName: formData.shopName.trim(),
            phone: formData.phone.trim(),
            location: formData.location.trim(),
            openingTimings: formData.openingTimings,
            shopImages: retainedImages,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.message || `Failed to update shop (${res.status})`);
        }

        return await res.json();
      }
    },
    onSuccess: () => {
      // Invalidate the shop query key so the whole app receives fresh data
      queryClient.invalidateQueries({ queryKey: ["shop"] });
      queryClient.invalidateQueries({ queryKey: ["adminShop"] });

      setSuccessMessage("Shop profile and operating hours updated successfully!");
      setErrorMessage("");
      setTimeout(() => setSuccessMessage(""), 5000);
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to update shop settings");
      setSuccessMessage("");
    },
  });

  // Form Field Handlers
  const handleInputChange = (field: keyof Omit<ShopFormData, "openingTimings">, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTimingChange = (dayKey: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      openingTimings: {
        ...prev.openingTimings,
        [dayKey]: value,
      },
    }));
  };

  const toggleDayClosed = (dayKey: string) => {
    setFormData((prev) => {
      const current = prev.openingTimings[dayKey] || "";
      const isClosed = current.toLowerCase().includes("closed");
      return {
        ...prev,
        openingTimings: {
          ...prev.openingTimings,
          [dayKey]: isClosed ? "10:00 AM – 07:00 PM" : "Closed",
        },
      };
    });
  };

  // Preset Shortcuts
  const applyStandardHours = () => {
    setFormData((prev) => ({
      ...prev,
      openingTimings: { ...DEFAULT_TIMINGS },
    }));
  };

  const copyMondayToWeekdays = () => {
    const mondayVal = formData.openingTimings.monday || "10:00 AM – 07:00 PM";
    setFormData((prev) => ({
      ...prev,
      openingTimings: {
        ...prev.openingTimings,
        monday: mondayVal,
        tuesday: mondayVal,
        wednesday: mondayVal,
        thursday: mondayVal,
        friday: mondayVal,
      },
    }));
  };

  // Image Management Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const selected = Array.from(e.target.files);

    // Limit to 10 files total across gallery
    if (stagedImages.length + selected.length > 10) {
      setErrorMessage("Maximum 10 showcase images allowed across gallery.");
      return;
    }

    const newItems: SortableImageItem[] = selected.map((file, i) => ({
      id: `shop-new-${file.name}-${file.lastModified}-${Date.now()}-${i}`,
      url: URL.createObjectURL(file),
      file,
      isExisting: false,
      name: file.name,
      size: file.size,
    }));

    setStagedImages((prev) => [...prev, ...newItems]);
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = (id: string) => {
    setStagedImages((prev) => {
      const item = prev.find((it) => it.id === id);
      if (item && !item.isExisting && item.url) {
        URL.revokeObjectURL(item.url);
      }
      return prev.filter((it) => it.id !== id);
    });
  };

  const handleReset = () => {
    if (shop) {
      setFormData({
        shopName: shop.shopName || "Cherrybrush |  Booking Service",
        phone: shop.phone || "",
        location: shop.location || "Jaipur, Rajasthan, India",
        openingTimings: {
          ...DEFAULT_TIMINGS,
          ...(shop.openingTimings || {}),
        },
      });
      // Revoke any temporary object URLs
      stagedImages.forEach((it) => {
        if (!it.isExisting && it.url) URL.revokeObjectURL(it.url);
      });
      const initialImages: SortableImageItem[] = (shop.shopImages || []).map(
        (url, i) => ({
          id: `shop-existing-${url}-${i}`,
          url,
          isExisting: true,
          name: `Studio ${i + 1}`,
        })
      );
      setStagedImages(initialImages);
      setErrorMessage("");
      setSuccessMessage("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!formData.shopName.trim()) {
      setErrorMessage("Shop name is required.");
      return;
    }
    if (!formData.location.trim()) {
      setErrorMessage("Shop location is required.");
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMessage("Contact phone number is required.");
      return;
    }

    updateShopMutation.mutate();
  };

  // Auth Redirect State
  if (isAuthenticated === false) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-center">
        <p className="font-medium">Redirecting to admin authentication...</p>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-28 min-h-screen bg-[#FAFAFA] font-sans antialiased text-[#18181B]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E4E7]">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <a
                href="/admin/edit-services"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#71717A] hover:text-[#18181B] bg-white border border-[#E4E4E7] px-3 py-1.5 rounded-full transition-all shadow-2xs hover:shadow-xs active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Services & Catalog</span>
              </a>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                <ShieldCheck className="w-3 h-3" />
                Admin Studio Profile
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18181B] pt-1">
              Shop Profile & Schedule
            </h1>
            <p className="text-xs sm:text-sm text-[#71717A]">
              Configure your salon identity, contact details, weekly operating hours, and Cloudinary showcase images.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E4E4E7] text-[#18181B] hover:bg-[#F4F4F5] transition-all shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#71717A]" />
              <span>Customer View</span>
            </a>
          </div>
        </div>

        {/* Status Alerts */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm font-medium">{successMessage}</div>
            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              className="text-emerald-700 hover:text-emerald-900 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm font-medium">{errorMessage}</div>
            <button
              type="button"
              onClick={() => setErrorMessage("")}
              className="text-rose-700 hover:text-rose-900 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {isShopLoading && (
          <div className="bg-white border border-[#E4E4E7] rounded-3xl p-8 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#18181B] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-[#71717A]">Fetching latest shop profile from backend...</p>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (Primary Details & Weekly Timings) - 7 cols */}
          <div className="lg:col-span-7 space-y-8">
            {/* Card 1: Core Business Information */}
            <div className="bg-white border border-[#E4E4E7] rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-[#F4F4F5]">
                <div className="w-9 h-9 rounded-2xl bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center text-[#18181B]">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#18181B]">General Information</h2>
                  <p className="text-xs text-[#71717A]">Public identification and client contact details.</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Shop Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#18181B]">
                    Shop Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={formData.shopName}
                      onChange={(e) => handleInputChange("shopName", e.target.value)}
                      placeholder="e.g. Cherrybrush Studio"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E4E7] rounded-xl text-xs sm:text-sm text-[#18181B] placeholder-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#18181B]/10 focus:border-[#18181B] transition-all"
                    />
                  </div>
                </div>

                {/* Contact Phone & Account Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#18181B]">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        placeholder="e.g. +91 9876543210"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E4E7] rounded-xl text-xs sm:text-sm text-[#18181B] placeholder-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#18181B]/10 focus:border-[#18181B] transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-[#18181B]">
                        Account Email
                      </label>
                      <span className="text-[10px] text-[#71717A] bg-[#F4F4F5] px-2 py-0.5 rounded-full border border-[#E4E4E7]">
                        Auth Only
                      </span>
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        disabled
                        value={shop?.email || "cherrybrush.in@gmail.com"}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl text-xs sm:text-sm text-[#71717A] cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* Location / Physical Address */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#18181B]">
                    Studio Address / Location <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-3 pointer-events-none" />
                    <textarea
                      rows={2}
                      required
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      placeholder="e.g. 1st Floor, Bandra West, Mumbai, Maharashtra 400050"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E4E7] rounded-xl text-xs sm:text-sm text-[#18181B] placeholder-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#18181B]/10 focus:border-[#18181B] transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Operating Hours & Weekly Schedule */}
            <div className="bg-white border border-[#E4E4E7] rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F4F4F5]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center text-[#18181B]">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#18181B]">Operating Hours</h2>
                    <p className="text-xs text-[#71717A]">
                      Controls customer 1-hour booking slot mapping in real-time.
                    </p>
                  </div>
                </div>

                {/* Presets Toolbar */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={applyStandardHours}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#18181B] border border-[#E4E4E7] transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Default 10-7</span>
                  </button>
                  <button
                    type="button"
                    onClick={copyMondayToWeekdays}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#18181B] border border-[#E4E4E7] transition-colors"
                  >
                    <Copy className="w-3 h-3 text-[#71717A]" />
                    <span>Sync Weekdays</span>
                  </button>
                </div>
              </div>

              {/* Day-by-Day List */}
              <div className="space-y-2.5">
                {DAYS_OF_WEEK.map(({ key, label, short }) => {
                  const currentValue = formData.openingTimings[key] ?? "Closed";
                  const isClosed = currentValue.trim().toLowerCase() === "closed";

                  return (
                    <div
                      key={key}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
                        isClosed
                          ? "bg-[#FAFAFA] border-[#E4E4E7]/70"
                          : "bg-white border-[#E4E4E7] shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:w-36 shrink-0">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                            isClosed
                              ? "bg-[#F4F4F5] text-[#71717A]"
                              : "bg-[#18181B] text-white"
                          }`}
                        >
                          {short}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-[#18181B]">{label}</p>
                          <span
                            className={`inline-block text-[10px] font-medium ${
                              isClosed ? "text-rose-600" : "text-emerald-600"
                            }`}
                          >
                            {isClosed ? "Closed" : "Open for Bookings"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={currentValue}
                          disabled={isClosed}
                          onChange={(e) => handleTimingChange(key, e.target.value)}
                          placeholder="e.g. 10:00 AM – 07:00 PM"
                          className={`w-full px-3 py-1.5 rounded-xl border text-xs transition-all ${
                            isClosed
                              ? "bg-[#F4F4F5] text-[#A1A1AA] border-[#E4E4E7] cursor-not-allowed"
                              : "bg-white text-[#18181B] border-[#E4E4E7] focus:ring-1 focus:ring-[#18181B] focus:border-[#18181B]"
                          }`}
                        />

                        <button
                          type="button"
                          onClick={() => toggleDayClosed(key)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border shrink-0 transition-colors ${
                            isClosed
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                          }`}
                        >
                          {isClosed ? "Mark Open" : "Mark Closed"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column (Showcase Images & Actions) - 5 cols */}
          <div className="lg:col-span-5 space-y-8">
            {/* Card 3: Showcase Images & Cloudinary Upload */}
            <div className="bg-white border border-[#E4E4E7] rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#F4F4F5]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center text-[#18181B]">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#18181B]">Shop Gallery</h2>
                    <p className="text-xs text-[#71717A]">
                      Showcased on booking pages and customer cards.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-[#71717A] bg-[#F4F4F5] px-2.5 py-1 rounded-full border border-[#E4E4E7]">
                  {stagedImages.length} / 10
                </span>
              </div>

              {/* Upload Drop Area */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="shop-image-upload"
                />
                <label
                  htmlFor="shop-image-upload"
                  className="border-2 border-dashed border-[#E4E4E7] hover:border-[#18181B] bg-[#FAFAFA] hover:bg-[#F4F4F5] rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group block"
                >
                  <div className="w-10 h-10 rounded-full bg-white border border-[#E4E4E7] group-hover:scale-105 transition-transform flex items-center justify-center text-[#71717A]">
                    <UploadCloud className="w-5 h-5 text-[#18181B]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#18181B]">
                      Click or drag images to upload
                    </p>
                    <p className="text-[11px] text-[#71717A] mt-0.5">
                      Direct Cloudinary upload via PUT /admin/shop (up to 10 files)
                    </p>
                  </div>
                </label>
              </div>

              {/* Drag and Drop Sortable Showcase Gallery */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#18181B] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-pink-600" />
                    <span>Showcase Photos ({stagedImages.length})</span>
                  </p>
                  <span className="text-[10px] text-[#71717A]">
                    Drag to reorder • #1 is Cover Photo
                  </span>
                </div>

                <SortableImageGrid
                  items={stagedImages}
                  onReorder={setStagedImages}
                  onRemove={handleRemoveImage}
                  maxItems={10}
                />
              </div>
            </div>

            {/* Card 4: Live Customer Booking Preview */}
            <div className="bg-gradient-to-br from-rose-50/70 to-pink-50/40 border border-rose-100 rounded-3xl p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                  Live Customer Preview
                </h3>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-rose-100/80 shadow-2xs space-y-2">
                {stagedImages[0]?.url ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-[#E4E4E7] mb-2 bg-[#F4F4F5]">
                    <img
                      src={stagedImages[0].url}
                      alt="Cover Preview"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-[#18181B]/80 text-[10px] font-semibold text-white tracking-wider uppercase backdrop-blur-xs">
                      Cover Photo
                    </span>
                  </div>
                ) : null}
                {formData.shopName ? (
                  <p className="text-sm font-bold text-[#18181B]">
                    {formData.shopName}
                  </p>
                ) : null}
                {formData.location ? (
                  <p className="text-xs text-[#71717A] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0" />
                    <span className="truncate">{formData.location}</span>
                  </p>
                ) : null}
                {formData.phone ? (
                  <p className="text-xs text-[#71717A] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0" />
                    <span>{formData.phone}</span>
                  </p>
                ) : null}
                {formData.openingTimings.monday ? (
                  <div className="pt-2 border-t border-[#F4F4F5] flex items-center justify-between text-[11px]">
                    <span className="text-[#71717A]">Today's Status:</span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {formData.openingTimings.monday}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Card 5: Sticky Save Action Bar */}
            <div className="bg-white border border-[#E4E4E7] rounded-3xl p-6 shadow-xs space-y-3">
              <button
                type="submit"
                disabled={updateShopMutation.isPending}
                className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold tracking-wide uppercase transition-all flex items-center justify-center gap-2 bg-[#18181B] hover:bg-black text-white active:scale-98 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateShopMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving to Cloudinary & DB…</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Shop Profile</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={updateShopMutation.isPending}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-[#71717A] hover:text-[#18181B] bg-[#FAFAFA] hover:bg-[#F4F4F5] border border-[#E4E4E7] transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Unsaved Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditShop() {
  return (
    <QueryClientProvider client={queryClient}>
      <EditShopInner />
    </QueryClientProvider>
  );
}

export default EditShop;
