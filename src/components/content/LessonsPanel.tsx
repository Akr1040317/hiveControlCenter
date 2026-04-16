"use client";

import { ContentCrudPanel, type FieldDef } from "./ContentCrudPanel";

const fields: FieldDef[] = [
  { key: "title", label: "Title", type: "text", required: true },
  { key: "description", label: "Description", type: "textarea" },
  { key: "tier", label: "Tier", type: "select", options: ["Tier 0", "Tier 1", "Tier 2", "Tier 3"] },
  { key: "order", label: "Order", type: "number", defaultValue: 0 },
  { key: "contentType", label: "Content Type", type: "select", options: ["text", "video", "interactive"] },
  { key: "body", label: "Body", type: "textarea" },
  { key: "videoUrl", label: "Video URL", type: "text" },
  { key: "durationMinutes", label: "Duration (min)", type: "number", defaultValue: 10 },
  { key: "status", label: "Status", type: "select", options: ["draft", "published", "archived"], defaultValue: "draft" },
  { key: "tags", label: "Tags", type: "tags" },
];

const columns = [
  { key: "title", label: "Title" },
  { key: "tier", label: "Tier" },
  { key: "contentType", label: "Type" },
  { key: "order", label: "Order" },
  { key: "status", label: "Status" },
];

export function LessonsPanel() {
  return (
    <ContentCrudPanel
      title="Lessons"
      apiBase="/api/content/lessons"
      fields={fields}
      nameKey="title"
      columns={columns}
    />
  );
}
