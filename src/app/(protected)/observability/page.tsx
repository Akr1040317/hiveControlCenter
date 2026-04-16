import { getSloSnapshot } from "@/lib/observability/slo";

export default async function ObservabilityPage() {
  const slo = await getSloSnapshot();
  const successRateColor =
    slo.reliability.successRate24h >= 99
      ? "text-green-400"
      : slo.reliability.successRate24h >= 97
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold text-white">Observability</h1>
      <p className="text-sm hive-subtle">
        SLO dashboards for reliability, queue health, security telemetry, and billing/webhook signal health.
      </p>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">Reliability SLO (24h)</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="hive-section-label">Total Jobs</p>
            <p className="mt-1 text-sm text-[#ececff]">
              {slo.reliability.totalJobs24h.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="hive-section-label">Failed Jobs</p>
            <p className="mt-1 text-sm text-[#ececff]">
              {slo.reliability.failedJobs24h.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="hive-section-label">Success Rate</p>
            <p className={`mt-1 text-sm font-medium ${successRateColor}`}>
              {slo.reliability.successRate24h.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="hive-section-label">P95 Job Duration</p>
            <p className="mt-1 text-sm text-[#ececff]">
              {slo.reliability.p95JobDurationSeconds24h.toLocaleString()}s
            </p>
          </div>
        </div>
      </article>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">Queue Health</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="hive-section-label">Pending Approval</p>
            <p className="mt-1 text-sm text-[#ececff]">
              {slo.queueHealth.pendingApproval.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="hive-section-label">Running Now</p>
            <p className="mt-1 text-sm text-[#ececff]">
              {slo.queueHealth.runningNow.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="hive-section-label">Stale Running {'>'}30m</p>
            <p
              className={`mt-1 text-sm ${slo.queueHealth.staleRunningOver30m > 0 ? "text-yellow-400" : "text-green-400"}`}
            >
              {slo.queueHealth.staleRunningOver30m.toLocaleString()}
            </p>
          </div>
        </div>
      </article>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">Security & Error Telemetry (24h)</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="hive-section-label">Audit Events</p>
            <p className="mt-1 text-sm text-[#ececff]">
              {slo.security.auditEvents24h.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="hive-section-label">Structured Error Events</p>
            <p
              className={`mt-1 text-sm ${slo.security.errorEvents24h > 0 ? "text-yellow-400" : "text-green-400"}`}
            >
              {slo.security.errorEvents24h.toLocaleString()}
            </p>
          </div>
        </div>
      </article>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">Billing / Webhook Signal (24h)</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="hive-section-label">Webhook Events</p>
            <p className="mt-1 text-sm text-[#ececff]">
              {slo.billing.stripeWebhookEvents24h.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="hive-section-label">Webhook Failures</p>
            <p
              className={`mt-1 text-sm ${slo.billing.stripeWebhookFailures24h > 0 ? "text-yellow-400" : "text-green-400"}`}
            >
              {slo.billing.stripeWebhookFailures24h.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="hive-section-label">Webhook Signal Stale</p>
            <p
              className={`mt-1 text-sm ${slo.billing.staleWebhookSignal ? "text-yellow-400" : "text-green-400"}`}
            >
              {slo.billing.staleWebhookSignal ? "Yes" : "No"}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-[#a4a4be]">
          Snapshot generated at {new Date(slo.generatedAt).toLocaleString()}.
        </p>
      </article>
    </section>
  );
}
