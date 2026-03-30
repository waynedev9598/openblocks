# Baseplate — Open Source Personal Operating System

## What is Baseplate?

A modular, self-hosted app for tracking your work, projects, and operations. Think of it as a personal Notion/Linear that you own — with a **block system** that lets you extend it like LEGO.

The core gives you: issues, projects, goals, documents, activity, dashboard — all with a polished UI. Blocks add domain-specific features on top: a CRM, a content pipeline, a habit tracker, whatever you need.

**Origin:** Extracted from a production internal tool (Mission Control). The core is battle-tested. The block system is new.

---

## Architecture Overview

```
baseplate/
  packages/
    db/             — Drizzle ORM, core schema, migrations, block schema loader
    shared/         — Types, constants, validators (core + block shared types)
  server/           — Express API (core routes + block route mounting)
  ui/               — React/Vite frontend (core pages + block page mounting)
  blocks/           — Plugin directory (each subdirectory is a block)
    starter/        — Example block (ships with baseplate, demonstrates patterns)
  agents/           — Agent definitions (optional, block-scoped)
  scripts/          — Dev tooling
```

### Tech Stack (unchanged from origin)
- **Server:** Express + TypeScript + Drizzle ORM
- **Database:** Embedded PostgreSQL (auto-managed, zero config)
- **UI:** React 19 + Vite + TanStack Query + Radix UI + Tailwind CSS
- **Editor:** MDXEditor (markdown documents)
- **Monorepo:** pnpm workspaces

---

## What to Keep (Core Platform)

### Database Tables (15 tables — keep all)
- `companies` — workspace container (rename concept to "workspace" in UI, keep table name for now)
- `issues`, `labels`, `issue_labels`, `issue_comments`, `issue_read_states`, `issue_attachments`
- `projects`, `goals`, `project_goals`
- `documents`, `assets`
- `activity_log`
- `auth_users`, `auth_sessions`, `auth_accounts`, `auth_verifications`
- `company_memberships`

### Server (keep all generic routes + services)
- `routes/`: health, companies, projects, issues, goals, activity, dashboard, assets, documents
- `services/`: companies, projects, issues, goals, activity, dashboard, documents, assets
- `middleware/`: all (httpLogger, errorHandler, auth, boardMutationGuard)
- `config.ts`, `config-file.ts`, `paths.ts`, `home-paths.ts` — update defaults (see Config section)

### UI Pages (keep all 11)
- Dashboard, Projects, ProjectDetail, Issues, IssueDetail, Goals, GoalDetail
- Activity, Inbox, DocumentsPage, DocumentEditorPage, NotFound

### UI Components (keep all 40+)
- Layout, Sidebar, SidebarSection, SidebarNavItem, SidebarProjects
- KanbanBoard, FilterBar, EntityRow, PropertiesPanel
- MarkdownEditor, MarkdownBody, CommentThread
- StatusIcon, StatusBadge, PriorityIcon, MetricCard
- CommandPalette, BreadcrumbBar, PageTabBar
- EmptyState, InlineEditor, InlineEntitySelector, DraftInput
- NewIssueDialog, NewProjectDialog, NewGoalDialog
- CompanySwitcher, CompanyRail, CompanyPatternIcon
- All `ui/` shadcn components
- PageSkeleton, CopyText, ScrollToBottom, Identity, etc.

### Shared Package
- Keep all types, constants, validators that aren't FMS-specific
- Remove FMS status enums, FMS type exports

---

## What to Remove (FMS Domain Layer)

### Database (8 schema files)
Delete from `packages/db/src/schema/`:
- `fms_brands.ts`
- `workflows.ts`
- `brand_workflow_runs.ts`
- `brand_deliverables.ts`
- `brand_events.ts`
- `brand_outreach.ts`
- `agent_runs.ts`
- `experiments.ts`

Remove their exports from `packages/db/src/schema/index.ts`.

