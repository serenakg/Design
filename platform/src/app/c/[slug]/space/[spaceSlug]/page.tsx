import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Member, Space, SpacePost } from "@/lib/types";
import { loadCommunity } from "../../community";
import { PostComposer } from "./post-composer";

export default async function SpacePage({
  params,
}: {
  params: Promise<{ slug: string; spaceSlug: string }>;
}) {
  const { slug, spaceSlug } = await params;
  const { supabase, user, workspace, member } = await loadCommunity(slug);
  if (!workspace) notFound();
  if (!user) redirect("/login");
  if (!member) redirect(`/c/${slug}`);

  const { data: space } = await supabase
    .from("spaces")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("slug", spaceSlug)
    .single();
  if (!space) notFound();
  const sp = space as Space;
  if (sp.paid_only && member.tier !== "paid") redirect(`/c/${slug}`);

  const { data: posts } = await supabase
    .from("space_posts")
    .select("*")
    .eq("space_id", sp.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const authorIds = [...new Set((posts ?? []).map((p) => p.author_member_id))];
  const { data: authors } = authorIds.length
    ? await supabase
        .from("members")
        .select("id, display_name, pronouns")
        .in("id", authorIds)
    : { data: [] };
  const authorById = new Map(
    ((authors ?? []) as Pick<Member, "id" | "display_name" | "pronouns">[]).map(
      (a) => [a.id, a]
    )
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link href={`/c/${slug}`} className="text-sm text-stone-500 hover:underline">
          ← All spaces
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{sp.name}</h1>
        {sp.description && <p className="text-sm text-stone-600">{sp.description}</p>}
      </header>

      <PostComposer
        slug={slug}
        spaceId={sp.id}
        workspaceId={workspace.id}
        memberId={member.id}
        brandColour={workspace.brand_colour}
      />

      {(posts ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-600">
          Quiet so far — be the first, whenever you&apos;re ready.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {(posts as SpacePost[]).map((p) => {
            const author = authorById.get(p.author_member_id);
            const inner = (
              <>
                <p className="text-sm font-medium">
                  {author?.display_name ?? "A member"}
                  {author?.pronouns && (
                    <span className="ml-1 font-normal text-stone-500">
                      ({author.pronouns})
                    </span>
                  )}
                  <span className="ml-2 text-xs font-normal text-stone-400">
                    {new Date(p.created_at).toLocaleDateString("en-IE", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  {p.status !== "published" && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                      hidden by moderators
                    </span>
                  )}
                </p>
                {p.title && <h2 className="mt-1 font-semibold">{p.title}</h2>}
                <p className="mt-1 line-clamp-3 text-sm whitespace-pre-line text-stone-700">
                  {p.body}
                </p>
              </>
            );
            return (
              <li key={p.id} className="rounded-2xl border border-stone-200 bg-white p-5">
                {p.content_warning ? (
                  // DELIA — Emotionally Safe: content warnings collapse the
                  // post until the reader chooses to open it.
                  <details>
                    <summary className="cursor-pointer text-sm font-medium text-stone-700">
                      ⚠️ Content note: {p.content_warning} — tap to read
                    </summary>
                    <div className="mt-3">{inner}</div>
                  </details>
                ) : (
                  inner
                )}
                <Link
                  href={`/c/${slug}/post/${p.id}`}
                  className="mt-3 inline-block text-sm font-medium underline underline-offset-4"
                  style={{ color: workspace.brand_colour }}
                >
                  Open & reply
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
