import "server-only";

import { NextResponse } from "next/server";
import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/audit/logger";
import { assertRateLimit } from "@/lib/security/rateLimit";
import { assertValidCsrf } from "@/lib/security/csrf";
import {
  listDocuments,
  createDocument,
} from "@/lib/content/firestore";

type ContentRouteOptions = {
  collection: string;
  resourceType: string;
  rateKey: string;
  validate?: (body: Record<string, unknown>) => string | null;
};

export function makeContentListHandler(opts: ContentRouteOptions) {
  return async function GET(request: Request) {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      assertPermission(session, "content.read");
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status") ?? undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);

    const docs = await listDocuments(opts.collection, { limit, statusFilter });
    return NextResponse.json({ items: docs, count: docs.length });
  };
}

export function makeContentCreateHandler(opts: ContentRouteOptions) {
  return async function POST(request: Request) {
    try {
      assertRateLimit(request, opts.rateKey, { limit: 60, windowMs: 60_000 });
      await assertValidCsrf(request);
    } catch (error) {
      if (error instanceof Error && error.message === "RATE_LIMITED") {
        return NextResponse.json({ error: "Too many requests." }, { status: 429 });
      }
      return NextResponse.json({ error: "Missing or invalid CSRF token." }, { status: 403 });
    }

    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      assertPermission(session, "content.write");
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    if (opts.validate) {
      const err = opts.validate(body);
      if (err) {
        return NextResponse.json({ error: err }, { status: 400 });
      }
    }

    try {
      const id = await createDocument(opts.collection, body);

      await logAdminAction({
        actor: session,
        actionType: `content.${opts.resourceType}.create`,
        resourceType: opts.resourceType,
        resourceId: id,
        requestPayloadRedacted: { keys: Object.keys(body) },
        result: "success",
      });

      return NextResponse.json({ id }, { status: 201 });
    } catch (error) {
      await logAdminAction({
        actor: session,
        actionType: `content.${opts.resourceType}.create`,
        resourceType: opts.resourceType,
        result: "failure",
        errorMessage: error instanceof Error ? error.message : "Unknown",
      });
      return NextResponse.json({ error: "Create failed" }, { status: 500 });
    }
  };
}
