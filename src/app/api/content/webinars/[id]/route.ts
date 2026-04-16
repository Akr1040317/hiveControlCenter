import {
  makeContentGetHandler,
  makeContentUpdateHandler,
  makeContentDeleteHandler,
} from "@/lib/content/apiDetailHandler";

const opts = {
  collection: "webinars",
  resourceType: "webinar",
  rateKey: "content-webinars-detail",
};

export const GET = makeContentGetHandler(opts);
export const PUT = makeContentUpdateHandler(opts);
export const DELETE = makeContentDeleteHandler(opts);
