import {
  makeContentListHandler,
  makeContentCreateHandler,
} from "@/lib/content/apiHandler";

const opts = {
  collection: "Quiz",
  resourceType: "quiz",
  rateKey: "content-quizzes",
  validate: (body: Record<string, unknown>) => {
    if (!body.quizName || typeof body.quizName !== "string") {
      return "quizName is required";
    }
    return null;
  },
};

export const GET = makeContentListHandler(opts);
export const POST = makeContentCreateHandler(opts);
