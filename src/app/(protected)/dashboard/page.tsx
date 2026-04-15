export default function DashboardPage() {
  const kpis = [
    { label: "Revenue (30d)", value: "$0.00", hint: "Connect billing sources" },
    { label: "Active Learners", value: "0", hint: "Wire metrics endpoint" },
    { label: "Campaign Sends", value: "0", hint: "Bee Ready + webinar sends" },
    { label: "Job Failures", value: "0", hint: "From automationJobRuns" },
  ];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Executive Command Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Phase A shell with secure auth and module routing in place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <article
            key={kpi.label}
            className="rounded-xl border border-zinc-200 bg-white p-4"
          >
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              {kpi.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {kpi.value}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{kpi.hint}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
