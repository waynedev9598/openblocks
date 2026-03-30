import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { starterItems } from "./items.js";

export const starterEvents = pgTable("starter_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => starterItems.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  summary: text("summary"),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
