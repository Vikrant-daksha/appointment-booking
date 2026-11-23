import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  useQuery,
  useMutation,
  QueryClientProvider,
} from "@tanstack/react-query";
import { queryClient } from "../../lib/queryClient.ts";
import { CartProvider, useCart } from "../../context/CartContext.tsx";
import { apiFetch } from "../../lib/api.ts";
import { zodEnv } from "../../lib/zodEnv.ts";
import type {
  PublicShop,
  BookingCreateRequest,
  BookingCreateResponse,
} from "../../types/booking.ts";
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  ChevronDown,
  Clock,
  Lock,
  Mail,
  Phone,
  Plus,
  Sparkles,
  User,
  Verified,
} from "lucide-react";
import { Calendar } from "../ui/calendar.tsx";
// @ts-ignore - SlideCommit is a React JSX component from reactbits
import SlideCommit from "../SlideCommit.jsx";

export interface TimeSlot {
  time: string;
  isAvailable: boolean;
  reason?: "taken" | "past" | "closed";
}

export interface DateTimeSlotPickerProps {
  initialShop?: PublicShop;
  shopId?: string;
  onContinue?: (
    selectedSlot: string,
    selectedDate: string,
    selectedIsoDate?: string,
    customerName?: string,
    phoneNumber?: string,
    customerEmail?: string,
  ) => void;
  onModifySelection?: () => void;
}

/**
 * Parses time strings like "10:00 AM", "7:00 PM", "10 AM", "7 PM" into minutes from midnight.
 */
function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const cleaned = timeStr.trim().toUpperCase();
  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const modifier = match[3];

  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Formats minutes from midnight into standard "hh:mm A" (e.g. 600 -> "10:00 AM", 780 -> "01:00 PM").
 */
function formatMinutesToTime(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const modifier = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  const paddedHours = hours12.toString().padStart(2, "0");
  const paddedMins = minutes.toString().padStart(2, "0");
  return `${paddedHours}:${paddedMins} ${modifier}`;
}

/**
 * Formats a Date object to YYYY-MM-DD local date string matching BackendSpec regex ^\d{4}-\d{2}-\d{2}$
 */
function formatIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Generates 1-hour increment arrival slots based on the day's opening and closing hours.
 * Disables slots if marked taken by backend (BackendSpec GET /bookings/taken-slots)
 * or if the slot has already elapsed today.
 */
function generateDayTimeSlots(
  daySchedule: string | undefined,
  takenSlots: string[],
  isToday: boolean,
): { slots: TimeSlot[]; isClosed: boolean; scheduleText: string } {
  const scheduleText = (daySchedule || "").trim();

  // If closed or empty schedule
  if (!scheduleText || scheduleText.toLowerCase() === "closed") {
    return { slots: [], isClosed: true, scheduleText: "Closed" };
  }

  // Parse start and end time (split by en-dash, hyphen, em-dash, or 'to')
  const parts = scheduleText.split(/[-–—]|to/i).map((s) => s.trim());
  if (parts.length < 2) {
    return { slots: [], isClosed: true, scheduleText };
  }

  const startMins = parseTimeToMinutes(parts[0]);
  const endMins = parseTimeToMinutes(parts[1]);

  if (startMins === null || endMins === null || endMins <= startMins) {
    return { slots: [], isClosed: true, scheduleText };
  }

  // Normalize taken slots for fast, robust lookup
  const takenSet = new Set<string>();
  const takenMinsList: number[] = [];

  takenSlots.forEach((slot) => {
    const parsed = parseTimeToMinutes(slot);
    if (parsed !== null) {
      takenSet.add(formatMinutesToTime(parsed));
      takenMinsList.push(parsed);
    } else {
      takenSet.add(slot.trim().toUpperCase());
    }
  });

  // Current time in minutes if checking today
  const now = new Date();
  const currentMinutesNow = now.getHours() * 60 + now.getMinutes();

  const slots: TimeSlot[] = [];
  let current = startMins;

  // Step in 1-hour (60 minutes) increments until closing time
  while (current + 60 <= endMins) {
    const formatted = formatMinutesToTime(current);

    // Check if slot is taken: exact match or falls inside 1-hour window
    const isTaken =
      takenSet.has(formatted) ||
      takenMinsList.some((tm) => tm >= current && tm < current + 60);

    // Check if slot has already passed today
    const isPast = isToday && current <= currentMinutesNow;

    slots.push({
      time: formatted,
      isAvailable: !isTaken && !isPast,
      reason: isTaken ? "taken" : isPast ? "past" : undefined,
    });

    current += 60;
  }

  return { slots, isClosed: false, scheduleText };
}

