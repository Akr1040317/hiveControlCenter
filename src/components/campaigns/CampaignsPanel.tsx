"use client";

import { FormEvent, useEffect, useState } from "react";

import { getCsrfToken } from "@/lib/client/csrf";

type CampaignJob = {
  id: string;
  runbookId?: string;
  status?: string;
  requestedByEmail?: string;
  isDryRun?: boolean;
  input?: Record<string, unknown>;
};

type CampaignsPanelProps = {
  initialCampaignJobs: CampaignJob[];
};

type CampaignTemplate = {
  key: string;
  name: string;
  description: string;
  channel: string;
  runbookId: string;
  scriptPath: string;
  templatePath: string;
  defaultAudienceSegment: string;
  supportsWeekNumber: boolean;
};

export function CampaignsPanel({ initialCampaignJobs }: CampaignsPanelProps) {
  const [jobs, setJobs] = useState<CampaignJob[]>(initialCampaignJobs);
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingInput, setIsUploadingInput] = useState(false);
  const [uploadedInputRefId, setUploadedInputRefId] = useState<string>("");
  const [uploadedRecipientCount, setUploadedRecipientCount] = useState<number | null>(
    null,
  );
  const [manualRecipientsText, setManualRecipientsText] = useState("");
  const [inputMode, setInputMode] = useState<"segment" | "manual">("segment");
  const [formState, setFormState] = useState({
    weekNumber: 2 as number | undefined,
    templateKey: "beeready-week2-article-live",
    audienceSegment: "bee-ready-active",
    idempotencyKey: `campaign-${Date.now()}`,
    scheduleAt: "",
    isDryRun: true,
  });

  const selectedTemplate = templates.find(
    (template) => template.key === formState.templateKey,
  );

  const parseManualRecipients = () =>
    [...manualRecipientsText.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map(
      (match) => match[0].toLowerCase(),
    );

  const refreshTemplates = async () => {
    const response = await fetch("/api/campaigns/templates");
    const payload = (await response.json()) as {
      templates?: CampaignTemplate[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load templates");
    }
    setTemplates(payload.templates ?? []);
  };

  const refreshPreview = async (templateKey: string) => {
    const response = await fetch(`/api/campaigns/templates/${templateKey}/preview`);
    const payload = (await response.json()) as {
      previewHtml?: string;
      error?: string;
    };
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load preview");
    }
    setPreviewHtml(payload.previewHtml ?? "");
  };

  const refresh = async () => {
    const response = await fetch("/api/campaigns/history");
    const payload = (await response.json()) as {
      campaigns?: CampaignJob[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load campaign history");
    }
    setJobs(payload.campaigns ?? []);
  };

  useEffect(() => {
    void (async () => {
      try {
        await refreshTemplates();
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Failed to load templates",
        );
      }
    })();
  }, []);

  useEffect(() => {
    if (!formState.templateKey) {
      return;
    }
    void (async () => {
      try {
        await refreshPreview(formState.templateKey);
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Failed to load preview",
        );
      }
    })();
  }, [formState.templateKey]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/campaigns/send", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": await getCsrfToken(),
        },
        body: JSON.stringify({
          ...formState,
          weekNumber: selectedTemplate?.supportsWeekNumber
            ? formState.weekNumber
            : undefined,
          scheduleAt: formState.scheduleAt || undefined,
          audienceSegment:
            inputMode === "segment" ? formState.audienceSegment : "manual",
          inputRefId: inputMode === "manual" ? uploadedInputRefId || undefined : undefined,
          manualRecipients:
            inputMode === "manual" ? parseManualRecipients() : undefined,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create campaign run");
      }

      setMessage("Campaign run created.");
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to create campaign run",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputUpload = async (file: File | null) => {
    if (!file || !selectedTemplate) {
      return;
    }
    setIsUploadingInput(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("runbookId", selectedTemplate.runbookId);
      formData.append("type", "campaign_recipients");
      formData.append("file", file);

      const response = await fetch("/api/automation/inputs/upload", {
        method: "POST",
        headers: {
          "x-csrf-token": await getCsrfToken(),
        },
        body: formData,
      });
      const payload = (await response.json()) as {
        error?: string;
        automationInput?: { id: string; parsedCount?: number };
      };
      if (!response.ok) {
        throw new Error(payload.error || "Upload failed");
      }
      setUploadedInputRefId(payload.automationInput?.id || "");
      setUploadedRecipientCount(payload.automationInput?.parsedCount ?? null);
      setMessage("Recipient file uploaded and parsed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploadingInput(false);
    }
  };

  return (
    <div className="space-y-4">
      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">Create campaign run</h2>
        <p className="mt-1 text-sm hive-subtle">
          Uses the campaign runbook and writes to automation job history.
        </p>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
          <input
            value={formState.templateKey}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                templateKey: event.target.value,
                audienceSegment:
                  templates.find((template) => template.key === event.target.value)
                    ?.defaultAudienceSegment ?? prev.audienceSegment,
              }))
            }
            className="hive-input px-3 py-2 text-sm"
            placeholder="Template key"
            required
            list="campaign-template-options"
          />
          <datalist id="campaign-template-options">
            {templates.map((template) => (
              <option key={template.key} value={template.key}>
                {template.name}
              </option>
            ))}
          </datalist>
          {selectedTemplate?.supportsWeekNumber ? (
            <input
              type="number"
              min={1}
              max={52}
              value={formState.weekNumber ?? 1}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  weekNumber: Number(event.target.value),
                }))
              }
              className="hive-input px-3 py-2 text-sm"
              placeholder="Week number"
              required
            />
          ) : (
            <input
              value={selectedTemplate?.name ?? "Template does not need week number"}
              readOnly
              className="hive-input px-3 py-2 text-sm"
            />
          )}
          <input
            value={formState.audienceSegment}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                audienceSegment: event.target.value,
              }))
            }
            className="hive-input px-3 py-2 text-sm"
            placeholder="Audience segment"
            required
            disabled={inputMode === "manual"}
          />
          <input
            value={formState.scheduleAt}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, scheduleAt: event.target.value }))
            }
            className="hive-input px-3 py-2 text-sm"
            placeholder="Schedule time (optional ISO)"
          />
          <input
            value={formState.idempotencyKey}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                idempotencyKey: event.target.value,
              }))
            }
            className="hive-input px-3 py-2 text-sm"
            placeholder="Idempotency key"
            required
          />
          <label className="flex items-center gap-2 text-sm text-[#dcdcef] md:col-span-2">
            <input
              type="checkbox"
              checked={formState.isDryRun}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, isDryRun: event.target.checked }))
              }
            />
            Run in dry-run mode
          </label>
          <div className="md:col-span-2 grid gap-2 rounded-md border border-[#2a2a46] bg-[#151526] p-3">
            <p className="text-sm text-white">Input source</p>
            <label className="text-xs text-[#dcdcef]">
              <input
                type="radio"
                checked={inputMode === "segment"}
                onChange={() => setInputMode("segment")}
                className="mr-2"
              />
              Use audience segment
            </label>
            <label className="text-xs text-[#dcdcef]">
              <input
                type="radio"
                checked={inputMode === "manual"}
                onChange={() => setInputMode("manual")}
                className="mr-2"
              />
              Manual recipients (paste or upload CSV/PDF/TXT)
            </label>

            {inputMode === "manual" ? (
              <div className="grid gap-2">
                <textarea
                  value={manualRecipientsText}
                  onChange={(event) => setManualRecipientsText(event.target.value)}
                  className="hive-input min-h-24 px-3 py-2 text-xs"
                  placeholder="Paste one email per line or comma-separated list"
                />
                <input
                  type="file"
                  accept=".csv,.pdf,.txt"
                  onChange={(event) =>
                    void handleInputUpload(event.target.files?.[0] ?? null)
                  }
                  className="hive-input px-3 py-2 text-xs"
                />
                {isUploadingInput ? (
                  <p className="text-xs text-[#a4a4be]">Uploading input...</p>
                ) : null}
                {uploadedInputRefId ? (
                  <p className="text-xs text-[#a4a4be]">
                    Uploaded input ref: {uploadedInputRefId}
                    {typeof uploadedRecipientCount === "number"
                      ? ` (${uploadedRecipientCount} parsed emails)`
                      : ""}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="hive-primary-btn px-4 py-2 text-sm disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Create Campaign Run"}
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              className="hive-secondary-btn ml-2 px-4 py-2 text-sm"
            >
              Refresh History
            </button>
          </div>
        </form>
        {message ? <p className="mt-3 text-sm text-[#dcdcef]">{message}</p> : null}
      </article>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">Template preview</h2>
        <p className="mt-1 text-xs hive-subtle">
          Template: {selectedTemplate?.name ?? formState.templateKey}
        </p>
        {selectedTemplate ? (
          <div className="mt-2 text-xs text-[#b9b9cf]">
            <p>Script: {selectedTemplate.scriptPath}</p>
            <p>Template file: {selectedTemplate.templatePath}</p>
          </div>
        ) : null}
        <div className="mt-3 overflow-hidden rounded-md border border-[#2a2a46] bg-[#151526]">
          <iframe
            title="Campaign Template Preview"
            srcDoc={previewHtml || "<p style='padding:16px;color:#fff'>No preview.</p>"}
            className="h-40 w-full bg-white"
          />
        </div>
      </article>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">Campaign history</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[#bbbcd1]">
              <tr>
                <th className="pb-2">Runbook</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Week</th>
                <th className="pb-2">Template</th>
                <th className="pb-2">Audience</th>
                <th className="pb-2">Requested by</th>
                <th className="pb-2">Dry run</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-t border-[#2a2a46]">
                  <td className="py-2 text-[#ececff]">{job.runbookId ?? "—"}</td>
                  <td className="py-2 text-[#ececff]">{job.status ?? "—"}</td>
                  <td className="py-2 text-[#dcdcef]">
                    {typeof job.input?.weekNumber === "number"
                      ? job.input.weekNumber
                      : "—"}
                  </td>
                  <td className="py-2 text-[#dcdcef]">
                    {typeof job.input?.templateKey === "string"
                      ? job.input.templateKey
                      : "—"}
                  </td>
                  <td className="py-2 text-[#dcdcef]">
                    {typeof job.input?.audienceSegment === "string"
                      ? job.input.audienceSegment
                      : "—"}
                  </td>
                  <td className="py-2 text-[#a4a4be]">
                    {job.requestedByEmail ?? "—"}
                  </td>
                  <td className="py-2 text-[#a4a4be]">
                    {job.isDryRun ? "yes" : "no"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
