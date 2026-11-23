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
import {
  SortableImageGrid,
  type SortableImageItem,
} from "./ui/SortableImageGrid.tsx";
import {
  Pencil,
  Trash2,
  UploadCloud,
  Check,
  Plus,
} from "lucide-react";

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
  const [stagedImages, setStagedImages] = useState<SortableImageItem[]>([]);
  const [optionRows, setOptionRows] = useState<OptionRow[]>([]);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Edit & Delete states
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setIsAuthenticated(false);
      window.location.href = "/admin/login";
    } else {
      setIsAuthenticated(true);
    }
  }, []);

  // 1. Fetch Shop details via useQuery
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

  const storedAdmin = typeof window !== "undefined" ? getStoredAdminInfo() : null;
  const shopId = shop?._id ?? shop?.id ?? (shop as any)?.shopId ?? storedAdmin?.adminId;

  const storedAdminId =
    typeof window !== "undefined" ? localStorage.getItem("adminId") : null;
  const effectiveShopId = storedAdminId || shopId;

  // 2. Fetch Services catalog with key ['services'] via useQuery
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

  // Extract unique existing service categories
  const existingTypes = React.useMemo(() => {
    return Array.from(
      new Set(
        services
          .map((s) => s.serviceType?.trim())
          .filter((t): t is string => Boolean(t)),
      ),
    );
  }, [services]);

  // Cancel Edit and reset form back to create mode
  const handleCancelEdit = () => {
    // Revoke any temporary object URLs
    stagedImages.forEach((item) => {
      if (!item.isExisting && item.url) {
        URL.revokeObjectURL(item.url);
      }
    });

    setEditingService(null);
    setServiceName("");
    setServiceType("");
    setServiceDuration("45 mins");
    setBasePrice("");
    setServiceDown(false);
    setStagedImages([]);
    setOptionRows([]);
    setFormError("");
    setSuccessMessage("");
  };

  // Start Editing an existing service
  const handleStartEdit = (svc: Service) => {
    // Revoke previous staged URLs if any
    stagedImages.forEach((item) => {
      if (!item.isExisting && item.url) {
        URL.revokeObjectURL(item.url);
      }
    });

    setEditingService(svc);
    setServiceName(svc.serviceName || "");
    setServiceType(svc.serviceType || "");
    setServiceDuration(svc.serviceDuration || "45 mins");
    setBasePrice(
      svc.basePrice !== undefined && svc.basePrice !== null
        ? String(svc.basePrice).replace(/^₹/, "")
        : ""
    );
    setServiceDown(Boolean(svc.serviceDown));

    // Map existing Cloudinary images to sortable items
    const loadedImages: SortableImageItem[] = (svc.serviceImages || []).map(
      (url, i) => ({
        id: `existing-${url}-${i}`,
        url,
        isExisting: true,
        name: `Photo ${i + 1}`,
      })
    );
    setStagedImages(loadedImages);

    // Convert serviceOptions to optionRows
    const rows: OptionRow[] = [];
    if (svc.serviceOptions) {
      Object.entries(svc.serviceOptions).forEach(([groupName, features]) => {
        if (Array.isArray(features)) {
          features.forEach((f) => {
            rows.push({
              groupName: groupName || "Add-ons",
              name: f.name || "",
              price: f.price || "₹",
            });
          });
        }
      });
    }
    setOptionRows(rows);
    setFormError("");
    setSuccessMessage("");

    // Scroll form into view
    window.scrollTo({ top: 200, behavior: "smooth" });
  };

  // Handle adding new files to stagedImages
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    if (stagedImages.length + files.length > 10) {
      setFormError("Maximum 10 images allowed per service.");
      return;
    }

    const newItems: SortableImageItem[] = files.map((file, i) => ({
      id: `file-${file.name}-${file.lastModified}-${Date.now()}-${i}`,
      url: URL.createObjectURL(file),
      file,
      isExisting: false,
      name: file.name,
      size: file.size,
    }));

    setStagedImages((prev) => [...prev, ...newItems]);
    setFormError("");

    // Clear input so same file can be re-selected if removed
    e.target.value = "";
  };

  // Handle removing a single image from stagedImages
  const handleRemoveStagedImage = (id: string) => {
    setStagedImages((prev) => {
      const item = prev.find((it) => it.id === id);
      if (item && !item.isExisting && item.url) {
        URL.revokeObjectURL(item.url);
      }
      return prev.filter((it) => it.id !== id);
    });
  };

  // 3. Create Service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiFetch(`/admin/services/create`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.message || `Failed to create service (${res.status})`
        );
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setSuccessMessage("Service created and added to catalog successfully!");
      handleCancelEdit();
      setTimeout(() => setSuccessMessage(""), 5000);
    },
    onError: (err: Error) => {
      setFormError(err.message || "Failed to create service");
      setSuccessMessage("");
    },
  });

  // 4. Edit/Update Service mutation
  const editServiceMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const svcId = editingService?._id || editingService?.id;
      if (!svcId) throw new Error("Service ID is required for editing");

      let res = await apiFetch(`/admin/services/edit/${svcId}`, {
        method: "POST",
        body: formData,
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await apiFetch(`/admin/services/${svcId}`, {
          method: "PUT",
          body: formData,
        }).catch(() => null);
      }

      if (!res || !res.ok) {
        res = await apiFetch(`/admin/services/edit`, {
          method: "POST",
          body: formData,
        }).catch(() => null);
      }

      if (!res || !res.ok) {
        res = await apiFetch(`/admin/services/${svcId}`, {
          method: "PATCH",
          body: formData,
        });
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.message || `Failed to update service (${res.status})`
        );
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setSuccessMessage(`Service "${serviceName}" updated successfully!`);
      handleCancelEdit();
      setTimeout(() => setSuccessMessage(""), 5000);
    },
    onError: (err: Error) => {
      setFormError(err.message || "Failed to update service");
      setSuccessMessage("");
    },
  });

  // 5. Delete Service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (svcId: string) => {
      let res = await apiFetch(`/admin/services/${svcId}`, {
        method: "DELETE",
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await apiFetch(`/admin/services/delete/${svcId}`, {
          method: "DELETE",
        }).catch(() => null);
      }

      if (!res || !res.ok) {
        res = await apiFetch(`/admin/services/delete`, {
          method: "POST",
          body: JSON.stringify({ serviceId: svcId, id: svcId }),
        });
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.message || `Failed to delete service (${res.status})`
        );
      }

      return await res.json();
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setSuccessMessage("Service deleted successfully!");
      if (
        editingService &&
        (editingService._id === deletedId || editingService.id === deletedId)
      ) {
        handleCancelEdit();
      }
      setDeletingId(null);
      setTimeout(() => setSuccessMessage(""), 5000);
    },
    onError: (err: Error) => {
      setFormError(err.message || "Failed to delete service");
      setDeletingId(null);
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
    value: string
  ) => {
    setOptionRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    const adminId =
      typeof window !== "undefined" ? localStorage.getItem("adminId") : null;
    const targetShopId = adminId || shopId;

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

    // Append images in their EXACT reordered sequence
    stagedImages.forEach((item) => {
      if (item.file) {
        fd.append("images", item.file);
      } else if (item.isExisting) {
        fd.append("existingImages", item.url);
        fd.append("serviceImages", item.url);
      }
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

    if (editingService) {
      const svcId = editingService.id ?? editingService._id;
      if (svcId) {
        fd.append("serviceId", String(svcId));
        fd.append("id", String(svcId));
        fd.append("_id", String(svcId));
      }
      editServiceMutation.mutate(fd);
    } else {
      createServiceMutation.mutate(fd);
    }
  };

  if (isAuthenticated === false) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-center">
        <p className="font-medium">Redirecting to admin login...</p>
      </div>
    );
  }

  const isMutating =
    createServiceMutation.isPending || editServiceMutation.isPending;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* 1. Header & Shop Overview */}
      <section className="bg-gradient-to-r from-rose-50 to-pink-50/50 rounded-3xl p-6 md:p-8 border border-rose-100 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E2B4BD]/30 text-[#9B6A73] text-xs font-semibold mb-2">
              <span>Admin Management</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
              Services & Pricing Catalog
            </h1>
            <p className="text-sm text-neutral-600 mt-1">
              Configure treatments, service timings, add-on features, and
              showcase images.
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
        {/* 2. Create or Edit Service Form */}
        <div
          id="service-form"
          className={`lg:col-span-5 bg-white rounded-3xl p-6 md:p-7 border transition-all ${
            editingService
              ? "border-[#E2B4BD] ring-2 ring-[#E2B4BD]/20 shadow-md"
              : "border-neutral-200 shadow-sm"
          }`}
        >
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                {editingService ? "Edit Service" : "Create New Service"}
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                {editingService
                  ? `Modifying "${editingService.serviceName}". Save changes or cancel.`
                  : "Fill out service details and upload images to add to the live catalog."}
              </p>
            </div>

            {editingService && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E2B4BD]/20 text-[#9B6A73] shrink-0">
                Edit Mode
              </span>
            )}
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
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-[#E2B4BD] focus:ring-1 focus:ring-[#E2B4BD] transition"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Category / Type <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hair, Nails, Facial"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  list="category-suggestions"
                  className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-[#E2B4BD] focus:ring-1 focus:ring-[#E2B4BD] transition"
                  required
                />
                {existingTypes.length > 0 && (
                  <datalist id="category-suggestions">
                    {existingTypes.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Duration <span className="text-rose-500">*</span>
                </label>
                <select
                  value={serviceDuration}
                  onChange={(e) => setServiceDuration(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-[#E2B4BD] focus:ring-1 focus:ring-[#E2B4BD] transition bg-white"
                >
                  <option value="15 mins">15 mins</option>
                  <option value="30 mins">30 mins</option>
                  <option value="45 mins">45 mins</option>
                  <option value="60 mins">60 mins</option>
                  <option value="90 mins">90 mins</option>
                  <option value="120 mins">120 mins</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Base Price
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">
                  ₹
                </span>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 pl-8 pr-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-[#E2B4BD] focus:ring-1 focus:ring-[#E2B4BD] transition"
                />
              </div>
            </div>

            {/* DnD Kit Sortable Image Grid */}
            {stagedImages.length > 0 && (
              <div className="pt-2">
                <SortableImageGrid
                  items={stagedImages}
                  onReorder={setStagedImages}
                  onRemove={handleRemoveStagedImage}
                  maxItems={10}
                />
              </div>
            )}

            {/* Upload Additional or New Images */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                {stagedImages.length > 0 ? "Add More Photos" : "Showcase Images"}
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesSelected}
                className="w-full text-xs text-neutral-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#E2B4BD]/20 file:text-[#9B6A73] hover:file:bg-[#E2B4BD]/30 cursor-pointer"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Drag cards above to set cover photo and rearrange showcase sequence.
              </p>
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
                  className="text-xs text-[#9B6A73] hover:text-[#7A4E56] font-semibold cursor-pointer"
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
                        className="flex-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#E2B4BD]"
                      />
                      <input
                        type="text"
                        placeholder="Price (₹)"
                        value={row.price}
                        onChange={(e) =>
                          handleOptionChange(idx, "price", e.target.value)
                        }
                        className="w-20 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs focus:outline-none focus:border-[#E2B4BD]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-neutral-400 hover:text-rose-600 text-sm px-1 cursor-pointer"
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
                Keep in catalog for admins, but hide from customer booking slots.
              </label>
            </div>

            {/* Action Buttons: Submit / Save Changes vs Cancel */}
            <div className="flex items-center gap-2.5 pt-2">
              <Button
                type="submit"
                disabled={isMutating}
                className="flex-1 cursor-pointer"
              >
                {editingService
                  ? editServiceMutation.isPending
                    ? "Updating Service..."
                    : "Save Changes"
                  : createServiceMutation.isPending
                  ? "Creating & Uploading..."
                  : "Publish Service"}
              </Button>

              {editingService && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isMutating}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 transition cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 3. Existing Services Catalog */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">
                Current Services
              </h2>
              <p className="text-xs text-neutral-500">
                Manage, edit, or delete existing treatments from your salon menu.
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
                const isCurrentEditing = Boolean(
                  editingService &&
                  (editingService._id === svcId || editingService.id === svcId)
                );
                const isDeleting = deletingId === svcId;

                return (
                  <div
                    key={svcId}
                    className={`p-5 rounded-2xl bg-white border transition space-y-3 shadow-2xs ${
                      isCurrentEditing
                        ? "border-[#E2B4BD] ring-2 ring-[#E2B4BD]/20 bg-[#FFF5F5]/30"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-neutral-900 text-base">
                            {svc.serviceName}
                          </h3>
                          {isCurrentEditing && (
                            <span className="px-2 py-0.5 rounded-full bg-[#E2B4BD]/20 text-[#9B6A73] text-[10px] font-bold">
                              Editing
                            </span>
                          )}
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
                          {svc.basePrice !== undefined &&
                            svc.basePrice !== null && (
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

                      {/* Edit & Delete Action Buttons */}
                      <div className="shrink-0">
                        {isDeleting ? (
                          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-red-50 border border-red-100">
                            <span className="text-[11px] font-semibold text-red-700">
                              Delete?
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                svcId && deleteServiceMutation.mutate(svcId)
                              }
                              disabled={deleteServiceMutation.isPending}
                              className="px-2.5 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition cursor-pointer disabled:opacity-50"
                            >
                              {deleteServiceMutation.isPending
                                ? "Deleting..."
                                : "Yes"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-200/60 rounded-lg transition cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(svc)}
                              disabled={isCurrentEditing}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
                                isCurrentEditing
                                  ? "bg-[#E2B4BD] text-white"
                                  : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                              }`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              {isCurrentEditing ? "Editing" : "Edit"}
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletingId(svcId || null)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                              title="Delete service"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
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
