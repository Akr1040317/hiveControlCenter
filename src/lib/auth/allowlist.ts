const DEFAULT_ALLOWLIST = [
  "arastogi@hivespelling.com",
  "erastogi@hivespelling.com",
  "fnuanupam@gmail.com",
  "vinitaprasad2011@gmail.com",
];

export function getAllowlistedEmails(): string[] {
  const fromEnv = process.env.ADMIN_EMAIL_ALLOWLIST;

  if (!fromEnv) {
    return DEFAULT_ALLOWLIST;
  }

  const parsed = fromEnv
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (parsed.length === 0) {
    return DEFAULT_ALLOWLIST;
  }

  return parsed;
}

export function isEmailAllowlisted(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  return getAllowlistedEmails().includes(email.toLowerCase());
}
