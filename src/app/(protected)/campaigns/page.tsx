import { listRecentJobs } from "@/lib/jobs/engine";
import { getRunbookById } from "@/lib/jobs/runbookRegistry";

import { CampaignsPanel } from "@/components/campaigns/CampaignsPanel";

export default async function CampaignsPage() {
  const recentJobs = await listRecentJobs(80);
  const campaignJobs = recentJobs.filter((job) => {
    const runbookId = typeof job.runbookId === "string" ? job.runbookId : "";
    const runbook = getRunbookById(runbookId);
    return runbook?.category === "campaigns";
  });

  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold text-white">Campaigns</h1>
      <p className="text-sm hive-subtle">
        Bee Ready and webinar campaign operations will be routed through
        runbooks and audited execution.
      </p>
      <CampaignsPanel initialCampaignJobs={campaignJobs} />
    </section>
  );
}
