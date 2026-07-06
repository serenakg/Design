import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Workspace } from "@/lib/types";
import { ExportAllButton } from "./export-all";

const DELIA = [
  ["D — Diverse", "Forms and journeys built for the full spectrum, no assumed-majority defaults."],
  ["E — Emotionally Safe", "No shame mechanics. Health and money data handled with care."],
  ["L — Life-Centred", "Nothing punishes being offline."],
  ["I — Inclusive", "Sliding-scale pricing and multiple entry points, by design."],
  ["A — Accessible", "WCAG standard. Works on a cheap phone on slow wifi."],
] as const;

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!workspace) notFound();
  const ws = workspace as Workspace;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold">Settings &amp; GDPR</h1>
        <p className="text-sm text-stone-600">{ws.name}</p>
      </header>

      <section
        aria-labelledby="gdpr-heading"
        className="rounded-2xl border border-stone-200 bg-white p-6"
      >
        <h2 id="gdpr-heading" className="text-lg font-semibold">
          Data protection
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          Every contact carries a consent record. Per-person export and erasure
          live on each contact row. Below is the workspace-level export
          (subject-access requests, backups before migrations).
        </p>
        <div className="mt-4">
          <ExportAllButton workspaceId={ws.id} workspaceName={ws.name} />
        </div>
        <ul className="mt-4 list-disc pl-5 text-sm text-stone-600">
          <li>Right of access / portability → “Export” on a contact, or export-all above.</li>
          <li>Right to erasure → “Erase” on a contact removes them and every linked record.</li>
          <li>
            Consent → stored as a timestamp plus a note of how it was given.
            No consent recorded = never emailed.
          </li>
        </ul>
      </section>

      <section
        aria-labelledby="delia-heading"
        className="rounded-2xl border border-stone-200 bg-white p-6"
      >
        <h2 id="delia-heading" className="text-lg font-semibold">
          The DELIA Model™ — the ship standard
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          Every feature in every phase must pass all five before it ships.
        </p>
        <dl className="mt-4 flex flex-col gap-3">
          {DELIA.map(([term, def]) => (
            <div key={term} className="rounded-lg bg-stone-50 p-3">
              <dt className="font-medium" style={{ color: ws.brand_colour }}>
                {term}
              </dt>
              <dd className="text-sm text-stone-600">{def}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-labelledby="ws-heading"
        className="rounded-2xl border border-stone-200 bg-white p-6"
      >
        <h2 id="ws-heading" className="text-lg font-semibold">
          Workspace
        </h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-stone-500">Name</dt>
            <dd className="font-medium">{ws.name}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Brand colour</dt>
            <dd className="flex items-center gap-2 font-medium">
              <span
                aria-hidden="true"
                className="inline-block h-4 w-4 rounded"
                style={{ backgroundColor: ws.brand_colour }}
              />
              {ws.brand_colour}
            </dd>
          </div>
          {ws.brand_config?.community_name && (
            <div>
              <dt className="text-stone-500">Community (Phase 5)</dt>
              <dd className="font-medium">{ws.brand_config.community_name}</dd>
            </div>
          )}
        </dl>
        <p className="mt-4 rounded-lg bg-stone-50 p-3 text-sm text-stone-600">
          🧱 The wall: this workspace&apos;s data is separated from the other by
          row-level security in the database. Team invites and per-workspace
          permissions arrive in Phase 7 — until then the owner grants access
          in Supabase.
        </p>
      </section>
    </div>
  );
}
