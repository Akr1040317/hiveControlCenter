import {
  makeContentListHandler,
  makeContentCreateHandler,
} from "@/lib/content/apiHandler";

const opts = {
  collection: "learningTracks",
  resourceType: "learningTrack",
  rateKey: "content-tracks",
  validate: (body: Record<string, unknown>) => {
    if (!body.name || typeof body.name !== "string") {
      return "name is required";
    }
    return null;
  },
};

export const GET = makeContentListHandler(opts);
export const POST = makeContentCreateHandler(opts);
