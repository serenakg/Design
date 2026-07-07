import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Course, Enrolment, Lesson, Profile, Workspace } from "@/lib/types";
import { CoursesAdmin } from "./courses-admin";

export default async function CoursesAdminPage({
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

  const [{ data: courses }, { data: lessons }, { data: enrolments }, { data: profile }] =
    await Promise.all([
      supabase
        .from("courses")
        .select("*")
        .eq("workspace_id", ws.id)
        .order("created_at"),
      supabase
        .from("lessons")
        .select("*")
        .eq("workspace_id", ws.id)
        .order("position"),
      supabase.from("enrolments").select("id, course_id").eq("workspace_id", ws.id),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
    ]);

  return (
    <CoursesAdmin
      workspace={ws}
      slug={slug}
      courses={(courses ?? []) as Course[]}
      lessons={(lessons ?? []) as Lesson[]}
      enrolments={(enrolments ?? []) as Pick<Enrolment, "id" | "course_id">[]}
      canPublish={Boolean((profile as Profile | null)?.can_publish)}
    />
  );
}
