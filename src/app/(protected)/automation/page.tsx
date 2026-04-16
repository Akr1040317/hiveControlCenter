import { listRunbooks } from "@/lib/jobs/engine";
import { AutomationJobsPanel } from "@/components/automation/AutomationJobsPanel";
import { PronunciationRunPanel } from "@/components/automation/PronunciationRunPanel";

export default async function AutomationPage() {
  const runbooks = await listRunbooks();
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
