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
