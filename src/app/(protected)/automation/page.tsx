import { getAutomationOpsOverview, listRunbooks } from "@/lib/jobs/engine";
import { AutomationJobsPanel } from "@/components/automation/AutomationJobsPanel";
import { PronunciationRunPanel } from "@/components/automation/PronunciationRunPanel";

export default async function AutomationPage() {
  const runbooks = await listRunbooks();
  const overview = await getAutomationOpsOverview();
  const grouped = runbooks.reduce<Record<string, typeof runbooks>>(
    (acc, runbook) => {
      if (!acc[runbook.category]) {
        acc[runbook.category] = [];
      }
      acc[runbook.category].push(runbook);
      return acc;
    },
    {},
  );

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Automation</h1>
        <p className="text-sm hive-subtle">
          Runbook catalog for script-backed operations with dry-run-first
          behavior.
        </p>
      </div>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">Automation health</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div>
            <p className="hive-section-label">Live execution</p>
            <p className="mt-1 text-sm text-[#ececff]">
              {overview.liveExecutionEnabled ? "Enabled" : "Paused"}
            </p>
          </div>
          <div>
            <p className="hive-section-label">Pending approval</p>
            <p className="mt-1 text-sm text-[#ececff]">
              {overview.pendingApproval.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="hive-section-label">Running jobs</p>
            <p className="mt-1 text-sm text-[#ececff]">
              {overview.runningJobs.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="hive-section-label">Queued jobs</p>
            <p className="mt-1 text-sm text-[#ececff]">
              {overview.queuedJobs.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="hive-section-label">Failed (24h)</p>
            <p className="mt-1 text-sm text-[#ececff]">
              {overview.failedJobs24h.toLocaleString()}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-[#a4a4be]">
          Toggle live executions with env var `ADMIN_CENTER_AUTOMATION_ENABLED=false`
          and redeploy.
        </p>
      </article>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="space-y-2">
          <h2 className="hive-section-label">
            {category.replace("_", " ")}
          </h2>
          <div className="grid gap-3">
            {items?.map((runbook) => (
              <article
                key={runbook.id}
                className="hive-card p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium text-white">{runbook.name}</h3>
                  <p className="hive-section-label">
                    {runbook.riskLevel} risk
                  </p>
                </div>
                <p className="mt-1 text-sm hive-subtle">{runbook.description}</p>
                <p className="mt-2 text-xs text-[#8f8faa]">{runbook.id}</p>
              </article>
            ))}
          </div>
        </div>
      ))}

      <PronunciationRunPanel />
      <AutomationJobsPanel />
    </section>
  );
}
