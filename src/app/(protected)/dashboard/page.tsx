import { getOverviewMetrics } from "@/lib/metrics/overview";

function asCount(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "—";
  }
  return value.toLocaleString();
}

export default async function DashboardPage() {
  let metrics: Awaited<ReturnType<typeof getOverviewMetrics>>["summary"] | null =
    null;

  try {
    metrics = (await getOverviewMetrics()).summary;
  } catch {
    metrics = null;
  }

  const revenueDisplay =
    typeof metrics?.revenue30d === "number"
      ? `$${metrics.revenue30d.toLocaleString()}`
      : "Pending";

  const stripeStatus = metrics?.stripeConnected
    ? metrics.stripeLivemode
      ? "Connected (live)"
      : "Connected (test)"
    : "Not connected";

  const kpis = [
    {
      label: "Revenue (30d)",
      value: revenueDisplay,
      hint: metrics?.stripeConnected
        ? "Computed from Stripe succeeded payment intents."
        : metrics?.stripeError || "Set STRIPE_SECRET_KEY to enable Stripe metrics.",
    },
    {
      label: "Stripe Status",
      value: stripeStatus,
      hint: metrics?.stripeConnected
        ? "Stripe API is reachable from admin backend."
        : metrics?.stripeError || "Stripe key missing or invalid.",
    },
    {
      label: "Total Users",
      value: asCount(metrics?.totalUsers),
      hint: "Count from Firestore users collection.",
    },
    {
      label: "Active Learners",
      value: asCount(metrics?.activeLearners),
      hint: "Users with active status.",
    },
    {
      label: "Admin Users",
      value: asCount(metrics?.adminUsers),
      hint: "Access records in adminUsers.",
    },
    {
      label: "Active Subscriptions",
      value: asCount(metrics?.activeSubscriptions),
      hint: "Users with subscriptionStatus = active.",
    },
    {
      label: "Failed Jobs (24h)",
      value: asCount(metrics?.failedJobs24h),
      hint: "automationJobRuns with failed status.",
    },
    {
      label: "Audit Events (24h)",
      value: asCount(metrics?.recentAuditEvents24h),
      hint: "adminActionAuditLogs events last 24 hours.",
    },
  ];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Executive Command Dashboard
        </h1>
        <p className="mt-1 text-sm hive-subtle">
          Live Firestore-backed metrics for the next control-center phase.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <article
            key={kpi.label}
                className="hive-card p-4"
          >
            <p className="hive-section-label">
              {kpi.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {kpi.value}
            </p>
            <p className="mt-1 text-xs hive-subtle">{kpi.hint}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
