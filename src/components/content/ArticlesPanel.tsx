"use client";

import { ContentCrudPanel, type FieldDef } from "./ContentCrudPanel";

const fields: FieldDef[] = [
  { key: "title", label: "Title", type: "text", required: true },
  { key: "slug", label: "Slug", type: "text", placeholder: "auto-generated-from-title" },
  { key: "summary", label: "Summary", type: "textarea" },
  { key: "body", label: "Body (Markdown/HTML)", type: "textarea" },
  { key: "coverImageUrl", label: "Cover Image URL", type: "text" },
  { key: "category", label: "Category", type: "select", options: ["bee-ready", "spelling", "vocabulary", "grammar", "general"] },
  { key: "tags", label: "Tags", type: "tags" },
  { key: "status", label: "Status", type: "select", options: ["draft", "published", "archived"], defaultValue: "draft" },
  { key: "authorName", label: "Author Name", type: "text" },
  { key: "publishedAt", label: "Publish Date", type: "date" },
];

const columns = [
  { key: "title", label: "Title" },
  { key: "category", label: "Category" },
  {
    key: "status",
    label: "Status",
    render: (v: unknown) => {
      const s = String(v ?? "draft");
      const colors: Record<string, string> = {
        draft: "text-yellow-400",
        published: "text-green-400",
        archived: "text-[#9b9bb4]",
      };
      return `<span class="${colors[s] ?? ""}">${s}</span>`;
    },
  },
  { key: "authorName", label: "Author" },
];

export function ArticlesPanel() {
  return (
    <ContentCrudPanel
      title="Articles"
      apiBase="/api/content/articles"
      fields={fields}
      nameKey="title"
      columns={columns}
    />
  );
}