### Server (3 files)
Delete:
- `server/src/routes/fms.ts` (889 lines)
- `server/src/services/fms.ts` (557 lines)
- `server/src/services/production-site.ts` (728 lines)
- `server/src/services/fms.test.ts` (71 lines)

Remove from `server/src/app.ts`:
- `import { fmsRoutes }` and `api.use(fmsRoutes(db, prodSite))`
- `import { productionSiteService }` and the `prodSiteConfig` / `prodSite` block
- FMS env var references (`FMS_STUDIO_URL`, `FMS_STUDIO_API_KEY`)

Remove from `server/src/routes/index.ts`:
- `export { fmsRoutes }`

Remove from `server/src/config.ts`:
- `fmsStudioUrl` and `fmsStudioApiKey` from Config interface and loadConfig()

### UI (7 files)
Delete:
- `ui/src/pages/operations/` (entire directory — 5 files, 2379 lines)
- `ui/src/components/FmsProductionStatusBadge.tsx`
- `ui/src/api/fms.ts`

Remove from `ui/src/App.tsx`:
- All FMS imports (OperationsIndex, OperationsBrands, etc.)
- All `/operations/*` Route entries (lines 123-127)

Remove from `ui/src/components/Sidebar.tsx`:
- The entire "Operations" SidebarSection (Store, Mail, Bot icons + 3 nav items)
- Remove unused icon imports (Store, Bot, Mail)

Remove from `ui/src/lib/queryKeys.ts`:
- The entire `fms: { ... }` block

### Shared Package
Search `packages/shared/` for FMS-specific exports:
- FMS status enums (`FMS_CLIENT_STATUSES`, `FMS_CLIENT_STATUS_LABELS`, `FMS_WORKFLOW_RUN_KANBAN_STATUSES`)
- FMS types (`FmsWorkflowRunStatus`, etc.)
- Remove these, keep everything generic

### Agents (entire directory contents)
Delete all 6 FMS agent directories:
- `agents/sourcer/`, `agents/generator/`, `agents/publisher/`
- `agents/outreach/`, `agents/pricer/`, `agents/analyst/`
- `agents/config/` (FMS-specific shared config)

**Keep** `agents/AGENTS.md` but rewrite it as a generic template (see Block System section).

### Environment / Config
- Remove from `.env` / `.env.example`: `FMS_STUDIO_URL`, `FMS_STUDIO_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- Keep all `PAPERCLIP_*` env vars (rename to `BASEPLATE_*` — see Renaming section)

---

## Config Changes (Port + DB Isolation)

The system uses `~/.paperclip/instances/{instance_id}/` for all data. To avoid clashing with an existing Mission Control instance:

### Option A: Different instance ID (recommended — minimal changes)
Set `BASEPLATE_INSTANCE_ID=baseplate` so data goes to `~/.baseplate/instances/baseplate/`.

### Option B: Different home dir
Set `BASEPLATE_HOME=~/.baseplate` so everything goes under `~/.baseplate/`.

### Specific changes:

**Server port:** `3100` → `3200`
- `server/src/config.ts` line 102: default port `3200`
- `ui/vite.config.ts` line 17: proxy target `http://localhost:3200`

**Embedded Postgres port:** `54329` → `54331`
- `server/src/config.ts` line 108: default `54331`

**Instance paths** (`server/src/home-paths.ts`):
- Rename `resolvePaperclipHomeDir` → `resolveBaseplateHomeDir`
- Default home: `~/.baseplate` instead of `~/.paperclip`
- Rename all `PAPERCLIP_*` env var references to `BASEPLATE_*`

**Config file lookup** (`server/src/paths.ts`):
- Look for `.baseplate/config.json` instead of `.paperclip/config.json`

**Dev runner** (`scripts/dev-runner.mjs`):
- Update `[mission-control]` log prefix to `[baseplate]`
- Update filter references from `@hsu-ltd/` to new namespace

---

## Renaming

### Package namespace: `@hsu-ltd/*` → `@baseplate/*`

