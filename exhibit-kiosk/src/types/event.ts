export type EventItem = {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  meta?: string | Record<string, unknown>;
  alt?: string;
};