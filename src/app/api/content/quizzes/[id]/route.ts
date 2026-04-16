import {
  makeContentGetHandler,
  makeContentUpdateHandler,
  makeContentDeleteHandler,
} from "@/lib/content/apiDetailHandler";

const opts = {
  collection: "Quiz",
  resourceType: "quiz",
  rateKey: "content-quizzes-detail",
};

export const GET = makeContentGetHandler(opts);
export const PUT = makeContentUpdateHandler(opts);
export const DELETE = makeContentDeleteHandler(opts);