Update in:
- `packages/db/package.json` → `@baseplate/db`
- `packages/shared/package.json` → `@baseplate/shared`
- `server/package.json` → `@baseplate/server`
- `ui/package.json` → `@baseplate/ui`
- Root `package.json` → `baseplate`
- All import statements referencing `@hsu-ltd/` across the codebase
- `pnpm-workspace.yaml` if it references package names
- `scripts/dev-runner.mjs` filter references

### Internal references
- `mission-control` → `baseplate` in log messages, comments, session IDs
- Search entire codebase for `mission-control`, `hsu-ltd`, `HSU`, `paperclip`, `Paperclip` and update

### Environment variables
- `PAPERCLIP_*` → `BASEPLATE_*` everywhere
- Keep backward compat during transition? No — clean break for open source.

---

## Block System Design

### What is a block?

A block is a self-contained feature module that adds domain-specific functionality to Baseplate. It can contribute:
- **Database tables** (Drizzle schema)
- **API routes** (Express router)
- **Services** (business logic)
- **UI pages** (React components)
- **UI components** (block-specific)
- **API client** (frontend fetch wrappers)
- **Sidebar navigation** (nav items)
- **Agents** (autonomous operators — optional)

### Block directory structure

```
blocks/
  {block-name}/
    block.ts              ← Manifest (required)
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
    agents/               ← Agent definitions (optional)
      AGENTS.md
      {agent-name}/
        AGENTS.md
        STRATEGY.md
        MEMORY.md
        scripts/
    README.md             ← Block documentation
```

### Block manifest (`block.ts`)

```ts
import type { BlockDefinition } from "@baseplate/shared";

export default {
  name: "starter",
  displayName: "Starter Block",
  description: "Example block demonstrating all patterns",
  version: "0.1.0",

  // Sidebar navigation items
  nav: [
    {
      section: "Starter",          // Sidebar section label
      items: [
        { label: "Items", path: "/starter/items", icon: "Blocks" },
        { label: "Board", path: "/starter/board", icon: "Kanban" },
      ],
    },
  ],

  // Route prefix for API endpoints (mounted at /api/blocks/{name}/*)
  routePrefix: "starter",
} satisfies BlockDefinition;
```

### How blocks get loaded

**Server-side (block route mounting):**

1. On startup, scan `blocks/*/block.ts` for manifests
2. For each block with a `server/routes.ts`, dynamically import and mount at `/api/blocks/{name}/*`
3. Block routes receive `(db: Db)` — same pattern as core routes
4. Block schema files are included in Drizzle config for migration generation

```ts
// In server/src/app.ts — pseudo-code for block loading
import { discoverBlocks } from "./block-loader.js";

const blocks = await discoverBlocks();
for (const block of blocks) {
  if (block.routes) {
    api.use(`/blocks/${block.name}`, block.routes(db));
  }
}
```

**Client-side (block UI mounting):**

1. At build time (or dev startup), scan `blocks/*/block.ts` for manifests
2. Collect nav items → inject into Sidebar
3. Collect page components → inject into React Router

```tsx
// In ui/src/App.tsx — pseudo-code for block pages
import { blockRoutes } from "./block-registry";

function boardRoutes() {
  return (
    <>
      {/* Core routes */}
      <Route path="dashboard" element={<Dashboard />} />
      {/* ... */}

      {/* Block routes — auto-discovered */}
      {blockRoutes.map(route => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}
    </>
  );
}
```

**Database (block schema):**

Block schema files live in `blocks/{name}/schema/*.ts` and follow the same Drizzle patterns as core schema. The Drizzle config includes both `packages/db/src/schema/*` and `blocks/*/schema/*`.

All block tables should use a consistent prefix: `{block_name}_` (e.g., `starter_items`).

