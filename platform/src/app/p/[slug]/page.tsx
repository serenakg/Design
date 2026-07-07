import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BlogPost, LeadMagnet, Workspace } from "@/lib/types";

export default async function PublicHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: branding } = await supabase
    .from("workspace_branding")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!branding) notFound();
  const ws = branding as Workspace;

  const [{ data: posts }, { data: magnets }] = await Promise.all([
    supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, published_at")
      .eq("workspace_id", ws.id)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3),
    supabase
      .from("lead_magnets")
      .select("id, slug, title, description")
      .eq("workspace_id", ws.id)
      .eq("active", true)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-12">
      <section className="py-8 text-center">
        <h1 className="text-4xl font-semibold" style={{ color: ws.brand_colour }}>
          {ws.name}
        </h1>
        {ws.brand_config?.tagline && (
          <p className="mx-auto mt-3 max-w-xl text-lg text-stone-600">
            {ws.brand_config.tagline}
          </p>
        )}
      </section>

      {(magnets ?? []).length > 0 && (
        <section aria-labelledby="free-heading">
          <h2 id="free-heading" className="mb-4 text-xl font-semibold">
            Free resources
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {(magnets as LeadMagnet[]).map((m) => (
              <li
                key={m.id}
                className="rounded-2xl border border-stone-200 bg-white p-5"
              >
                <h3 className="font-semibold">{m.title}</h3>
                {m.description && (
                  <p className="mt-1 text-sm text-stone-600">{m.description}</p>
                )}
                <Link
                  href={`/p/${slug}/free/${m.slug}`}
                  className="mt-3 inline-block rounded-lg px-4 py-2 text-sm font-medium text-white"
                  style={{ backgroundColor: ws.brand_colour }}
                >
                  Get it free
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="latest-heading">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="latest-heading" className="text-xl font-semibold">
            From the blog
          </h2>
          <Link
            href={`/p/${slug}/blog`}
            className="text-sm font-medium underline underline-offset-4"
            style={{ color: ws.brand_colour }}
          >
            All posts
          </Link>
        </div>
        {(posts ?? []).length === 0 ? (
          <p className="text-sm text-stone-500">First posts coming soon.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {(posts as BlogPost[]).map((p) => (
              <li key={p.id}>
                <article className="rounded-2xl border border-stone-200 bg-white p-5">
                  <h3 className="font-semibold">
                    <Link
                      href={`/p/${slug}/blog/${p.slug}`}
                      className="hover:underline"
                    >
                      {p.title}
                    </Link>
                  </h3>
                  {p.excerpt && (
                    <p className="mt-1 text-sm text-stone-600">{p.excerpt}</p>
                  )}
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
