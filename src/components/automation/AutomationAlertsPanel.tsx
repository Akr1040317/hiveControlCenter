"use client";

import Link from "next/link";
import { useState } from "react";

import type { AutomationAlert } from "@/lib/jobs/engine";
import { getCsrfToken } from "@/lib/client/csrf";

type AutomationAlertsPanelProps = {
  alerts: AutomationAlert[];
};

export function AutomationAlertsPanel({ alerts }: AutomationAlertsPanelProps) {
  const [ackReasonById, setAckReasonById] = useState<Record<string, string>>({});
  const [hiddenAlertIds, setHiddenAlertIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const visibleAlerts = alerts.filter((alert) => !hiddenAlertIds.includes(alert.id));

  const acknowledgeAlert = async (alertId: string) => {
    const reason = ackReasonById[alertId]?.trim();
    if (!reason || reason.length < 6) {
      setMessage("Add an ack reason (at least 6 chars).");
      return;
    }

    const response = await fetch("/api/automation/alerts/ack", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": await getCsrfToken(),
      },
      body: JSON.stringify({ alertId, reason }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || "Failed to acknowledge alert");
    }
    setHiddenAlertIds((prev) => [...prev, alertId]);
    setMessage("Alert acknowledged.");
  };

  return (
    <article className="hive-card p-4">
      <h2 className="text-base font-medium text-white">Automation alerts</h2>
      {message ? <p className="mt-2 text-xs text-[#dcdcef]">{message}</p> : null}
      {visibleAlerts.length === 0 ? (
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
                <th className="pb-2">Ack reason</th>
                <th className="pb-2">Job</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleAlerts.map((alert) => (
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
                    <input
                      value={ackReasonById[alert.id] ?? ""}
                      onChange={(event) =>
                        setAckReasonById((prev) => ({
                          ...prev,
                          [alert.id]: event.target.value,
                        }))
                      }
                      className="hive-input w-52 px-2 py-1 text-xs"
                      placeholder="Ack reason"
                    />
                  </td>
                  <td className="py-2">
                    <Link
                      href={`/automation/${alert.jobId}`}
                      className="hive-secondary-btn px-2 py-1 text-xs"
                    >
                      Open
                    </Link>
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => void acknowledgeAlert(alert.id)}
                      className="hive-secondary-btn px-2 py-1 text-xs"
                    >
                      Acknowledge
                    </button>
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

