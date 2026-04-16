"use client";

import { ContentCrudPanel, type FieldDef } from "./ContentCrudPanel";

const fields: FieldDef[] = [
  { key: "title", label: "Title", type: "text", required: true },
  { key: "description", label: "Description", type: "textarea" },
  { key: "videoUrl", label: "Video URL", type: "text", required: true, placeholder: "https://youtube.com/..." },
  { key: "thumbnailUrl", label: "Thumbnail URL", type: "text" },
  { key: "durationSeconds", label: "Duration (seconds)", type: "number", defaultValue: 0 },
  { key: "category", label: "Category", type: "select", options: ["tutorial", "lesson", "webinar-recording", "promo", "other"] },
  { key: "tags", label: "Tags", type: "tags" },
  { key: "status", label: "Status", type: "select", options: ["draft", "published", "archived"], defaultValue: "draft" },
];

const columns = [
  { key: "title", label: "Title" },
  { key: "category", label: "Category" },
  {
    key: "durationSeconds",
    label: "Duration",
    render: (v: unknown) => {
      const secs = Number(v ?? 0);
      if (!secs) return "—";
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}:${String(s).padStart(2, "0")}`;
    },
  },
  { key: "status", label: "Status" },
];

export function VideosPanel() {
  return (
    <ContentCrudPanel
      title="Videos"
      apiBase="/api/content/videos"
      fields={fields}
      nameKey="title"
      columns={columns}
    />
  );
}
