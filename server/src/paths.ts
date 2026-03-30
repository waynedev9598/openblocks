import fs from "node:fs";
import path from "node:path";
import { resolveDefaultConfigPath } from "./home-paths.js";

const OPENBLOCK_CONFIG_BASENAME = "config.json";
const OPENBLOCK_ENV_FILENAME = ".env";

function findConfigFileFromAncestors(startDir: string): string | null {
  const absoluteStartDir = path.resolve(startDir);
  let currentDir = absoluteStartDir;

  while (true) {
    const candidate = path.resolve(currentDir, ".openblock", OPENBLOCK_CONFIG_BASENAME);
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const nextDir = path.resolve(currentDir, "..");
    if (nextDir === currentDir) break;
    currentDir = nextDir;
  }

  return null;
}

export function resolveOpenblockConfigPath(overridePath?: string): string {
  if (overridePath) return path.resolve(overridePath);
  if (process.env.OPENBLOCK_CONFIG) return path.resolve(process.env.OPENBLOCK_CONFIG);
  return findConfigFileFromAncestors(process.cwd()) ?? resolveDefaultConfigPath();
}

export function resolveOpenblockEnvPath(overrideConfigPath?: string): string {
  return path.resolve(path.dirname(resolveOpenblockConfigPath(overrideConfigPath)), OPENBLOCK_ENV_FILENAME);
}
