import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/guards";
import { getJobById, getJobEvents } from "@/lib/jobs/engine";

type PageProps = {
  params: Promise<{ jobId: string }>;
};

function formatTimestamp(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    try {
      return (value as { toDate: () => Date }).toDate().toLocaleString();
    } catch {
      return "—";
    }
  }
  if (typeof value === "string") {
    return value;
  }
  return "—";
}

export default async function AutomationJobDetailPage({ params }: PageProps) {
  await requireAdminSession();
  const { jobId } = await params;
  const job = await getJobById(jobId);
  if (!job) {
    notFound();
  }
  const events = await getJobEvents(jobId, 100);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Automation Job</h1>
          <p className="mt-1 text-sm hive-subtle">{jobId}</p>
        </div>
        <Link href="/automation" className="hive-secondary-btn px-4 py-2 text-sm">
          Back to Automation
        </Link>
      </div>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">Job summary</h2>
        <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          <div>
            <dt className="hive-section-label">Runbook</dt>
            <dd className="text-[#ececff]">{String(job.runbookId ?? "—")}</dd>
          </div>
          <div>
            <dt className="hive-section-label">Status</dt>
            <dd className="text-[#ececff]">{String(job.status ?? "—")}</dd>
          </div>
          <div>
            <dt className="hive-section-label">Requested by</dt>
            <dd className="text-[#ececff]">
              {String(job.requestedByEmail ?? "—")}
            </dd>
          </div>
          <div>
            <dt className="hive-section-label">Dry run</dt>
            <dd className="text-[#ececff]">
              {job.isDryRun ? "Yes" : "No"}
            </dd>
          </div>
        </dl>
      </article>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">Input payload</h2>
        <pre className="mt-3 overflow-auto rounded-md border border-[#2a2a46] bg-[#151526] p-3 text-xs text-[#dcdcef]">
          {JSON.stringify(job.input ?? {}, null, 2)}
        </pre>
      </article>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">Output summary</h2>
        <p className="mt-2 text-sm text-[#dcdcef]">
          {String(job.outputSummary ?? "No summary available.")}
        </p>
        <p className="mt-2 text-xs text-[#a4a4be]">
          Command: {String((job.execution as { command?: string } | undefined)?.command ?? "—")}
        </p>
        <pre className="mt-3 max-h-72 overflow-auto rounded-md border border-[#2a2a46] bg-[#151526] p-3 text-xs text-[#dcdcef]">
          {JSON.stringify(
            (job.execution as { logs?: string[] } | undefined)?.logs ?? [],
            null,
            2,
          )}
        </pre>
      </article>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">Timeline</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-sm hive-subtle">No timeline events yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[#bbbcd1]">
                <tr>
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Message</th>
                  <th className="pb-2">Actor</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-[#2a2a46]">
                    <td className="py-2 text-[#a4a4be]">
                      {formatTimestamp(event.createdAt)}
                    </td>
                    <td className="py-2 text-[#ececff]">{String(event.type ?? "—")}</td>
                    <td className="py-2 text-[#dcdcef]">{String(event.message ?? "—")}</td>
                    <td className="py-2 text-[#a4a4be]">
                      {String(event.actorEmail ?? "system")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
