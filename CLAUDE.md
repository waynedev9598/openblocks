# OpenBlock — Open Source Modular Personal OS

## What This Is

A modular, self-hosted app for tracking your work, projects, and operations. Think of it as a personal Notion/Linear that you own — with a **block system** that lets you extend it with domain-specific features.

The core gives you: issues, projects, goals, documents, activity, dashboard. Blocks add anything on top: a CRM, a content pipeline, a habit tracker, whatever you need.

## Dev Workflow

```bash
pnpm dev              # Server (tsx watch) + UI (vite) — hot reload
pnpm build            # Full build
pnpm typecheck        # Type checking across all packages
pnpm test:run         # Vitest
pnpm db:generate      # Drizzle: compile + generate migration SQL
pnpm db:migrate       # Apply migrations to embedded Postgres
```

Server runs on **http://localhost:3200**. Auth is `local_trusted` (no login needed).

## Monorepo Structure

```
packages/
  db/           — Drizzle ORM schema, migrations, DB client
  shared/       — Types, constants, validators (used by server + UI)
server/         — Express API (routes, services, middleware)
ui/             — React/Vite frontend (Radix + Tailwind)
blocks/         — Plugin directory (each subdirectory is a block)
  starter/      — Example block (ships with OpenBlock, demonstrates patterns)
scripts/        — dev-runner.mjs, backup-db.sh
```

## Database

Embedded Postgres on port **54331**. Data at `~/.openblock/instances/default/db/`.

Connection: `postgres://openblock:openblock@127.0.0.1:54331/openblock`

Auto-starts with `pnpm dev`.

### How to Add a New Table

1. Create `packages/db/src/schema/my_table.ts`:
```ts
import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const myTable = pgTable(
  "my_table",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("my_table_company_idx").on(table.companyId),
  }),
);
```

2. Export from `packages/db/src/schema/index.ts`.

3. Generate + apply migration:
```bash
pnpm db:generate
pnpm db:migrate
```

### Schema Patterns
- UUID primary keys
- Multi-tenant via `companyId` (core tables) — block tables can omit this
- snake_case in DB, camelCase in TypeScript
- Timestamps with timezone

## API

### How to Add a New Endpoint

1. **Service** (`server/src/services/my-service.ts`):
```ts
import type { Db } from "@openblock/db";
import { myTable } from "@openblock/db";
import { eq } from "drizzle-orm";

export function myService(db: Db) {
  return {
    async list(companyId: string) {
      return db.select().from(myTable).where(eq(myTable.companyId, companyId));
    },
  };
}
```

2. **Route** (`server/src/routes/my-route.ts`):
```ts
import { Router } from "express";
import type { Db } from "@openblock/db";
import { myService } from "../services/my-service.js";

export function myRoutes(db: Db) {
  const router = Router();
  const svc = myService(db);

  router.get("/companies/:companyId/my-things", async (req, res) => {
    const items = await svc.list(req.params.companyId);
    res.json(items);
  });

  return router;
}
```

3. **Mount** in `server/src/routes/index.ts` and `server/src/app.ts`.

4. **Test with curl**:
```bash
curl http://localhost:3200/api/companies/$CID/my-things | python3 -m json.tool
```

### Core API Routes

| Route | Purpose |
|-------|---------|
| `/api/health` | Health check |
| `/api/companies` | Company/workspace CRUD |
| `/api/companies/:id/issues` | Issue tracking |
| `/api/companies/:id/projects` | Projects |
| `/api/companies/:id/goals` | Goals |
| `/api/companies/:id/activity` | Activity log |
| `/api/companies/:id/dashboard` | Dashboard metrics |
| `/api/companies/:id/assets` | File uploads |
| `/api/companies/:id/documents` | Markdown documents (CRUD + tag filter + search) |
| `/api/blocks/{block}/*` | Block-specific routes (auto-mounted) |

Auth: `local_trusted` mode — no auth headers needed.

## UI

### How to Add a New Page

