import "server-only";

type Bucket = {
  count: number;
  windowStart: number;
};

type RateLimitOptions = {
  limit: number;
  windowMs: number;
  userKey?: string;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function getClientIp(request: Request): string {
  const fromForwarded = request.headers.get("x-forwarded-for");
  if (fromForwarded) {
    return fromForwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function assertRateLimit(
  request: Request,
  routeKey: string,
  options: RateLimitOptions,
) {
  const now = Date.now();
  const ip = getClientIp(request);
  const actorKey = options.userKey?.trim() || "anon";
  const key = `${routeKey}:${ip}:${actorKey}`;
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= options.windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return;
  }

  if (existing.count >= options.limit) {
    throw new Error("RATE_LIMITED");
  }

  existing.count += 1;
  buckets.set(key, existing);

  // Prevent unbounded growth in long-lived server processes.
  if (buckets.size > MAX_BUCKETS) {
    const cutoff = now - options.windowMs * 2;
    for (const [bucketKey, bucket] of buckets.entries()) {
      if (bucket.windowStart < cutoff) {
        buckets.delete(bucketKey);
      }
    }
  }
}
