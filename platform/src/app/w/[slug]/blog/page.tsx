import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BlogPost, Profile, Workspace } from "@/lib/types";
import { BlogManager } from "./blog-manager";

export default async function BlogAdminPage({
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
      .from("blog_posts")
      .select("*")
      .eq("workspace_id", ws.id)
      .order("updated_at", { ascending: false }),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);

  return (
    <BlogManager
      workspace={ws}
      slug={slug}
      posts={(posts ?? []) as BlogPost[]}
      canPublish={Boolean((profile as Profile | null)?.can_publish)}
    />
  );
}
