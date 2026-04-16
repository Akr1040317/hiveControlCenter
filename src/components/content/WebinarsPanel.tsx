"use client";

import { ContentCrudPanel, type FieldDef } from "./ContentCrudPanel";

const fields: FieldDef[] = [
  { key: "title", label: "Title", type: "text", required: true },
  { key: "description", label: "Description", type: "textarea" },
  { key: "hostName", label: "Host Name", type: "text" },
  { key: "scheduledAt", label: "Scheduled Date/Time", type: "date" },
  { key: "durationMinutes", label: "Duration (min)", type: "number", defaultValue: 60 },
  { key: "meetingUrl", label: "Meeting URL", type: "text", placeholder: "https://zoom.us/..." },
  { key: "registrationOpen", label: "Registration Open", type: "boolean", defaultValue: true },
  { key: "recordingUrl", label: "Recording URL", type: "text" },
  { key: "status", label: "Status", type: "select", options: ["upcoming", "live", "completed", "cancelled"], defaultValue: "upcoming" },
];

const columns = [
  { key: "title", label: "Title" },
  { key: "hostName", label: "Host" },
  {
    key: "scheduledAt",
    label: "Scheduled",
    render: (v: unknown) => {
      if (!v) return "—";
      const s = String(v);
      if (s.includes("_seconds")) {
        try {
          const parsed = v as { _seconds?: number };
          return parsed._seconds
            ? new Date(parsed._seconds * 1000).toLocaleDateString()
            : s;
        } catch {
          return s;
        }
      }
      return new Date(s).toLocaleDateString();
    },
  },
  { key: "status", label: "Status" },
  { key: "registrationOpen", label: "Reg. Open", render: (v: unknown) => (v ? "Yes" : "No") },
];

export function WebinarsPanel() {
  return (
    <ContentCrudPanel
      title="Webinars"
      apiBase="/api/content/webinars"
      fields={fields}
      nameKey="title"
      columns={columns}
    />
  );
}
