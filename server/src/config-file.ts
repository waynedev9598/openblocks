import fs from "node:fs";
import { z } from "zod";
import { resolveOpenblockConfigPath } from "./paths.js";

const openblockConfigSchema = z.object({
  server: z.object({
    host: z.string().optional(),
    port: z.number().optional(),
    serveUi: z.boolean().optional(),
  }).default({}),
  database: z.object({
    mode: z.enum(["embedded-postgres", "postgres"]).default("embedded-postgres"),
    connectionString: z.string().optional(),
    embeddedPostgresDataDir: z.string().optional(),
    embeddedPostgresPort: z.number().optional(),
    backup: z.object({
      enabled: z.boolean().optional(),
      intervalMinutes: z.number().optional(),
      retentionDays: z.number().optional(),
      dir: z.string().optional(),
    }).optional(),
  }).default({}),
  storage: z.object({
    provider: z.string().optional(),
    localDisk: z.object({
      baseDir: z.string().optional(),
    }).optional(),
    s3: z.object({
      bucket: z.string().optional(),
      region: z.string().optional(),
      endpoint: z.string().optional(),
      prefix: z.string().optional(),
      forcePathStyle: z.boolean().optional(),
    }).optional(),
  }).optional(),
  logging: z.object({
    logDir: z.string().optional(),
  }).default({}),
});

export type OpenblockConfig = z.infer<typeof openblockConfigSchema>;

export function readConfigFile(): OpenblockConfig | null {
  const configPath = resolveOpenblockConfigPath();

  if (!fs.existsSync(configPath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return openblockConfigSchema.parse(raw);
  } catch {
    return null;
  }
}
