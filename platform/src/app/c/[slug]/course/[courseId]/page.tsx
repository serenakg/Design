import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Course, Enrolment, Lesson } from "@/lib/types";
import { loadCommunity } from "../../community";
import { EnrolButton } from "./enrol-button";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string; courseId: string }>;
}) {
  const { slug, courseId } = await params;
  const { supabase, user, workspace, member } = await loadCommunity(slug);
  if (!workspace) notFound();
  if (!user) redirect("/login");
  if (!member) redirect(`/c/${slug}`);

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .eq("workspace_id", workspace.id)
    .single();
  if (!course) notFound();
  const c = course as Course;

  const [{ data: lessons }, { data: enrolment }] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, title, position, video_url")
      .eq("course_id", c.id)
      .order("position"),
    supabase
      .from("enrolments")
      .select("*")
      .eq("course_id", c.id)
      .eq("contact_id", member.contact_id)
      .maybeSingle(),
  ]);
  const enrolled = (enrolment as Enrolment | null) ?? null;
  const completed = new Set(enrolled?.progress?.completed ?? []);
  const total = (lessons ?? []).length;
  const done = (lessons ?? []).filter((l) => completed.has(l.id)).length;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link href={`/c/${slug}/courses`} className="text-sm text-stone-500 hover:underline">
          ← All courses
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{c.title}</h1>
        {c.description && <p className="text-sm text-stone-600">{c.description}</p>}
      </header>

      {!enrolled ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center">
          <p className="text-sm text-stone-600">
            Start whenever suits you — there&apos;s no cohort to keep up with.
          </p>
          <EnrolButton
            slug={slug}
            workspaceId={workspace.id}
            courseId={c.id}
            contactId={member.contact_id}
            brandColour={workspace.brand_colour}
          />
        </div>
      ) : (
        total > 0 && (
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Your progress</span>
              <span className="text-stone-500">
                {done} of {total} lessons
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
              className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100"
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${total ? Math.round((done / total) * 100) : 0}%`,
                  backgroundColor: workspace.brand_colour,
                }}
              />
            </div>
          </div>
        )
      )}

      <ol className="flex flex-col gap-2">
        {(lessons ?? []).map((l: Pick<Lesson, "id" | "title" | "position" | "video_url">) => (
          <li key={l.id}>
            {enrolled ? (
              <Link
                href={`/c/${slug}/course/${c.id}/lesson/${l.id}`}
                className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 hover:border-stone-300"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    completed.has(l.id) ? "text-white" : "bg-stone-100 text-stone-500"
                  }`}
                  style={completed.has(l.id) ? { backgroundColor: workspace.brand_colour } : undefined}
                >
                  {completed.has(l.id) ? "✓" : l.position}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium">{l.title}</span>
                {l.video_url && <span className="text-xs text-stone-400">🎬</span>}
                {completed.has(l.id) && <span className="sr-only">(completed)</span>}
              </Link>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 p-4 text-stone-400">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-bold">
                  {l.position}
                </span>
                <span className="text-sm">{l.title}</span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
