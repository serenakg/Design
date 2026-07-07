import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Member, SpaceComment, SpacePost } from "@/lib/types";
import { loadCommunity } from "../../community";
import { CommentComposer, FlagButton } from "./thread-controls";

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string; postId: string }>;
}) {
  const { slug, postId } = await params;
  const { supabase, user, workspace, member } = await loadCommunity(slug);
  if (!workspace) notFound();
  if (!user) redirect("/login");
  if (!member) redirect(`/c/${slug}`);

  const { data: post } = await supabase
    .from("space_posts")
    .select("*")
    .eq("id", postId)
    .eq("workspace_id", workspace.id)
    .single();
  if (!post) notFound();
  const p = post as SpacePost;

  const { data: comments } = await supabase
    .from("space_comments")
    .select("*")
    .eq("post_id", p.id)
    .order("created_at");

  const authorIds = [
    ...new Set([p.author_member_id, ...(comments ?? []).map((c) => c.author_member_id)]),
  ];
  const { data: authors } = await supabase
    .from("members")
    .select("id, display_name, pronouns")
    .in("id", authorIds);
  const authorById = new Map(
    ((authors ?? []) as Pick<Member, "id" | "display_name" | "pronouns">[]).map(
      (a) => [a.id, a]
    )
  );
  const name = (id: string) => authorById.get(id)?.display_name ?? "A member";

  const body = (
    <article className="rounded-2xl border border-stone-200 bg-white p-5">
      <p className="text-sm font-medium">
        {name(p.author_member_id)}
        <span className="ml-2 text-xs font-normal text-stone-400">
          {new Date(p.created_at).toLocaleString("en-IE")}
        </span>
      </p>
      {p.title && <h1 className="mt-1 text-xl font-semibold">{p.title}</h1>}
      <p className="mt-2 text-sm whitespace-pre-line text-stone-800">{p.body}</p>
      <div className="mt-3">
        <FlagButton
          slug={slug}
          workspaceId={workspace.id}
          memberId={member.id}
          targetType="post"
          targetId={p.id}
        />
      </div>
    </article>
  );

  return (
    <div className="flex flex-col gap-5">
      <Link href={`/c/${slug}`} className="text-sm text-stone-500 hover:underline">
        ← All spaces
      </Link>

      {p.content_warning ? (
        <details>
          <summary className="cursor-pointer rounded-2xl border border-stone-200 bg-white p-4 text-sm font-medium text-stone-700">
            ⚠️ Content note: {p.content_warning} — tap to read
          </summary>
          <div className="mt-3">{body}</div>
        </details>
      ) : (
        body
      )}

      <section aria-labelledby="replies-heading" className="flex flex-col gap-3">
        <h2 id="replies-heading" className="text-sm font-semibold text-stone-600">
          Replies
        </h2>
        {(comments ?? []).length === 0 ? (
          <p className="text-sm text-stone-500">No replies yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(comments as SpaceComment[]).map((c) => (
              <li key={c.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <p className="text-sm font-medium">
                  {name(c.author_member_id)}
                  <span className="ml-2 text-xs font-normal text-stone-400">
                    {new Date(c.created_at).toLocaleString("en-IE")}
                  </span>
                  {c.status !== "published" && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                      hidden by moderators
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm whitespace-pre-line text-stone-700">{c.body}</p>
                <div className="mt-2">
                  <FlagButton
                    slug={slug}
                    workspaceId={workspace.id}
                    memberId={member.id}
                    targetType="comment"
                    targetId={c.id}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <CommentComposer
          slug={slug}
          postId={p.id}
          workspaceId={workspace.id}
          memberId={member.id}
          brandColour={workspace.brand_colour}
        />
      </section>
    </div>
  );
}
