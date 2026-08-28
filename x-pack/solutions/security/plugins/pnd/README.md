# PND plugin (`@kbn/pnd-plugin`)

Security Watch investigation queue and catalog behind `xpack.pnd.enabled`.

## Enablement

Add to `kibana.yml` (or `config/kibana.dev.yml` for local dev):

```yaml
xpack.pnd.enabled: true
```

- **`xpack.pnd.enabled`** — deployment-level plugin gate (default `false`). When false, the plugin registers no app, routes, or features; Security nav nodes for PND are omitted automatically.
- **`xpack.pnd.ui.useMockData`** — optional presentation-source toggle (default `true`). Watch settings use managed workflow template values in both modes; the flag controls whether the rest of the watch projection comes from fixtures or live Workflows data.

Watches install when a user enables one or saves settings on one. There is no space-level enablement switch. Disable leaves the per-space document and its settings in place. The only bulk cleanup is turning `xpack.pnd.enabled` off and restarting — PND then stops registering as a managed-workflow owner and orphan cleanup force-deletes its documents across every space.

Restart Kibana after changing config, then open `/app/pnd` (or use the Security left rail).

### When disabled (`xpack.pnd.enabled: false`) — no production pollution

| Surface | Behavior |
|---------|----------|
| HTTP `/internal/pnd/*` | Not registered |
| Kibana feature / privileges | Not registered |
| Browser app `/app/pnd` | Not registered (nav links to `pnd` / `pnd:*` are removed by chrome) |
| Managed workflow **owner** | Not registered (`registerManagedWorkflowOwner` skipped) |
| Managed workflow initialization | Not called |
| Leftover installed watches | Global Workflows orphan cleanup removes docs whose owner is unregistered |

Definitions still exist in `@kbn/workflows/managed` (code registry only). Watch definitions are **not** installed into `.workflows-*` until a user enables that watch or saves settings on it. PND startup installs only the three global rule workflows before `ready()` reconciles already-installed dynamic watches.

The only always-on cost of a soft flag is the tiny public plugin entry bundle (~page-load limit); it registers nothing when disabled.

### Live mode caveats (`useMockData: false`)

Before enabling live projection in shared or production environments:

- Watch reads require only `pnd_read`; PND owns the catalog projection and its managed definitions. Recent-run enrichment soft-fails when execution history is unavailable.
- Settings writes require `pnd_write`; managed install is requestless, so the PND route is the authorization boundary.
- Autonomy is the common durable setting for every managed Watch. Trigger, scope-routing, worker, skill, and approval-gate mutations remain outside the live extension.

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
| PATCH | `/internal/pnd/watches/{watchId}` |
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
- `system-security-watch-detection`

Central PND watch definitions live in `src/platform/packages/shared/kbn-workflows/managed/definitions/pnd/`, with one module per Watch. The platform package owns the static managed-workflow metadata, YAML, template function, and template value type. PND owns each Watch's settings defaults, migrations, patch behavior, and API projection under `server/managed_workflows/watches/`. The PND catalog comes from the PND registry rather than managed-workflow selector visibility.

Watch definitions are `dynamic` + `auto` + `restorable`. They are installed on enable with `workflowIdSuffix: spaceId`, so every space owns an independent copy. Disable changes enablement in place. Every built-in Watch is a `yamlTemplate` whose versioned template values persist autonomy settings and are re-used during definition upgrades.

The prototype rule workflows remain static global installs and are not advertised to workflow selector UIs. A Watch reaches them with `workflow.execute`, and they surface on the Watch detail page as callables of kind `workflow`:

- `system-security-rule-tuning` — called by Detection Watch on its scheduled sweep
- `system-security-rule-tuning-proposal` — launched per noisy rule by the tuning sweep (`workflow.executeAsync`), each run holding its own approval gate
- `system-security-rule-creation` — called by Detection Watch when a caller supplies an ATT&CK technique
- `system-security-rule-preview` — called by the proposal and creation workers

### Managed definition `version` vs product “v1”

Two different version fields:

