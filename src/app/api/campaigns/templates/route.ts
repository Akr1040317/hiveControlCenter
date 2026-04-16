import { NextResponse } from "next/server";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { CAMPAIGN_TEMPLATES } from "@/lib/campaigns/catalog";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertPermission(session, "campaigns.preview");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    templates: CAMPAIGN_TEMPLATES.map((template) => ({
      key: template.key,
      name: template.name,
      description: template.description,
      channel: template.channel,
      runbookId: template.runbookId,
      scriptPath: template.scriptPath,
      templatePath: template.templatePath,
      defaultAudienceSegment: template.defaultAudienceSegment,
      supportsWeekNumber: template.supportsWeekNumber,
    })),
  });
}
