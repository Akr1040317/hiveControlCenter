export type ToolParamField = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "boolean" | "textarea" | "tags";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  helpText?: string;
};

export type ToolAction = {
  id: string;
  name: string;
  description: string;
  category: "quiz" | "pronunciation" | "word_info" | "learning_track" | "content_sync";
  icon: string;
  runbookId: string;
  supportsDryRun: boolean;
  supportsFileUpload?: boolean;
  fileUploadType?: string;
  params: ToolParamField[];
};

export const TOOL_ACTIONS: ToolAction[] = [
  {
    id: "add-quiz-words",
    name: "Add Words to Quiz",
    description:
      "Add new words to a quiz bank. Specify the target quiz and provide words via text or file upload.",
    category: "quiz",
    icon: "📝",
    runbookId: "tools.quiz.addWords",
    supportsDryRun: true,
    supportsFileUpload: true,
    fileUploadType: "quiz_words",
    params: [
      {
        key: "targetQuiz",
        label: "Target Quiz",
        type: "text",
        required: true,
        placeholder: "e.g. quiz-drop-1",
        helpText: "Name of the quiz in Firestore to update",
      },
      {
        key: "sourceFile",
        label: "Source identifier",
        type: "text",
        required: true,
        placeholder: "e.g. manual-input or seed-file-name",
        defaultValue: "manual-input",
      },
      {
        key: "words",
        label: "Words to add",
        type: "tags",
        helpText: "Type words and press Enter, or upload a file below",
      },
    ],
  },
  {
    id: "generate-pronunciations",
    name: "Generate Pronunciations",
    description:
      "Generate pronunciation audio for a set of words using Google TTS or manual override.",
    category: "pronunciation",
    icon: "🔊",
    runbookId: "tools.pronunciations.generate",
    supportsDryRun: true,
    supportsFileUpload: true,
    fileUploadType: "pronunciation_words",
    params: [
      {
        key: "provider",
        label: "TTS Provider",
        type: "select",
        options: ["google_tts", "manual"],
        required: true,
        defaultValue: "google_tts",
      },
      {
        key: "wordSetRef",
        label: "Word Set Reference",
        type: "text",
        required: true,
        placeholder: "e.g. manual-input",
        defaultValue: "manual-input",
      },
      {
        key: "manualWords",
        label: "Words",
        type: "tags",
        helpText: "Type words and press Enter, or upload a file",
      },
    ],
  },
  {
    id: "generate-word-info",
    name: "Generate Word Information",
    description:
      "Build and sync word-level metadata (definitions, examples, breakdowns) from the specified source into Firestore.",
    category: "word_info",
    icon: "📖",
    runbookId: "tools.wordInfo.generate",
    supportsDryRun: true,
    params: [
      {
        key: "source",
        label: "Data Source",
        type: "select",
        options: ["csv", "json", "firestore"],
        required: true,
        defaultValue: "firestore",
      },
      {
        key: "targetCollection",
        label: "Target Collection",
        type: "text",
        required: true,
        placeholder: "e.g. JSON or wotd",
        defaultValue: "JSON",
      },
    ],
  },
  {
    id: "rebuild-learning-tracks",
    name: "Rebuild Learning Tracks",
    description:
      "Regenerate learning track path structures, validate content links, and update path items for a specific cohort.",
    category: "learning_track",
    icon: "🛤️",
    runbookId: "tools.learningTrack.rebuild",
    supportsDryRun: true,
    params: [
      {
        key: "trackId",
        label: "Track ID",
        type: "text",
        required: true,
        placeholder: "e.g. bee-ready-tier-0",
      },
      {
        key: "cohort",
        label: "Cohort",
        type: "text",
        required: true,
        placeholder: "e.g. spring-2026",
      },
    ],
  },
  {
    id: "sync-json-words",
    name: "Sync JSON Word Data",
    description:
      "Syncs structured word dataset from the JSON collection into the beeapp Firestore, ensuring definitions, examples, and metadata are up-to-date.",
    category: "word_info",
    icon: "🔄",
    runbookId: "tools.wordInfo.generate",
    supportsDryRun: true,
    params: [
      {
        key: "source",
        label: "Data Source",
        type: "select",
        options: ["json", "firestore"],
        required: true,
        defaultValue: "json",
      },
      {
        key: "targetCollection",
        label: "Target Collection",
        type: "text",
        required: true,
        defaultValue: "JSON",
      },
    ],
  },
  {
    id: "fix-example-sentences",
    name: "Fix Example Sentences",
    description:
      "Backfills or corrects example sentence data attached to word entries in the specified collection.",
    category: "word_info",
    icon: "✏️",
    runbookId: "tools.wordInfo.generate",
    supportsDryRun: true,
    params: [
      {
        key: "source",
        label: "Data Source",
        type: "select",
        options: ["firestore"],
        required: true,
        defaultValue: "firestore",
      },
      {
        key: "targetCollection",
        label: "Target Collection",
        type: "text",
        required: true,
        defaultValue: "JSON",
      },
    ],
  },
];

export const TOOL_CATEGORIES = [
  { id: "quiz", label: "Quiz Tools" },
  { id: "pronunciation", label: "Pronunciation Tools" },
  { id: "word_info", label: "Word Info Tools" },
  { id: "learning_track", label: "Learning Track Tools" },
  { id: "content_sync", label: "Content Sync" },
] as const;

export function getToolAction(id: string): ToolAction | undefined {
  return TOOL_ACTIONS.find((t) => t.id === id);
}
