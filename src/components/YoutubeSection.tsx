"use client";

import { useEffect, useRef, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { cn } from "../../lib/utils";
import ytchannel from "../assets/ytchannel.png";
import { Skeleton } from "./ui/skeleton";

const CHANNEL_ID = "UCS2J_l3OuZW9Uv-ZO8cOQSQ";

// Official YouTube subscribe button. platform.js loads async and scans the DOM
// only once, so we poll for gapi.ytsubscribe and render the button ourselves
// once the div is mounted, re-injecting the script if it never shows up.
function ensureGapi() {
  if (document.querySelector('script[src*="apis.google.com/js/platform.js"]')) {
    return;
  }
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://apis.google.com/js/platform.js";
  document.head.appendChild(s);
}

const CHANNEL = "https://www.youtube.com/@cherrybrush/videos";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export interface Video {
  id: string;
  title: string;
  link: string;
  thumbnail: string;
  views: string;
  time: string;
}

interface ApiResponse {
  videos: Video[];
  channelThumbnail: string | null;
}

async function fetchVideos({
  signal,
}: { signal?: AbortSignal } = {}): Promise<ApiResponse> {
  // Abort immediately on slow connections so we never start the fetch.
  const conn = (navigator as any).connection;
  const isSlow =
    conn?.saveData === true ||
    /^(slow-2g|2g)$/.test(String(conn?.effectiveType ?? ""));

  if (isSlow) {
    signal?.throwIfAborted?.();
    return { videos: [], channelThumbnail: null };
  }

  const res = await fetch("/api/videos", { signal });
  if (!res.ok) return { videos: [], channelThumbnail: null };
  return res.json();
}

function VideoCard({ video }: { video: Video }) {
  return (
    <a
      href={video.link}
      target="_blank"
      rel="noopener"
      className="flex flex-col gap-2 w-[320px] shrink-0"
    >
      <span className="relative block aspect-video rounded-2xl overflow-hidden bg-zinc-200 group">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <span className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/70 via-transparent p-3"></span>
      </span>
      <span className="text-sm font-semibold text-foreground line-clamp-2">
        {video.title}
      </span>
      <span className="text-xs text-muted-foreground">
        {video.views} {video.time}
      </span>
    </a>
  );
}

function VideoSkeleton() {
  return (
    <div className="w-[320px] shrink-0 flex flex-col gap-2">
      <div className="aspect-video rounded-2xl bg-zinc-200 animate-pulse" />
      <div className="h-4 w-3/4 rounded-md bg-zinc-200 animate-pulse" />
      <div className="h-4 w-1/2 rounded-md bg-zinc-200 animate-pulse" />
    </div>
  );
}

function Carousel({ videos }: { videos: Video[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [topIndex, setTopIndex] = useState(0);
  // One card (320px) plus gap (4px).
  const STEP = 360;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const index = Math.round(el.scrollLeft / STEP);
      setTopIndex(Math.max(0, Math.min(index, videos.length - 1)));
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [videos.length, STEP]);

  const scrollBy = (delta: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  const canPrev = topIndex > 0;
  const canNext = topIndex < videos.length - 1;

  const navButton = (active: boolean) =>
    cn(
      "flex items-center justify-center size-9 rounded-full border transition-colors duration-200",
      active
        ? "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900 dark:active:bg-zinc-800"
        : "border-transparent text-zinc-400 hover:border-zinc-200 dark:text-zinc-500 dark:hover:border-zinc-800",
    );

  return (
    <>
      <div
        ref={scrollRef}
        className="overflow-x-auto scroll-snap-type-x mandatory pb-6 scrollbar-none"
      >
        <div className="flex flex-nowrap gap-4 px-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      </div>
      <div className="mt-4 flex w-full max-w-[640px] mx-auto items-center justify-between gap-2 px-4">
        <button
          aria-label="Previous card"
          disabled={!canPrev}
          onClick={() => scrollBy(-STEP)}
          type="button"
          className={cn(
            navButton(canPrev),
            !canPrev && "opacity-40 cursor-not-allowed",
          )}
        >
          <svg
            aria-hidden="true"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <p
          aria-live="polite"
          className="min-w-0 truncate text-center text-xs text-zinc-500 tabular-nums dark:text-zinc-400"
        >
          <span className="text-zinc-900 dark:text-zinc-100">
            {String(topIndex + 1).padStart(2, "0")}
          </span>
          {" / "}
          {String(videos.length).padStart(2, "0")}
        </p>
        <button
          aria-label="Next card"
          disabled={!canNext}
          onClick={() => scrollBy(STEP)}
          type="button"
          className={cn(
            navButton(canNext),
            !canNext && "opacity-40 cursor-not-allowed",
          )}
        >
          <svg
            aria-hidden="true"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </>
  );
}

function ChannelHeader({
  channelThumbnail,
}: {
  channelThumbnail: string | null;
}) {
  const btnRef = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  useEffect(() => {
    ensureGapi();
    const timer = setInterval(() => {
      if (rendered.current || !btnRef.current) {
        return;
      }
      const gapi = (window as any).gapi?.ytsubscribe;
      if (!gapi) {
        return;
      }
      gapi.render(btnRef.current, {
        channelid: CHANNEL_ID,
        layout: "default",
        count: "default",
      });
      rendered.current = true;
    }, 100);
    setTimeout(() => clearInterval(timer), 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex w-[300px] gap-4 items-start mb-8">
      <div className="w-[80px] h-[80px]">
        <img
          src={channelThumbnail ?? ytchannel}
          alt="Cherry Brush"
          className="size-full object-cover rounded-full border border-zinc-200 dark:border-zinc-800 shadow-lg"
          loading="lazy"
        />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-foreground">
          Cherry Brush
        </span>
        <span className="text-xs text-muted-foreground mb-3">@cherrybrush</span>
        <div ref={btnRef} className="g-ytsubscribe" title="youtube subscribe" />
      </div>
    </div>
  );
}

function ClientSkeleton() {
  return (
    <section className="py-20 px-6 bg-muted/50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            YouTube
          </h2>
          <p className="text-md text-muted-foreground">
            watch our behind the scenes and packing video with some daily vlogs
          </p>
        </div>
        <ChannelHeader channelThumbnail={null} />
        <div className="flex gap-4 px-4">
          <VideoSkeleton />
          <VideoSkeleton />
          <VideoSkeleton />
        </div>
      </div>
    </section>
  );
}

function YoutubeClient() {
  const controller = useRef<AbortController | null>(null);
  if (!controller.current) {
    controller.current = new AbortController();
  }

  // Abort the in-flight request on unmount.
  useEffect(() => {
    return () => {
      controller.current?.abort();
      controller.current = null;
    };
  }, []);

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["videos"],
    queryFn: () => fetchVideos({ signal: controller.current?.signal }),
  });

  // Only render the carousel once there's data in the cache.
  if (isLoading || !data?.videos?.length) {
    return <ClientSkeleton />;
  }

  return (
    <section className="py-20 px-6 bg-muted/50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            YouTube
          </h2>
          <p className="text-md text-muted-foreground">
            Watch our behind the scenes and packing video with some daily vlogs
          </p>
        </div>
        <ChannelHeader channelThumbnail={data.channelThumbnail} />
        <Carousel videos={data.videos} />
      </div>
    </section>
  );
}

export default function YoutubeSection() {
  const [mounted, setMounted] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    setMounted(true);
    const conn = (navigator as any).connection;
    setSlow(
      conn?.saveData === true ||
        /^(slow-2g|2g)$/.test(String(conn?.effectiveType ?? "")),
    );
  }, []);

  // Slow network / save-data: static image + Subscribe button, no carousel.
  if (slow) {
    return (
      <section className="py-20 px-6 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              YouTube
            </h2>
            <p className="text-md text-muted-foreground">
              Watch our behind the scenes and packing video with some daily
              vlogs
            </p>
          </div>
          <div className="flex flex-col items-center gap-6 text-center">
            <img
              src={ytchannel}
              alt="Cherry Brush YouTube channel"
              className="w-full max-w-2xl rounded-2xl object-cover shadow-lg"
            />
            <button
              className="bg-[#FF0000] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:#CC0000 active:#A80000 transition-colors flex items-center gap-1.5"
              onClick={() => window.open(CHANNEL, "_blank")}
            >
              <svg
                aria-hidden="true"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              Subscribe
            </button>
            <a
              href={CHANNEL}
              target="_blank"
              rel="noopener"
              className="text-primary underline underline-offset-4 hover:text-primary/80"
            >
              Watch on YouTube &rarr;
            </a>
          </div>
        </div>
      </section>
    );
  }

  // Before hydration: render skeletons immediately (no SSR hang).
  if (!mounted) {
    return (
      <section className="py-20 px-6 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              YouTube
            </h2>
            <p className="text-md text-muted-foreground">
              Watch our behind the scenes and packing video with some daily
              vlogs
            </p>
          </div>
          <div className="flex items-center gap-3 mb-8">
            <div className="size-8 rounded-full bg-zinc-200 animate-pulse" />
            <div className="flex flex-col gap-1">
              <div className="h-4 w-24 rounded-md bg-zinc-200 animate-pulse" />
              <div className="h-3 w-12 rounded-md bg-zinc-200 animate-pulse" />
            </div>
            <div className="ml-auto">
              <div className="h-8 w-24 rounded-full bg-zinc-200 animate-pulse" />
            </div>
          </div>
          <div className="flex gap-4 px-4">
            <VideoSkeleton />
            <VideoSkeleton />
            <VideoSkeleton />
          </div>
        </div>
      </section>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <YoutubeClient />
    </QueryClientProvider>
  );
}
