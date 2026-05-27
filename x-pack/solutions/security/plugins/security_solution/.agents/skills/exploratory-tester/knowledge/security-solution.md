# Security Solution — Exploratory Testing Knowledge

**Last updated:** 2026-05-26  
**Session:** ECH, editor+t2_analyst role, PR #238549 (remove newDataViewPickerEnabled flag), 10 flows

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

## Known issues observed this session

### Open / needs investigation
- **Lens KPI metric "field can not be used for filtering" TypeErrors**: Affects all Explore pages (Hosts/Network/Users). Fields: `source.ip`, `destination.ip`, `network.community_id`, `user.name`. From `expressionLegacyMetricVis` checking filter action compatibility. May indicate Data View Manager field metadata regression for explore scope.
- **`/api/security_solution/initialize` called multiple times per navigation**: 4× on Alerts page, 2× on Hosts page. Possible React component re-mount issue from Data View Manager initialization.
- **ES|QL tab in Timeline auto-executes empty query on mount**: Shows "1 error" immediately before user types anything. Error: `action_request_validation_exception: [query] is required`.

### Pre-existing (do not re-log)
- Entity store disabled → `/internal/risk_score/engine/settings` → 500 (expected behavior when EA is off)
- `/internal/alerting/rules/gaps/auto_fill_scheduler/...` → 404 (may be missing in some builds)

## Timeline interaction notes

- Timeline is opened via bottom bar ("Open Timeline" button) on Security pages
- Two "Refresh" buttons exist on timeline pages: one for the outer page, one inside the timeline — use JS evaluate to click the last one
- EQL textarea selector: `[data-test-subj="eqlQueryBarTextInput"]`
- ES|QL Monaco editor: use `.monaco-editor textarea` with `pressSequentially()` for input; `fill()` doesn't propagate to Monaco's internal model
- Timeline saves via `button "Save"`; unsaved changes trigger `beforeunload` dialog on navigation

## `browser_file_upload` path restriction

- Only accepts paths within the repo directory — write test files to `.exploratory-session/` not `/tmp`
