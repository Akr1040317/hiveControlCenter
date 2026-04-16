import "server-only";

import { NextResponse } from "next/server";
import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/audit/logger";
import { assertRateLimit } from "@/lib/security/rateLimit";
import { assertValidCsrf } from "@/lib/security/csrf";
import {
  getDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/content/firestore";

type DetailRouteOptions = {
  collection: string;
  resourceType: string;
  rateKey: string;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export function makeContentGetHandler(opts: DetailRouteOptions) {
  return async function GET(
    _request: Request,
    context: RouteContext,
  ) {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      assertPermission(session, "content.read");
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const doc = await getDocument(opts.collection, id);
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ item: doc });
  };
}

export function makeContentUpdateHandler(opts: DetailRouteOptions) {
  return async function PUT(
    request: Request,
    context: RouteContext,
  ) {
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

    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    try {
      await updateDocument(opts.collection, id, body);

      await logAdminAction({
        actor: session,
        actionType: `content.${opts.resourceType}.update`,
        resourceType: opts.resourceType,
        resourceId: id,
        requestPayloadRedacted: { keys: Object.keys(body) },
        result: "success",
      });

      return NextResponse.json({ ok: true });
    } catch (error) {
      await logAdminAction({
        actor: session,
        actionType: `content.${opts.resourceType}.update`,
        resourceType: opts.resourceType,
        resourceId: id,
        result: "failure",
        errorMessage: error instanceof Error ? error.message : "Unknown",
      });
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
  };
}

export function makeContentDeleteHandler(opts: DetailRouteOptions) {
  return async function DELETE(
    request: Request,
    context: RouteContext,
  ) {
    try {
      assertRateLimit(request, opts.rateKey, { limit: 30, windowMs: 60_000 });
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

    const { id } = await context.params;

    try {
      await deleteDocument(opts.collection, id);

      await logAdminAction({
        actor: session,
        actionType: `content.${opts.resourceType}.delete`,
        resourceType: opts.resourceType,
        resourceId: id,
        result: "success",
      });

      return NextResponse.json({ ok: true });
    } catch (error) {
      await logAdminAction({
        actor: session,
        actionType: `content.${opts.resourceType}.delete`,
        resourceType: opts.resourceType,
        resourceId: id,
        result: "failure",
        errorMessage: error instanceof Error ? error.message : "Unknown",
      });
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
  };
}
