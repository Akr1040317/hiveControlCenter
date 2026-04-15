export type ScriptCatalogItem = {
  id: string;
  name: string;
  description: string;
  source: "hivewebsite" | "hiveTools";
  path: string;
  language: "js" | "mjs" | "py";
  area:
    | "quiz"
    | "pronunciation"
    | "word_info"
    | "webinar"
    | "article"
    | "learning_track"
    | "messaging"
    | "commerce";
  recommendedRunbookId?: string;
};

export const SCRIPT_CATALOG: ScriptCatalogItem[] = [
  {
    id: "quiz.seed.quiz-drop-1",
    name: "Seed quiz words (Quiz Drop 1)",
    description: "Adds quiz words into Firestore for quiz-drop release.",
    source: "hivewebsite",
    path: "scripts/seed-quiz-quiz-drop-1.mjs",
    language: "mjs",
    area: "quiz",
    recommendedRunbookId: "tools.quiz.addWords",
  },
  {
    id: "quiz.seed.diagnostic-week-1",
    name: "Seed diagnostic quiz words (Week 1)",
    description: "Seeds Week 1 diagnostic quiz records into the app data store.",
    source: "hivewebsite",
    path: "scripts/seed-quiz-diagnostic-week-1.mjs",
    language: "mjs",
    area: "quiz",
    recommendedRunbookId: "tools.quiz.addWords",
  },
  {
    id: "quiz.partial-progress.seed",
    name: "Seed typing quiz partial progress",
    description: "Creates test/prototype progress data for typing quiz flows.",
    source: "hivewebsite",
    path: "scripts/seed-typing-quiz-partial-progress.js",
    language: "js",
    area: "quiz",
  },
  {
    id: "learning-track.generate-path-items",
    name: "Generate Bee Ready path items",
    description: "Builds canonical path items for Bee Ready learning tracks.",
    source: "hivewebsite",
    path: "scripts/generate-bee-ready-path-items.js",
    language: "js",
    area: "learning_track",
    recommendedRunbookId: "tools.learningTrack.rebuild",
  },
  {
    id: "learning-track.rebuild",
    name: "Rebuild Bee Ready path",
    description: "Recomputes and writes Bee Ready learning path content.",
    source: "hivewebsite",
    path: "scripts/rebuild-bee-ready-path.mjs",
    language: "mjs",
    area: "learning_track",
    recommendedRunbookId: "tools.learningTrack.rebuild",
  },
  {
    id: "learning-track.apply-nsl",
    name: "Apply NSL data to path",
    description: "Applies NSL generated data to current learning track path.",
    source: "hivewebsite",
    path: "scripts/apply-bee-ready-nsl-to-path.mjs",
    language: "mjs",
    area: "learning_track",
  },
  {
    id: "article.send-week2-live",
    name: "Send Week 2 article live email",
    description: "Sends article live campaign for Bee Ready recipients.",
    source: "hivewebsite",
    path: "scripts/send-beeready-week2-article-live-email.js",
    language: "js",
    area: "article",
    recommendedRunbookId: "campaign.sendBeeReadyWeekN",
  },
  {
    id: "webinar.starting-soon",
    name: "Send webinar starting soon email",
    description: "Sends near-start reminder blast for webinar registrants.",
    source: "hivewebsite",
    path: "scripts/send-webinar-starting-soon-reminder.js",
    language: "js",
    area: "webinar",
  },
  {
    id: "webinar.free-scripps",
    name: "Send free Scripps webinar email",
    description: "Runs free webinar outreach campaign from recipient list.",
    source: "hivewebsite",
    path: "scripts/send-free-scripps-webinar-email.js",
    language: "js",
    area: "webinar",
  },
  {
    id: "word.sync-json",
    name: "Sync JSON words to beeapp",
    description:
      "Syncs structured word dataset into beeapp Firestore collections.",
    source: "hiveTools",
    path: "sync_json_words_beeapp.py",
    language: "py",
    area: "word_info",
    recommendedRunbookId: "tools.wordInfo.generate",
  },
  {
    id: "pronunciation.pregenerate",
    name: "Pregenerate pronunciations",
    description:
      "Generates and stores pronunciation audio for batch word lists.",
    source: "hiveTools",
    path: "pregenerate_beeapp_pronunciations.py",
    language: "py",
    area: "pronunciation",
    recommendedRunbookId: "tools.pronunciations.generate",
  },
  {
    id: "pronunciation.on-demand",
    name: "Generate pronunciations (on demand)",
    description:
      "Generates pronunciation files and updates references for target words.",
    source: "hiveTools",
    path: "pronunciations.py",
    language: "py",
    area: "pronunciation",
    recommendedRunbookId: "tools.pronunciations.generate",
  },
  {
    id: "word.generate-csv",
    name: "Generate word CSV",
    description:
      "Exports normalized word fields into CSV for review and downstream seed.",
    source: "hiveTools",
    path: "generate_word_csv.py",
    language: "py",
    area: "word_info",
    recommendedRunbookId: "tools.wordInfo.generate",
  },
  {
    id: "quiz.update-quizzes",
    name: "Update quizzes",
    description:
      "Applies quiz updates to Firestore content and metadata references.",
    source: "hiveTools",
    path: "update_quizzes.py",
    language: "py",
    area: "quiz",
    recommendedRunbookId: "tools.quiz.addWords",
  },
  {
    id: "word.fix-example-sentences",
    name: "Fix example sentences",
    description:
      "Backfills or corrects example sentence data attached to word entries.",
    source: "hiveTools",
    path: "fix_example_sentences.py",
    language: "py",
    area: "word_info",
  },
];
