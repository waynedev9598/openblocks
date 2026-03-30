import { api } from "../../../ui/src/api/client";

function toQueryString(params?: Record<string, string | undefined>): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    (e): e is [string, string] => e[1] !== undefined && e[1] !== "",
  );
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries).toString();
}

export interface StarterItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface StarterEvent {
  id: string;
  itemId: string;
  eventType: string;
  summary: string | null;
  data: unknown;
  createdAt: string;
}

export const starterApi = {
  listItems: (params?: Record<string, string | undefined>) =>
    api.get<StarterItem[]>(`/blocks/starter/items${toQueryString(params)}`),

  getItem: (id: string) =>
    api.get<StarterItem>(`/blocks/starter/items/${encodeURIComponent(id)}`),

  createItem: (data: { name: string; description?: string; status?: string; priority?: string; category?: string }) =>
    api.post<StarterItem>("/blocks/starter/items", data),

  updateItem: (id: string, data: Partial<StarterItem>) =>
    api.patch<StarterItem>(`/blocks/starter/items/${encodeURIComponent(id)}`, data),

  deleteItem: (id: string) =>
    api.delete<StarterItem>(`/blocks/starter/items/${encodeURIComponent(id)}`),

  updateItemStatus: (id: string, status: string) =>
    api.patch<StarterItem>(`/blocks/starter/items/${encodeURIComponent(id)}/status`, { status }),

  listItemEvents: (id: string) =>
    api.get<StarterEvent[]>(`/blocks/starter/items/${encodeURIComponent(id)}/events`),

  createItemEvent: (id: string, data: { eventType: string; summary?: string }) =>
    api.post<StarterEvent>(`/blocks/starter/items/${encodeURIComponent(id)}/events`, data),

  getBoard: () =>
    api.get<Record<string, StarterItem[]>>("/blocks/starter/board"),
};
