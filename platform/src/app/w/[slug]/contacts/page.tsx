import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Contact, Workspace } from "@/lib/types";
import { ContactsManager } from "./contacts-manager";

export default async function ContactsPage({
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

  return (
    <ContactsManager
      workspace={ws}
      slug={slug}
      contacts={(data ?? []) as Contact[]}
    />
  );
}
