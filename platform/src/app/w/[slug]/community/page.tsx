import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Flag, Member, Space, Workspace } from "@/lib/types";
import { CommunityAdmin } from "./community-admin";

export default async function CommunityAdminPage({
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

  const [{ data: spaces }, { data: members }, { data: flags }] =
    await Promise.all([
      supabase
        .from("spaces")
        .select("*")
        .eq("workspace_id", ws.id)
        .order("position"),
      supabase
        .from("members")
        .select("*")
        .eq("workspace_id", ws.id)
        .order("joined_at", { ascending: false })
        .limit(200),
      supabase
        .from("flags")
        .select("*")
        .eq("workspace_id", ws.id)
        .eq("status", "open")
        .order("created_at"),
    ]);

  // pull the flagged content so moderators see what was reported
  const flagged = (flags ?? []) as Flag[];
  const postIds = flagged.filter((f) => f.target_type === "post").map((f) => f.target_id);
  const commentIds = flagged
    .filter((f) => f.target_type === "comment")
    .map((f) => f.target_id);
  const [{ data: flaggedPosts }, { data: flaggedComments }] = await Promise.all([
    postIds.length
      ? supabase.from("space_posts").select("id, body, status").in("id", postIds)
      : Promise.resolve({ data: [] }),
    commentIds.length
      ? supabase.from("space_comments").select("id, body, status").in("id", commentIds)
      : Promise.resolve({ data: [] }),
  ]);
  const contentById = new Map<string, { body: string; status: string }>();
  for (const row of [...(flaggedPosts ?? []), ...(flaggedComments ?? [])]) {
    contentById.set(row.id, { body: row.body, status: row.status });
  }

  return (
    <CommunityAdmin
      workspace={ws}
      slug={slug}
      spaces={(spaces ?? []) as Space[]}
      members={(members ?? []) as Member[]}
      flags={flagged.map((f) => ({
        ...f,
        body: contentById.get(f.target_id)?.body ?? "(content deleted)",
        contentStatus: contentById.get(f.target_id)?.status ?? "removed",
      }))}
    />
  );
}
