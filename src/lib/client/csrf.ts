let cachedCsrfToken: string | null = null;

export async function getCsrfToken() {
  if (cachedCsrfToken) {
    return cachedCsrfToken;
  }

  const response = await fetch("/api/auth/csrf", { method: "GET" });
  if (!response.ok) {
    throw new Error("Unable to initialize CSRF token.");
  }

  const payload = (await response.json()) as { csrfToken?: string };
  if (!payload.csrfToken) {
    throw new Error("Missing CSRF token in response.");
  }

  cachedCsrfToken = payload.csrfToken;
  return payload.csrfToken;
}