1. Create `ui/src/pages/MyPage.tsx`
2. Add route in `ui/src/App.tsx` inside `boardRoutes()`
3. Add nav item in `ui/src/components/Sidebar.tsx`
4. API client in `ui/src/api/my-api.ts`
5. Query keys in `ui/src/lib/queryKeys.ts`

### Tech Stack
- React 19 + Vite
- TanStack Query (data fetching)
- Radix UI + Tailwind CSS (components)
- react-router-dom (routing)
- `@` alias maps to `ui/src/`

## Block System

Blocks are self-contained feature modules that extend OpenBlock. A block can contribute database tables, API routes, UI pages, and sidebar navigation.

### Block Directory Structure

```
blocks/
  {block-name}/
    block.ts              ← Manifest (required)
    package.json          ← Block dependencies
    schema/               ← Drizzle table definitions
      *.ts
    server/
      routes.ts           ← Express router
      services/           ← Business logic
        *.ts
    ui/
      pages/              ← React page components
        *.tsx
      components/         ← Block-specific components
        *.tsx
      api.ts              ← API client functions
```

### Block Manifest (`block.ts`)

```ts
import type { BlockDefinition } from "@openblock/shared";

export default {
  name: "starter",
  displayName: "Starter Block",
  description: "Example block demonstrating all patterns",
  version: "0.1.0",
  nav: [
    {
      section: "Starter",
      items: [
        { label: "Items", path: "/starter/items", icon: "List" },
        { label: "Board", path: "/starter/board", icon: "Kanban" },
      ],
    },
  ],
  routePrefix: "starter",
} satisfies BlockDefinition;
```

### How Blocks Get Loaded

**Server-side:** On startup, `server/src/block-loader.ts` scans `blocks/*/block.ts` for manifests. Each block with a `server/routes.ts` gets mounted at `/api/blocks/{name}/*`. Block routes receive `(db: Db)` — same pattern as core routes.

**Client-side:** `ui/src/block-registry.ts` uses Vite's `import.meta.glob` to discover block manifests at build time. Nav items are injected into the Sidebar, page components into React Router.

**Database:** Block schema files in `blocks/{name}/schema/*.ts` follow the same Drizzle patterns as core schema. All block tables should use a `{block_name}_` prefix (e.g., `starter_items`).

### How to Add a Block

1. Create `blocks/my-block/block.ts` with the manifest.
2. Add schema files in `blocks/my-block/schema/`.
3. Add server routes in `blocks/my-block/server/routes.ts`.
4. Add UI pages in `blocks/my-block/ui/pages/`.
5. Add API client in `blocks/my-block/ui/api.ts`.
6. Run `pnpm db:generate && pnpm db:migrate` if adding tables.
7. Restart dev server — the block is auto-discovered.

### Page Naming Conventions

The block registry uses file names to derive routes:
- `Items.tsx` maps to `/{routePrefix}/items`
- `ItemDetail.tsx` maps to `/{routePrefix}/items/:id`
- `Board.tsx` maps to `/{routePrefix}/board`

### Starter Block (Example)

The `blocks/starter/` block ships with OpenBlock as a working reference. It demonstrates:

| Page | Route | Pattern |
|------|-------|---------|
| Items | `/starter/items` | List view with filters and search |
| Item Detail | `/starter/items/:id` | Tabbed detail with properties panel |
| Board | `/starter/board` | Kanban board with drag-and-drop |

Schema tables: `starter_items`, `starter_events`.

## Issue Tracking

Issues work as a lightweight kanban/task tracker:
- Status: backlog, todo, in_progress, in_review, done, blocked, cancelled
- Priority: critical, high, medium, low
- Scoped to projects and goals

```bash
# List issues
curl -s "http://localhost:3200/api/companies/$CID/issues" | python3 -m json.tool

# Create issue
curl -s -X POST "http://localhost:3200/api/companies/$CID/issues" \
  -H "Content-Type: application/json" \
  -d '{"title":"My task","status":"todo","priority":"medium"}'
```
