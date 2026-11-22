import type { APIRoute } from "astro";

// Replace with your channel's UC... ID if different.
const CHANNEL_ID = "UCS2J_l3OuZW9Uv-ZO8cOQSQ";

// Channel profile thumbnail provided directly by the user.
const CHANNEL_THUMBNAIL =
  "https://yt3.googleusercontent.com/lcPhJgxhZVU2HNL__YLYbfq6U_bzIsrWOqHs0cya7FsfiO6puDjQPxus3w2IJaWv1neFGCvJ2g=s160-c-k-c0x00ffffff-no-rj";

interface Video {
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

function decodeXml(str: string) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

// Channel profile thumbnail provided directly by the user.
async function fetchChannelThumbnail(): Promise<string | null> {
  return CHANNEL_THUMBNAIL ?? null;
}

export const GET: APIRoute = async () => {
  let videosRes: Response | null = null;
  let channelThumb: string | null = null;

  try {
    const results = await Promise.all([
      fetch(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
      ),
      fetchChannelThumbnail(),
    ]);
    videosRes = results[0];
    channelThumb = results[1];
  } catch {
    channelThumb = await fetchChannelThumbnail().catch(() => null);
  }

  let videos: Video[] = [];
  if (videosRes && videosRes.ok) {
    const xml = await videosRes.text();
    const entries = xml.split("<entry>").slice(1);
    videos = entries.map((entry) => {
      const videoId =
        entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ?? "";
      const titleRaw = entry.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
      const title = decodeXml(titleRaw.trim());
      const published =
        entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? "";
      const thumbMatch = entry.match(/<media:thumbnail[^>]*url="([^"]+)"/);
      const thumbnail =
        thumbMatch?.[1] ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      return {
        id: videoId,
        title,
        link: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail,
        views: "",
        time: published ? relativeTime(published) : "",
      };
    });
  }

  return new Response(
    JSON.stringify({ videos, channelThumbnail: channelThumb ?? null }),
    { headers: { "Content-Type": "application/json" } },
  );
};
