"use client";

import { FormEvent, useState } from "react";
import { getCsrfToken } from "@/lib/client/csrf";
import type { ToolAction, ToolParamField } from "@/lib/tools/toolActions";

type Props = {
  action: ToolAction;
  onJobCreated?: (jobId: string) => void;
};

type JobResult = {
  id: string;
  status: string;
  runbookId: string;
  isDryRun: boolean;
} | null;

export function ToolRunnerPanel({ action, onJobCreated }: Props) {
  const [params, setParams] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const p of action.params) {
      if (p.defaultValue !== undefined) init[p.key] = p.defaultValue;
      else if (p.type === "tags") init[p.key] = [];
      else if (p.type === "boolean") init[p.key] = false;
      else if (p.type === "number") init[p.key] = 0;
      else init[p.key] = "";
    }
    return init;
  });

  const [isDryRun, setIsDryRun] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JobResult>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedRefId, setUploadedRefId] = useState<string | null>(null);
  const [uploadedCount, setUploadedCount] = useState<number | null>(null);

  function updateParam(key: string, value: unknown) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFileUpload(file: File | null) {
    if (!file || !action.supportsFileUpload) return;
    setUploadingFile(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("runbookId", action.runbookId);
      formData.append("type", action.fileUploadType ?? "general");
      formData.append("file", file);

      const res = await fetch("/api/automation/inputs/upload", {
        method: "POST",
        headers: { "x-csrf-token": await getCsrfToken() },
        body: formData,
      });
      const payload = (await res.json()) as {
        error?: string;
        automationInput?: { id: string; parsedCount?: number };
      };
      if (!res.ok) throw new Error(payload.error ?? "Upload failed");

      setUploadedRefId(payload.automationInput?.id ?? null);
      setUploadedCount(payload.automationInput?.parsedCount ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const csrf = await getCsrfToken();
      const payload: Record<string, unknown> = { ...params };

      if (uploadedRefId) {
        payload.inputRefId = uploadedRefId;
      }

      const res = await fetch("/api/tools/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrf,
        },
        body: JSON.stringify({
          toolActionId: action.id,
          params: payload,
          isDryRun,
        }),
      });

      const body = (await res.json()) as {
        error?: string;
        job?: { id: string; status: string; runbookId: string; isDryRun: boolean };
      };

      if (!res.ok) throw new Error(body.error ?? "Run failed");

      setResult(body.job ?? null);
      onJobCreated?.(body.job?.id ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setSubmitting(false);
    }
  }

  function renderField(f: ToolParamField) {
    const value = params[f.key];

    if (f.type === "select" && f.options) {
      return (
        <select
          className="w-full rounded-md border border-[#2a2a40] bg-[#15152a] px-3 py-2 text-sm text-[#d8d8ea] focus:border-[#ffa500] focus:outline-none"
          value={String(value ?? "")}
          onChange={(e) => updateParam(f.key, e.target.value)}
        >
          {f.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    }

    if (f.type === "tags") {
      const tags = (Array.isArray(value) ? value : []) as string[];
      return (
        <div>
          <div className="mb-1 flex flex-wrap gap-1">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-[rgba(255,165,0,0.15)] px-2 py-0.5 text-xs text-[#ffc36b]"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => updateParam(f.key, tags.filter((_, j) => j !== i))}
                  className="ml-0.5 text-[#ffa500] hover:text-white"
                >
                  x
                </button>
              </span>
            ))}
          </div>
          <input
            className="w-full rounded-md border border-[#2a2a40] bg-[#15152a] px-3 py-2 text-sm text-[#d8d8ea] placeholder-[#6b6b8a] focus:border-[#ffa500] focus:outline-none"
            placeholder="Type and press Enter to add"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const v = e.currentTarget.value.trim();
                if (v && !tags.includes(v)) {
                  updateParam(f.key, [...tags, v]);
                  e.currentTarget.value = "";
                }
              }
            }}
          />
        </div>
      );
    }

    if (f.type === "textarea") {
      return (
        <textarea
          className="w-full rounded-md border border-[#2a2a40] bg-[#15152a] px-3 py-2 text-sm text-[#d8d8ea] placeholder-[#6b6b8a] focus:border-[#ffa500] focus:outline-none"
          rows={3}
          placeholder={f.placeholder}
          value={String(value ?? "")}
          onChange={(e) => updateParam(f.key, e.target.value)}
        />
      );
    }

    if (f.type === "number") {
      return (
        <input
          type="number"
          className="w-full rounded-md border border-[#2a2a40] bg-[#15152a] px-3 py-2 text-sm text-[#d8d8ea] focus:border-[#ffa500] focus:outline-none"
          value={Number(value ?? 0)}
          onChange={(e) => updateParam(f.key, Number(e.target.value))}
        />
      );
    }

    if (f.type === "boolean") {
      return (
        <label className="flex items-center gap-2 text-sm text-[#d8d8ea]">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => updateParam(f.key, e.target.checked)}
            className="accent-[#ffa500]"
          />
          {f.label}
        </label>
      );
    }

    return (
      <input
        type="text"
        className="w-full rounded-md border border-[#2a2a40] bg-[#15152a] px-3 py-2 text-sm text-[#d8d8ea] placeholder-[#6b6b8a] focus:border-[#ffa500] focus:outline-none"
        placeholder={f.placeholder}
        value={String(value ?? "")}
        onChange={(e) => updateParam(f.key, e.target.value)}
        required={f.required}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {action.params.map((f) => (
          <div key={f.key} className={f.type === "tags" || f.type === "textarea" ? "sm:col-span-2" : ""}>
            {f.type !== "boolean" && (
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#9b9bb4]">
                {f.label}
                {f.required && <span className="text-red-400"> *</span>}
              </label>
            )}
            {renderField(f)}
            {f.helpText && (
              <p className="mt-0.5 text-xs text-[#6b6b8a]">{f.helpText}</p>
            )}
          </div>
        ))}
      </div>

      {action.supportsFileUpload && (
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#9b9bb4]">
            Upload File (CSV / TXT / PDF)
          </label>
          <input
            type="file"
            accept=".csv,.txt,.pdf"
            onChange={(e) => void handleFileUpload(e.target.files?.[0] ?? null)}
            className="w-full rounded-md border border-[#2a2a40] bg-[#15152a] px-3 py-2 text-xs text-[#d8d8ea] file:mr-3 file:rounded file:border-0 file:bg-[rgba(255,165,0,0.15)] file:px-3 file:py-1 file:text-xs file:text-[#ffc36b]"
          />
          {uploadingFile && <p className="mt-1 text-xs text-[#a4a4be]">Uploading...</p>}
          {uploadedRefId && (
            <p className="mt-1 text-xs text-green-400">
              Uploaded (ref: {uploadedRefId}
              {uploadedCount !== null ? `, ${uploadedCount} items parsed` : ""})
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-[#d8d8ea]">
          <input
            type="checkbox"
            checked={isDryRun}
            onChange={(e) => setIsDryRun(e.target.checked)}
            className="accent-[#ffa500]"
          />
          Dry run
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-[#ffa500] px-5 py-2 text-sm font-medium text-black hover:bg-[#ffb732] disabled:opacity-50 transition-colors"
        >
          {submitting ? "Running..." : isDryRun ? "Preview (Dry Run)" : "Execute"}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-900/30 border border-red-700/40 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-md border border-green-700/40 bg-green-900/20 px-4 py-3">
          <p className="text-sm font-medium text-green-300">Job created successfully</p>
          <div className="mt-2 grid gap-1 text-xs text-[#d8d8ea]">
            <p>
              <span className="text-[#9b9bb4]">Job ID:</span>{" "}
              <a href={`/automation/${result.id}`} className="text-[#ffa500] hover:underline">
                {result.id}
              </a>
            </p>
            <p><span className="text-[#9b9bb4]">Status:</span> {result.status}</p>
            <p><span className="text-[#9b9bb4]">Runbook:</span> {result.runbookId}</p>
            <p><span className="text-[#9b9bb4]">Dry Run:</span> {result.isDryRun ? "Yes" : "No"}</p>
          </div>
        </div>
      )}
    </form>
  );
}
