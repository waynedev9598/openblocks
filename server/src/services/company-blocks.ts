import type { Db } from "@openblock/db";
import { companyBlocks } from "@openblock/db";
import { eq, and } from "drizzle-orm";

export function companyBlocksService(db: Db) {
  return {
    async listEnabled(companyId: string) {
      const rows = await db
        .select({ blockName: companyBlocks.blockName })
        .from(companyBlocks)
        .where(eq(companyBlocks.companyId, companyId));
      return rows.map((r) => r.blockName);
    },

    async enable(companyId: string, blockName: string) {
      await db
        .insert(companyBlocks)
        .values({ companyId, blockName })
        .onConflictDoNothing();
    },

    async disable(companyId: string, blockName: string) {
      await db
        .delete(companyBlocks)
        .where(
          and(
            eq(companyBlocks.companyId, companyId),
            eq(companyBlocks.blockName, blockName),
          ),
        );
    },

    async enableAll(companyId: string, blockNames: string[]) {
      if (blockNames.length === 0) return;
      await db
        .insert(companyBlocks)
        .values(blockNames.map((blockName) => ({ companyId, blockName })))
        .onConflictDoNothing();
    },
  };
}
