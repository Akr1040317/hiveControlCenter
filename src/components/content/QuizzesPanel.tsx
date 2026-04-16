"use client";

import { ContentCrudPanel, type FieldDef } from "./ContentCrudPanel";

const fields: FieldDef[] = [
  { key: "quizName", label: "Quiz Name", type: "text", required: true },
  { key: "description", label: "Description", type: "textarea" },
  { key: "tier", label: "Tier", type: "select", options: ["Tier 0", "Tier 1", "Tier 2", "Tier 3"] },
  { key: "words", label: "Words", type: "tags" },
  { key: "timeLimit", label: "Time Limit (seconds)", type: "number", defaultValue: 120 },
  { key: "passingScore", label: "Passing Score (%)", type: "number", defaultValue: 70 },
  { key: "status", label: "Status", type: "select", options: ["draft", "published", "archived"], defaultValue: "draft" },
];

const columns = [
  { key: "quizName", label: "Name" },
  { key: "tier", label: "Tier" },
  {
    key: "words",
    label: "Words",
    render: (v: unknown) => {
      const arr = Array.isArray(v) ? v : [];
      return `${arr.length} word${arr.length !== 1 ? "s" : ""}`;
    },
  },
  { key: "timeLimit", label: "Time (s)" },
  { key: "status", label: "Status" },
];

export function QuizzesPanel() {
  return (
    <ContentCrudPanel
      title="Quizzes"
      apiBase="/api/content/quizzes"
      fields={fields}
      nameKey="quizName"
      columns={columns}
    />
  );
}
