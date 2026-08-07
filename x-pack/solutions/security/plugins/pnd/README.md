# PND plugin (`@kbn/pnd-plugin`)

Security Watch investigation queue and configuration UI behind `xpack.pnd.enabled`.

## Enablement

Add to `kibana.yml` (or `config/kibana.dev.yml` for local dev):

```yaml
xpack.pnd.enabled: true
```

- **`xpack.pnd.enabled`** — sole enablement switch (default `false`). When false, the plugin registers no app, routes, or features; Security nav nodes for PND are omitted automatically.
- **`xpack.pnd.ui.useMockData`** — optional data-source toggle (default `false`). Set it to `true` only when developing against mock fixtures.

Restart Kibana after changing config, then open `/app/pnd` (or use the Security left rail).

### When disabled (`xpack.pnd.enabled: false`) — no production pollution

| Surface | Behavior |
|---------|----------|
| HTTP `/internal/pnd/*` | Not registered |
| Kibana feature / privileges | Not registered |
| Browser app `/app/pnd` | Not registered (nav links to `pnd` / `pnd:*` are removed by chrome) |
| Watch starting points | Not created |

The only always-on cost of a soft flag is the tiny public plugin entry bundle (~page-load limit); it registers nothing when disabled.

### Live mode caveats (`useMockData: false`)

Before enabling live projection in shared or production environments:

- Live watch routes currently require **`pnd_read` + Workflows `read` + `readManaged`** because tagged managed leftovers remain visible until their filtering is handled separately. Recent-run enrichment is included only when the caller has the corresponding execution privileges.
- The Watches area explicitly calls the setup endpoint for users with **`pnd_write` + Workflows `create` + `update`** before listing. Read-only users can list starting points after they exist; GET routes never create data.
- Settings writes require **`pnd_write` + Workflows `read` + `update`**.

## Chrome strategy (PR1)

PND is a **standalone Security-category app** (`/app/pnd`) that **uses platform Kibana chrome**:

- Does **not** hide the Kibana top header (search, help, AI Agent, user menu)
- Does **not** render a custom left rail or Tour/Help/user utilities
- Slots Throughline-ordered destinations into the **Security solution nav** (ESS + serverless trees)
- Platform footer stays as on Security `main`: Launchpad, Developer tools, Settings / stack management, collapse
- **Discover** uses the platform `{ link: 'discover' }` destination (real `/app/discover`)
- **Dashboards** uses Security’s real dashboards destination (same Throughline slot; no PND stub)
- **Chats** stays in-app and embeds Agent Builder
- Watches keeps a **content-area** secondary nav for individual Watches, Workers, and Skills
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
| `/app/pnd/watches` | Redirect to the first customer-owned Watch |
| `/app/pnd/watches/:watchId` | Watch detail |
| `/app/pnd/watches/workers` | Workers section stub |
| `/app/pnd/watches/skills` | Skills section stub |
| `/app/pnd/investigations/:id` | Investigation inspector shell |
| `/app/pnd/investigations/:id/proposals/:proposalId` | Proposal detail shell |
| `/app/pnd/settings` | Settings stub (no dedicated nav item) |

### Security left-rail order (when PND enabled)

**PND → Chats → Discover → Dashboards → Alerts → Attacks → Records → Threat hunt → Streams → Watches**, then the rest of Security’s existing destinations (including the platform **More** overflow — not a PND stub).

### Internal API (`/internal/pnd/*`)

| Method | Path |
|--------|------|
| GET | `/internal/pnd/watches` |
| POST | `/internal/pnd/watches/setup` |
| GET | `/internal/pnd/watches/{watchId}` |
| PUT | `/internal/pnd/watches/{watchId}` |
| GET | `/internal/pnd/investigations` |
| GET | `/internal/pnd/investigations/{id}` |
| GET | `/internal/pnd/investigations/{id}/proposals` |

OpenAPI → Zod schemas live in `@kbn/pnd-common`. Regenerate with:

```bash
cd x-pack/solutions/security/packages/kbn-pnd-common
yarn openapi:generate
```

## Watch starting points

PND carries four YAML starting points in `server/prebuilt_watches/definitions` and creates them as ordinary, user-owned workflows through the explicit setup request made by the Watches page:

- `security-watch-floor`
- `security-watch-officer`
- `security-watch-dark`
- `security-watch-deep`

Creation is create-if-absent. PND does not reconcile, restore, version, or replace a customer's copy. Watches continue to be discovered by the `watch` tag rather than this id list.

## Working-group contribution map

| Area | Where to land |
|------|----------------|
| Shared types, fixtures, OpenAPI | `@kbn/pnd-common` |
| Watch starting-point YAML / callables | `plugins/pnd/server/prebuilt_watches/definitions` |
| Investigation / Proposal conversation projection | Agent Builder / Conversations (optional dep) |
| Live Watch projection (non-mock) | Workflows Management |
| Brief / in-app pages | `plugins/pnd/public` |
| Solution nav nodes | `security_solution_ess` / `security_solution_serverless` navigation trees |

## In scope (PR1)

- Platform chrome (header + Security footer utilities)
- Throughline body order in Security nav; Discover → real Discover; Dashboards → real Security dashboards
- Brief queue, Watches navigation/detail, Chats Agent Builder embed
- Investigation shells + mock internal APIs

## Non-goals (this PR)

- Nesting routes under `/app/security` or importing Security page wrappers
- Wiring remaining operate destinations (Alerts, Attacks, …) to real apps
- Pixel-perfect Throughline CSS port
- Implementing Workers / Skills aggregate pages or deferred settings such as callable toggles and approval gates
- No `.kibana-threat-intel-hunt-findings` index / Intelligence Hub findings queue
- Custom watch creation and deletion

## Development

```bash
source ~/.nvm/nvm.sh && nvm use
node scripts/regenerate_moon_projects.js --update --filter @kbn/pnd-plugin
node scripts/type_check --project x-pack/solutions/security/plugins/pnd/tsconfig.json
node scripts/jest x-pack/solutions/security/plugins/pnd/public/components/app_chrome/pnd_chrome.test.tsx
node scripts/jest x-pack/solutions/security/packages/kbn-pnd-common
node scripts/scout run-tests --arch stateful --domain classic --serverConfigSet pnd --config x-pack/solutions/security/plugins/pnd/test/scout_pnd/api/playwright.config.ts
```

### Page-load budget

Keep `pageLoadAssetSize.pnd` lean — prefer a thin plugin entry over raising the optimizer limit. Keep the app UI behind `import('./application')` in `public/plugin.ts`. The shared package (`@kbn/pnd-common`) must use an **explicit export allow-list** in `index.ts` — never `export *` for schemas/samples. Star re-exports defeat optimizer tree-shaking and can pull Zod + mock catalogs into the page-load bundle even when the plugin only imports a few constants.

Measure with:

```bash
node scripts/build_kibana_platform_plugins.js --filter pnd --dist --no-cache --no-examples
# inspect …/pnd/target/public/metrics.json → "page load bundle size"
```
