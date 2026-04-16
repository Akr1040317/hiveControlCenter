"use client";

import { useState } from "react";
import { WordOfDayPanel } from "./WordOfDayPanel";
import { ArticlesPanel } from "./ArticlesPanel";
import { LessonsPanel } from "./LessonsPanel";
import { QuizzesPanel } from "./QuizzesPanel";
import { WebinarsPanel } from "./WebinarsPanel";
import { VideosPanel } from "./VideosPanel";
import { LearningTracksPanel } from "./LearningTracksPanel";

const TABS = [
  { id: "wotd", label: "Word of the Day", component: WordOfDayPanel },
  { id: "articles", label: "Articles", component: ArticlesPanel },
  { id: "lessons", label: "Lessons", component: LessonsPanel },
  { id: "quizzes", label: "Quizzes", component: QuizzesPanel },
  { id: "webinars", label: "Webinars", component: WebinarsPanel },
  { id: "videos", label: "Videos", component: VideosPanel },
  { id: "tracks", label: "Learning Tracks", component: LearningTracksPanel },
] as const;

export function ContentManagementTabs() {
  const [activeTab, setActiveTab] = useState<string>("wotd");

  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component ?? WordOfDayPanel;

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1 rounded-lg border border-[#1e1e34] bg-[#121220] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-[rgba(255,165,0,0.15)] text-[#ffc36b]"
                : "text-[#9b9bb4] hover:text-[#d8d8ea] hover:bg-[rgba(255,255,255,0.04)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="hive-card p-5">
        <ActiveComponent />
      </div>
    </div>
  );
}
