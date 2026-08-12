# PND plugin (`@kbn/pnd-plugin`)

Security Watch investigation queue and catalog behind `xpack.pnd.enabled`.

## Enablement

Add to `kibana.yml` (or `config/kibana.dev.yml` for local dev):

```yaml
xpack.pnd.enabled: true
```

- **`xpack.pnd.enabled`** — sole enablement switch (default `false`). When false, the plugin registers no app, routes, or features; Security nav nodes for PND are omitted automatically.
- **`xpack.pnd.ui.useMockData`** — optional data-source toggle (default `true`). Not required for enablement; leave unset for mock fixtures. Set `false` later when wiring live Workflows / Agent Builder projection.

Restart Kibana after changing config, then open `/app/pnd` (or use the Security left rail).

### When disabled (`xpack.pnd.enabled: false`) — no production pollution

| Surface | Behavior |
|---------|----------|
| HTTP `/internal/pnd/*` | Not registered |
| Kibana feature / privileges | Not registered |
| Browser app `/app/pnd` | Not registered (nav links to `pnd` / `pnd:*` are removed by chrome) |
| Managed workflow **owner** | Not registered (`registerManagedWorkflowOwner` skipped) |
| Managed watch **install** | Not called (`installStatic` no-ops) |
| Leftover installed watches | Global Workflows orphan cleanup removes docs whose owner is unregistered |

Definitions still exist in `@kbn/workflows/managed` (code registry only). They are **not** installed into `.workflows-*` and do not appear in the Watch catalog unless PND is enabled and `install` / `ready` run.

The only always-on cost of a soft flag is the tiny public plugin entry bundle (~page-load limit); it registers nothing when disabled.

### Live mode caveats (`useMockData: false`)

Before enabling live projection in shared or production environments:

- Live watch routes require **`pnd_read` + Workflows `read` + `readManaged`** (same pair Workflows uses for managed reads). Execution privileges are not required at the route gate; recent-run enrichment soft-fails when unavailable.
- A follow-up should still pass the user `KibanaRequest` (or `authzResult`) into the watch projection layer so managed/execution reads are enforced inside Workflows Management calls, not only at the PND route boundary.
- Until request-scoped Workflows authz lands in projection, prefer `useMockData: true` outside local development.

## Chrome strategy (PR1)

PND is a **standalone Security-category app** (`/app/pnd`) that **uses platform Kibana chrome**:

- Does **not** hide the Kibana top header (search, help, AI Agent, user menu)
- Does **not** render a custom left rail or Tour/Help/user utilities
- Slots Throughline-ordered destinations into the **Security solution nav** (ESS + serverless trees)
- Platform footer stays as on Security `main`: Launchpad, Developer tools, Settings / stack management, collapse
- **Discover** uses the platform `{ link: 'discover' }` destination (real `/app/discover`)
- **Dashboards** uses Security’s real dashboards destination (same Throughline slot; no PND stub)
- **Chats** stays in-app and embeds Agent Builder
- Watches keeps a **content-area** secondary nav (Workflows / Skills / … stubs)
- Ask PND FAB routes to Chats (hidden on `/chats`)

## Routes

| UI route | Purpose |
|----------|---------|
| `/app/pnd` | Brief — Investigation queue |
| `/app/pnd/chats` | Agent Builder embed (`sessionTag: pnd`) |
| `/app/discover` | Real Discover (via Security / PND nav Discover item) |
| `/app/security/dashboards` | Real Security dashboards (via Throughline Dashboards item) |
| `/app/pnd/alerts` | Placeholder — coming soon |
| `/app/pnd/attacks` | Placeholder — coming soon |
| `/app/pnd/records` | Placeholder — coming soon |
| `/app/pnd/threat-hunt` | Placeholder — coming soon |
| `/app/pnd/streams` | Placeholder — coming soon |
| `/app/pnd/watches` | Watch catalog (`system-security-watch-*`) |
| `/app/pnd/watches/:watchId` | Watch detail |
| `/app/pnd/watches/workflows` … `/guardrails` | Watches section stubs |
| `/app/pnd/investigations/:id` | Investigation inspector shell |
| `/app/pnd/investigations/:id/proposals/:proposalId` | Proposal detail shell |
| `/app/pnd/settings` | Settings stub (no dedicated nav item) |

### Security left-rail order (when PND enabled)

