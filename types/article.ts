/**
 * Article Type Definitions
 */

export interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  tags: string[];
  folder: string;
  created_at: string;
  updated_at: string;
}
