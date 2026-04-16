"use client";

import { ContentCrudPanel, type FieldDef } from "./ContentCrudPanel";

const USER_GROUPS = ["admin", "userTier0", "userTier1", "userTier2", "userTier3"];

const fields: FieldDef[] = [
  { key: "wordName", label: "Word", type: "text", required: true, placeholder: "e.g. abracadabra" },
  { key: "diacritic", label: "Diacritic / Pronunciation", type: "text", placeholder: "\\ ¦a-brə-kə-ˈda-brə \\" },
  { key: "definition", label: "Definition", type: "textarea", placeholder: "Short definition..." },
  { key: "breakdown", label: "Breakdown", type: "textarea", placeholder: "Full breakdown / etymology text..." },
  { key: "exampleSentence", label: "Example Sentence", type: "textarea" },
  { key: "partOfSpeech", label: "Part of Speech", type: "select", options: ["noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "interjection"] },
  { key: "difficulty", label: "Difficulty (1-5)", type: "number", defaultValue: 3 },
  { key: "etymology", label: "Etymology", type: "textarea" },
  { key: "pronunciationUrl", label: "Pronunciation Audio URL", type: "text" },
  { key: "wordActualDate", label: "Scheduled Date", type: "date" },
  { key: "verified", label: "Verified", type: "boolean", defaultValue: false },
  { key: "userGroups", label: "User Groups", type: "tags", defaultValue: USER_GROUPS },
];

const columns = [
  { key: "wordName", label: "Word" },
  {
    key: "wordActualDate",
    label: "Date",
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
  { key: "verified", label: "Verified", render: (v: unknown) => (v ? "Yes" : "No") },
  { key: "difficulty", label: "Difficulty", render: (v: unknown) => `${v ?? "—"}/5` },
  { key: "partOfSpeech", label: "POS" },
];

export function WordOfDayPanel() {
  return (
    <ContentCrudPanel
      title="Words of the Day"
      apiBase="/api/content/wotd"
      fields={fields}
      nameKey="wordName"
      columns={columns}
    />
  );
}
