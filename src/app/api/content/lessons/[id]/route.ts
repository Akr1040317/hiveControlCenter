import {
  makeContentGetHandler,
  makeContentUpdateHandler,
  makeContentDeleteHandler,
} from "@/lib/content/apiDetailHandler";

const opts = {
  collection: "lessons",
  resourceType: "lesson",
  rateKey: "content-lessons-detail",
};

export const GET = makeContentGetHandler(opts);
export const PUT = makeContentUpdateHandler(opts);
export const DELETE = makeContentDeleteHandler(opts);
