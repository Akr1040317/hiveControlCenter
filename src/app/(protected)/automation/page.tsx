import { listRunbooks } from "@/lib/jobs/engine";

export default async function AutomationPage() {
  const runbooks = await listRunbooks();

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Automation</h1>
        <p className="text-sm text-zinc-600">
          Runbook catalog for script-backed operations with dry-run-first
          behavior.
        </p>
      </div>

      <div className="grid gap-3">
        {runbooks.map((runbook) => (
          <article
            key={runbook.id}
            className="rounded-xl border border-zinc-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium text-zinc-900">{runbook.name}</h2>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                {runbook.riskLevel} risk
              </p>
            </div>
            <p className="mt-1 text-sm text-zinc-600">{runbook.description}</p>
            <p className="mt-2 text-xs text-zinc-500">{runbook.id}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
