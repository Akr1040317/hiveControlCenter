import { describe, expect, it } from "vitest";

import { assertRateLimit } from "@/lib/security/rateLimit";

describe("rate limiter", () => {
  it("throws RATE_LIMITED when requests exceed limit in the same window", () => {
    const request = new Request("https://example.com/api/test", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
      },
    });

    assertRateLimit(request, "test-limit", { limit: 2, windowMs: 60_000 });
    assertRateLimit(request, "test-limit", { limit: 2, windowMs: 60_000 });

    expect(() =>
      assertRateLimit(request, "test-limit", { limit: 2, windowMs: 60_000 }),
    ).toThrowError("RATE_LIMITED");
  });
});
