export type ContentStatus = "draft" | "published" | "archived";

export type WordOfDay = {
  id: string;
  wordName: string;
  diacritic: string;
  definition: string;
  breakdown: string;
  exampleSentence: string;
  partOfSpeech: string;
  difficulty: number;
  etymology: string;
  pronunciationUrl: string;
  wordActualDate: string;
  uploadDate: string;
  verified: boolean;
  userGroups: string[];
  likes: number;
  createdBy: string;
  updatedAt: string;
};

export type Article = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  coverImageUrl: string;
  category: string;
  tags: string[];
  status: ContentStatus;
  authorId: string;
  authorName: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type Lesson = {
  id: string;
  title: string;
  description: string;
  tier: string;
  order: number;
  contentType: "text" | "video" | "interactive";
  body: string;
  videoUrl: string;
  durationMinutes: number;
  status: ContentStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type Quiz = {
  id: string;
  quizName: string;
  description: string;
  tier: string;
  words: string[];
  timeLimit: number;
  passingScore: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
};

export type Webinar = {
  id: string;
  title: string;
  description: string;
  hostName: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingUrl: string;
  registrationOpen: boolean;
  registrationCount: number;
  recordingUrl: string;
  status: "upcoming" | "live" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
};

export type Video = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  category: string;
  tags: string[];
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
};

export type LearningTrack = {
  id: string;
  name: string;
  description: string;
  tier: string;
  pathItems: TrackPathItem[];
  status: ContentStatus;
  cohort: string;
  createdAt: string;
  updatedAt: string;
};

export type TrackPathItem = {
  type: "lesson" | "quiz" | "article" | "video";
  refId: string;
  title: string;
  order: number;
};
