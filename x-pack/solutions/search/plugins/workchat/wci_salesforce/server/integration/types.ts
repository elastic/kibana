export interface SupportCase {
  id?: string;
  title?: string;
  content?: string;
  content_semantic?: string;
  url?: string;
  object_type?: string;
  owner?: {
    name?: string;
    emailaddress?: string;
  };
  created_at?: string | Date;
  updated_at?: string | Date;
  metadata?: {
    case_number?: string;
    priority?: string;
    status?: string;
    closed?: boolean;
    deleted?: boolean;
  };
  comments?: Array<{
    id?: string;
    author?: {
      email?: string;
      name?: string;
    };
    content?: {
      text?: string;
    };
    created_at?: string | Date;
    updated_at?: string | Date;
  }>;
}