```ts
// blocks/starter/schema/items.ts
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const starterItems = pgTable("starter_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Note: block tables do NOT have `companyId` — Baseplate is single-user. The existing core tables keep `companyId` for now (it acts as a workspace separator) but new block tables don't need it.

### Block discovery implementation

Create these new files:

**`server/src/block-loader.ts`** — scans `blocks/` directory, validates manifests, returns block metadata + lazy route importers.

**`ui/src/block-registry.ts`** — scans block manifests at build time (via Vite plugin or static import map), exports nav items + route components.

**`packages/shared/src/block-types.ts`** — shared `BlockDefinition` type used by manifests.

The loader should be convention-based and simple. No complex plugin API, no lifecycle hooks, no dependency resolution. Just: discover → validate manifest → mount routes/pages/nav. Evolve later as real blocks get built.

---

## Starter Block

The starter block ships with Baseplate as a working example. It demonstrates:

1. **List page** — table with filtering and search (pattern from Brands list)
2. **Detail page** — tabbed view with properties panel (pattern from BrandDetail)
3. **Board page** — kanban view with drag-and-drop (pattern from Workflow Board)
4. **Events/activity** — timeline of actions (pattern from Brand Events)
5. **API routes** — CRUD endpoints
6. **Schema** — simple tables showing the patterns

It uses simple, generic domain language (Items, Boards, Events) rather than any business-specific terminology. The code should be **readable as a tutorial** — someone building their first block should be able to copy the starter and modify it.

### Starter block schema

```
starter_items      — Simple entity with name, status, description
starter_events     — Activity log for items
```

### Starter block pages

| Page | Route | What it demonstrates |
|------|-------|---------------------|
| Items | `/starter/items` | List view with filters, search, status badges |
| Item Detail | `/starter/items/:id` | Tabbed detail (Overview, Events), properties panel |
| Board | `/starter/board` | Kanban board with status columns |

### Preserving FMS UI patterns

The starter block pages should be **simplified rewrites** of the FMS operations pages, preserving the UI patterns but with generic data:

- `Brands.tsx` (468 lines) → `Items.tsx` (~200 lines) — list + filters + search
- `BrandDetail.tsx` (1291 lines) → `ItemDetail.tsx` (~400 lines) — tabs + properties + events
- `Brands.tsx` kanban tab → `Board.tsx` (~150 lines) — kanban view
- `AgentRuns.tsx` (264 lines) — don't port, agents are optional
- `Outreach.tsx` (356 lines) — don't port, too domain-specific

The goal is to keep the **UI patterns** (how to use KanbanBoard, FilterBar, PropertiesPanel, StatusBadge, etc.) accessible without the FMS business logic.

---

## Agents (Generic Template)

Rewrite `agents/AGENTS.md` as a generic agent operating guide:

- Strip all FMS references (brand pipeline, Space64, fashion, etc.)
- Keep the operating principles: self-improvement, file ownership, when to act vs raise issues
- Keep the structure: AGENTS.md (role), STRATEGY.md (playbook), MEMORY.md (learnings)
- Update API references to use `http://localhost:3200/api`
- Update the cross-agent table to be a template, not FMS-specific
- Agents are block-scoped: a block's agents live in `blocks/{name}/agents/`

---

## CLAUDE.md

Rewrite `CLAUDE.md` for Baseplate:
- Project description: "Baseplate — open source modular personal OS"
- Remove all FMS business context (brands, pipeline, revenue targets)
- Remove hardcoded company ID
- Update port references (3100 → 3200)
- Update package namespace (@hsu-ltd → @baseplate)
- Document the block system (how to add a block)
- Keep dev workflow, DB patterns, API patterns, UI patterns
- Remove FMS API routes table, add block route pattern
- Remove FMS DB tables, add block schema pattern

---

## Implementation Order

