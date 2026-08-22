/**
 * Fixed-window rate limiting for the public API routes.
 *
 * `/api/ai` calls a paid OpenAI endpoint and `/api/contact` sends mail. Both are
 * unauthenticated by design — this is a portfolio, and requiring a login to ask
 * the assistant a question would defeat the point — so the cost ceiling has to
 * come from rate limiting rather than from auth.
 *
 * **Scope, honestly stated.** State lives in this module's memory. On Cloudflare
 * Workers that means per-isolate: a client whose requests land on different
 * isolates or colos gets a fresh budget each time, and every isolate eviction
 * resets the counters. This meaningfully raises the effort of casual abuse and
 * bounds a single misbehaving client, but it is not a distributed limiter.
 *
 * For a hard guarantee, put a Cloudflare WAF rate-limiting rule in front of
 * `/api/*`, or move this state into a Durable Object. Until then this is
 * defence in depth, not a wall.
 */

export interface RateLimitOptions {
  /** Requests permitted per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Injectable clock, so tests do not sleep. */
  now?: number;
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Epoch ms at which the current window ends. */
  resetAt: number;
  /** Whole seconds until the window ends; 0 when not limited. */
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Drop expired buckets so a long-lived isolate cannot grow without bound. */
function sweep(now: number): void {
  if (buckets.size < 512) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const { limit, windowMs } = options;
  const now = options.now ?? Date.now();

  sweep(now);

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  const over = bucket.count > limit;

  return {
    ok: !over,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
    retryAfterSeconds: over ? Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) : 0,
  };
}

/**
 * Identify the caller.
 *
 * `CF-Connecting-IP` is set by Cloudflare and cannot be spoofed by the client.
 * `x-forwarded-for` can be, so it is only a fallback for local development —
 * behind Cloudflare the first header is always present.
 */
export function clientKey(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return "unknown";
}

/** Standard headers so a client can back off politely. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
  };
  if (!result.ok) headers["Retry-After"] = String(result.retryAfterSeconds);
  return headers;
}

/** Test seam. Never called by request handling. */
export function __resetRateLimits(): void {
  buckets.clear();
}
