import { NextResponse } from "next/server";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { getCampaignTemplateByKey } from "@/lib/campaigns/catalog";

type RouteParams = {
  params: Promise<{ templateKey: string }>;
};

export async function GET(_: Request, context: RouteParams) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertPermission(session, "campaigns.preview");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { templateKey } = await context.params;
  const template = getCampaignTemplateByKey(templateKey);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({
    templateKey: template.key,
    name: template.name,
    previewHtml: template.previewHtml,
    scriptPath: template.scriptPath,
    templatePath: template.templatePath,
  });
}
