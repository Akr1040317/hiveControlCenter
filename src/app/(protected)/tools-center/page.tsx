import { SCRIPT_CATALOG } from "@/lib/tools/scriptCatalog";
import { listRunbooks } from "@/lib/jobs/engine";

export default async function ToolsCenterPage() {
  const runbooks = await listRunbooks();

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Tools Center</h1>
        <p className="mt-1 text-sm hive-subtle">
          Script catalog from `hivewebsite` and `hiveTools` for quiz words,
          pronunciations, word info, and learning track operations.
        </p>
      </div>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">
          Script inventory
        </h2>
        <p className="mt-1 text-xs hive-subtle">
          These scripts are cataloged for admin workflow routing. Execution
          wrappers will run through job runbooks.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[#b9b9cf]">
              <tr>
                <th className="pb-2">Script</th>
                <th className="pb-2">Area</th>
                <th className="pb-2">Source</th>
                <th className="pb-2">Path</th>
                <th className="pb-2">Suggested runbook</th>
              </tr>
            </thead>
            <tbody>
              {SCRIPT_CATALOG.map((script) => (
                <tr key={script.id} className="border-t border-zinc-100">
                  <td className="py-2">
                    <div className="font-medium text-white">{script.name}</div>
                    <div className="text-xs hive-subtle">
                      {script.description}
                    </div>
                  </td>
                  <td className="py-2 uppercase text-xs text-[#d7a75f]">
                    {script.area.replace("_", " ")}
                  </td>
                  <td className="py-2 text-[#ddddef]">{script.source}</td>
                  <td className="py-2 font-mono text-xs text-[#b9b9cf]">
                    {script.path}
                  </td>
                  <td className="py-2 text-[#ddddef]">
                    {script.recommendedRunbookId ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">
          Available runbooks
        </h2>
        <div className="mt-3 grid gap-2">
          {runbooks
            .filter((runbook) =>
              ["tooling", "content"].includes(runbook.category),
            )
            .map((runbook) => (
              <div
                key={runbook.id}
                className="rounded-md border border-[#2b2b48] bg-[#17172a] px-3 py-2"
              >
                <p className="text-sm font-medium text-white">{runbook.name}</p>
                <p className="text-xs text-[#a7a7c0]">{runbook.id}</p>
              </div>
            ))}
        </div>
      </article>
    </section>
  );
}
