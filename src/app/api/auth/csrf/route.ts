import { NextResponse } from "next/server";

import { attachCsrfCookie, generateCsrfToken } from "@/lib/security/csrf";

export async function GET() {
  const token = generateCsrfToken();
  const response = NextResponse.json({ csrfToken: token });
  attachCsrfCookie(response, token);
  return response;
}
