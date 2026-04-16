import {
  makeContentListHandler,
  makeContentCreateHandler,
} from "@/lib/content/apiHandler";

const opts = {
  collection: "articles",
  resourceType: "article",
  rateKey: "content-articles",
  validate: (body: Record<string, unknown>) => {
    if (!body.title || typeof body.title !== "string") {
      return "title is required";
    }
    return null;
  },
};

export const GET = makeContentListHandler(opts);
export const POST = makeContentCreateHandler(opts);
