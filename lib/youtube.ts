/**
 * Helpers for turning a pasted YouTube link into a video id, a thumbnail and a
 * canonical watch url. Accepts the formats people actually paste: full watch
 * links, share links, embeds, shorts and live urls, with or without a protocol.
 */

const ID = '[a-zA-Z0-9_-]{11}';

const PATTERNS = [
  new RegExp(`[?&]v=(${ID})`),
  new RegExp(`youtu\\.be/(${ID})`),
  new RegExp(`/embed/(${ID})`),
  new RegExp(`/shorts/(${ID})`),
  new RegExp(`/live/(${ID})`),
  new RegExp(`/v/(${ID})`),
];

export function extractYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // A bare id pasted on its own.
  if (new RegExp(`^${ID}$`).test(trimmed)) return trimmed;

  if (!/youtube\.com|youtu\.be/i.test(trimmed)) return null;

  for (const pattern of PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function isValidYouTubeUrl(url?: string | null): boolean {
  return extractYouTubeId(url) !== null;
}

/**
 * hqdefault exists for every video, unlike maxresdefault which 404s on videos
 * that were never uploaded in HD.
 */
export function youTubeThumbnail(url?: string | null): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export function youTubeWatchUrl(url?: string | null): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}
