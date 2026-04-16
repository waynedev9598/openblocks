import type { Db } from "@openblock/db";
import { eq, desc, ilike, and, or, sql } from "drizzle-orm";
import { reelsAnalysisReels } from "../../schema/reels.js";

const SCRAPECREATORS_URL =
  "https://api.scrapecreators.com/v2/instagram/media/transcript";
const SCRAPECREATORS_KEY = "d8l61FnXL8Qr0q6a7rUC42tYO4u1";

interface TranscriptResponse {
  success: boolean;
  transcripts: Array<{ id: string; shortcode: string; text: string | null }> | null;
}

async function fetchTranscript(instagramUrl: string): Promise<TranscriptResponse> {
  const url = new URL(SCRAPECREATORS_URL);
  url.searchParams.set("url", instagramUrl);

  const res = await fetch(url, {
    method: "GET",
    headers: { "x-api-key": SCRAPECREATORS_KEY },
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ScrapeCreators API error ${res.status}: ${body}`);
  }

  return res.json();
}

function extractShortcode(instagramUrl: string): string | null {
  const match = instagramUrl.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
  return match?.[2] ?? null;
}

export function reelsService(db: Db) {
  return {
    async list(filters?: { status?: string; tag?: string; q?: string }) {
      const conditions = [];
      if (filters?.status) {
        conditions.push(eq(reelsAnalysisReels.status, filters.status));
      }
      if (filters?.tag) {
        conditions.push(
          sql`${reelsAnalysisReels.tags} && ARRAY[${sql`${filters.tag}`}]::text[]`,
        );
      }
      if (filters?.q) {
        conditions.push(
          or(
            ilike(reelsAnalysisReels.transcript, `%${filters.q}%`),
            ilike(reelsAnalysisReels.notes, `%${filters.q}%`),
            ilike(reelsAnalysisReels.author, `%${filters.q}%`),
          ),
        );
      }
      return db
        .select()
        .from(reelsAnalysisReels)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(reelsAnalysisReels.createdAt));
    },

    async getById(id: string) {
      const rows = await db
        .select()
        .from(reelsAnalysisReels)
        .where(eq(reelsAnalysisReels.id, id));
      return rows[0] ?? null;
    },

    async create(data: { url: string; notes?: string; tags?: string[] }) {
      // Extract shortcode from URL as fallback
      const shortcodeFromUrl = extractShortcode(data.url);

      // Check for duplicate by shortcode
      if (shortcodeFromUrl) {
        const existing = await db
          .select()
          .from(reelsAnalysisReels)
          .where(eq(reelsAnalysisReels.shortcode, shortcodeFromUrl));
        if (existing.length > 0) {
          return { duplicate: true, existing: existing[0]! };
        }
      }

      // Fetch transcript from ScrapeCreators
      let transcript: string | null = null;
      let shortcode = shortcodeFromUrl;

      try {
        const result = await fetchTranscript(data.url);
        if (result.success && result.transcripts && result.transcripts.length > 0) {
          shortcode = result.transcripts[0].shortcode ?? shortcode;
          // Concatenate carousel transcripts
          const texts = result.transcripts
            .map((t) => t.text)
            .filter((t): t is string => t != null);
          transcript = texts.length > 0 ? texts.join("\n---\n") : null;
        }
      } catch {
        // Store the reel even if transcript fetch fails
      }

      const rows = await db
        .insert(reelsAnalysisReels)
        .values({
          url: data.url,
          shortcode,
          transcript,
          notes: data.notes,
          tags: data.tags ?? [],
          status: "saved",
        })
        .returning();

      return rows[0]!;
    },

    async update(
      id: string,
      data: Partial<{
        notes: string | null;
        tags: string[];
        status: string;
      }>,
    ) {
      const rows = await db
        .update(reelsAnalysisReels)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(reelsAnalysisReels.id, id))
        .returning();
      return rows[0] ?? null;
    },

    async remove(id: string) {
      const rows = await db
        .delete(reelsAnalysisReels)
        .where(eq(reelsAnalysisReels.id, id))
        .returning();
      return rows[0] ?? null;
    },
  };
}
