# Mission Control

This file is the repo-level instructions file for AGENTS-aware tools such as Codex.

## Read Order

1. Read `CLAUDE.md` for the long-form project, business, and architecture context.
2. If you are working in `agents/`, also read `agents/AGENTS.md` and the relevant nested `agents/*/AGENTS.md`.
3. If the task maps to an existing workflow, prefer the reusable skill docs:
   - Claude-native skills live in `.claude/skills/`
   - Codex-native wrapper skills live in `.agents/skills/`

## Important Compatibility Rules

- Do not move, rename, or rewrite `.claude/skills/` unless explicitly asked. Claude Code slash-command behavior in this repo depends on that path.
- `.agents/skills/` contains Codex-native wrappers that point back to the canonical repo workflows.
- Keep Claude and Codex instructions additive: `CLAUDE.md` remains the long-form project memory, while `AGENTS.md` files provide Codex-compatible scoped guidance.

## Working Norms

- Use the existing monorepo commands:
  - `pnpm dev`
  - `pnpm build`
  - `pnpm typecheck`
  - `pnpm test:run`
  - `pnpm db:generate`
  - `pnpm db:migrate`
- Server runs on `http://localhost:3100`.
- Embedded Postgres runs on port `54329`.
- Never reset or delete the embedded database.

## Agency Structure

- Shared agent operating system: `agents/AGENTS.md`
- Per-agent scoped instructions: `agents/<slug>/AGENTS.md`
- Shared Claude skill sources: `.claude/skills/`
- Codex skill wrappers: `.agents/skills/`
