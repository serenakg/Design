import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EmailSequence, LeadMagnet, Workspace } from "@/lib/types";
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

  const [{ data: magnets }, { data: sequences }] = await Promise.all([
    supabase
      .from("lead_magnets")
      .select("*")
      .eq("workspace_id", ws.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("email_sequences")
      .select("id, name, status")
      .eq("workspace_id", ws.id)
      .order("name"),
  ]);

  return (
    <MagnetsManager
      workspace={ws}
      slug={slug}
      magnets={(magnets ?? []) as LeadMagnet[]}
      sequences={(sequences ?? []) as Pick<EmailSequence, "id" | "name" | "status">[]}
    />
  );
}
