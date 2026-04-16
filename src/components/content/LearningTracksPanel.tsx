"use client";

import { ContentCrudPanel, type FieldDef } from "./ContentCrudPanel";

const fields: FieldDef[] = [
  { key: "name", label: "Track Name", type: "text", required: true },
  { key: "description", label: "Description", type: "textarea" },
  { key: "tier", label: "Tier", type: "select", options: ["Tier 0", "Tier 1", "Tier 2", "Tier 3"] },
  { key: "cohort", label: "Cohort", type: "text", placeholder: "e.g. spring-2026" },
  { key: "status", label: "Status", type: "select", options: ["draft", "published", "archived"], defaultValue: "draft" },
];

const columns = [
  { key: "name", label: "Track Name" },
  { key: "tier", label: "Tier" },
  { key: "cohort", label: "Cohort" },
  { key: "status", label: "Status" },
  {
    key: "pathItems",
    label: "Items",
    render: (v: unknown) => {
      const arr = Array.isArray(v) ? v : [];
      return String(arr.length);
    },
  },
];

export function LearningTracksPanel() {
  return (
    <ContentCrudPanel
      title="Learning Tracks"
      apiBase="/api/content/tracks"
      fields={fields}
      nameKey="name"
      columns={columns}
    />
  );
}
