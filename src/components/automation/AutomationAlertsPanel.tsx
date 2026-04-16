import Link from "next/link";

import type { AutomationAlert } from "@/lib/jobs/engine";

type AutomationAlertsPanelProps = {
  alerts: AutomationAlert[];
};

export function AutomationAlertsPanel({ alerts }: AutomationAlertsPanelProps) {
  return (
    <article className="hive-card p-4">
      <h2 className="text-base font-medium text-white">Automation alerts</h2>
      {alerts.length === 0 ? (
        <p className="mt-2 text-sm hive-subtle">No active alerts.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[#bbbcd1]">
              <tr>
                <th className="pb-2">Severity</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Runbook</th>
                <th className="pb-2">Message</th>
                <th className="pb-2">At</th>
                <th className="pb-2">Job</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id} className="border-t border-[#2a2a46]">
                  <td
                    className={`py-2 ${
                      alert.severity === "high" ? "text-[#ff8a8a]" : "text-[#ffd58a]"
                    }`}
                  >
                    {alert.severity}
                  </td>
                  <td className="py-2 text-[#ececff]">{alert.type}</td>
                  <td className="py-2 text-[#dcdcef]">{alert.runbookId}</td>
                  <td className="py-2 text-[#dcdcef]">{alert.message}</td>
                  <td className="py-2 text-[#a4a4be]">{alert.createdAtLabel}</td>
                  <td className="py-2">
                    <Link
                      href={`/automation/${alert.jobId}`}
                      className="hive-secondary-btn px-2 py-1 text-xs"
                    >
                      Open
                    </Link>
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

