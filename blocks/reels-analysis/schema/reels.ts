import { pgTable, uuid, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const reelsAnalysisReels = pgTable(
  "reels_analysis_reels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull(),
    shortcode: text("shortcode"),
    transcript: text("transcript"),
    author: text("author"),
    caption: text("caption"),
    thumbnailUrl: text("thumbnail_url"),
    notes: text("notes"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    status: text("status").notNull().default("saved"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    shortcodeIdx: uniqueIndex("reels_analysis_reels_shortcode_idx").on(table.shortcode),
    tagsIdx: index("reels_analysis_reels_tags_idx").using("gin", table.tags),
    statusIdx: index("reels_analysis_reels_status_idx").on(table.status),
  }),
);
