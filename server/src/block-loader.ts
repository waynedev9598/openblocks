import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { BlockDefinition } from "@openblock/shared";
import type { Db } from "@openblock/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOCKS_DIR = path.resolve(__dirname, "../../blocks");

export interface LoadedBlock {
  definition: BlockDefinition;
  routes?: (db: Db) => Router;
}

export async function discoverBlocks(): Promise<LoadedBlock[]> {
  if (!fs.existsSync(BLOCKS_DIR)) return [];

  const entries = fs.readdirSync(BLOCKS_DIR, { withFileTypes: true });
  const blocks: LoadedBlock[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const blockDir = path.join(BLOCKS_DIR, entry.name);

    // Look for manifest: block.ts or block.js
    const manifestCandidates = [
      path.join(blockDir, "block.js"),
      path.join(blockDir, "block.ts"),
    ];
    const manifestPath = manifestCandidates.find((p) => fs.existsSync(p));
    if (!manifestPath) continue;

    const manifest = await import(pathToFileURL(manifestPath).href);
    const definition: BlockDefinition = manifest.default;

    // Look for server routes
    const routeCandidates = [
      path.join(blockDir, "server", "routes.js"),
      path.join(blockDir, "server", "routes.ts"),
    ];
    const routesPath = routeCandidates.find((p) => fs.existsSync(p));

    let routes: ((db: Db) => Router) | undefined;
    if (routesPath) {
      const routesModule = await import(pathToFileURL(routesPath).href);
      routes = routesModule.default ?? routesModule.routes;
    }

    blocks.push({ definition, routes });
  }

  return blocks;
}
