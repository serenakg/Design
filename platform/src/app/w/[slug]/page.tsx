import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Contact, Workspace } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";

export default async function DashboardPage({
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

  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("workspace_id", ws.id)
    .order("created_at", { ascending: false });
  const contacts = (data ?? []) as Contact[];

  const counts = {
    lead: contacts.filter((c) => c.status === "lead").length,
    subscriber: contacts.filter((c) => c.status === "subscriber").length,
    paid: contacts.filter((c) => c.status === "paid").length,
  };
  const totalValue = contacts.reduce((sum, c) => sum + Number(c.value), 0);
  const recent = contacts.slice(0, 5);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: ws.brand_colour }}>
          {ws.name}
        </h1>
        {ws.brand_config?.tagline && (
          <p className="mt-1 text-sm text-stone-600">{ws.brand_config.tagline}</p>
        )}
      </header>

      <dl className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["Contacts", contacts.length],
            ["Leads", counts.lead],
            ["Subscribers", counts.subscriber],
            ["Paid", counts.paid],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-stone-200 bg-white p-4"
          >
            <dt className="text-xs font-medium tracking-wide text-stone-500 uppercase">
              {label}
            </dt>
            <dd className="mt-1 text-2xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-4">
        <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">
          Total contact value
        </p>
        <p className="mt-1 text-3xl font-semibold" style={{ color: ws.brand_colour }}>
          €{totalValue.toLocaleString("en-IE", { minimumFractionDigits: 2 })}
        </p>
      </div>

      <section aria-labelledby="recent-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="recent-heading" className="text-lg font-semibold">
            Recent contacts
          </h2>
          <Link
            href={`/w/${slug}/contacts`}
            className="text-sm font-medium underline underline-offset-4"
            style={{ color: ws.brand_colour }}
          >
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-600">
            No contacts yet. Add the first one — or wait for the lead magnets
            (Phase 2) to start filling this automatically.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
            {recent.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-sm text-stone-500">{c.email}</p>
                </div>
                <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium">
                  {STATUS_LABELS[c.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
