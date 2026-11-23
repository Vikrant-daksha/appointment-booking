import React, { useEffect, useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  Printer,
  User,
  ArrowRight,
  Home,
  Calendar,
} from "lucide-react";
import type { Booking } from "../../types/booking.ts";

interface CachedBookingData {
  booking: Booking;
  shopName?: string;
  location?: string;
  phone?: string;
  durationText?: string;
  totalAmount?: number;
}

export default function BookingConfirmed() {
  const [data, setData] = useState<CachedBookingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("lastBooking");
        if (cached) {
          setData(JSON.parse(cached));
        }
      } catch (err) {
        console.warn("Failed to parse cached booking:", err);
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  const booking = data?.booking;
  const bookingId = booking?._id || booking?.id || "";
  const displayId = bookingId
    ? `#BK-${bookingId.slice(-6).toUpperCase()}`
    : "#CONFIRMED";

  const formattedDate = booking?.date
    ? new Date(booking.date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div className="bg-[#F4F4F5] font-body-md text-[#18181B] antialiased min-h-screen">
      <main className="w-full pt-8 md:pt-14 pb-20 bg-[#F4F4F5] min-h-[calc(100vh-5rem)] mt-[2rem]">
        <div className="max-w-[860px] mx-auto px-6 md:px-8 py-6 w-full flex flex-col gap-8">
          {/* Success Banner Hero */}
          <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-DEFAULT p-6 sm:p-8 shadow-sm flex flex-col gap-6">
            {/* Horizontal Layout: Left filled icon, right headings in flex-col */}
            <div className="flex flex-row items-start sm:items-center gap-4 sm:gap-6">
              <div className="shrink-0 flex items-center justify-center">
                <CheckCircle2 className="w-18 h-18 sm:w-14 sm:h-14 fill-emerald-600 text-white shrink-0 animate-in zoom-in-75 duration-300" />
              </div>

              <div className="flex flex-col text-left">
                <h1 className="text-2xl sm:text-3xl text-[#18181B] font-semibold tracking-tight">
                  You're All Set!
                </h1>
                <p className="text-xs sm:text-sm text-[#71717A] mt-1 max-w-xl">
                  Your appointment has been successfully recorded and reserved.
                </p>
              </div>
            </div>

            {/* Reference ID & Status below */}
            <div className="pt-4 border-t border-[#E4E4E7] w-full flex flex-wrap items-center justify-between sm:justify-start gap-3 sm:gap-6 text-xs text-[#71717A]">
              <span>
                Reference ID:{" "}
                <strong className="text-[#18181B] font-mono">
                  {displayId}
                </strong>
              </span>
              <span className="hidden sm:inline text-[#D4D4D8]">&bull;</span>
              <span className="flex items-center gap-1.5">
                Status:{" "}
                <strong className="text-emerald-700 font-medium">
                  CONFIRMED
                </strong>
              </span>
            </div>
          </div>

          {/* Booking Summary Card */}
          <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-DEFAULT p-6 sm:p-8 shadow-sm flex flex-col gap-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E4E7]">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-[#18181B]">
                  Appointment Summary
                </h2>
                <p className="text-xs text-[#71717A] mt-0.5">
                  Review your reserved schedule and salon details
                </p>
              </div>
            </div>

            {/* Time & Studio Highlight Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Slot & Date Card */}
              <div className="p-4 rounded-DEFAULT bg-[#F4F4F5] border border-[#E4E4E7] flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#E4E4E7] text-[#333333] flex items-center justify-center shrink-0">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-[#71717A] uppercase tracking-wider font-medium block">
                    Reserved Date & Time
                  </span>
                  <span className="text-sm font-semibold text-[#18181B] block mt-0.5">
                    {formattedDate || booking?.date || "Selected Date"}
                  </span>
                  <span className="text-xs text-[#333333] font-medium block mt-0.5">
                    {booking?.timeSlot || "Selected Time"}
                  </span>
                  {data?.durationText && (
                    <span className="text-[11px] text-[#71717A] block mt-1">
                      Duration: {data.durationText}
                    </span>
                  )}
                </div>
              </div>

              {/* Studio Info Card */}
              <div className="p-4 rounded-DEFAULT bg-[#F4F4F5] border border-[#E4E4E7] flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#E4E4E7] text-[#333333] flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-[#71717A] uppercase tracking-wider font-medium block">
                    Studio Location
                  </span>
                  <span className="text-sm font-semibold text-[#18181B] block mt-0.5">
                    {data?.shopName || "Cherrybrush Studio"}
                  </span>
                  <span className="text-xs text-[#71717A] block mt-0.5">
                    {data?.location || "Studio Location"}
                  </span>
                  {data?.phone && (
                    <span className="text-xs text-[#71717A] flex items-center gap-1.5 mt-1">
                      <Phone className="w-3 h-3 text-[#71717A]" />
                      {data.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="p-4 rounded-DEFAULT bg-[#F4F4F5] border border-[#E4E4E7] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E4E4E7] flex items-center justify-center shrink-0 text-[#71717A]">
                  <User className="w-4 h-4 text-[#71717A]" />
                </div>
                <div>
                  <span className="text-[10px] text-[#71717A] uppercase tracking-wider font-medium block">
                    Guest Name
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[#18181B]">
                    {booking?.customerName || "Valued Client"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E4E4E7] flex items-center justify-center shrink-0 text-[#71717A]">
                  <Phone className="w-4 h-4 text-[#71717A]" />
                </div>
                <div>
                  <span className="text-[10px] text-[#71717A] uppercase tracking-wider font-medium block">
                    Contact Phone
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[#18181B]">
                    {booking?.customerPhone || "+91 Phone"}
                  </span>
                </div>
              </div>

              {booking?.customerEmail && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#E4E4E7] flex items-center justify-center shrink-0 text-[#71717A]">
                    <Mail className="w-4 h-4 text-[#71717A]" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#71717A] uppercase tracking-wider font-medium block">
                      Email Address
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-[#18181B]">
                      {booking.customerEmail}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Booked Services Breakdown */}
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-wider text-[#71717A] font-medium block">
                Booked Services
              </span>
              <div className="space-y-2 border border-[#E4E4E7] rounded-DEFAULT p-3 bg-[#FFFFFF]">
                {booking?.cart && booking.cart.length > 0 ? (
                  booking.cart.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between py-2 border-b border-[#E4E4E7] last:border-b-0"
                    >
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-[#18181B]">
                          {item.serviceName}
                        </p>
                        {item.selectedOptions &&
                          item.selectedOptions.length > 0 && (
                            <p className="text-[11px] text-[#71717A] mt-0.5">
                              {item.selectedOptions
                                .map((o) => `${o.featureName} (${o.price})`)
                                .join(", ")}
                            </p>
                          )}
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-[#18181B]">
                        ₹{item.totalPrice}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#71717A] py-2">
                    Custom Service package
                  </p>
                )}
              </div>

              {/* Total Summary */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E4E4E7]">
                <span className="text-xs sm:text-sm font-semibold text-[#18181B] uppercase tracking-wider">
                  Total Amount
                </span>
                <span className="font-title-md text-title-md font-semibold text-[#18181B]">
                  ₹
                  {data?.totalAmount ??
                    (booking?.cart?.reduce(
                      (acc, c) => acc + (c.totalPrice || 0),
                      0,
                    ) ||
                      0)}
                </span>
              </div>
            </div>

            {/* Notes Section if any */}
            {booking?.notes && (
              <div className="p-3 bg-[#F4F4F5] rounded-DEFAULT border border-[#E4E4E7] text-xs text-[#71717A]">
                <strong className="text-[#18181B] font-medium block mb-0.5">
                  Special Requests:
                </strong>
                {booking.notes}
              </div>
            )}

            {/* Studio Arrival Guidelines */}
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-DEFAULT text-xs text-amber-900 space-y-1">
              <p className="font-semibold text-amber-950">
                Important Arrival Information
              </p>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Please arrive 5 to 10 minutes before your scheduled arrival
                time.
              </p>
            </div>

            {/* Navigation Actions */}
            <div className="pt-4 border-t border-[#E4E4E7] flex flex-col sm:flex-row items-center justify-between gap-3">
              <a
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full border border-[#E4E4E7] hover:bg-[#F4F4F5] text-xs font-semibold uppercase tracking-wider text-[#18181B] transition-colors text-center"
              >
                <Home className="w-4 h-4 text-[#71717A]" />
                Return to Home
              </a>

              <a
                href="/book"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#18181B] hover:bg-[#333333] text-xs font-semibold uppercase tracking-wider text-[#FFFFFF] transition-colors text-center shadow-xs"
              >
                <span>Book Another Appointment</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
