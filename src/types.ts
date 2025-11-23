export interface Person {
  id: number;
  name: string;
  relationship_type: string;
  notes?: string;
  photo_uri?: string;
  archived?: number;
  is_favorite?: number;
  cloud_id?: string;
  created_at: string;
  updated_at?: string;
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
  note?: string;
  timestamp: string;
}