import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  Broadcast,
  EmailLogEntry,
  EmailSequence,
  Profile,
  SequenceEmail,
  Workspace,
} from "@/lib/types";
import { EmailManager } from "./email-manager";

export default async function EmailAdminPage({
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

  const [
    { data: sequences },
    { data: sequenceEmails },
    { data: broadcasts },
    { data: log },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("email_sequences")
      .select("*")
      .eq("workspace_id", ws.id)
      .order("created_at"),
    supabase
      .from("sequence_emails")
      .select("*")
      .eq("workspace_id", ws.id)
      .order("position"),
    supabase
      .from("broadcasts")
      .select("*")
      .eq("workspace_id", ws.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("email_log")
      .select("id, workspace_id, to_email, subject, status, error, queued_at, sent_at")
      .eq("workspace_id", ws.id)
      .order("queued_at", { ascending: false })
      .limit(25),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);

  return (
    <EmailManager
      workspace={ws}
      slug={slug}
      sequences={(sequences ?? []) as EmailSequence[]}
      sequenceEmails={(sequenceEmails ?? []) as SequenceEmail[]}
      broadcasts={(broadcasts ?? []) as Broadcast[]}
      log={(log ?? []) as EmailLogEntry[]}
      canPublish={Boolean((profile as Profile | null)?.can_publish)}
    />
  );
}
