import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { BlockDefinition, BlockNavSection } from "@openblock/shared";

// Eagerly import all block manifests
const manifestModules = import.meta.glob<{ default: BlockDefinition }>(
  "../../blocks/*/block.ts",
  { eager: true },
);

// Lazily import all block page components
const pageModules = import.meta.glob<{ default: ComponentType }>(
  "../../blocks/*/ui/pages/*.tsx",
);

export interface BlockRoute {
  path: string;
  element: LazyExoticComponent<ComponentType>;
  blockName: string;
}

export interface BlockRegistryEntry {
  definition: BlockDefinition;
  nav: BlockNavSection[];
  routes: BlockRoute[];
}

function loadBlockRegistry(): BlockRegistryEntry[] {
  const entries: BlockRegistryEntry[] = [];

  for (const [manifestPath, mod] of Object.entries(manifestModules)) {
    const definition = mod.default;
    const blockDirMatch = manifestPath.match(
      /\.\.\/\.\.\/blocks\/([^/]+)\/block\.ts$/,
    );
    if (!blockDirMatch) continue;
    const blockDirName = blockDirMatch[1];

    // Collect all nav paths for route matching
    const navPaths = new Set<string>();
    for (const section of definition.nav) {
      for (const item of section.items) {
        navPaths.add(item.path.replace(/^\//, ""));
      }
    }

    // Find page components for this block
    const routes: BlockRoute[] = [];
    for (const [pagePath, pageLoader] of Object.entries(pageModules)) {
      if (!pagePath.includes(`/blocks/${blockDirName}/`)) continue;
      const pageNameMatch = pagePath.match(/\/pages\/([^/]+)\.tsx$/);
      if (!pageNameMatch) continue;

      const pageName = pageNameMatch[1];
      const element = lazy(
        pageLoader as () => Promise<{ default: ComponentType }>,
      );

      // Convention: Items.tsx -> starter/items, ItemDetail.tsx -> starter/items/:id
      const lowerName = pageName.toLowerCase();
      let routePath: string;
      if (lowerName.endsWith("detail")) {
        // e.g. ItemDetail -> starter/items/:id
        const baseName = lowerName.replace(/detail$/, "");
        routePath = `${definition.routePrefix}/${baseName}s/:id`;
      } else {
        routePath = `${definition.routePrefix}/${lowerName}`;
      }

      routes.push({ path: routePath, element, blockName: definition.name });
    }

    entries.push({ definition, nav: definition.nav, routes });
  }

  return entries;
}

// Singleton
let _registry: BlockRegistryEntry[] | null = null;
export function getBlockRegistry(): BlockRegistryEntry[] {
  if (!_registry) _registry = loadBlockRegistry();
  return _registry;
}
