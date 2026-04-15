import "server-only";

import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const CSRF_COOKIE_NAME = "__hive_admin_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

function toBuffer(value: string) {
  return Buffer.from(value);
}

export function generateCsrfToken() {
  return randomBytes(32).toString("hex");
}

export function attachCsrfCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: CSRF_COOKIE_NAME,
    value: token,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function assertValidCsrf(request: Request) {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    throw new Error("CSRF_MISSING");
  }

  const cookieBuffer = toBuffer(cookieToken);
  const headerBuffer = toBuffer(headerToken);

  if (cookieBuffer.length !== headerBuffer.length) {
    throw new Error("CSRF_INVALID");
  }

  if (!timingSafeEqual(cookieBuffer, headerBuffer)) {
    throw new Error("CSRF_INVALID");
  }
}
