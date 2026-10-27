
import { Construction } from "lucide-react";

type WorkspacePlaceholderPageProps = {
  title: string;
  description: string;
};

function WorkspacePlaceholderPage({
  title,
  description,
}: WorkspacePlaceholderPageProps) {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan">
          Tournament operations
        </p>
        <h2 className="mt-2 text-2xl font-bold">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {description}
        </p>
      </div>

      <section className="rounded-xl border border-border bg-panel p-6 sm:p-8">
        <Construction size={25} className="text-gold" />
        <h3 className="mt-4 font-semibold">
          Workspace not implemented yet
        </h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          This route is in place for navigation and layout integration.
          Its data contracts, backend operations and verification must
          be implemented before it is operational.
        </p>
      </section>
    </div>
  );
}

export default WorkspacePlaceholderPage;
