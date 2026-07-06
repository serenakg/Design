export type Workspace = {
  id: string;
  slug: string;
  name: string;
  brand_colour: string;
  brand_config: {
    tagline?: string;
    community_name?: string;
    accent_soft?: string;
  };
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "owner" | "admin" | "editor";
  can_publish: boolean;
};

export type ContactStatus = "lead" | "subscriber" | "paid";

export type Contact = {
  id: string;
  workspace_id: string;
  name: string;
  email: string;
  status: ContactStatus;
  source: string;
  value: number;
  tags: string[];
  consent_at: string | null;
  consent_note: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
};

export const STATUS_LABELS: Record<ContactStatus, string> = {
  lead: "Lead",
  subscriber: "Subscriber",
  paid: "Paid",
};

export type BlogStatus = "draft" | "pending_approval" | "published";

export type BlogPost = {
  id: string;
  workspace_id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  status: BlogStatus;
  approved_by: string | null;
  created_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export const BLOG_STATUS_LABELS: Record<BlogStatus, string> = {
  draft: "Draft",
  pending_approval: "Awaiting sign-off",
  published: "Published",
};

export type LeadMagnet = {
  id: string;
  workspace_id: string;
  slug: string;
  title: string;
  description: string;
  file_url: string;
  tag: string;
  active: boolean;
  created_at: string;
};
