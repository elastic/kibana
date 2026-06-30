# Security Solution — Exploratory Testing Knowledge

**Last updated:** 2026-05-27  
**Sessions:** ECH, editor+t2_analyst role, PR #238549 (remove newDataViewPickerEnabled flag), 12 flows across 2 sessions

---

## Environment notes (ECH / Elastic Cloud Hosted)

- Kibana internal user API (`POST /internal/security/users/`) is **unavailable on ECH** — use Elasticsearch Security API instead: `POST /_security/user/<username>`
- Prebuilt rules endpoints unavailable on ECH: `POST /api/detection_engine/rules/prepackaged` → 404; `POST /internal/detection_engine/prebuilt_rules/installation/_perform` → 400
- `GET /internal/cloud/solution` → 404 on ECH — **known noise**, ignorable
- Inline script CSP violation — **known noise**, appears on every page, ECH environment-specific
- SAML auth is NOT used on ECH standard (basic auth works via elastic/password)

## User setup for ECH

- Create test user via: `POST /_security/user/<username>` with `{ password, roles: ["editor", "t2_analyst"] }`
- `t2_analyst` alone gives Security Solution access but not full Kibana app access — always pair with `editor`
- Login as test user via standard Kibana UI after creation

## Test data

- Test alerts can be ingested directly to `.alerts-security.alerts-default` via ES index API using API key auth
- **Caveat**: Manually ingested alerts satisfy KPI aggregation queries but NOT the Alerts data grid query — the grid requires full signal schema fields (`kibana.alert.rule.uuid`, `kibana.alert.instance.id`, `kibana.alert.start`, etc.)
- The Alerts table will show "No results" even when KPI panel shows alert counts, if test data lacks required schema fields
- **Preferred approach**: Create a detection rule (`POST /api/detection_engine/rules`) against a test index, let it fire on rule interval. Rule-generated alerts have the full schema including `kibana.alert.*` fields and appear in the Alerts data grid.
- Resolver/Analyzer tab requires `process.entity_id` field — only present on alerts from Elastic Defend (Endpoint) data. Custom query rule alerts on plain logs will NOT show the Analyzer tab. This is expected, not a regression.
- Create rules via `POST /api/detection_engine/rules` — rule will appear in the Rules list

## Navigation patterns

- Security Solution entry: `/app/security/get_started` or `/app/security/alerts`
- Alerts page: `/app/security/alerts`
- Timeline: `/app/security/timelines` (bottom bar on all Security pages opens current timeline)
- Hosts: `/app/security/hosts/allHosts`
- Network: `/app/security/network/flows`
- Users: `/app/security/users/allUsers`
- Detection Rules: `/app/security/rules`
- Create rule: `/app/security/rules/create`
- Entity Analytics: `/app/security/entity_analytics`
- Attack Discovery: `/app/security/attack_discovery`
- Dashboards: `/app/security/dashboards`
- Overview dashboard: `/app/security/overview`

## Data view picker behavior (as of PR #238549)

| Page | Data view scope | Picker state (editor+t2_analyst) |
|------|-----------------|----------------------------------|
| Alerts | "Security solution default" | **Disabled** (no tooltip) |
| Overview dashboard | "Security solution default" | Enabled |
| Hosts, Network, Users | "Security solution explore" | Enabled |
| Timeline (internal) | Configurable per-timeline | Enabled (full list) |
| Detection Rules | None (no picker) | N/A |
| Attack Discovery | None (no picker) | N/A |
| Entity Analytics | None (no picker) | N/A |

**Known inconsistency (open)**: Alerts page picker disabled for non-admin but Overview dashboard (same scope) is enabled.

## Known console errors on ECH (not product bugs)

- `Executing inline script violates Content Security Policy` — every page, ECH infrastructure
- `Failed to load resource: 404 @ /internal/cloud/solution` — every page, ECH-specific missing route

## Managed Security Solution data views (PR #238549+)

- `Security solution default` — alerts scope (Alerts page, Overview dashboard)
- `Security solution explore` — explore scope (Hosts, Network, Users)
- `Security solution alerts` — alerts-specific (used in rule creation, timeline)
- `Security solution attacks` — attack discovery scope

## Cell actions in Alerts data grid

- Cell actions (Filter for, Filter out, Add to Timeline) appear on hover, not click — use `browser_hover` on the cell first
- Target specific row/column: `[role="gridcell"][data-gridcell-row-index="0"][data-gridcell-column-index="5"]`
- Cell action test subjects: `dataGridColumnCellAction-security-default-cellActions-filterIn`, `…filterOut`, `…addToTimeline`
- "Filter for" click adds a filter pill to the filter bar and encodes the filter in the URL `&filters=…` param
- Delete filter via `[aria-label="Delete <field>: <value>"]` button
- "Investigate in Timeline" bulk action opens Timeline with the selected alert's `_id` as a KQL filter; data view scope is not altered
- Bulk actions menu opened via `[data-test-subj="selectedShowBulkActionsButton"]`; menu item: `[data-test-subj="investigate-bulk-in-timeline"]`

## Data view scope isolation

- Each Security Solution page uses a single fixed scope: Alerts→`default`, Explore→`explore`, Timeline→`timeline`, Attack Discovery→`attacks`
- Changing the data view on one page/scope does NOT affect other scopes — URL-state-based, no server-side persistence
- After navigating away and back without the `sourcerer=` URL param, the page resets to its default data view for that scope
- The Alerts page picker is disabled for `editor+t2_analyst` role — you cannot test interactive Alerts scope changes with this role

## Known issues observed this session

### Open / needs investigation
- **Lens KPI metric "field can not be used for filtering" TypeErrors** (F-L1-01): Observed in Session 1 across all Explore pages. **Not reproducible in Session 2** (41/41 KPI panels rendered cleanly). Intermittent or data-dependent. Check if it reproduces with a cold cache or different date range.
- **`/api/security_solution/initialize` called multiple times per navigation**: 4× on Alerts page, 2× on Hosts page. Duplicate `data_views/fields` fetches (3×) on both pages. Possible React component re-mount issue from Data View Manager initialization.
- **ES|QL tab in Timeline auto-executes empty query on mount**: Shows "1 error" immediately before user types anything. Error: `action_request_validation_exception: [query] is required`.

### Pre-existing (do not re-log)
- Entity store disabled → `/internal/risk_score/engine/settings` → 500 (expected behavior when EA is off)
- `/internal/alerting/rules/gaps/auto_fill_scheduler/...` → 404 (may be missing in some builds)
- `/internal/osquery/fleet_wrapper/agents` → 404 (Osquery integration not installed on ECH)

## Timeline interaction notes

- Timeline is opened via bottom bar ("Open Timeline" button) on Security pages
- Two "Refresh" buttons exist on timeline pages: one for the outer page, one inside the timeline — use JS evaluate to click the last one
- EQL textarea selector: `[data-test-subj="eqlQueryBarTextInput"]`
- ES|QL Monaco editor: use `.monaco-editor textarea` with `pressSequentially()` for input; `fill()` doesn't propagate to Monaco's internal model
- Timeline saves via `button "Save"`; unsaved changes trigger `beforeunload` dialog on navigation

## `browser_file_upload` path restriction

- Only accepts paths within the repo directory — write test files to `.exploratory-session/` not `/tmp`
