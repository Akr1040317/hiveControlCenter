import { ToolsConsole } from "@/components/tools/ToolsConsole";
import { SCRIPT_CATALOG } from "@/lib/tools/scriptCatalog";

export default function ToolsCenterPage() {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Tools Center</h1>
        <p className="mt-1 text-sm hive-subtle">
          Run tools for quiz words, pronunciations, word metadata, and learning
          track operations. Each tool executes through the automation engine with
          dry-run support.
        </p>
      </div>

      <ToolsConsole />

      {/* Script reference catalog */}
      <details className="group">
        <summary className="cursor-pointer rounded-lg border border-[#1e1e34] bg-[#121220] px-4 py-3 text-sm font-medium text-[#9b9bb4] hover:text-white transition-colors">
          Script Reference Catalog ({SCRIPT_CATALOG.length} scripts from hivewebsite + hiveTools)
        </summary>
        <div className="mt-2 overflow-x-auto rounded-lg border border-[#1e1e34]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#1e1e34] bg-[#121220]">
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-[#9b9bb4]">Script</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-[#9b9bb4]">Area</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-[#9b9bb4]">Source</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-[#9b9bb4]">Path</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-[#9b9bb4]">Runbook</th>
              </tr>
            </thead>
            <tbody>
              {SCRIPT_CATALOG.map((script) => (
                <tr key={script.id} className="border-b border-[#1e1e34] hover:bg-[rgba(255,165,0,0.04)]">
                  <td className="px-3 py-2">
                    <p className="font-medium text-white">{script.name}</p>
                    <p className="text-xs text-[#6b6b8a]">{script.description}</p>
                  </td>
                  <td className="px-3 py-2 text-xs uppercase text-[#d7a75f]">
                    {script.area.replace("_", " ")}
                  </td>
                  <td className="px-3 py-2 text-[#d8d8ea]">{script.source}</td>
                  <td className="px-3 py-2 font-mono text-xs text-[#9b9bb4]">{script.path}</td>
                  <td className="px-3 py-2 text-xs text-[#d8d8ea]">
                    {script.recommendedRunbookId ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
