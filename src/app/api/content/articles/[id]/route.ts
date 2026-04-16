import {
  makeContentGetHandler,
  makeContentUpdateHandler,
  makeContentDeleteHandler,
} from "@/lib/content/apiDetailHandler";

const opts = {
  collection: "articles",
  resourceType: "article",
  rateKey: "content-articles-detail",
};

export const GET = makeContentGetHandler(opts);
export const PUT = makeContentUpdateHandler(opts);
export const DELETE = makeContentDeleteHandler(opts);
