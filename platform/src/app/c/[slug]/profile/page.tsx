import { notFound, redirect } from "next/navigation";
import { loadCommunity } from "../community";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { user, workspace, member } = await loadCommunity(slug);
  if (!workspace) notFound();
  if (!user) redirect("/login");
  if (!member) redirect(`/c/${slug}`);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-semibold">My profile</h1>
      <ProfileForm slug={slug} member={member} brandColour={workspace.brand_colour} />
      <p className="mt-4 text-xs text-stone-500">
        Membership tier: <strong>{member.tier}</strong>. Your profile is only
        visible inside this community. To export or delete your data, use the
        report button on any post or reply to any email from us — a human
        handles every request.
      </p>
    </div>
  );
}