**PND → Chats → Discover → Dashboards → Alerts → Attacks → Records → Threat hunt → Streams → Watches**, then the rest of Security’s existing destinations (including the platform **More** overflow — not a PND stub).

### Internal API (`/internal/pnd/*`)

| Method | Path |
|--------|------|
| GET | `/internal/pnd/watches` |
| GET | `/internal/pnd/watches/{watchId}` |
| GET | `/internal/pnd/investigations` |
| GET | `/internal/pnd/investigations/{id}` |
| GET | `/internal/pnd/investigations/{id}/proposals` |

OpenAPI → Zod schemas live in `@kbn/pnd-common`. Regenerate with:

```bash
cd x-pack/solutions/security/packages/kbn-pnd-common
yarn openapi:generate
```

## Managed workflows

Owner plugin id: `pnd`. Catalog definitions:

- `system-security-watch-floor`
- `system-security-watch-officer`
- `system-security-watch-dark`
- `system-security-watch-deep`

YAML + registry entries: `src/platform/packages/shared/kbn-workflows/managed/definitions/pnd/`. Visibility: `selector:watch` + `solution:security`.

### Managed definition `version` vs product “v1”

Two different version fields:

| Field | Where | Meaning |
|-------|--------|---------|
| YAML `version: "1"` | Top of each `watch_*.yaml` | Workflow document schema / format version (stays `"1"` until the YAML language changes). |
| Definition `version: N` | `managed/definitions/pnd/index.ts` | **Managed reconciliation counter** for `@kbn/workflows/managed`. Bump when you need install/`ready()` to re-apply the definition (`versionStrategy: 'auto'`). |

POC bumps (4, 5, …) are expected while iterating — they are not a product SemVer and do **not** mean “Watch Floor v5”. Keep bumping on intentional definition changes; do not reset counters on clusters that already installed higher versions unless you intentionally wipe those managed docs.

## Working-group contribution map

| Area | Where to land |
|------|----------------|
| Shared types, fixtures, OpenAPI | `@kbn/pnd-common` |
| Managed watch YAML / callables | `kbn-workflows/managed/definitions/pnd` + this plugin's install path |
| Investigation / Proposal conversation projection | Agent Builder / Conversations (optional dep) |
| Live Watch projection (non-mock) | Workflows Management via `workflowsExtensions` |
| Brief / in-app pages | `plugins/pnd/public` |
| Solution nav nodes | `security_solution_ess` / `security_solution_serverless` navigation trees |

## In scope (PR1)

- Platform chrome (header + Security footer utilities)
- Throughline body order in Security nav; Discover → real Discover; Dashboards → real Security dashboards
- Brief queue, Watches catalog/detail, Chats Agent Builder embed
- Investigation shells + mock internal APIs

## Non-goals (this PR)

- Nesting routes under `/app/security` or importing Security page wrappers
- Wiring remaining operate destinations (Alerts, Attacks, …) to real apps
- Pixel-perfect Throughline CSS port
- Implementing Workflows / Skills / Activity / Performance / Guardrails data
- No `.kibana-threat-intel-hunt-findings` index / Intelligence Hub findings queue
- No custom watch create/delete persistence (UI stubs only)

## Development

```bash
source ~/.nvm/nvm.sh && nvm use
node scripts/regenerate_moon_projects.js --update --filter @kbn/pnd-plugin
node scripts/type_check --project x-pack/solutions/security/plugins/pnd/tsconfig.json
node scripts/jest x-pack/solutions/security/plugins/pnd/public/components/app_chrome/pnd_chrome.test.tsx
node scripts/jest x-pack/solutions/security/packages/kbn-pnd-common
```

### Page-load budget

Keep `pageLoadAssetSize.pnd` lean — prefer a thin plugin entry over raising the optimizer limit. Keep the app UI behind `import('./application')` in `public/plugin.ts`. The shared package (`@kbn/pnd-common`) must use an **explicit export allow-list** in `index.ts` — never `export *` for schemas/samples. Star re-exports defeat optimizer tree-shaking and can pull Zod + mock catalogs into the page-load bundle even when the plugin only imports a few constants.

Measure with:

```bash
node scripts/build_kibana_platform_plugins.js --filter pnd --dist --no-cache --no-examples
# inspect …/pnd/target/public/metrics.json → "page load bundle size"
```
