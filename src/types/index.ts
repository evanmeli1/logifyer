export interface Person {
  id: number;
  name: string;
  photo_uri: string | null;
  relationship_type: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  emoji: string;
  default_points: number;
  is_positive: number;
  is_custom: number;
}

export interface Incident {
  id: number;
  person_id: number;
  category_id: number;
  points: number;
  is_major: number;
  note: string | null;
  timestamp: string;
}