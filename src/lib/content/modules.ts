export type ContentModule = {
  id: string;
  title: string;
  description: string;
  ownerArea: "content" | "growth" | "curriculum";
  dataSources: string[];
  status: "planned" | "in_progress" | "ready_for_wiring";
};

export const CONTENT_MODULES: ContentModule[] = [
  {
    id: "word_of_day",
    title: "Word of the Day",
    description:
      "Manage daily featured words, definitions, pronunciation links, and publish schedule.",
    ownerArea: "curriculum",
    dataSources: ["users", "contentCollections", "hiveTools word scripts"],
    status: "ready_for_wiring",
  },
  {
    id: "article_management",
    title: "Article Management",
    description:
      "Control Bee Ready and learning articles with draft, review, and publish lifecycle.",
    ownerArea: "content",
    dataSources: ["hivewebsite/public/bee-ready-articles", "scripts/templates"],
    status: "ready_for_wiring",
  },
  {
    id: "lesson_management",
    title: "Lesson Management",
    description:
      "Create and organize lessons and curriculum units with sequencing metadata.",
    ownerArea: "curriculum",
    dataSources: ["learning track collections", "quiz content seed scripts"],
    status: "planned",
  },
  {
    id: "video_management",
    title: "Video Management",
    description:
      "Track embedded videos, host URLs, release visibility, and content tagging.",
    ownerArea: "content",
    dataSources: ["lesson/video metadata docs", "campaign content links"],
    status: "planned",
  },
  {
    id: "webinar_management",
    title: "Webinar Management",
    description:
      "Plan webinar events, registrant lists, reminders, and post-event follow-up.",
    ownerArea: "growth",
    dataSources: ["webinar email scripts", "recipient data files"],
    status: "ready_for_wiring",
  },
  {
    id: "quiz_management",
    title: "Quiz Management",
    description:
      "Manage quiz banks, add/update words, and monitor publish readiness.",
    ownerArea: "curriculum",
    dataSources: ["scripts/seed-quiz-*.mjs", "hiveTools update_quizzes.py"],
    status: "ready_for_wiring",
  },
  {
    id: "learning_track_management",
    title: "Learning Track Management",
    description:
      "Manage track structure, path items, and release state for each cohort.",
    ownerArea: "curriculum",
    dataSources: [
      "scripts/generate-bee-ready-path-items.js",
      "scripts/rebuild-bee-ready-path.mjs",
      "scripts/apply-bee-ready-nsl-to-path.mjs",
    ],
    status: "in_progress",
  },
];
