"use client";

import { useState } from "react";
import { TOOL_ACTIONS, TOOL_CATEGORIES, type ToolAction } from "@/lib/tools/toolActions";
import { ToolRunnerPanel } from "./ToolRunnerPanel";
import { ToolRunHistoryPanel } from "./ToolRunHistoryPanel";

const RISK_BADGE: Record<string, string> = {
  low: "bg-green-900/30 text-green-400 border-green-700/30",
  medium: "bg-yellow-900/30 text-yellow-400 border-yellow-700/30",
  high: "bg-red-900/30 text-red-400 border-red-700/30",
  critical: "bg-red-900/50 text-red-300 border-red-600/40",
};

export function ToolsConsole() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const filtered =
    activeCategory === "all"
      ? TOOL_ACTIONS
      : TOOL_ACTIONS.filter((t) => t.category === activeCategory);

  function handleJobCreated() {
    setRefreshTrigger((n) => n + 1);
  }

  function getRiskLevel(action: ToolAction) {
    if (action.runbookId.includes("quiz.addWords")) return "high";
    if (action.runbookId.includes("learningTrack.rebuild")) return "high";
    return "medium";
  }

  return (
    <div className="space-y-5">
      {/* Category filter */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-[#1e1e34] bg-[#121220] p-1">
        <button
          onClick={() => setActiveCategory("all")}
          className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeCategory === "all"
              ? "bg-[rgba(255,165,0,0.15)] text-[#ffc36b]"
              : "text-[#9b9bb4] hover:text-[#d8d8ea] hover:bg-[rgba(255,255,255,0.04)]"
          }`}
        >
          All Tools ({TOOL_ACTIONS.length})
        </button>
        {TOOL_CATEGORIES.map((cat) => {
          const count = TOOL_ACTIONS.filter((t) => t.category === cat.id).length;
          if (count === 0) return null;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? "bg-[rgba(255,165,0,0.15)] text-[#ffc36b]"
                  : "text-[#9b9bb4] hover:text-[#d8d8ea] hover:bg-[rgba(255,255,255,0.04)]"
              }`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Tool cards */}
      <div className="grid gap-3">
        {filtered.map((action) => {
          const isExpanded = expandedTool === action.id;
          const risk = getRiskLevel(action);

          return (
            <div
              key={action.id}
              className="rounded-lg border border-[#1e1e34] bg-[#161629] overflow-hidden"
            >
              <button
                onClick={() => setExpandedTool(isExpanded ? null : action.id)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-[rgba(255,165,0,0.04)] transition-colors"
              >
                <span className="text-2xl">{action.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-white">{action.name}</h3>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${RISK_BADGE[risk] ?? RISK_BADGE.medium}`}
                    >
                      {risk} risk
                    </span>
                    {action.supportsDryRun && (
                      <span className="rounded-full bg-blue-900/30 border border-blue-700/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-blue-400">
                        dry-run
                      </span>
                    )}
                    {action.supportsFileUpload && (
                      <span className="rounded-full bg-purple-900/30 border border-purple-700/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-purple-400">
                        file upload
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-[#9b9bb4] truncate">{action.description}</p>
                </div>
                <span className={`text-[#9b9bb4] transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </button>

              {isExpanded && (
                <div className="border-t border-[#1e1e34] bg-[#13132a] px-5 py-5">
                  <div className="mb-3 flex flex-wrap gap-3 text-xs text-[#6b6b8a]">
                    <span>Runbook: <span className="text-[#d8d8ea]">{action.runbookId}</span></span>
                    <span>Category: <span className="text-[#d8d8ea]">{action.category}</span></span>
                  </div>
                  <ToolRunnerPanel action={action} onJobCreated={handleJobCreated} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-[#9b9bb4]">No tools in this category.</p>
      )}

      {/* Run history */}
      <div className="hive-card p-5">
        <ToolRunHistoryPanel refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}
