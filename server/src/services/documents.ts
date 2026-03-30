import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { Db } from "@openblock/db";
import { documents } from "@openblock/db";

export interface DocumentFilters {
  tags?: string[];
  search?: string;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function documentService(db: Db) {
  return {
    list: async (companyId: string, filters?: DocumentFilters) => {
      const conditions = [eq(documents.companyId, companyId)];

      if (filters?.tags && filters.tags.length > 0) {
        // ANY match: document has at least one of the requested tags (parameterized)
        conditions.push(sql`${documents.tags} && ARRAY[${sql.join(filters.tags.map((t) => sql`${t}`), sql`, `)}]::text[]`);
      }

      if (filters?.search) {
        const term = `%${escapeLikePattern(filters.search)}%`;
        conditions.push(or(ilike(documents.title, term), ilike(documents.content, term))!);
      }

      return db
        .select({
          id: documents.id,
          companyId: documents.companyId,
          title: documents.title,
          tags: documents.tags,
          createdAt: documents.createdAt,
          updatedAt: documents.updatedAt,
        })
        .from(documents)
        .where(and(...conditions))
        .orderBy(desc(documents.updatedAt));
    },

    getById: (id: string) =>
      db
        .select()
        .from(documents)
        .where(eq(documents.id, id))
        .then((rows) => rows[0] ?? null),

    create: (companyId: string, data: { title: string; content?: string; tags?: string[] }) =>
      db
        .insert(documents)
        .values({
          companyId,
          title: data.title,
          content: data.content ?? "",
          tags: data.tags ?? [],
        })
        .returning()
        .then((rows) => rows[0]),

    update: (id: string, data: { title?: string; content?: string; tags?: string[] }) =>
      db
        .update(documents)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(documents.id, id))
        .returning()
        .then((rows) => rows[0] ?? null),

    remove: (id: string) =>
      db
        .delete(documents)
        .where(eq(documents.id, id))
        .returning()
        .then((rows) => rows[0] ?? null),
  };
}
