"use client";

import { useCallback, useEffect, useState } from "react";

type ToolRun = {
  id: string;
  runbookId: string;
  status: string;
  isDryRun: boolean;
  requestedByEmail: string;
  createdAt: string | null;
  completedAt: string | null;
  resultSummary: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  completed: "text-green-400",
  running: "text-blue-400",
  pending_approval: "text-yellow-400",
  queued: "text-[#a4a4be]",
  failed: "text-red-400",
  cancelled: "text-[#6b6b8a]",
};

export function ToolRunHistoryPanel({ refreshTrigger }: { refreshTrigger?: number }) {
  const [runs, setRuns] = useState<ToolRun[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tools/history");
      if (!res.ok) return;
      const data = (await res.json()) as { runs: ToolRun[] };
      setRuns(data.runs ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshTrigger]);

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  }

  function friendlyRunbook(id: string) {
    const parts = id.split(".");
    return parts[parts.length - 1] ?? id;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#9b9bb4]">
          Recent Tool Runs
        </h3>
        <button
          onClick={fetchHistory}
          className="text-xs text-[#ffa500] hover:underline"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[#9b9bb4]">Loading...</p>
      ) : runs.length === 0 ? (
        <p className="text-sm text-[#9b9bb4]">No tool runs yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#1e1e34]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#1e1e34] bg-[#121220]">
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-[#9b9bb4]">Tool</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-[#9b9bb4]">Status</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-[#9b9bb4]">Dry</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-[#9b9bb4]">By</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-[#9b9bb4]">Created</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-[#9b9bb4]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-[#1e1e34] hover:bg-[rgba(255,165,0,0.04)] transition-colors">
                  <td className="px-3 py-2 text-[#d8d8ea]">{friendlyRunbook(run.runbookId)}</td>
                  <td className={`px-3 py-2 font-medium ${STATUS_COLORS[run.status] ?? "text-[#d8d8ea]"}`}>
                    {run.status}
                  </td>
                  <td className="px-3 py-2 text-[#d8d8ea]">{run.isDryRun ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-xs text-[#9b9bb4]">{run.requestedByEmail ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-[#9b9bb4]">{formatDate(run.createdAt)}</td>
                  <td className="px-3 py-2">
                    <a
                      href={`/automation/${run.id}`}
                      className="text-xs text-[#ffa500] hover:underline"
                    >
                      Details
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
