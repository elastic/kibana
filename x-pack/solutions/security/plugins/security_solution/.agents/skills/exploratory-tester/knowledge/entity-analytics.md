# Knowledge: Entity Analytics

**Last updated:** 2026-07-29
**Archive:** `entity-analytics-archive-2026-07-15.md` (all narrative session findings — see "Compact by design" below)

---

**Compact by design:** this file holds only `## Known non-bugs` (suppression-eligible
entries — see `phases/3-report.md` Step 3b) and `## Navigation patterns` (reachability
context). It never accumulates per-session bug narratives, confirmed-bug tables, or
checklist-coverage summaries — those already live in full in each session's
`report.md`/`findings-flow-*.md`, and are archived here only for explicit lookup, never
auto-loaded. See `phases/3-report.md` Step 3d before adding anything beyond these two
sections.

---

## Known non-bugs

- `GET /api/asset_criticality?id_value=X&id_field=host.name` → 404 when no criticality set. By design; UI shows "Unassigned".
- `POST /api/security/api_key` → 404 on ECH deployments. Use `Authorization: Basic` for Kibana REST calls instead.
- CSP inline-script console error on page load — Kibana bootstrap; explicitly expected.
- `POST /api/security_solution/initialize` fires twice on EA home page load — consistent across sessions, not a bug.
- `ERR_ABORTED` on `POST /internal/cases/_search` during hard navigation — standard fetch cancellation, not a bug.
- `GET /api/detection_engine/rules?id=test-rule-uuid-*` → 400 when test data has non-UUID rule IDs — test-setup, not a bug.
- Double-click on "Select" button in case picker creates exactly 1 attachment — modal unmounts on first click, second click is detached no-op.
- Risk score shown as "N/A" for entities directly indexed (bypassing risk engine pipeline) — test-setup artifact; the risk engine must run for `entity.risk` fields to populate correctly.
- `launchdarkly.com ERR_NETWORK_IO_SUSPENDED` — infrastructure noise, not a product bug.
- `totalComment: 0` on `GET /api/cases/{id}` for entity attachments — **this is a confirmed product bug (L2-03)**, not noise. Do not suppress.

## Navigation patterns

### Entry points for "Add to case"
- **EA home page** (`/app/security/entity_analytics_home_page`) — click "Open entity details" on a host or user row → flyout → "Take action" → "Add to new/existing case". Direct and fastest path.
- **Hosts Explore page** (`/app/security/hosts/allHosts`) — same flyout pattern. Note: clicking hostname triggers field-actions dialog simultaneously with flyout (F-06 from prior session).
- **Alerts table** (`/app/security/alerts`) — requires 2 extra steps: alert row → preview panel (no Take action here) → "Show full host details" → full flyout → Take action.
- **Case Attachments tab row** — click "Open entity details" on an existing entity attachment row → flyout → Take action. `contextID: entity-analytics-case-attachment-table`.

### Service entities (as of 2026-07-15)
- Service entities do NOT have a flyout from the EA home page. Clicking a service entity row expands an inline data-grid. No "Open entity details" or "Take action" button. Row-action button is `disabled: true`. **Add to case is completely blocked for service entities from any UI path.**

### Lifecycle behaviors
- "Select" button is `disabled: true` for **closed cases** in the picker modal. No API call fires.
- **Delete attachment:** only accessible from Activity tab → entity event → ellipsis → "Delete attachment". No delete control on Entities section rows in Attachments tab.
- **Count badge** is stale immediately after attachment. "Refresh case" button does NOT update counts. Full page reload required.
- **Timeline → Attach to case** creates `type: security.timeline`, not `type: security.entity`. Rendered in "Timelines N" accordion section, not "Entities N". "Attach to case" button is `aria-disabled` until Timeline is saved.

### Privilege requirements for EA entity flyout
Both entity analytics Kibana features AND Elasticsearch index privileges are required. Kibana-only roles (`siem:*`, `securitySolutionCases:*`) will see "Privileges required" empty state on EA home even with full cases access. Required ES index read privileges:
- `risk-score.risk-score-*`
- `.entities.v2.latest.security_default-*`
- `.entities.v2.metadata.security_default-*`
- `entities-latest-default`
- `entities-metadata-default`
