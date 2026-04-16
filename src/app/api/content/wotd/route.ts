import {
  makeContentListHandler,
  makeContentCreateHandler,
} from "@/lib/content/apiHandler";

const opts = {
  collection: "wotd",
  resourceType: "wordOfDay",
  rateKey: "content-wotd",
  validate: (body: Record<string, unknown>) => {
    if (!body.wordName || typeof body.wordName !== "string") {
      return "wordName is required";
    }
    return null;
  },
};

export const GET = makeContentListHandler(opts);
export const POST = makeContentCreateHandler(opts);
