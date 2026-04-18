#!/usr/bin/env node

/**
 * Production smoke checks for Hive Control Center.
 *
 * Required env:
 * - ADMIN_BASE_URL (e.g. https://hive-control-center.vercel.app)
 * Optional env:
 * - ADMIN_SESSION_COOKIE (raw session cookie value for authenticated API checks)
 * - ADMIN_CSRF_TOKEN (if provided with session cookie, used for mutation smoke check)
 */

const baseUrl = process.env.ADMIN_BASE_URL?.trim();
if (!baseUrl) {
  console.error("Missing ADMIN_BASE_URL");
  process.exit(1);
}

const sessionCookie = process.env.ADMIN_SESSION_COOKIE?.trim();
const csrfToken = process.env.ADMIN_CSRF_TOKEN?.trim();

const results = [];

function ok(name, details = "") {
  results.push({ name, pass: true, details });
}

function fail(name, details = "") {
  results.push({ name, pass: false, details });
}

async function check(name, fn) {
  try {
    await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(name, message);
  }
}

async function fetchJson(path, options = {}) {
  const headers = {
    ...(options.headers ?? {}),
  };
  if (sessionCookie) {
    headers.cookie = `__session=${sessionCookie}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return { response, payload };
}

await check("Public sign-in page", async () => {
  const response = await fetch(`${baseUrl}/sign-in`);
  if (!response.ok) {
    throw new Error(`Expected 200, got ${response.status}`);
  }
  ok("Public sign-in page");
});

await check("Protected dashboard redirects or succeeds", async () => {
  const response = await fetch(`${baseUrl}/dashboard`, { redirect: "manual" });
  if (![200, 307, 308].includes(response.status)) {
    throw new Error(`Expected 200/307/308, got ${response.status}`);
  }
  ok("Protected dashboard redirects or succeeds", `status ${response.status}`);
});

await check("SLO endpoint", async () => {
  const { response, payload } = await fetchJson("/api/observability/slo");
  if (sessionCookie) {
    if (!response.ok) {
      throw new Error(`Expected 200 with session, got ${response.status}`);
    }
    if (!payload?.reliability || !payload?.queueHealth) {
      throw new Error("Missing expected SLO keys");
    }
    ok("SLO endpoint", "authenticated");
    return;
  }

  if (response.status !== 401) {
    throw new Error(`Expected 401 without session, got ${response.status}`);
  }
  ok("SLO endpoint", "unauthenticated protected as expected");
});

await check("Stripe health endpoint", async () => {
  const { response } = await fetchJson("/api/integrations/stripe/health");
  if (sessionCookie) {
    if (![200, 403].includes(response.status)) {
      throw new Error(`Expected 200/403 with session, got ${response.status}`);
    }
    ok("Stripe health endpoint", `status ${response.status}`);
    return;
  }

  if (response.status !== 401) {
    throw new Error(`Expected 401 without session, got ${response.status}`);
  }
  ok("Stripe health endpoint", "unauthenticated protected as expected");
});

if (sessionCookie && csrfToken) {
  await check("CSRF-protected mutation endpoint", async () => {
    const { response } = await fetchJson("/api/commerce/stripe/resync", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        identifier: "smoke-test@example.com",
        reason: "smoke-test",
      }),
    });

    if (![404, 400, 403, 423].includes(response.status)) {
      throw new Error(`Expected safe failure code, got ${response.status}`);
    }
    ok("CSRF-protected mutation endpoint", `status ${response.status}`);
  });
}

const passed = results.filter((item) => item.pass).length;
const failed = results.length - passed;

for (const result of results) {
  const prefix = result.pass ? "PASS" : "FAIL";
  const suffix = result.details ? ` - ${result.details}` : "";
  console.log(`${prefix}: ${result.name}${suffix}`);
}

console.log(`\nSummary: ${passed}/${results.length} passed`);
if (failed > 0) {
  process.exit(1);
}
