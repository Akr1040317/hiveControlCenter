import { ContentManagementTabs } from "@/components/content/ContentManagementTabs";

export default function ContentManagementPage() {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Content Management
        </h1>
        <p className="mt-1 text-sm hive-subtle">
          Create, edit, and manage all content across the Hive platform.
        </p>
      </div>

      <ContentManagementTabs />
    </section>
  );
}
