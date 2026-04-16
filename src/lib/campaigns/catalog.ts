export type CampaignTemplate = {
  key: string;
  name: string;
  description: string;
  channel: "email";
  runbookId: string;
  scriptPath: string;
  templatePath: string;
  defaultAudienceSegment: string;
  supportsWeekNumber: boolean;
  previewHtml: string;
};

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    key: "beeready-week2-article-live",
    name: "Bee Ready Week 2 Article Live",
    description: "Announces week-2 article publication to Bee Ready cohort.",
    channel: "email",
    runbookId: "campaign.sendBeeReadyWeekN",
    scriptPath: "scripts/send-beeready-week2-article-live-email.js",
    templatePath: "scripts/templates/beeready-week2-article-live-email.html",
    defaultAudienceSegment: "bee-ready-active",
    supportsWeekNumber: true,
    previewHtml: `
      <div style="font-family:Arial,sans-serif;padding:24px;background:#121220;color:#fff;">
        <h2 style="margin:0 0 8px;">Bee Ready Week 2 Article is Live</h2>
        <p style="margin:0;color:#d2d2e7;">Your next article is now available in the dashboard.</p>
      </div>
    `,
  },
  {
    key: "webinar-starting-soon-reminder",
    name: "Webinar Starting Soon Reminder",
    description: "Sends near-start webinar reminder to registered attendees.",
    channel: "email",
    runbookId: "campaign.sendWebinarStartingSoon",
    scriptPath: "scripts/send-webinar-starting-soon-reminder.js",
    templatePath: "scripts/templates/webinar-starting-soon-reminder.html",
    defaultAudienceSegment: "webinar-registrants",
    supportsWeekNumber: false,
    previewHtml: `
      <div style="font-family:Arial,sans-serif;padding:24px;background:#121220;color:#fff;">
        <h2 style="margin:0 0 8px;">Your Webinar Starts Soon</h2>
        <p style="margin:0;color:#d2d2e7;">We are starting shortly. Join using your webinar link.</p>
      </div>
    `,
  },
  {
    key: "beeready-week1-recap-week2-webinar",
    name: "Bee Ready Week 1 Recap + Week 2 Webinar",
    description: "Recap and follow-up webinar invite for Bee Ready learners.",
    channel: "email",
    runbookId: "campaign.sendBeeReadyRecapWebinar",
    scriptPath: "scripts/send-beeready-week1-recap-week2-webinar-email.js",
    templatePath:
      "scripts/templates/beeready-week1-recap-week2-webinar-email.html",
    defaultAudienceSegment: "bee-ready-week1-complete",
    supportsWeekNumber: true,
    previewHtml: `
      <div style="font-family:Arial,sans-serif;padding:24px;background:#121220;color:#fff;">
        <h2 style="margin:0 0 8px;">Week 1 Recap + Week 2 Webinar</h2>
        <p style="margin:0;color:#d2d2e7;">Great progress! Join us for the upcoming webinar.</p>
      </div>
    `,
  },
];

export function getCampaignTemplateByKey(templateKey: string) {
  return CAMPAIGN_TEMPLATES.find((template) => template.key === templateKey) ?? null;
}
