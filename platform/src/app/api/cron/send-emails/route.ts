import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// The sender. Called by Vercel Cron (see vercel.json) with
// Authorization: Bearer ${CRON_SECRET}. Uses the service-role key —
// the queue functions are locked to it. Flow per run:
//   1. queue_due_sequence_emails() — due steps into the log
//      (consentless contacts are logged as skipped, never sent)
//   2. queue_due_broadcasts()      — due broadcasts into the log
//   3. take_queued_emails()        — claim a batch, send via Resend,
//      record sent/failed per email. Failures keep their error and
//      stay visible in the activity log. Never silent-fail.

export const dynamic = "force-dynamic";

type Outgoing = {
  log_id: string;
  to_email: string;
  contact_id: string | null;
  contact_name: string;
  subject: string;
  body: string;
  workspace_slug: string;
  workspace_name: string;
  brand_config: { from_email?: string } | null;
  broadcast_id: string | null;
};

function personalise(text: string, name: string): string {
  const firstName = name.trim().split(/\s+/)[0] ?? "";
  return text
    .replaceAll("{{name}}", name)
    .replaceAll("{{first_name}}", firstName);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const [seq, bc] = await Promise.all([
    supabase.rpc("queue_due_sequence_emails"),
    supabase.rpc("queue_due_broadcasts"),
  ]);
  if (seq.error) return NextResponse.json({ error: seq.error.message }, { status: 500 });
  if (bc.error) return NextResponse.json({ error: bc.error.message }, { status: 500 });

  const { data, error } = await supabase.rpc("take_queued_emails", {
    p_limit: 50,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  let failed = 0;

  for (const mail of (data ?? []) as Outgoing[]) {
    const fromEmail =
      mail.brand_config?.from_email ??
      process.env.EMAIL_FROM ??
      "onboarding@resend.dev";
    const unsubscribe = mail.contact_id
      ? `${siteUrl}/p/${mail.workspace_slug}/unsubscribe?c=${mail.contact_id}`
      : "";
    const text =
      personalise(mail.body, mail.contact_name) +
      (unsubscribe
        ? `\n\n—\nNo longer want these emails? Unsubscribe in one click: ${unsubscribe}`
        : "");

    let ok = false;
    let resendId: string | null = null;
    let errorMessage: string | null = null;

    if (!resendKey) {
      errorMessage = "RESEND_API_KEY is not configured";
    } else {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${mail.workspace_name} <${fromEmail}>`,
            to: [mail.to_email],
            subject: personalise(mail.subject, mail.contact_name),
            text,
          }),
        });
        const payload = await res.json().catch(() => ({}));
        if (res.ok) {
          ok = true;
          resendId = payload.id ?? null;
        } else {
          errorMessage = payload.message ?? `Resend responded ${res.status}`;
        }
      } catch (e) {
        errorMessage = e instanceof Error ? e.message : "Network error";
      }
    }

    await supabase.rpc("finish_email", {
      p_log_id: mail.log_id,
      p_ok: ok,
      p_resend_id: resendId,
      p_error: errorMessage,
    });
    if (ok) sent += 1;
    else failed += 1;
  }

  return NextResponse.json({
    queued_from_sequences: seq.data,
    queued_from_broadcasts: bc.data,
    sent,
    failed,
  });
}
