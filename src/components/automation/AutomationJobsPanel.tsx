"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { getCsrfToken } from "@/lib/client/csrf";

type JobRecord = {
  id: string;
  runbookId?: string;
  status?: string;
  requestedByEmail?: string;
  isDryRun?: boolean;
};

export function AutomationJobsPanel() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [reasonByJobId, setReasonByJobId] = useState<Record<string, string>>({});

  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/automation/jobs");
      const payload = (await response.json()) as { jobs?: JobRecord[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load jobs");
      }
      setJobs(payload.jobs ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load jobs");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const runAction = async (
    jobId: string,
    action: "approve" | "cancel" | "retry",
  ) => {
    const reason = reasonByJobId[jobId]?.trim();
    if (!reason || reason.length < 6) {
      setMessage("Add a reason (at least 6 chars) before approving/canceling.");
      return;
    }

    try {
      const response = await fetch(`/api/automation/jobs/${jobId}/${action}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": await getCsrfToken(),
        },
        body: JSON.stringify({ reason }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to ${action} job`);
      }

      setMessage(
        action === "retry"
          ? "Job retried successfully."
          : `Job ${action}d successfully.`,
      );
      await loadJobs();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Failed to ${action} job`);
    }
  };

  return (
    <article className="hive-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-medium text-white">Recent job runs</h2>
        <button
          type="button"
          onClick={() => void loadJobs()}
          className="hive-secondary-btn px-3 py-1.5 text-xs"
        >
          Refresh
        </button>
      </div>
      {message ? <p className="mt-2 text-sm text-[#dcdcef]">{message}</p> : null}
      {isLoading ? (
        <p className="mt-3 text-sm hive-subtle">Loading jobs...</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[#bbbcd1]">
              <tr>
                <th className="pb-2">Runbook</th>
                <th className="pb-2">Job</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Requested by</th>
                <th className="pb-2">Dry run</th>
                <th className="pb-2">Reason</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-t border-[#2a2a46]">
                  <td className="py-2 text-[#ececff]">{job.runbookId ?? "—"}</td>
                  <td className="py-2">
                    <Link
                      href={`/automation/${job.id}`}
                      className="hive-secondary-btn px-2 py-1 text-xs"
                    >
                      Open
                    </Link>
                  </td>
                  <td className="py-2 text-[#ececff]">{job.status ?? "—"}</td>
                  <td className="py-2 text-[#a4a4be]">
                    {job.requestedByEmail ?? "—"}
                  </td>
                  <td className="py-2 text-[#a4a4be]">
                    {job.isDryRun ? "yes" : "no"}
                  </td>
                  <td className="py-2">
                    <input
                      value={reasonByJobId[job.id] ?? ""}
                      onChange={(event) =>
                        setReasonByJobId((prev) => ({
                          ...prev,
                          [job.id]: event.target.value,
                        }))
                      }
                      className="hive-input w-52 px-2 py-1 text-xs"
                      placeholder="Reason for action"
                    />
                  </td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      {job.isDryRun || job.status !== "pending_approval" ? null : (
                        <button
                          type="button"
                          onClick={() => void runAction(job.id, "approve")}
                          className="hive-primary-btn px-2 py-1 text-xs"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void runAction(job.id, "cancel")}
                        className="hive-secondary-btn px-2 py-1 text-xs"
                        disabled={job.status === "completed" || job.status === "failed"}
                      >
                        Cancel
                      </button>
                      {job.status === "failed" || job.status === "cancelled" ? (
                        <button
                          type="button"
                          onClick={() => void runAction(job.id, "retry")}
                          className="hive-primary-btn px-2 py-1 text-xs"
                        >
                          Retry
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
