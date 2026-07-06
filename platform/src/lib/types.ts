export type Workspace = {
  id: string;
  slug: string;
  name: string;
  brand_colour: string;
  brand_config: {
    tagline?: string;
    community_name?: string;
    accent_soft?: string;
    voice?: string;
    from_email?: string;
  };
};

export type PostStatus =
  | "draft"
  | "pending_approval"
  | "scheduled"
  | "posted"
  | "rejected";

export type SocialPost = {
  id: string;
  workspace_id: string;
  topic: string;
  caption: string;
  graphic_text: string;
  media_url: string | null;
  platforms: string[];
  status: PostStatus;
  scheduled_at: string | null;
  posted_at: string | null;
  post_error: string | null;
  retry_count: number;
  approved_by: string | null;
  created_by: string | null;
  created_at: string;
};

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  draft: "Draft",
  pending_approval: "Awaiting sign-off",
  scheduled: "Scheduled",
  posted: "Posted",
  rejected: "Failed",
};

export const PLATFORMS = ["instagram", "linkedin", "threads"] as const;

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
  sequence_id: string | null;
  created_at: string;
};

export type SequenceStatus = "draft" | "pending_approval" | "active" | "paused";

export type EmailSequence = {
  id: string;
  workspace_id: string;
  name: string;
  trigger_event: "contact_created" | "lead_magnet";
  status: SequenceStatus;
  approved_by: string | null;
  created_at: string;
};

export const SEQUENCE_STATUS_LABELS: Record<SequenceStatus, string> = {
  draft: "Draft",
  pending_approval: "Awaiting sign-off",
  active: "Active",
  paused: "Paused",
};

export type SequenceEmail = {
  id: string;
  workspace_id: string;
  sequence_id: string;
  position: number;
  delay_hours: number;
  subject: string;
  body: string;
};

export type BroadcastStatus =
  | "draft"
  | "pending_approval"
  | "scheduled"
  | "sending"
  | "sent";

export type Broadcast = {
  id: string;
  workspace_id: string;
  subject: string;
  body: string;
  segment_status: "all" | ContactStatus;
  segment_tag: string;
  status: BroadcastStatus;
  scheduled_at: string | null;
  approved_by: string | null;
  created_at: string;
};

export const BROADCAST_STATUS_LABELS: Record<BroadcastStatus, string> = {
  draft: "Draft",
  pending_approval: "Awaiting sign-off",
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Sent",
};

export type EmailLogEntry = {
  id: string;
  workspace_id: string;
  to_email: string;
  subject: string;
  status: "queued" | "sending" | "sent" | "failed" | "skipped_no_consent";
  error: string | null;
  queued_at: string;
  sent_at: string | null;
};
