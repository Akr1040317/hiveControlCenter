import { getLaunchReadinessSnapshot } from "@/lib/launch/readiness";

function CheckPill({ pass }: { pass: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${pass ? "bg-green-900/40 text-green-300" : "bg-yellow-900/40 text-yellow-300"}`}
    >
      {pass ? "pass" : "attention"}
    </span>
  );
}

export default async function LaunchReadinessPage() {
  const snapshot = await getLaunchReadinessSnapshot();

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Launch Readiness</h1>
        <p className="text-sm hive-subtle">
          Final pre-launch gate for RBAC, staging checks, backup/rollback, and production smoke verification.
        </p>
      </div>

      <article className="hive-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-medium text-white">Go-live gate</h2>
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${snapshot.overallReady ? "bg-green-900/40 text-green-300" : "bg-yellow-900/40 text-yellow-300"}`}
          >
            {snapshot.overallReady ? "ready" : "not-ready"}
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {snapshot.goLiveChecks.map((check) => (
            <div
              key={check.key}
              className="flex items-center justify-between rounded-md border border-[#2a2a46] bg-[#17172a] px-3 py-2 text-sm"
            >
              <div>
                <p className="text-[#ececff]">{check.label}</p>
                <p className="text-xs text-[#a4a4be]">Current: {check.value}</p>
              </div>
              <CheckPill pass={check.pass} />
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#a4a4be]">
          Generated at {new Date(snapshot.generatedAt).toLocaleString()}.
        </p>
      </article>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">RBAC review matrix</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[#b9b9cf]">
              <tr>
                <th className="pb-2">Role</th>
                <th className="pb-2">Permissions</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.roles.map((row) => (
                <tr key={row.role} className="border-t border-[#2a2a46]">
                  <td className="py-2 text-[#ececff]">{row.role}</td>
                  <td className="py-2 text-xs text-[#a4a4be]">
                    {row.permissions.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">Staging checklist</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[#dcdcef]">
          {snapshot.stagingChecklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </article>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">Backup & rollback runbook</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[#dcdcef]">
          {snapshot.backupAndRollbackPlan.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </article>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">Production smoke tests</h2>
        <p className="mt-2 text-sm text-[#dcdcef]">
          Run the scripted checks against production before broad launch:
        </p>
        <pre className="mt-2 overflow-auto rounded-md border border-[#2a2a46] bg-[#17172a] px-3 py-2 text-xs text-[#dcdcef]">
{`ADMIN_BASE_URL=https://hive-control-center.vercel.app \\
ADMIN_SESSION_COOKIE="<session-cookie-value>" \\
npm run smoke:prod`}
        </pre>
      </article>
    </section>
  );
}
