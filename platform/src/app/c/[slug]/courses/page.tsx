import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Course } from "@/lib/types";
import { loadCommunity } from "../community";

export default async function MemberCoursesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { supabase, user, workspace, member } = await loadCommunity(slug);
  if (!workspace) notFound();
  if (!user) redirect("/login");
  if (!member) redirect(`/c/${slug}`);

  // RLS already limits this to published courses this member may see
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("created_at");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Courses</h1>
        <p className="text-sm text-stone-600">
          Learn at whatever pace your life allows — progress is private, and
          nothing expires.
        </p>
      </header>

      {(courses ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-600">
          Courses are coming soon.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {(courses as Course[]).map((c) => (
            <li key={c.id}>
              <Link
                href={`/c/${slug}/course/${c.id}`}
                className="block rounded-2xl border border-stone-200 bg-white p-5 hover:border-stone-300"
              >
                <h2 className="font-semibold" style={{ color: workspace.brand_colour }}>
                  {c.title}
                </h2>
                {c.description && (
                  <p className="mt-1 text-sm text-stone-600">{c.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
