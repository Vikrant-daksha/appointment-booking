import React, { useState, useEffect, useMemo } from "react";
import {
  useQuery,
  useQueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient.ts";
import { apiFetch, getStoredAdminInfo } from "../lib/api.ts";
import { zodEnv } from "../lib/zodEnv.ts";
import type { Booking, BookingStatus } from "../types/booking.ts";
import {
  Calendar,
  Clock,
  Phone,
  User,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  XCircle,
  CalendarCheck,
  TrendingUp,
  X,
  Copy,
  Check,
} from "lucide-react";

function CustomerBookingsInner() {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal inspection state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Authentication check
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setIsAuthenticated(false);
      window.location.href = "/admin/login";
    } else {
      setIsAuthenticated(true);
    }
  }, []);

  // Format today's date in YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  }, []);

  // Fetch customer bookings with TanStack useQuery
  const storedAdmin = typeof window !== "undefined" ? getStoredAdminInfo() : null;
  const storedAdminId =
    typeof window !== "undefined" ? localStorage.getItem("adminId") : null;
  const shopId = storedAdminId || storedAdmin?.adminId;

  const {
    data: allBookings = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<Booking[]>({
    queryKey: ["customer-bookings", { shopId, dateFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter) params.append("date", dateFilter);
      if (shopId) params.append("shopId", shopId);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await apiFetch(`${zodEnv.BACKEND_URL}/bookings/get-bookings${qs}`);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to fetch bookings");
      }

      const json = await res.json();
      return (json.bookings ?? json.data ?? []) as Booking[];
    },
    enabled: isAuthenticated === true,
    staleTime: 1000 * 60 * 3, // Cache query for 3 minutes
    refetchOnWindowFocus: true,
  });

  // Client-side filtering & sorting
  const filteredBookings = useMemo(() => {
    return allBookings
      .filter((booking) => {
        // Status filter
        if (statusFilter !== "ALL" && booking.status !== statusFilter) {
          return false;
        }

        // Date filter
        if (dateFilter && booking.date !== dateFilter) {
          return false;
        }

        // Text search across name, phone, service names
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = booking.customerName?.toLowerCase().includes(q);
          const matchPhone = booking.customerPhone?.toLowerCase().includes(q);
          const matchServices = booking.cart?.some((item) =>
            item.serviceName?.toLowerCase().includes(q)
          );
          if (!matchName && !matchPhone && !matchServices) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Sort descending by date, then timeSlot or createdAt
        const dateA = a.date || "";
        const dateB = b.date || "";
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      });
  }, [allBookings, statusFilter, dateFilter, searchQuery]);

  // Reset pagination when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFilter, pageSize]);

  // Derived pagination variables
  const totalItems = filteredBookings.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = allBookings.length;
    const confirmed = allBookings.filter((b) => b.status === "CONFIRMED").length;
    const todayCount = allBookings.filter((b) => b.date === todayStr).length;
    const totalRevenue = allBookings.reduce((sum, b) => {
      const bTotal = b.cart?.reduce((sub, item) => sub + (item.totalPrice || 0), 0) || 0;
      return sum + bTotal;
    }, 0);

    return { total, confirmed, todayCount, totalRevenue };
  }, [allBookings, todayStr]);

  // Copy phone helper
  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2B4BD]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#E2B4BD]/20 text-[#9B6A73]">
              Admin Panel
            </span>
            <span className="text-xs text-neutral-400">•</span>
            <span className="text-xs text-neutral-500">Live Database</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            Customer Bookings
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            View, filter, and inspect client appointments and order breakdowns.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-neutral-200 text-neutral-700 shadow-xs hover:bg-neutral-50 hover:border-neutral-300 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-[#E2B4BD]" : ""}`} />
            {isFetching ? "Refreshing..." : "Refresh Data"}
          </button>

          <a
            href="/admin/edit-services"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#E2B4BD] text-white shadow-xs hover:bg-[#d69fa9] transition-all cursor-pointer"
          >
            Edit Services
          </a>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Total Bookings</span>
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-neutral-900 mt-2">
            {metrics.total}
          </p>
          <span className="text-[11px] text-neutral-500 mt-1 block">Lifetime client bookings</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Confirmed</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-2">
            {metrics.confirmed}
          </p>
          <span className="text-[11px] text-neutral-500 mt-1 block">Active confirmed reservations</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Today's Schedule</span>
            <div className="w-8 h-8 rounded-lg bg-[#E2B4BD]/20 flex items-center justify-center text-[#9B6A73]">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#9B6A73] mt-2">
            {metrics.todayCount}
          </p>
          <span className="text-[11px] text-neutral-500 mt-1 block">Appointments for {todayStr}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Est. Order Value</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-purple-700 mt-2">
            ₹{metrics.totalRevenue.toLocaleString("en-IN")}
          </p>
          <span className="text-[11px] text-neutral-500 mt-1 block">Total booked service revenue</span>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by name, phone, service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:border-[#E2B4BD] focus:ring-1 focus:ring-[#E2B4BD] bg-neutral-50/50"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:border-[#E2B4BD] focus:ring-1 focus:ring-[#E2B4BD] bg-neutral-50/50 text-neutral-700 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Date Picker Filter */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:border-[#E2B4BD] focus:ring-1 focus:ring-[#E2B4BD] bg-neutral-50/50 text-neutral-700 cursor-pointer"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter("")}
                title="Clear date filter"
                className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDateFilter(todayStr)}
              className={`flex-1 py-2 text-xs font-medium rounded-xl border transition ${
                dateFilter === todayStr
                  ? "bg-[#E2B4BD] text-white border-[#E2B4BD]"
                  : "bg-neutral-50/50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                setDateFilter("");
                setStatusFilter("ALL");
                setSearchQuery("");
              }}
              className="flex-1 py-2 text-xs font-medium rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-700 hover:bg-neutral-100 transition"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-neutral-200 animate-pulse">
              <div className="h-4 bg-neutral-200 rounded w-1/4 mb-3"></div>
              <div className="h-3 bg-neutral-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-neutral-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl p-8 border border-red-200 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-neutral-900">Failed to load bookings</h3>
          <p className="text-xs text-neutral-500 mt-1">{(error as Error).message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition"
          >
            Retry Fetch
          </button>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-neutral-200/80 text-center">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mx-auto mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">No bookings found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
            {searchQuery || dateFilter || statusFilter !== "ALL"
              ? "No reservations match your current filter criteria. Try clearing search or date filters."
              : "No customer bookings have been made yet."}
          </p>
          {(searchQuery || dateFilter || statusFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setDateFilter("");
                setStatusFilter("ALL");
              }}
              className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-[#E2B4BD] text-white hover:bg-[#d69fa9] transition"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Bookings List Cards */}
          <div className="space-y-3.5 mb-6">
            {paginatedBookings.map((booking) => {
              const bookingTotal =
                booking.cart?.reduce((acc, it) => acc + (it.totalPrice || 0), 0) || 0;

              return (
                <div
                  key={booking._id || booking.id || `${booking.customerPhone}-${booking.date}-${booking.timeSlot}`}
                  className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-xs hover:border-neutral-300 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Customer & Appointment Info */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#E2B4BD]/20 flex items-center justify-center text-[#9B6A73] shrink-0 mt-0.5 font-bold text-sm">
                        {booking.customerName ? booking.customerName.charAt(0).toUpperCase() : "C"}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-neutral-900">
                            {booking.customerName}
                          </h4>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              booking.status === "CONFIRMED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : booking.status === "COMPLETED"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </div>

                        {/* Contact details */}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-neutral-500">
                          <div className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-neutral-400" />
                            <a
                              href={`tel:${booking.customerPhone}`}
                              className="hover:text-neutral-800 transition"
                            >
                              {booking.customerPhone}
                            </a>
                            <button
                              onClick={() => handleCopyPhone(booking.customerPhone)}
                              title="Copy phone"
                              className="ml-1 text-neutral-400 hover:text-neutral-700 transition"
                            >
                              {copiedPhone === booking.customerPhone ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          <span className="text-neutral-300">•</span>

                          <div className="flex items-center gap-1 font-medium text-neutral-700">
                            <Calendar className="w-3.5 h-3.5 text-[#E2B4BD]" />
                            <span>{booking.date}</span>
                          </div>

                          <span className="text-neutral-300">•</span>

                          <div className="flex items-center gap-1 font-medium text-neutral-700">
                            <Clock className="w-3.5 h-3.5 text-[#E2B4BD]" />
                            <span>{booking.timeSlot}</span>
                          </div>
                        </div>

                        {/* Services Preview */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {booking.cart?.map((item, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-lg border border-neutral-200/60 inline-flex items-center gap-1"
                            >
                              <ShoppingBag className="w-3 h-3 text-neutral-400" />
                              <span className="font-medium">{item.serviceName}</span>
                              {item.selectedOptions && item.selectedOptions.length > 0 && (
                                <span className="text-[10px] text-neutral-400">
                                  ({item.selectedOptions.length} opts)
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Total & Actions */}
                    <div className="flex items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-neutral-100">
                      <div className="text-left lg:text-right">
                        <span className="text-[11px] text-neutral-400 block">Total Price</span>
                        <span className="text-base font-bold text-neutral-900">
                          ₹{bookingTotal.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span>
                Showing <strong className="text-neutral-900">{startIndex + 1}</strong> to{" "}
                <strong className="text-neutral-900">{endIndex}</strong> of{" "}
                <strong className="text-neutral-900">{totalItems}</strong> bookings
              </span>
              <span className="text-neutral-300">•</span>
              <div className="flex items-center gap-1">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 text-xs border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-700 cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>
            </div>

            {/* Pagination Navigation */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  // Show first, last, and pages close to current page
                  return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
                })
                .map((page, idx, arr) => {
                  const prevPage = arr[idx - 1];
                  const hasGap = prevPage && page - prevPage > 1;

                  return (
                    <React.Fragment key={page}>
                      {hasGap && <span className="px-1 text-xs text-neutral-400">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-xl text-xs font-semibold transition ${
                          currentPage === page
                            ? "bg-[#E2B4BD] text-white shadow-xs"
                            : "border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal: Full Booking Details Inspection */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-[#E2B4BD]/20 flex items-center justify-center text-[#9B6A73] font-bold text-lg">
                {selectedBooking.customerName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  {selectedBooking.customerName}
                </h3>
                <span className="text-xs text-neutral-500">{selectedBooking.customerPhone}</span>
              </div>
            </div>

            {/* Appointment Meta */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-neutral-50 rounded-2xl mb-5 text-xs">
              <div>
                <span className="text-neutral-400 block text-[11px]">Appointment Date</span>
                <span className="font-semibold text-neutral-800 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-[#E2B4BD]" />
                  {selectedBooking.date}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[11px]">Time Slot</span>
                <span className="font-semibold text-neutral-800 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-[#E2B4BD]" />
                  {selectedBooking.timeSlot}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[11px]">Status</span>
                <span className="font-semibold text-emerald-700 mt-0.5 block">
                  {selectedBooking.status}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[11px]">Booked At</span>
                <span className="font-medium text-neutral-600 mt-0.5 block">
                  {selectedBooking.createdAt
                    ? new Date(selectedBooking.createdAt).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            </div>

            {/* Cart Items Breakdown */}
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
              Booked Services ({selectedBooking.cart?.length || 0})
            </h4>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 mb-5">
              {selectedBooking.cart?.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-neutral-100 bg-neutral-50/50 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-800">{item.serviceName}</span>
                    <span className="font-semibold text-neutral-900">₹{item.totalPrice}</span>
                  </div>

                  {item.selectedOptions && item.selectedOptions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {item.selectedOptions.map((opt, oIdx) => (
                        <span
                          key={oIdx}
                          className="text-[10px] bg-white text-neutral-600 px-2 py-0.5 rounded-md border border-neutral-200/80"
                        >
                          {opt.featureName} (+₹{opt.price})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total and Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
              <div>
                <span className="text-xs text-neutral-400 block">Total Due / Paid</span>
                <span className="text-lg font-bold text-neutral-900">
                  ₹
                  {selectedBooking.cart
                    ?.reduce((acc, it) => acc + (it.totalPrice || 0), 0)
                    .toLocaleString("en-IN")}
                </span>
              </div>

              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#E2B4BD] text-white hover:bg-[#d69fa9] transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerBookings() {
  return (
    <QueryClientProvider client={queryClient}>
      <CustomerBookingsInner />
    </QueryClientProvider>
  );
}

