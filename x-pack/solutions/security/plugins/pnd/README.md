# PND plugin (`@kbn/pnd-plugin`)

Security Watch investigation queue and catalog behind `xpack.pnd.enabled`.

## Enablement

Add to `kibana.yml` (or `config/kibana.dev.yml` for local dev):

```yaml
xpack.pnd.enabled: true
```

- **`xpack.pnd.enabled`** — sole enablement switch (default `false`). When false, the plugin registers no app, routes, or features; Security nav nodes for PND are omitted automatically.
- **`xpack.pnd.ui.useMockData`** — optional data-source toggle (default `true`). Not required for enablement; leave unset for mock fixtures. Set `false` later when wiring live Workflows / Agent Builder projection.

PR cloud deploys set `xpack.pnd.enabled: true` via `.buildkite/scripts/steps/cloud/deploy.json` (label `ci:cloud-deploy`).

Restart Kibana after changing config, then open `/app/pnd` (or use the Security left rail).

### Live mode caveats (`useMockData: false`)

Before enabling live projection in shared or production environments:

- PND watch routes currently authorize with **`pnd_read` only** and call Workflows Management APIs without composing Workflows `read` / `readManaged` / `readExecution` privileges.
- A follow-up must pass the user `KibanaRequest` (or equivalent `authzResult` checks) into the watch projection layer so `pnd_read` does not bypass Workflows RBAC.
- Until that lands, keep `useMockData: true` outside local development.

## Chrome strategy (PR1)

PND is a **standalone Security-category app** (`/app/pnd`) that **uses platform Kibana chrome**:

- Does **not** hide the Kibana top header (search, help, AI Agent, user menu)
- Does **not** render a custom left rail or Tour/Help/user utilities
- Slots Throughline-ordered destinations into the **Security solution nav** (ESS + serverless trees)
- Platform footer stays as on Security `main`: Launchpad, Developer tools, Settings / stack management, collapse
- **Discover** uses the platform `{ link: 'discover' }` destination (real `/app/discover`)
- **Chats** stays in-app and embeds Agent Builder
- Watches keeps a **content-area** secondary nav (Workflows / Skills / … stubs)
- Ask PND FAB routes to Chats (hidden on `/chats`)

## Routes

| UI route | Purpose |
|----------|---------|
| `/app/pnd` | Brief — Investigation queue |
| `/app/pnd/chats` | Agent Builder embed (`sessionTag: pnd`) |
| `/app/discover` | Real Discover (via Security / PND nav Discover item) |
| `/app/pnd/dashboards` | Placeholder — coming soon |
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
- Throughline body order in Security nav; Discover → real Discover
- Brief queue, Watches catalog/detail, Chats Agent Builder embed
- Investigation shells + mock internal APIs

## Non-goals (this PR)

- Nesting routes under `/app/security` or importing Security page wrappers
- Wiring remaining operate destinations (Dashboards, Alerts, …) to real apps — Discover only for that quick win
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
