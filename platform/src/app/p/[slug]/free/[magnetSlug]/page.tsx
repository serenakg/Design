import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LeadMagnet, Workspace } from "@/lib/types";
import { ClaimForm } from "./claim-form";

export default async function LeadMagnetPage({
  params,
}: {
  params: Promise<{ slug: string; magnetSlug: string }>;
}) {
  const { slug, magnetSlug } = await params;
  const supabase = await createClient();

  const { data: branding } = await supabase
    .from("workspace_branding")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!branding) notFound();
  const ws = branding as Workspace;

  const { data: magnet } = await supabase
    .from("lead_magnets")
    .select("slug, title, description")
    .eq("workspace_id", ws.id)
    .eq("slug", magnetSlug)
    .eq("active", true)
    .single();
  if (!magnet) notFound();
  const m = magnet as Pick<LeadMagnet, "slug" | "title" | "description">;

  return (
    <div className="mx-auto max-w-md">
      <header className="mb-6 text-center">
        <p
          className="text-sm font-semibold tracking-wide uppercase"
          style={{ color: ws.brand_colour }}
        >
          Free download
        </p>
        <h1 className="mt-1 text-3xl font-semibold">{m.title}</h1>
        {m.description && (
          <p className="mt-2 text-stone-600">{m.description}</p>
        )}
      </header>
      <ClaimForm
        workspaceSlug={slug}
        magnetSlug={m.slug}
        brandColour={ws.brand_colour}
      />
    </div>
  );
}
