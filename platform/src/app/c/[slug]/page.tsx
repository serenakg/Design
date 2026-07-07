import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Space } from "@/lib/types";
import { loadCommunity } from "./community";
import { JoinForm } from "./join-form";

export default async function CommunityHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { supabase, user, workspace, member } = await loadCommunity(slug);
  if (!workspace) notFound();
  if (!user) redirect("/login");

  if (!member) {
    return (
      <div className="mx-auto max-w-md">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">
            Join {workspace.brand_config?.community_name ?? workspace.name}
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            {workspace.brand_config?.tagline}
          </p>
        </header>
        <JoinForm slug={slug} brandColour={workspace.brand_colour} />
      </div>
    );
  }

  const { data: spaces } = await supabase
    .from("spaces")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("position");

  const visibleSpaces = ((spaces ?? []) as Space[]).filter(
    (s) => !s.paid_only || member.tier === "paid"
  );
  const lockedSpaces = ((spaces ?? []) as Space[]).filter(
    (s) => s.paid_only && member.tier !== "paid"
  );
  const paymentLink = workspace.brand_config
    ? (workspace.brand_config as Record<string, unknown>)["membership_payment_link"]
    : null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">
          Hello, {member.display_name} 👋
        </h1>
        <p className="text-sm text-stone-600">
          Pick a space — join in, or just read along. Both are welcome.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {visibleSpaces.map((s) => (
          <li key={s.id}>
            <Link
              href={`/c/${slug}/space/${s.slug}`}
              className="block rounded-2xl border border-stone-200 bg-white p-5 hover:border-stone-300"
            >
              <h2 className="font-semibold" style={{ color: workspace.brand_colour }}>
                {s.name}
              </h2>
              {s.description && (
                <p className="mt-1 text-sm text-stone-600">{s.description}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {lockedSpaces.length > 0 && (
        <section className="rounded-2xl border border-dashed border-stone-300 p-5">
          <h2 className="text-sm font-semibold text-stone-700">
            Member-supported spaces
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-stone-600">
            {lockedSpaces.map((s) => (
              <li key={s.id}>🔒 {s.name}</li>
            ))}
          </ul>
          {typeof paymentLink === "string" && paymentLink ? (
            <a
              href={paymentLink}
              className="mt-3 inline-block rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: workspace.brand_colour }}
            >
              Become a paid member
            </a>
          ) : (
            <p className="mt-2 text-xs text-stone-500">
              Paid membership opens soon.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
