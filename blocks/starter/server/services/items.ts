import type { Db } from "@openblock/db";
import { eq, desc, ilike, and, sql } from "drizzle-orm";
import { starterItems } from "../../schema/items.js";
import { starterEvents } from "../../schema/events.js";

export function starterItemsService(db: Db) {
  return {
    async list(filters?: { status?: string; category?: string; q?: string }) {
      const conditions = [];
      if (filters?.status) {
        conditions.push(eq(starterItems.status, filters.status));
      }
      if (filters?.category) {
        conditions.push(eq(starterItems.category, filters.category));
      }
      if (filters?.q) {
        conditions.push(ilike(starterItems.name, `%${filters.q}%`));
      }
      return db
        .select()
        .from(starterItems)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(starterItems.createdAt));
    },

    async getById(id: string) {
      const rows = await db
        .select()
        .from(starterItems)
        .where(eq(starterItems.id, id));
      return rows[0] ?? null;
    },

    async create(data: {
      name: string;
      description?: string;
      status?: string;
      priority?: string;
      category?: string;
    }) {
      const rows = await db.insert(starterItems).values(data).returning();
      const item = rows[0]!;
      await db.insert(starterEvents).values({
        itemId: item.id,
        eventType: "created",
        summary: `Item "${item.name}" created`,
      });
      return item;
    },

    async update(
      id: string,
      data: Partial<{
        name: string;
        description: string | null;
        status: string;
        priority: string;
        category: string | null;
      }>,
    ) {
      const rows = await db
        .update(starterItems)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(starterItems.id, id))
        .returning();
      const item = rows[0];
      if (item) {
        const fields = Object.keys(data).join(", ");
        await db.insert(starterEvents).values({
          itemId: id,
          eventType: "updated",
          summary: `Updated: ${fields}`,
          data: data as Record<string, unknown>,
        });
      }
      return item ?? null;
    },

    async updateStatus(id: string, status: string) {
      return this.update(id, { status });
    },

    async delete(id: string) {
      const rows = await db
        .delete(starterItems)
        .where(eq(starterItems.id, id))
        .returning();
      return rows[0] ?? null;
    },

    async listEvents(itemId: string) {
      return db
        .select()
        .from(starterEvents)
        .where(eq(starterEvents.itemId, itemId))
        .orderBy(desc(starterEvents.createdAt));
    },

    async createEvent(
      itemId: string,
      data: { eventType: string; summary?: string; data?: unknown },
    ) {
      const rows = await db
        .insert(starterEvents)
        .values({ itemId, ...data })
        .returning();
      return rows[0]!;
    },

    async getBoard() {
      const items = await db
        .select()
        .from(starterItems)
        .orderBy(desc(starterItems.createdAt));
      const board: Record<string, typeof items> = {};
      for (const item of items) {
        if (!board[item.status]) board[item.status] = [];
        board[item.status].push(item);
      }
      return board;
    },
  };
}