### Phase 1: Strip + Rename (do first, get to clean compile)
1. Delete all FMS files listed above
2. Remove FMS imports/references from app.ts, routes/index.ts, Sidebar, App.tsx, queryKeys, config
3. Remove FMS types from `packages/shared/`
4. Rename `@hsu-ltd/*` → `@baseplate/*` across all package.json + imports
5. Rename `PAPERCLIP_*` → `BASEPLATE_*` env vars + path functions
6. Update ports (3100→3200, 54329→54331)
7. Update home dir (~/.paperclip → ~/.baseplate)
8. **Verify:** `pnpm install && pnpm typecheck && pnpm build` — must pass clean

### Phase 2: Block System (build the loader)
1. Define `BlockDefinition` type in `@baseplate/shared`
2. Build `server/src/block-loader.ts` — discover + mount block routes
3. Build `ui/src/block-registry.ts` — discover + mount block pages/nav
4. Update Drizzle config to include `blocks/*/schema/*.ts`
5. Update `server/src/app.ts` to call block loader
6. Update `ui/src/App.tsx` and `Sidebar.tsx` to render block routes/nav
7. **Verify:** core still works with zero blocks installed

### Phase 3: Starter Block (prove the pattern)
1. Create `blocks/starter/block.ts` manifest
2. Create `blocks/starter/schema/` — items + events tables
3. Create `blocks/starter/server/routes.ts` + services
4. Create `blocks/starter/ui/pages/` — Items, ItemDetail, Board
5. Create `blocks/starter/ui/api.ts`
6. Run `pnpm db:generate && pnpm db:migrate`
7. **Verify:** starter block pages render, CRUD works, kanban works

### Phase 4: Polish
1. Rewrite CLAUDE.md
2. Rewrite agents/AGENTS.md as generic template
3. Clean up any remaining mission-control / hsu-ltd / paperclip references
4. Init fresh git repo: `rm -rf .git && git init && git add -A && git commit -m "Initial commit"`
5. Write a README.md for the open source project

---

## Key Design Decisions

### Single-user, no multi-tenant
- The `companies` table stays (it's deeply wired as workspace container) but the UI treats it as "workspaces"
- New block tables don't need `companyId` — Baseplate is personal
- Eventually can simplify to remove the company abstraction entirely, but that's a bigger refactor

### Convention over configuration
- Blocks are discovered by directory structure, not registered in a config file
- File naming conventions replace explicit wiring
- No plugin lifecycle hooks, no dependency injection — just mount and go

### Blocks are local-first
- Blocks live in the repo, not installed from a registry
- To add someone else's block: copy their block directory into `blocks/`
- A package registry can come later if there's demand

### Keep the Paperclip infrastructure
- Embedded Postgres management, backup system, storage abstraction — this is good infra
- Just rename the env vars and paths, don't rewrite the plumbing

---

## File Inventory (what exists after Phase 1)

```
baseplate/
  packages/
    db/src/schema/          — 15 core table files + index.ts
    db/src/migrations/      — existing migrations (will need new baseline)
    shared/src/             — core types, validators (FMS types removed)
  server/src/
    routes/                 — 9 route files (health, companies, projects, issues, goals, activity, dashboard, assets, documents)
    services/               — 7 service files (matching routes)
    middleware/              — auth, httpLogger, errorHandler, boardMutationGuard
    config.ts               — updated ports + removed FMS config
    home-paths.ts           — updated to ~/.baseplate
    app.ts                  — clean, no FMS imports
    block-loader.ts         — NEW (Phase 2)
  ui/src/
    pages/                  — 11 page files (no operations/ directory)
    components/             — 40+ components (no FmsProductionStatusBadge)
    api/                    — 9 API client files (no fms.ts)
    lib/queryKeys.ts        — clean, no fms block
    App.tsx                 — clean, no operations routes
    block-registry.ts       — NEW (Phase 2)
  blocks/
    starter/                — NEW (Phase 3)
  agents/
    AGENTS.md               — rewritten generic template
  scripts/
    dev-runner.mjs          — updated namespace + log prefix
  CLAUDE.md                 — rewritten for Baseplate
  SPEC.md                   — this file
  package.json              — name: "baseplate"
```
