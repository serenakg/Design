import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, SocialPost, Workspace } from "@/lib/types";
import { SocialManager } from "./social-manager";

export default async function SocialAdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!workspace) notFound();
  const ws = workspace as Workspace;

  const [{ data: posts }, { data: profile }] = await Promise.all([
    supabase
      .from("posts")
      .select("*")
      .eq("workspace_id", ws.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);

  return (
    <SocialManager
      workspace={ws}
      slug={slug}
      posts={(posts ?? []) as SocialPost[]}
      canPublish={Boolean((profile as Profile | null)?.can_publish)}
    />
  );
}