| Field | Where | Meaning |
|-------|--------|---------|
| YAML `version: "1"` | Top of each `watch_*.yaml` | Workflow document schema / format version (stays `"1"` until the YAML language changes). |
| Definition `version: N` | The Watch's module under `managed/definitions/pnd/` | **Managed reconciliation counter** for `@kbn/workflows/managed`. Bump when you need install/`ready()` to re-apply the definition (`versionStrategy: 'auto'`). |

Start a new definition at `1` and increment it for intentional definition changes. This counter is not product SemVer; once a definition has been published, do not reset it without an explicit managed-document migration decision.

### Central PND watch registry guide

The current YAML files are prototypes rather than final Watch-team definitions. This guide records the hookup contract teams can build toward without treating the current YAML, settings list, or runtime semantics as settled product requirements.

For now, every built-in Watch is registered centrally:

1. Define the stable Watch id and catalog presentation in `@kbn/pnd-common`. The id is the managed definition id presented by the PND Watch API; per-space document ids are produced later by `workflowIdSuffix: spaceId`.
2. Add a per-Watch managed definition module under `kbn-workflows/managed/definitions/pnd` and include it in the platform `managedWorkflowDefinitions` registry. Keep `pluginId: 'pnd'`, `lifecycle: 'dynamic'`, `versionStrategy: 'auto'`, and `enablement: 'restorable'`. Watch teams do not call managed `install()` directly.
3. Register every built-in Watch with the common settings behavior in PND's `server/managed_workflows/watches/` registry. The registry joins PND settings behavior to the platform definition by stable Watch id and rejects a template without settings behavior or settings behavior without a template.
4. Workflow enablement is lifecycle state: templates start with `enabled: false`, and PND enables the installed per-space document through the request-authorized Workflows update API.
5. Treat stored values as untrusted old data. `migrate` validates the shape, returns the complete current value set, removes obsolete keys, and sets `migrated: true` whenever PND must reinstall it. PND runs all settings migrations before Workflows reconciliation; an unsafe migration prevents reconciliation for that boot.
6. Keep `applyPatch` limited to fields already present in the shared PND Watch API. New trigger, schedule, identity, approval, worker, skill, or watch-specific shapes require agreement with the Experience UX and owning working groups before extending the OpenAPI contract.
7. `toSettings` projects stored values into the sectioned `WatchSettings` response. Omit sections the Watch does not genuinely support; do not populate them with fixture identities, schedules, runtime state, or other invented values.
8. Add settings-module tests for defaults, every supported patch, migration from the immediately preceding shape, and rejection of invalid stored data. Add managed-definition tests for valid rendered YAML and registry tests for catalog/settings wiring. Test unresolved placeholder tokens and that every supported persisted setting changes the rendered definition. Imported YAML changes require an explicit managed-definition version decision.

To add a common setting, add it to the managed template-values type shared by the Watch platform modules. Add a placeholder to every Watch YAML and have each `yamlTemplate` replace it, so changing the value changes the rendered definition. Declare its default, migration, patch behavior, and API projection in the shared PND settings registration. Watch-specific settings should extend that common behavior only after their API and runtime semantics are settled.

The lifecycle service owns the rest: per-space installation, reading persisted values, enable/disable, startup migration, and upgrades. Settings responses carry the logical workflow version, and settings patches return HTTP 409 when a fresh read shows that version was already stale. This is best-effort detection rather than an atomic write guard: overlapping requests can both pass the comparison and remain last-write-wins. The atomic conflict behavior remains open.

Do not add runtime meaning for autonomy levels, execution identities, trigger/schedule fields, per-worker or per-skill toggles, or approval policy as part of registry hookup. Those contracts remain separately owned and should be implemented only after their requirements settle.

## Working-group contribution map

| Area | Where to land |
|------|----------------|
| Shared types, fixtures, OpenAPI | `@kbn/pnd-common` |
| Managed Watch YAML, renderers, template value types, and callables | `kbn-workflows/managed/definitions/pnd` |
| Watch settings defaults, migrations, patches, and API projection | `plugins/pnd/server/managed_workflows/watches` |
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
- No PND create or delete surface for custom watches

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
