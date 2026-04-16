import { api } from "../../../ui/src/api/client";

function toQueryString(params?: Record<string, string | undefined>): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    (e): e is [string, string] => e[1] !== undefined && e[1] !== "",
  );
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries).toString();
}

export interface ReelItem {
  id: string;
  url: string;
  shortcode: string | null;
  transcript: string | null;
  author: string | null;
  caption: string | null;
  thumbnailUrl: string | null;
  notes: string | null;
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const reelsAnalysisApi = {
  listReels: (params?: Record<string, string | undefined>) =>
    api.get<ReelItem[]>(`/blocks/reels-analysis/reels${toQueryString(params)}`),

  getReel: (id: string) =>
    api.get<ReelItem>(`/blocks/reels-analysis/reels/${encodeURIComponent(id)}`),

  createReel: (data: { url: string; notes?: string; tags?: string[] }) =>
    api.post<ReelItem>("/blocks/reels-analysis/reels", data),

  updateReel: (id: string, data: Partial<Pick<ReelItem, "notes" | "tags" | "status">>) =>
    api.patch<ReelItem>(`/blocks/reels-analysis/reels/${encodeURIComponent(id)}`, data),

  deleteReel: (id: string) =>
    api.delete<ReelItem>(`/blocks/reels-analysis/reels/${encodeURIComponent(id)}`),
};
