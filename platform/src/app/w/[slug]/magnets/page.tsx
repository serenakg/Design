import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LeadMagnet, Workspace } from "@/lib/types";
import { MagnetsManager } from "./magnets-manager";

export default async function MagnetsAdminPage({
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

  const { data: magnets } = await supabase
    .from("lead_magnets")
    .select("*")
    .eq("workspace_id", ws.id)
    .order("created_at", { ascending: false });

  return (
    <MagnetsManager
      workspace={ws}
      slug={slug}
      magnets={(magnets ?? []) as LeadMagnet[]}
    />
  );
}
