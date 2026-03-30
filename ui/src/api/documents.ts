import type { Document } from "@openblock/shared";
import { api } from "./client";

export const documentsApi = {
  list: (companyId: string, params?: { tags?: string[]; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.tags?.length) qs.set("tags", params.tags.join(","));
    if (params?.search) qs.set("search", params.search);
    const query = qs.toString();
    return api.get<Document[]>(`/companies/${companyId}/documents${query ? `?${query}` : ""}`);
  },
  get: (id: string) => api.get<Document>(`/documents/${id}`),
  create: (companyId: string, data: { title: string; content?: string; tags?: string[] }) =>
    api.post<Document>(`/companies/${companyId}/documents`, data),
  update: (id: string, data: { title?: string; content?: string; tags?: string[] }) =>
    api.patch<Document>(`/documents/${id}`, data),
  remove: (id: string) => api.delete<Document>(`/documents/${id}`),
};