function DateTimeSlotPickerContent({
  initialShop,
  shopId: initialShopIdProp,
  onContinue,
  onModifySelection,
}: DateTimeSlotPickerProps) {
  const {
    items: cartItems,
    totalAmount,
    totalMinutes,
    totalCount,
    clearCart,
  } = useCart();
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Optional customer notes & booking error feedback
  const [notes, setNotes] = useState<string>("");
  const [bookingError, setBookingError] = useState<string | null>(null);

  // 1. Fetch Shop details to retrieve shopId and openingTimings
  const { data: shop, isLoading: isShopLoading } = useQuery<PublicShop>({
    queryKey: ["shop"],
    queryFn: async () => {
      let res = await apiFetch(`${zodEnv.BACKEND_URL}/admin/get-shop`).catch(
        () => null,
      );
      if (!res || !res.ok) {
        res = await apiFetch(`${zodEnv.BACKEND_URL}/admin/shop`);
      }
      if (!res.ok) throw new Error("Failed to load shop details");
      const json = await res.json();
      return (json.shop ?? json.data ?? json) as PublicShop;
    },
    initialData: initialShop,
  });

  const resolvedShopId =
    initialShop?.id ||
    initialShop?._id ||
    initialShopIdProp ||
    shop?.id ||
    shop?._id ||
    "";

  // Dynamically compute real rolling quick dates (7 days)
  const quickDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 2; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayLabel =
        i === 0
          ? "Today"
          : i === 1
            ? "Tomorrow"
            : d.toLocaleDateString("en-US", { weekday: "long" });
      const dateStr = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const fullDateStr = d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const isoDate = formatIsoDate(d);
      dates.push({
        label: dayLabel,
        date: dateStr,
        fullDate: fullDateStr,
        isoDate,
        dayKey: d
          .toLocaleDateString("en-US", { weekday: "long" })
          .toLowerCase(),
      });
    }
    return dates;
  }, []);

  const [selectedIsoDate, setSelectedIsoDate] = useState<string>(
    () => quickDates[0]?.isoDate || formatIsoDate(new Date()),
  );
  const [selectedSlot, setSelectedSlot] = useState<string>("11:00 AM");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Customer info state
  const [customerName, setCustomerName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const isNameValid = customerName.trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());
  const isPhoneValid = /^[6-9]\d{9}$/.test(phoneNumber.trim());
  const isCustomerInfoValid = isNameValid && isEmailValid && isPhoneValid;

  // Responsive width tracking for SlideCommit component
  const slideContainerRef = useRef<HTMLDivElement>(null);
  const [slideWidth, setSlideWidth] = useState(340);

  useEffect(() => {
    if (!slideContainerRef.current) return;
    const updateWidth = () => {
      if (slideContainerRef.current) {
        setSlideWidth(Math.floor(slideContainerRef.current.clientWidth));
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Derive Date metadata from selectedIsoDate
  const selectedDateObj = useMemo(() => {
    const [y, m, d] = selectedIsoDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedIsoDate]);

  const selectedDayKey = useMemo(() => {
    return selectedDateObj
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
  }, [selectedDateObj]);

  const selectedDayName = useMemo(() => {
    return selectedDateObj.toLocaleDateString("en-US", { weekday: "long" });
  }, [selectedDateObj]);

  const selectedDateFormatted = useMemo(() => {
    return selectedDateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDateObj]);

  const isToday = useMemo(() => {
    return selectedIsoDate === formatIsoDate(new Date());
  }, [selectedIsoDate]);

  // 2. Fetch taken slots for the selected date and shop (BackendSpec.md line 485-486)
  const { data: takenSlotsData, isLoading: isTakenLoading } = useQuery<{
    success: boolean;
    takenSlots: string[];
  }>({
    queryKey: ["taken-slots", resolvedShopId, selectedIsoDate],
    queryFn: async () => {
      if (!resolvedShopId || !selectedIsoDate) {
        return { success: true, takenSlots: [] };
      }
      const res = await apiFetch(
        `${zodEnv.BACKEND_URL}/bookings/taken-slots?date=${encodeURIComponent(
          selectedIsoDate,
        )}&shopId=${encodeURIComponent(resolvedShopId)}`,
      );
      if (!res.ok) {
        throw new Error("Failed to load taken slots");
      }
      return res.json();
    },
    enabled: Boolean(resolvedShopId && selectedIsoDate),
    staleTime: 1000 * 30, // 30s fresh cache
  });

  // 3. Resolve day's opening timings from shop.openingTimings (BackendSpec.md line 33-41)
  const daySchedule = useMemo(() => {
    const timings = shop?.openingTimings;
    if (timings && timings[selectedDayKey]) {
      return timings[selectedDayKey];
    }
    return "";
  }, [shop?.openingTimings, selectedDayKey]);

  // 4. Generate 1-hour slots mapped against opening/closing hours and takenSlots
  const {
    slots: timeSlots,
    isClosed,
    scheduleText,
  } = useMemo(() => {
    const taken = takenSlotsData?.takenSlots ?? [];
    return generateDayTimeSlots(daySchedule, taken, isToday);
  }, [daySchedule, takenSlotsData?.takenSlots, isToday]);

  // Keep selected slot in sync when slots change
  useEffect(() => {
    if (timeSlots.length > 0) {
      const isCurrentValid = timeSlots.some(
        (s) => s.time === selectedSlot && s.isAvailable,
      );
      if (!isCurrentValid) {
        const firstAvailable = timeSlots.find((s) => s.isAvailable);
        setSelectedSlot(firstAvailable ? firstAvailable.time : "");
      }
    } else {
      setSelectedSlot("");
    }
  }, [timeSlots, selectedSlot]);

  const durationText = useMemo(() => {
    const minsTotal = totalMinutes > 0 ? totalMinutes : 45;
    const hours = Math.floor(minsTotal / 60);
    const mins = minsTotal % 60;
    if (hours > 0) {
      return `${hours} Hour${hours > 1 ? "s" : ""} ${
        mins > 0 ? `${mins} Minute${mins > 1 ? "s" : ""}` : ""
      }`.trim();
    }
    return `${minsTotal} Minutes`;
  }, [totalMinutes]);

  // TanStack Query useMutation for POST /bookings/create (BackendSpec.md C.8)
  const bookingMutation = useMutation<
    BookingCreateResponse,
    Error,
    BookingCreateRequest
  >({
    mutationFn: async (payload: BookingCreateRequest) => {
      setBookingError(null);
      const res = await apiFetch(`${zodEnv.BACKEND_URL}/bookings/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        const errorMsg =
          data?.message ||
          (res.status === 409
            ? "This time slot is already booked. Please choose another."
            : "Failed to confirm booking. Please try again.");
        throw new Error(errorMsg);
      }

      return data;
    },
    onSuccess: (data) => {
      // 1. Immediately invalidate taken slots cache so calendar reflects newly reserved slot
      queryClient.invalidateQueries({
        queryKey: ["taken-slots", resolvedShopId, selectedIsoDate],
      });

      // 2. Persist confirmed booking receipt in sessionStorage for the confirmation receipt screen
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(
            "lastBooking",
            JSON.stringify({
              booking: {
                ...data.booking,
                customerEmail: customerEmail.trim(),
              },
              shopName: shop?.shopName || "Cherrybrush Studio",
              location: shop?.location || "",
              phone: shop?.phone || "",
              durationText,
              totalAmount,
            }),
          );
        } catch (e) {
          console.warn("Could not cache lastBooking in sessionStorage:", e);
        }
      }

      // 3. Clear cart external store
      clearCart();

      // 4. Notify optional onContinue callback
      onContinue?.(
        selectedSlot,
        selectedDateFormatted,
        selectedIsoDate,
        customerName.trim(),
        `+91 ${phoneNumber.trim()}`,
        customerEmail.trim(),
      );

      // 5. 1.5 second delay before redirecting user to the new confirmed page
      setTimeout(() => {
        const bookingId = data?.booking?._id || data?.booking?.id || "";
        const redirectUrl = bookingId
          ? `/book/confirmed?id=${encodeURIComponent(bookingId)}`
          : "/book/confirmed";
        window.location.href = redirectUrl;
      }, 1500);
    },
    onError: (err: Error) => {
      setBookingError(err.message || "Failed to confirm booking.");
      // Invalidate slots in case it was a 409 conflict so UI updates taken states
      queryClient.invalidateQueries({
        queryKey: ["taken-slots", resolvedShopId, selectedIsoDate],
      });
    },
  });

  const handleModifySelection = () => {
    if (onModifySelection) {
      onModifySelection();
    } else {
      window.location.href = "/book/services";
    }
  };

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setSelectedIsoDate(e.target.value);
    }
  };

  return (
    <div className="bg-[#F4F4F5] font-body-md text-[#18181B] antialiased min-h-screen">
      <main className="w-full pt-8 md:pt-14 pb-20 bg-[#F4F4F5] min-h-[calc(100vh-5rem)] mt-[2rem]">
        <div className="flex flex-col w-full">
          {/* Main Booking Studio Body */}
          <div className="max-w-[1380px] mx-auto px-6 md:px-12 py-6 w-full">
            {/* Breadcrumb strip */}
            <div className="flex items-center gap-2 text-xs text-[#71717A] mb-4">
              <a
                href="/book"
                className="hover:text-[#18181B] transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Cherrybrush</span>
              </a>
              <span>/</span>
              <a
                href="/book/services"
                className="hover:text-[#18181B] transition-colors"
              >
                Services
              </a>
              <span>/</span>
              <span className="text-[#18181B] font-medium">Appointment</span>
            </div>

            {/* Editorial Header Intro */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
              <div>
                <h1 className="font-headline-hero-mobile md:font-headline-hero text-2xl md:text-3xl text-[#18181B] tracking-tight">
                  Select your Date & Time
                </h1>
                <p className="text-xs sm:text-sm text-[#71717A] mt-1.5 max-w-xl">
                  Choose your preferred date and time slot
                </p>
              </div>

              {/* Quick Date Selector Pills (7 Days Rolling) */}
              <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
                {quickDates.map((item) => (
                  <button
                    key={item.isoDate}
                    type="button"
                    onClick={() => setSelectedIsoDate(item.isoDate)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors shadow-xs ${
                      selectedIsoDate === item.isoDate
                        ? "bg-[#333333] text-[#ffffff] border-[#333333]"
                        : "bg-[#FFFFFF] border-[#E4E4E7] text-[#18181B] hover:bg-[#eaeaea]"
                    }`}
                  >
                    {item.label} ({item.date})
                  </button>
                ))}
              </div>
            </div>

            {/* 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* LEFT COLUMN: Architectural Calendar Card (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-DEFAULT p-5 sm:p-7 shadow-sm">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-[#71717A] uppercase tracking-widest font-medium">
                      Selected Date
                    </label>
                    <div
                      onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                      className="relative flex items-center justify-between p-4 rounded-DEFAULT bg-[#F4F4F5] hover:bg-[#eaeaea] border border-[#E4E4E7] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#E4E4E7] text-[#333333] flex items-center justify-center shrink-0">
                          <CalendarCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-sm sm:text-base text-[#18181B] font-semibold block">
                            {selectedDateFormatted}
                          </span>
                          <span className="text-xs text-[#71717A]">
                            Operating Hours: {scheduleText}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          className={`w-5 h-5 text-[#71717A] transition-transform duration-200 ${
                            isCalendarOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* Integrated Calendar from src/components/ui/calendar.tsx */}
                    {isCalendarOpen && (
                      <div className="mt-2 p-3 bg-[#FFFFFF] border border-[#E4E4E7] rounded-DEFAULT shadow-sm flex justify-center animate-in fade-in duration-150">
                        <Calendar
                          mode="single"
                          selected={selectedDateObj}
                          onSelect={(date) => {
                            if (date) {
                              setSelectedIsoDate(formatIsoDate(date));
                              setIsCalendarOpen(false);
                            }
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          className="rounded-DEFAULT border border-[#E4E4E7] p-2 bg-[#FFFFFF]"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Available Window Cards */}
                <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-DEFAULT p-5 sm:p-7 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E4E4E7]">
                    <div>
                      <div className="flex items-center gap-5">
                        <div className="text-xs text-[#71717A] uppercase tracking-widest font-medium">
                          {selectedDayName} Timeslots
                        </div>
                        <div>
                          {scheduleText && (
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                                isClosed
                                  ? "bg-red-50 text-red-600 border-red-200"
                                  : "bg-[#F4F4F5] text-[#71717A] border-[#E4E4E7]"
                              }`}
                            >
                              {scheduleText}
                            </span>
                          )}
                        </div>
                      </div>
                      <h2 className="font-headline text-base sm:text-lg text-[#18181B] mt-0.5">
                        Available Time Slots
                      </h2>
                    </div>
                  </div>

                  {/* Time Slots Rendering */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {isClosed ? (
                      <div className="col-span-full p-6 rounded-DEFAULT bg-[#F4F4F5] border border-[#E4E4E7] text-center flex flex-col items-center justify-center gap-2">
                        <CalendarX className="w-7 h-7 text-[#71717A]" />
                        <p className="text-sm font-semibold text-[#18181B]">
                          Place Closed on {selectedDayName}s
                        </p>
                        <p className="text-xs text-[#71717A] max-w-xs">
                          we are closed on this day. Please select another date
                          above to reserve your appointment
                        </p>
                      </div>
                    ) : isShopLoading || isTakenLoading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-11 rounded-DEFAULT bg-[#F4F4F5] border border-[#E4E4E7] animate-pulse flex items-center justify-center"
                        >
                          <span className="h-3 w-16 bg-[#E4E4E7] rounded"></span>
                        </div>
                      ))
                    ) : timeSlots.length === 0 ? (
                      <div className="col-span-full p-6 rounded-DEFAULT bg-[#F4F4F5] border border-[#E4E4E7] text-center text-xs text-[#71717A]">
                        No arrival slots available for this date.
                      </div>
                    ) : (
                      timeSlots.map((slot) => {
                        if (!slot.isAvailable) {
                          return (
                            <button
                              key={slot.time}
                              disabled
                              type="button"
                              title={
                                slot.reason === "past"
                                  ? "Slot has already passed today"
                                  : "Already reserved"
                              }
                              className="h-11 w-full rounded-DEFAULT border border-[#E4E4E7] bg-[#F4F4F5]/50 px-3 flex items-center justify-center gap-1.5 opacity-40 cursor-not-allowed select-none transition-colors"
                            >
                              <span className="text-sm font-medium text-[#71717A] line-through">
                                {slot.time}
                              </span>
                              <Lock className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
                            </button>
                          );
                        }

                        const isSelected = selectedSlot === slot.time;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            onClick={() => setSelectedSlot(slot.time)}
                            className={`h-11 w-full rounded-DEFAULT border px-3 flex items-center justify-center gap-1.5 transition-colors ${
                              isSelected
                                ? "bg-[#333333] border-[#333333] text-[#ffffff] shadow-sm"
                                : "bg-[#F4F4F5] border-[#E4E4E7] text-[#18181B] hover:bg-[#eaeaea] hover:border-[#D4D4D8]"
                            }`}
                          >
                            <span
                              className={`text-sm font-medium ${
                                isSelected ? "text-[#ffffff]" : "text-[#18181B]"
                              }`}
                            >
                              {slot.time}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Populated Cart Package Sequence & Summary (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-DEFAULT p-5 sm:p-7 shadow-sm flex flex-col gap-5">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E7]">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-[#71717A] font-medium">
                        Services
                      </span>
                      <h3 className=" text-base text-[#18181B]">
                        Selected ({totalCount})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleModifySelection}
                      className="text-xs text-[#71717A] hover:text-[#18181B] underline transition-colors"
                    >
                      Change Services
                    </button>
                  </div>

                  {/* Dynamic Cart Items from CartContext */}
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {cartItems.length === 0 ? (
                      <div className="py-8 text-center space-y-3">
                        <p className="text-sm font-medium text-[#18181B]">
                          No services selected yet
                        </p>
                        <p className="text-xs text-[#71717A] max-w-xs mx-auto">
                          Choose services before booking your appointment slot
                        </p>
                        <button
                          type="button"
                          onClick={handleModifySelection}
                          className="mt-2 px-4 py-2 rounded-full bg-[#333333] text-white text-xs font-medium hover:bg-[#18181B] transition-colors"
                        >
                          Explore Services
                        </button>
                      </div>
                    ) : (
                      cartItems.map((item, idx) => {
                        const itemImage =
                          item.image ||
                          (item.serviceImages && item.serviceImages[0]) ||
                          item.img;

                        return (
                          <div
                            key={`${item.id}-${idx}`}
                            className="flex items-center justify-between gap-3 p-3 bg-[#F4F4F5] rounded-DEFAULT border border-[#E4E4E7]"
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              {itemImage ? (
                                <img
                                  src={itemImage}
                                  alt={item.name}
                                  className="w-12 h-12 rounded-DEFAULT object-cover border border-[#E4E4E7] shrink-0 bg-[#E4E4E7]/40"
                                  onError={(e) => {
                                    (
                                      e.currentTarget as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-DEFAULT bg-[#E4E4E7]/60 border border-[#E4E4E7] flex items-center justify-center shrink-0 text-[#71717A]">
                                  <Sparkles className="w-5 h-5 text-[#71717A]" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#18181B] leading-snug truncate">
                                  {item.name}
                                  {item.qty && item.qty > 1 && (
                                    <span className="ml-1.5 text-xs text-[#71717A]">
                                      x{item.qty}
                                    </span>
                                  )}
                                </p>
                                {item.selectedOptions &&
                                  item.selectedOptions.length > 0 && (
                                    <p className="text-[11px] text-[#71717A] truncate">
                                      {item.selectedOptions
                                        .map(
                                          (o: any) => o.featureName || o.name,
                                        )
                                        .join(", ")}
                                    </p>
                                  )}
                                <div className="flex items-center gap-2 mt-1 text-xs text-[#71717A]">
                                  {item.time && <span>{item.time}</span>}
                                  {item.time && item.categoryRaw && (
                                    <span>•</span>
                                  )}
                                  {item.categoryRaw && (
                                    <span className="truncate">
                                      {item.categoryRaw}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-[#18181B] shrink-0">
                              ₹{(item.price || 0) * (item.qty || 1)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Customer Information */}
                  <div className="flex flex-col gap-3 pt-3 border-t border-[#E4E4E7]">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-[#71717A] font-medium">
                        Your Details
                      </span>
                      <h3 className="text-base text-[#18181B] mt-0.5">
                        Contact Information
                      </h3>
                    </div>

                    {/* Name Field */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-[#71717A] uppercase tracking-widest font-medium">
                        Full Name
                      </label>
                      <div
                        className={`relative flex items-center gap-3 p-3.5 rounded-DEFAULT border transition-colors ${
                          submitAttempted && !isNameValid
                            ? "bg-red-50 border-red-200"
                            : customerName && isNameValid
                              ? "bg-[#F4F4F5] border-[#333333]"
                              : "bg-[#F4F4F5] border-[#E4E4E7]"
                        }`}
                      >
                        <div className="w-7 h-7 rounded-full bg-[#E4E4E7] flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-[#71717A]" />
                        </div>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="e.g. Priya Sharma"
                          className="flex-1 bg-transparent text-sm text-[#18181B] placeholder-[#A1A1AA] outline-none font-medium"
                        />
                        {customerName && isNameValid && (
                          <CheckCircle2 className="w-4 h-4 text-[#333333] shrink-0" />
                        )}
                      </div>
                      {submitAttempted && !isNameValid && (
                        <p className="text-[11px] text-red-500 ml-1">
                          Please enter at least 2 characters
                        </p>
                      )}
                    </div>

                    {/* Email Field */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-[#71717A] uppercase tracking-widest font-medium">
                        Email Address
                      </label>
                      <div
                        className={`relative flex items-center gap-3 p-3.5 rounded-DEFAULT border transition-colors ${
                          submitAttempted && !isEmailValid
                            ? "bg-red-50 border-red-200"
                            : customerEmail && isEmailValid
                              ? "bg-[#F4F4F5] border-[#333333]"
                              : "bg-[#F4F4F5] border-[#E4E4E7]"
                        }`}
                      >
                        <div className="w-7 h-7 rounded-full bg-[#E4E4E7] flex items-center justify-center shrink-0">
                          <Mail className="w-3.5 h-3.5 text-[#71717A]" />
                        </div>
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="e.g. priya@example.com"
                          className="flex-1 bg-transparent text-sm text-[#18181B] placeholder-[#A1A1AA] outline-none font-medium"
                        />
                        {customerEmail && isEmailValid && (
                          <CheckCircle2 className="w-4 h-4 text-[#333333] shrink-0" />
                        )}
                      </div>
                      {submitAttempted && !isEmailValid && (
                        <p className="text-[11px] text-red-500 ml-1">
                          {customerEmail.trim() === ""
                            ? "Email address is required"
                            : "Please enter a valid email address"}
                        </p>
                      )}
                    </div>

                    {/* Phone Field */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-[#71717A] uppercase tracking-widest font-medium">
                        Phone Number
                      </label>
                      <div
                        className={`relative flex items-center gap-3 p-3.5 rounded-DEFAULT border transition-colors ${
                          submitAttempted && !isPhoneValid
                            ? "bg-red-50 border-red-200"
                            : phoneNumber && isPhoneValid
                              ? "bg-[#F4F4F5] border-[#333333]"
                              : "bg-[#F4F4F5] border-[#E4E4E7]"
                        }`}
                      >
                        <div className="w-7 h-7 rounded-full bg-[#E4E4E7] flex items-center justify-center shrink-0">
                          <Phone className="w-3.5 h-3.5 text-[#71717A]" />
                        </div>
                        <span className="text-sm text-[#71717A] font-medium shrink-0">
                          +91
                        </span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={phoneNumber}
                          onChange={(e) =>
                            setPhoneNumber(e.target.value.replace(/\D/g, ""))
                          }
                          placeholder="98765 43210"
                          className="flex-1 bg-transparent text-sm text-[#18181B] placeholder-[#A1A1AA] outline-none font-medium tracking-wide"
                        />
                        {phoneNumber && isPhoneValid && (
                          <CheckCircle2 className="w-4 h-4 text-[#333333] shrink-0" />
                        )}
                      </div>
                      {submitAttempted && !isPhoneValid && (
                        <p className="text-[11px] text-red-500 ml-1">
                          Enter a valid 10-digit Indian mobile number
                        </p>
                      )}
                    </div>

                    {/* Special Requests / Notes (Optional) */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-[#71717A] uppercase tracking-widest font-medium">
                        Special Requests (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any preferences, allergies, or first-time visit notes..."
                        className="w-full p-3 rounded-DEFAULT bg-[#F4F4F5] border border-[#E4E4E7] text-xs sm:text-sm text-[#18181B] placeholder-[#A1A1AA] outline-none focus:border-[#333333] transition-colors resize-none font-normal"
                      />
                    </div>
                  </div>

                  {/* Reserved Date & Slot Anchor Card */}
                  <div className="bg-[#F4F4F5] border border-[#E4E4E7] rounded-DEFAULT p-3.5 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#E4E4E7] text-[#333333] flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-[#333333]" />
                      </div>
                      <div>
                        <p className="text-[10px] text-[#71717A] uppercase tracking-wide font-medium">
                          Reserved Appointment Time
                        </p>
                        <p className="text-xs sm:text-sm font-semibold text-[#18181B]">
                          {selectedDateFormatted.split(",")[0]},{" "}
                          {selectedSlot || ""}
                        </p>
                      </div>
                    </div>
                    <Verified className="w-6 h-6 text-[#333333]" />
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="pt-2 border-t border-[#E4E4E7] space-y-2">
                    <div className="flex justify-between text-xs text-[#71717A]">
                      <span>Estimated Duration</span>
                      <span className="font-medium text-[#18181B]">
                        {durationText}
                      </span>
                    </div>

                    <div className="pt-4 border-t border-[#E4E4E7] flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider text-[#71717A] font-medium">
                        Total Amount
                      </span>
                      <span className="font-title-md text-title-md font-semibold text-[#18181B]">
                        ₹{totalAmount}
                      </span>
                    </div>
                  </div>

                  {/* Booking Error Banner */}
                  {bookingError && (
                    <div className="p-3 rounded-DEFAULT bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{bookingError}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-1">
                    <div
                      ref={slideContainerRef}
                      className="w-full flex justify-center py-1 overflow-hidden"
                    >
                      <SlideCommit
                        label={
                          cartItems.length === 0
                            ? "Select a Service first"
                            : !selectedSlot
                              ? "Select a slot above"
                              : bookingMutation.isPending
                                ? "Confirming booking..."
                                : "Slide to Confirm Booking"
                        }
                        doneLabel="Booking Confirmed!"
                        errorLabel={bookingError || "Check Required Details"}
                        disabled={
                          cartItems.length === 0 ||
                          !selectedSlot ||
                          bookingMutation.isPending
                        }
                        trackColor="#333333"
                        handleColor="#FFFFFF"
                        successColor="#16a34a"
                        width={slideWidth}
                        height={52}
                        radius={26}
                        holdMs={2000}
                        onConfirm={async () => {
                          if (!resolvedShopId) {
                            throw new Error(
                              "Salon shop information is not loaded yet.",
                            );
                          }
                          if (!selectedIsoDate) {
                            throw new Error(
                              "Please select an appointment date.",
                            );
                          }
                          if (!selectedSlot) {
                            throw new Error(
                              "Please choose an available time slot.",
                            );
                          }
                          if (!isCustomerInfoValid) {
                            setSubmitAttempted(true);
                            if (!isNameValid) {
                              throw new Error(
                                "Please enter your full name (at least 2 characters).",
                              );
                            }
                            if (!isEmailValid) {
                              throw new Error(
                                "Please enter a valid email address.",
                              );
                            }
                            if (!isPhoneValid) {
                              throw new Error(
                                "Please enter a valid 10-digit mobile number.",
                              );
                            }
                            throw new Error(
                              "Please fill in your contact information above.",
                            );
                          }
                          if (cartItems.length === 0) {
                            throw new Error(
                              "No Services selected in your cart.",
                            );
                          }

                          const payload: BookingCreateRequest = {
                            customerName: customerName.trim(),
                            customerEmail: customerEmail.trim(),
                            customerPhone: `+91 ${phoneNumber.trim()}`,
                            shopId: resolvedShopId,
                            date: selectedIsoDate,
                            timeSlot: selectedSlot,
                            cart: cartItems.map((item) => ({
                              serviceId: item.serviceId || item.id,
                              serviceName: item.name,
                              selectedOptions: (item.selectedOptions || []).map(
                                (opt) => ({
                                  featureName:
                                    opt.featureName || opt.name || "",
                                  price:
                                    typeof opt.price === "string"
                                      ? opt.price
                                      : `₹${opt.price || 0}`,
                                  additive: opt.additive !== false,
                                }),
                              ),
                              totalPrice: (item.price || 0) * (item.qty || 1),
                            })),
                            notes: notes.trim() || undefined,
                          };

                          return bookingMutation.mutateAsync(payload);
                        }}
                        onError={(err: any) => {
                          setBookingError(err?.message || "Booking failed");
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleModifySelection}
                      className="w-full flex items-center justify-center gap-3 py-2 px-4 rounded-full bg-transparent hover:bg-[#F4F4F5] text-[#71717A] hover:text-[#18181B] text-xs font-medium uppercase tracking-wider transition-colors text-center"
                    >
                      <Plus className="w-4" /> Add More Services
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DateTimeSlotPicker(props: DateTimeSlotPickerProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <DateTimeSlotPickerContent {...props} />
      </CartProvider>
    </QueryClientProvider>
  );
}
