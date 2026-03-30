# OpenBlock

OpenBlock is an open-source modular personal OS for tracking work, projects, and operations. It provides a self-hosted workspace with issue tracking, project management, goal setting, and extensible "blocks" that add domain-specific functionality -- like a custom-built Notion you fully control.

## Quick Start

```bash
pnpm install
pnpm dev
```

Opens at [http://localhost:3200](http://localhost:3200). An embedded Postgres database starts automatically -- no external DB setup required.

## Architecture

OpenBlock is a monorepo with five main areas:

```
packages/
  db/             Drizzle ORM schema, migrations, DB client
  shared/         Types, constants, validators (used by server + UI)
server/           Express API (routes, services, middleware)
ui/               React/Vite frontend (Radix + Tailwind)
blocks/           Domain-specific extensions (each block adds schema, routes, pages)
```

## Tech Stack

- **Server:** Express with TypeScript
- **UI:** React 19 + Vite
- **Database:** Embedded Postgres with Drizzle ORM
- **Styling:** Tailwind CSS + Radix UI
- **Data fetching:** TanStack Query
- **Routing:** react-router-dom

## Creating a Block

Blocks are self-contained modules that extend OpenBlock with domain-specific functionality.

1. Create a directory under `blocks/` (e.g., `blocks/myblock/`)
2. Add a `block.ts` manifest declaring the block's metadata
3. Define your schema in `blocks/myblock/schema/` (Drizzle tables)
4. Add API routes in `blocks/myblock/routes/`
5. Add UI pages in `blocks/myblock/pages/`
6. Agents live in `blocks/myblock/agents/` (see `agents/AGENTS.md` for the operating guide)

## Documentation

See [SPEC.md](./SPEC.md) for detailed architecture, conventions, and design decisions.
