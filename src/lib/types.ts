// データベース行の型（kikou スキーマ）

export type Role = "author" | "editor";

export interface Profile {
  id: string;
  display_name: string;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  owner_id: string;
  archived: boolean;
  created_at: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: Role;
  created_at: string;
}

export interface Chapter {
  id: string;
  project_id: string;
  title: string;
  sort_order: number;
  created_at: string;
}

export interface Position {
  id: string;
  chapter_id: string;
  title: string;
  sfen: string;
  side_to_move: string;
  kifu_jkf: unknown | null;
  description: string;
  sort_order: number;
  updated_at: string;
  created_at: string;
}

export interface Comment {
  id: string;
  position_id: string;
  parent_id: string | null;
  author_id: string;
  body: string;
  resolved: boolean;
  created_at: string;
}

export interface Attachment {
  id: string;
  position_id: string;
  storage_path: string;
  caption: string;
  uploaded_by: string;
  created_at: string;
}
