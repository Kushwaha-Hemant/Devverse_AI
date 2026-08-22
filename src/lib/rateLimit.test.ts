import { beforeEach, describe, expect, it } from "vitest";

import {
  __resetRateLimits,
  clientKey,
  rateLimit,
  rateLimitHeaders,
} from "./rateLimit";

const OPTS = { limit: 3, windowMs: 60_000 };

beforeEach(() => {
  __resetRateLimits();
});

describe("rateLimit", () => {
  it("allows requests up to the limit and refuses the next one", () => {
    const now = 1_000_000;
    for (let i = 1; i <= OPTS.limit; i++) {
      const r = rateLimit("1.2.3.4", { ...OPTS, now });
      expect(r.ok).toBe(true);
      expect(r.remaining).toBe(OPTS.limit - i);
    }
    const over = rateLimit("1.2.3.4", { ...OPTS, now });
    expect(over.ok).toBe(false);
    expect(over.remaining).toBe(0);
    expect(over.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keeps separate budgets per client", () => {
    const now = 1_000_000;
    for (let i = 0; i < OPTS.limit; i++) rateLimit("a", { ...OPTS, now });
    expect(rateLimit("a", { ...OPTS, now }).ok).toBe(false);
    // A different caller must be unaffected by the first one's spending.
    expect(rateLimit("b", { ...OPTS, now }).ok).toBe(true);
  });

  it("starts a fresh window once the old one expires", () => {
    const now = 1_000_000;
    for (let i = 0; i < OPTS.limit; i++) rateLimit("c", { ...OPTS, now });
    expect(rateLimit("c", { ...OPTS, now }).ok).toBe(false);

    const later = now + OPTS.windowMs + 1;
    const fresh = rateLimit("c", { ...OPTS, now: later });
    expect(fresh.ok).toBe(true);
    expect(fresh.remaining).toBe(OPTS.limit - 1);
  });

  it("does not let a client accumulate budget by waiting inside a window", () => {
    const now = 1_000_000;
    rateLimit("d", { ...OPTS, now });
    rateLimit("d", { ...OPTS, now: now + 30_000 });
    rateLimit("d", { ...OPTS, now: now + 40_000 });
    expect(rateLimit("d", { ...OPTS, now: now + 50_000 }).ok).toBe(false);
  });

  it("reports retry-after in whole seconds, never zero when limited", () => {
    const now = 1_000_000;
    for (let i = 0; i < OPTS.limit; i++) rateLimit("e", { ...OPTS, now });
    // 1ms before the window closes, Retry-After must still round up to 1.
    const r = rateLimit("e", { ...OPTS, now: now + OPTS.windowMs - 1 });
    expect(r.ok).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(r.retryAfterSeconds)).toBe(true);
  });
});

describe("clientKey", () => {
  function req(headers: Record<string, string>) {
    return new Request("https://example.com/api/ai", { headers });
  }

  it("prefers CF-Connecting-IP, which the client cannot forge", () => {
    const key = clientKey(
      req({ "cf-connecting-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1" }),
    );
    expect(key).toBe("9.9.9.9");
  });

  it("falls back to the first x-forwarded-for entry off Cloudflare", () => {
    expect(clientKey(req({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("1.1.1.1");
  });

  it("returns a stable key when nothing identifies the caller", () => {
    expect(clientKey(req({}))).toBe("unknown");
  });
});

describe("rateLimitHeaders", () => {
  it("omits Retry-After while under the limit", () => {
    const h = rateLimitHeaders(rateLimit("f", OPTS));
    expect(h["RateLimit-Limit"]).toBe("3");
    expect(h).not.toHaveProperty("Retry-After");
  });

  it("includes Retry-After once limited", () => {
    const now = Date.now();
    for (let i = 0; i < OPTS.limit; i++) rateLimit("g", { ...OPTS, now });
    const h = rateLimitHeaders(rateLimit("g", { ...OPTS, now }));
    expect(h["Retry-After"]).toBeDefined();
    expect(Number(h["Retry-After"])).toBeGreaterThan(0);
  });
});
