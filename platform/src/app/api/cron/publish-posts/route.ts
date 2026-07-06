import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Step 6 of the pipeline: auto-post. Real Meta/LinkedIn/Threads APIs
// only work once deployed and app-reviewed, so posting goes through a
// CONNECTOR: set SOCIAL_WEBHOOK_URL to any endpoint that accepts the
// post payload (Make/Zapier/Buffer webhook, or your own integration
// later) — no code changes needed at go-live.
//
// Rejection policy (Rules of the House): retry once, then mark the
// post failed AND email the owner. Never silent-fail.
// With no connector configured, scheduled posts simply wait — they
// stay visible on the calendar.

export const dynamic = "force-dynamic";

type DuePost = {
  id: string;
  workspace_id: string;
  caption: string;
  media_url: string | null;
  platforms: string[];
  scheduled_at: string;
  retry_count: number;
  workspaces: { slug: string; name: string } | null;
};

async function alertOwner(
  supabase: SupabaseClient,
  workspaceName: string,
  caption: string,
  errorMessage: string
) {
  const resendKey = process.env.RESEND_API_KEY;
  const { data: owner } = await supabase
    .from("profiles")
    .select("email")
    .eq("role", "owner")
    .limit(1)
    .single();
  if (!resendKey || !owner?.email) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM
        ? `The Platform <${process.env.EMAIL_FROM}>`
        : "The Platform <onboarding@resend.dev>",
      to: [owner.email as string],
      subject: `⚠️ A ${workspaceName} post failed to publish`,
      text: `A scheduled social post could not be published after a retry.

Workspace: ${workspaceName}
Post: ${caption.slice(0, 200)}

Error: ${errorMessage}

It's marked "Failed" in the social builder — edit it and re-schedule when ready.`,
    }),
  }).catch(() => {
    // alerting must never crash the publish run; the failure is
    // already recorded on the post itself
  });
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connectorUrl = process.env.SOCIAL_WEBHOOK_URL;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, workspace_id, caption, media_url, platforms, scheduled_at, retry_count, workspaces(slug, name)"
    )
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const due = (data ?? []) as unknown as DuePost[];
  if (!connectorUrl) {
    // Step 6 not wired yet — leave posts scheduled and say so.
    return NextResponse.json({
      due: due.length,
      posted: 0,
      note: "SOCIAL_WEBHOOK_URL not configured; posts stay scheduled",
    });
  }

  let posted = 0;
  let retried = 0;
  let failed = 0;

  for (const post of due) {
    let ok = false;
    let errorMessage = "";
    try {
      const res = await fetch(connectorUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace: post.workspaces?.slug,
          caption: post.caption,
          media_url: post.media_url,
          platforms: post.platforms,
          scheduled_at: post.scheduled_at,
        }),
      });
      if (res.ok) ok = true;
      else errorMessage = `Connector responded ${res.status}`;
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : "Network error";
    }

    if (ok) {
      await supabase
        .from("posts")
        .update({ status: "posted", posted_at: new Date().toISOString(), post_error: null })
        .eq("id", post.id);
      posted += 1;
    } else if (post.retry_count < 1) {
      // retry once: keep it scheduled, the next run tries again
      await supabase
        .from("posts")
        .update({ retry_count: post.retry_count + 1, post_error: errorMessage })
        .eq("id", post.id);
      retried += 1;
    } else {
      // second failure: mark failed + alert the owner
      await supabase
        .from("posts")
        .update({ status: "rejected", post_error: errorMessage })
        .eq("id", post.id);
      await alertOwner(
        supabase,
        post.workspaces?.name ?? "workspace",
        post.caption,
        errorMessage
      );
      failed += 1;
    }
  }

  return NextResponse.json({ due: due.length, posted, retried, failed });
}
