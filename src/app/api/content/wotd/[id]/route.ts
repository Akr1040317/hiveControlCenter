import {
  makeContentGetHandler,
  makeContentUpdateHandler,
  makeContentDeleteHandler,
} from "@/lib/content/apiDetailHandler";

const opts = {
  collection: "wotd",
  resourceType: "wordOfDay",
  rateKey: "content-wotd-detail",
};

export const GET = makeContentGetHandler(opts);
export const PUT = makeContentUpdateHandler(opts);
export const DELETE = makeContentDeleteHandler(opts);
