import React from "react";

export function MobileCategoryNavSkeleton() {
  return (
    <div className="w-full flex flex-col gap-2">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-1.5 w-full py-1 animate-pulse"
        >
          <div className="w-10 h-10 rounded-full bg-neutral-200" />
          <div className="w-9 h-2 bg-neutral-200 rounded" />
        </div>
      ))}
    </div>
  );
}

export function MobileServicesListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-DEFAULT p-3 border border-[#E4E4E7] shadow-sm flex flex-col gap-2.5 animate-pulse"
        >
          <div className="flex gap-2.5">
            <div className="w-16 h-16 rounded-md bg-neutral-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <div className="w-28 h-3.5 bg-neutral-200 rounded" />
                <div className="w-12 h-3.5 bg-neutral-200 rounded" />
              </div>
              <div className="w-3/4 h-2.5 bg-neutral-200 rounded" />
              <div className="w-1/2 h-2.5 bg-neutral-200 rounded" />
            </div>
          </div>
          <div className="pt-2 flex justify-between items-center border-t border-neutral-100">
            <div className="w-12 h-3.5 bg-neutral-200 rounded-full" />
            <div className="w-14 h-5 bg-neutral-200 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DesktopCategoryNavSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-2 bg-neutral-50 rounded animate-pulse"
        >
          <div className="w-11 h-11 rounded-full bg-neutral-200 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="w-24 h-3 bg-neutral-200 rounded" />
            <div className="w-10 h-2 bg-neutral-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DesktopServicesListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-DEFAULT p-5 border border-[#E4E4E7] shadow-sm flex flex-col sm:flex-row gap-5 items-start sm:items-center animate-pulse"
        >
          <div className="w-36 h-36 rounded-DEFAULT bg-neutral-200 shrink-0" />
          <div className="flex-1 space-y-3 w-full">
            <div className="flex justify-between">
              <div className="w-48 h-5 bg-neutral-200 rounded" />
              <div className="w-16 h-5 bg-neutral-200 rounded" />
            </div>
            <div className="w-full h-3 bg-neutral-200 rounded" />
            <div className="w-2/3 h-3 bg-neutral-200 rounded" />
            <div className="pt-3 flex justify-between border-t border-neutral-100">
              <div className="w-20 h-5 bg-neutral-200 rounded-full" />
              <div className="w-24 h-7 bg-neutral-200 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ServicesSkeleton() {
  return (
    <div className="font-body-md antialiased bg-[#fbf8fc] min-h-screen">
      {/* Mobile Skeleton (< md) */}
      <div className="block md:hidden">
        <div className="flex w-full min-h-screen">
          <aside className="sticky top-0 h-screen w-20 shrink-0 bg-[#FFFFFF] border-r border-[#E4E4E7] py-3 px-1.5 flex flex-col items-center gap-3">
            <div className="w-10 h-2.5 bg-neutral-200 rounded animate-pulse mb-1" />
            <MobileCategoryNavSkeleton />
          </aside>
          <main className="flex-1 min-w-0 p-3 pb-32 flex flex-col">
            <div className="w-28 h-2.5 bg-neutral-200 rounded animate-pulse mb-3" />
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E4E4E7]">
              <div className="w-20 h-5 bg-neutral-200 rounded animate-pulse" />
              <div className="w-40 h-7 bg-neutral-200 rounded-full animate-pulse" />
            </div>
            <MobileServicesListSkeleton />
          </main>
        </div>
      </div>

      {/* Desktop Skeleton (>= md) */}
      <div className="hidden md:block w-full max-w-[1380px] mx-auto px-6 md:px-12 pt-8 md:pt-12 pb-32">
        <div className="w-36 h-3 bg-neutral-200 rounded animate-pulse mb-4" />
        <div className="flex justify-between items-end pb-6 mb-8 border-b border-[#E4E4E7]">
          <div className="space-y-2">
            <div className="w-56 h-8 bg-neutral-200 rounded animate-pulse" />
            <div className="w-96 h-3.5 bg-neutral-200 rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="w-64 h-9 bg-neutral-200 rounded-full animate-pulse" />
            <div className="w-36 h-9 bg-neutral-200 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-DEFAULT p-5 border border-[#E4E4E7] space-y-3">
            <div className="w-24 h-3 bg-neutral-200 rounded animate-pulse pb-2" />
            <DesktopCategoryNavSkeleton />
          </div>
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            <DesktopServicesListSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
