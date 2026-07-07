"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

// ------------------------------------------------------------
// Step 2 of the pipeline: AI writes the caption in THIS
// workspace's voice. The workspace row is fetched through the
// user's own session, so RLS guarantees they belong here.
// ------------------------------------------------------------
export async function generateCaption(
  workspaceId: string,
  topic: string
): Promise<
  | { ok: true; caption: string; graphicText: string }
  | { ok: false; error: string }
> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error:
        "AI is not configured yet — add ANTHROPIC_API_KEY (created under the owner's email) to the environment.",
    };
  }
  const cleanTopic = topic.trim().slice(0, 500);
  if (!cleanTopic) return { ok: false, error: "Type a topic first." };

  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name, brand_config")
    .eq("id", workspaceId)
    .single();
  if (!workspace) return { ok: false, error: "Workspace not found." };

  const voice =
    workspace.brand_config?.voice ??
    "Warm, professional, plain-spoken. No jargon, no hype.";

  const anthropic = new Anthropic();
  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system: `You write social media posts for ${workspace.name}.

Voice: ${voice}

Rules:
- One post only, ready to publish on Instagram/LinkedIn/Threads.
- 60–150 words, short paragraphs, no headline.
- 2–4 relevant hashtags at the end.
- No em-dash overuse, no "game-changer" clichés, no fake urgency,
  no shame-based hooks (this brand never uses shame mechanics).`,
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              caption: {
                type: "string",
                description: "The full post caption, ready to publish",
              },
              graphic_text: {
                type: "string",
                description:
                  "A 3–8 word hook from the post, for the branded graphic",
              },
            },
            required: ["caption", "graphic_text"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: `Topic: ${cleanTopic}` }],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = JSON.parse(text) as {
      caption: string;
      graphic_text: string;
    };
    return {
      ok: true,
      caption: parsed.caption,
      graphicText: parsed.graphic_text,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? `AI request failed: ${e.message}` : "AI request failed",
    };
  }
}

// ------------------------------------------------------------
// Step 3: the brand graphic — a clean SVG card in the workspace's
// colours with the hook text, uploaded to the public bucket.
// Deterministic and free; an image-model can replace it later
// without touching the pipeline.
// ------------------------------------------------------------
function escapeXml(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapWords(text: string, perLine: number): string[] {
  const words = text.split(/\s+/).filter(Boolean).slice(0, 16);
  const lines: string[] = [];
  let line: string[] = [];
  for (const word of words) {
    line.push(word);
    if (line.join(" ").length >= perLine) {
      lines.push(line.join(" "));
      line = [];
    }
  }
  if (line.length) lines.push(line.join(" "));
  return lines.slice(0, 4);
}

function renderBrandGraphic(
  workspaceName: string,
  brandColour: string,
  graphicText: string
): string {
  const lines = wrapWords(graphicText, 14);
  const lineHeight = 96;
  const startY = 540 - ((lines.length - 1) * lineHeight) / 2;
  const textSpans = lines
    .map(
      (line, i) =>
        `<text x="540" y="${startY + i * lineHeight}" text-anchor="middle" font-family="Georgia, serif" font-size="72" font-weight="bold" fill="#ffffff">${escapeXml(line)}</text>`
    )
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${escapeXml(brandColour)}"/>
      <stop offset="100%" stop-color="#1c1917"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <text x="540" y="140" text-anchor="middle" font-family="Georgia, serif" font-size="40" fill="rgba(255,255,255,0.85)">${escapeXml(workspaceName)}</text>
  ${textSpans}
  <rect x="490" y="${startY + lines.length * lineHeight}" width="100" height="6" rx="3" fill="rgba(255,255,255,0.6)"/>
</svg>`;
}

// ------------------------------------------------------------
// Save (create or update) a post draft. Regenerates the graphic
// whenever the hook text is present.
// ------------------------------------------------------------
export async function savePost(
  workspaceId: string,
  slug: string,
  postId: string | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  const caption = String(formData.get("caption") ?? "").trim();
  if (!caption) return { ok: false, error: "The caption is empty." };
  const graphicText = String(formData.get("graphic_text") ?? "").trim();
  const platforms = ["instagram", "linkedin", "threads"].filter(
    (p) => formData.get(`platform_${p}`) === "on"
  );

  // Build + upload the brand graphic
  let mediaUrl: string | null = null;
  if (graphicText) {
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("name, brand_colour")
      .eq("id", workspaceId)
      .single();
    if (workspace) {
      const svg = renderBrandGraphic(
        workspace.name,
        workspace.brand_colour,
        graphicText
      );
      const bucket = `${slug}-public`;
      const path = `social/${Date.now()}.svg`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, new Blob([svg], { type: "image/svg+xml" }), {
          contentType: "image/svg+xml",
        });
      if (!uploadError) {
        mediaUrl = supabase.storage.from(bucket).getPublicUrl(path).data
          .publicUrl;
      }
    }
  }

  const values: Record<string, unknown> = {
    topic: String(formData.get("topic") ?? "").trim(),
    caption,
    graphic_text: graphicText,
    platforms,
  };
  if (mediaUrl) values.media_url = mediaUrl;

  if (postId) {
    const { error } = await supabase
      .from("posts")
      .update(values)
      .eq("id", postId);
    if (error) return { ok: false, error: error.message };
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("posts").insert({
      ...values,
      workspace_id: workspaceId,
      created_by: user?.id,
    });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath(`/w/${slug}/social`);
  return { ok: true };
}

// ------------------------------------------------------------
// Step 4: THE APPROVAL GATE. Submitting and approving are status
// moves; the database (constraint + trigger) enforces that only a
// can_publish profile can reach 'scheduled', and stamps the approver.
// ------------------------------------------------------------
export async function submitPost(
  postId: string,
  slug: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({ status: "pending_approval" })
    .eq("id", postId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/social`);
  return { ok: true };
}

export async function schedulePost(
  postId: string,
  slug: string,
  when: string
): Promise<ActionResult> {
  const scheduledAt = new Date(when);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { ok: false, error: "Pick a date and time first." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({
      status: "scheduled",
      scheduled_at: scheduledAt.toISOString(),
      post_error: null,
      retry_count: 0,
    })
    .eq("id", postId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/social`);
  return { ok: true };
}

export async function unschedulePost(
  postId: string,
  slug: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({
      status: "draft",
      approved_by: null,
      scheduled_at: null,
      post_error: null,
      retry_count: 0,
    })
    .eq("id", postId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/social`);
  return { ok: true };
}

export async function deletePost(
  postId: string,
  slug: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/social`);
  return { ok: true };
}
