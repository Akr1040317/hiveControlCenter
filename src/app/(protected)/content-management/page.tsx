import { CONTENT_MODULES } from "@/lib/content/modules";

export default function ContentManagementPage() {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Content Management
        </h1>
        <p className="mt-1 text-sm hive-subtle">
          Central control for word, article, lesson, video, webinar, quiz, and
          learning track operations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CONTENT_MODULES.map((module) => (
          <article
            key={module.id}
            className="hive-card p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-medium text-white">
                {module.title}
              </h2>
              <span className="rounded-md bg-[rgba(255,165,0,0.12)] px-2 py-1 text-xs uppercase tracking-wide text-[#ffc36b]">
                {module.status.replace(/_/g, " ")}
              </span>
            </div>

            <p className="mt-2 text-sm hive-subtle">{module.description}</p>

            <div className="mt-3">
              <p className="hive-section-label">
                Data sources
              </p>
              <ul className="mt-1 space-y-1 text-xs text-[#b9b9cf]">
                {module.dataSources.map((source) => (
                  <li key={source}>{source}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
