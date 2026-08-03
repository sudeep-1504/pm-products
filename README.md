# Backlog Prioritisation Tool

Ingests a backlog from CSV/XLSX, extracts scoring signals with Claude, projects them
through a prioritisation framework, and produces a single explainable ranked list with
a human review gate before anything is committed. See the PRD for full scope.

This covers **Phases 1-3** of the phasing plan:

- **Phase 1 — core loop.** Product context setup, import, AI signal extraction grounded
  in that context, review gate (gaps + low-confidence), ranked output, explainability,
  export.
- **Phase 2 — frameworks.** RICE, ICE, WSJF, Value vs Effort, CD3, MoSCoW, and
  configurable Weighted Scoring, all reading the same signal layer. Framework is a
  per-backlog choice (import wizard, or "switch" on the review screen — signals are
  reused, only the projection recomputes).
- **Phase 3 — org rules engine.** Override / floor-cap / boost-penalty rules, a rule
  builder UI, precedence-ordered application as a post-scoring pass, and an audit log
  surfaced in the explainability drawer.

Phase 4 (multi-backlog run comparison) is not in this pass.

## Stack

- Next.js (App Router) + Tailwind v4, hand-rolled shadcn/ui-style primitives (Radix UI)
- Prisma ORM against Supabase Postgres via `@prisma/adapter-pg` (`pg` driver).
- AI provider abstraction (`src/lib/ai`) — Claude via `@anthropic-ai/sdk` is the only
  provider wired up (matches the PRD's v1 scope), behind an interface that keeps the
  extraction prompt/JSON schema stable across models/providers.
- SheetJS (`xlsx`) for CSV/XLSX parsing, server-side only.

## Design system

Rounded corners (radius scale in `globals.css`), soft tinted shadows instead of hard
borders, and a `motion`-powered transition layer on every interactive primitive
(`src/components/ui/`) — hover/active states, smooth open/close on dialogs, sheets,
selects, and dropdowns. `magicui.design` itself is unreachable from this sandbox's
network allowlist, so the four Magic UI components in use (`src/components/magicui/`)
are hand-built from the well-known open patterns rather than pulled from their
registry: `NumberTicker` (spring count-up, used for scores/ranks), `BorderBeam`
(a light trail around a container's perimeter, used sparingly — e.g. a committed score
run), `ShimmerButton` (continuous light sweep, reserved for the single primary action
per screen), and `BlurFade` (staggered fade+blur+y-offset entrance for lists/cards).

## Database: Supabase Postgres

Project: `pm-products-backlog-prioritisation` (ref `iirbnjkzpzuuofydvhgm`, `ap-south-1`).
Schema is applied — 10 tables from `prisma/schema.prisma`, matching the PRD's Section 13
data model.

Set `DATABASE_URL` (see `.env.example`) to the **Transaction pooler** connection string
with `?pgbouncer=true` appended — required for serverless (Vercel functions, and this
avoids Postgres connection-limit exhaustion under autoscaling):

```
postgresql://postgres.iirbnjkzpzuuofydvhgm:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

Get the password from Supabase Dashboard → this project → Project Settings → Database →
Connect → "Transaction pooler" (or reset the DB password there if you don't have it).
**Set this same value as `DATABASE_URL` in the Vercel project's environment variables** —
that step has to happen in Vercel's dashboard; nothing in this repo can do it for you.

**Row Level Security is off on all 10 tables.** This is safe *only* because the app
connects as the `postgres` role (via the Prisma connection string), which bypasses RLS —
the app never uses `supabase-js` or the anon/publishable key. With RLS off, though,
Supabase's auto-generated REST/GraphQL API exposes every row to anyone holding the
project's anon key. Recommended fix (not yet applied — a schema-security change like
this should be a deliberate call, not something done in passing):

```sql
ALTER TABLE public."ProductContext" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AppConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Backlog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TaskSignal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FrameworkConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrgRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ScoreRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TaskScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuditEvent" ENABLE ROW LEVEL SECURITY;
```

Enabling RLS with no policies blocks the anon/authenticated PostgREST roles entirely
(they have no legitimate reason to touch this data) while leaving Prisma's connection
fully unaffected.

### Schema changes going forward

This was built in a sandbox whose network egress is allowlisted and does **not**
include arbitrary Supabase project hostnames — only the Supabase MCP tools (a separate
path) could reach the database from here. Practical effect: `prisma migrate dev` (which
needs a live DB connection to diff/apply) doesn't work from this environment. The
migration in `prisma/migrations/` was instead generated locally with
`prisma migrate diff --from-empty --to-schema` (no DB connection required) and applied
via the Supabase MCP `apply_migration` tool. From a normal machine or CI runner with
unrestricted network access, `prisma migrate dev` / `prisma migrate deploy` work exactly
as usual against `DATABASE_URL`.

## Getting started

```bash
npm install
npx prisma generate   # postinstall also does this
npm run dev
```

Open http://localhost:3000. Set up Product Context first (extraction quality depends on
it), then create a backlog — `samples/sample-backlog.csv` is a small ready-made file to
try the flow with.

**Not verified from this build session:** the golden path (import → extract → score →
commit → export) against the live Supabase DB, because this sandbox can't reach it
(see above). It was fully verified earlier against SQLite with identical application
code — only the datasource/adapter changed — but re-confirming against the real
Postgres instance (locally, or via a Vercel deploy) is the one remaining check.

### Running extraction against real Claude

Set `ANTHROPIC_API_KEY` as a **server-side environment variable** (never enter it in the
UI — the Settings screen only picks which model to use, per the PRD's explicit
server-side-secret carve-out):

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Without it, extraction runs against a deterministic mock provider (`src/lib/ai/mock-provider.ts`)
so the full pipeline — import, extraction, review, scoring, commit, export — is
exercisable end to end without a live model call. The Settings screen shows which mode
is active.

## Project layout

- `src/lib/domain/signals.ts` — the fixed signal vocabulary (reach, value, impact,
  effort, confidence, urgency, risk, category), source precedence (human > CSV > AI),
  gap/low-confidence rules.
- `src/lib/domain/frameworks/` — `Framework` interface + RICE, ICE, WSJF, CD3, Value vs
  Effort, MoSCoW, Weighted Scoring. Add a framework by adding a file here and
  registering it in `index.ts`; it reads whatever subset of the signal layer it needs.
  Weighted Scoring is the one framework whose required signals depend on stored config
  (`getRequiredSignals`) rather than being fixed.
- `src/lib/domain/org-rules.ts` — condition matching (category/keyword) and precedence
  (override > floor/cap > boost/penalty > base score) for the rules engine.
- `src/lib/ai/` — provider abstraction (`AIProvider.extractBatch`), Claude implementation
  using tool-use for structured output, mock provider for offline dev/testing.
- `prisma/schema.prisma` — full data model from the PRD's Section 13 sketch.
- `src/app/api/` — Route Handlers for import, extraction, scoring, org rules CRUD,
  framework config, commit, export.
- Pages: Import wizard, Review screen (virtualised table, framework switcher), Ranked
  list + explainability drawer (with recompute-against-current-rules), Org Rules
  builder, Framework Config (Weighted Scoring criteria/weights), Product Context,
  Settings.

## Judgment calls filling spec gaps

The PRD leaves a few framework details implicit; these are documented, deliberate
choices rather than oversights:

- **ICE's "ease" signal** isn't in the fixed signal vocabulary — it's derived from
  effort (`ease = clamp(11 - min(effort, 10), 1, 10)`) since frameworks project the
  existing signal layer rather than adding fields to it.
- **MoSCoW's band** (Must/Should/Could/Won't) is derived from `value + urgency + risk`
  against fixed absolute thresholds, not batch-relative percentiles — every framework's
  `compute()` is a pure per-task function with no visibility into the rest of the run's
  tasks, so an adaptive/relative banding would require breaking that invariant.
- **Weighted Scoring's normalisation** uses fixed assumed ranges per signal (linear for
  bounded signals like value/impact/confidence, log-scale for unbounded ones like
  reach/effort) rather than batch-relative min/max, for the same pure-per-task reason.
  Criteria are also restricted to the fixed signal vocabulary — no arbitrary raw CSV
  column as a criterion input yet.
- **Org rule conditions** support `category` (equals/contains) and `keyword` (contains
  across title + description + category) — there's no separate `tag` field on `Task` in
  this pass, so PRD §8's "tag" condition type isn't separately implemented.

## Known trade-offs in this pass

- The `xlsx` (SheetJS) package on npm carries open prototype-pollution/ReDoS advisories
  with no fixed release on the registry; the sandbox this was built in blocks pulling the
  patched build from SheetJS's own CDN. Mitigated with file size/row caps and disabling
  formula/VBA parsing in `src/lib/domain/file-parse.ts` — swap in the patched CDN build
  when deploying somewhere with broader network access.
- Column-mapping "AI suggestion" is a deterministic header-synonym heuristic
  (`src/lib/domain/column-mapping.ts`), not a live model call — matching headers to
  fields doesn't need judgement, so it stays instant and free while the real extraction
  (which does need judgement) goes through Claude.
- Org rules engine, additional frameworks, and multi-backlog run comparison are Phase
  2-4 per the PRD's phasing — not in this pass.
