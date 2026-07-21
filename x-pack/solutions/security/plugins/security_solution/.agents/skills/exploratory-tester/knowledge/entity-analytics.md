# Knowledge: Entity Analytics

**Last updated:** 2026-07-15
**Archive:** `entity-analytics-archive-2026-07-15.md` (sessions through 2026-07-15-041422)

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

---

## Session findings — Entity Cases Attachments (2026-07-14 / 2026-07-15-041422)

Key confirmed findings from the first two sessions (10 flows, all 5 checklist steps):

**Confirmed bugs filed:**
- **B-01 [Level 1]** "Create case" submit button not disabled while in-flight — double-click creates duplicate cases (18ms apart, both HTTP 200). Affects all case creation paths.
- **B-02 [Level 2] #278382** Entity ID colon-notation (`host:entity-name`) unsearchable in case Entities tab — colon parsed as Elasticsearch field separator. Workaround: search by bare hostname.
- **B-03 [Level 2]** Select-case modal survives parent entity flyout close — orphaned modal remains interactive and can create attachments.

**UX gaps confirmed (F-series):** toast says "updated" on new case creation (F-01); description required but no asterisk (F-02); beforeunload on unmodified case page (F-03); case picker defaults to Last 30 days silently (F-04); cancel on empty form shows "Discard?" dialog (F-05); hostname click triggers field-actions dialog simultaneously with flyout (F-06); alerts path needs 2 extra steps (F-07); delete only from Activity tab (F-08); closed-case "Select" disabled with no tooltip (F-09); search not real-time, header count stale (F-10); name field no maxlength DOM attr (F-11); case picker fires search twice per click (F-12); empty-string search returns 0 (F-13); Entities section absent (no empty state) when 0 attachments (F-14); delete button no in-flight guard (F-15); entity filter lost on page reload (F-16).

**Positive behaviors confirmed:** XSS-safe Create Case form; empty prerequisites gracefully handled; cancel paths clean; duplicate-entity guard on existing-case path (modal unmount); refresh survives in-flight correctly; flyout URL-encoded and survives page refresh; host not in entity store still shows Take action.

---

## Session findings — Entity Cases Attachments Missing Scenarios (2026-07-15-100117)

**12 new flows.** 2 Level 1 bugs, 10 Level 2 findings.

### Level 1 (file immediately)

**L1-01 [NEW]** Service entity has no flyout and no "Take action" from EA home — case attachment completely blocked. Inline data-grid expands in place; row-action button is `disabled`. Related to #268190 but more severe (no flyout at all, not gaps in flyout). All checklist steps 2–5 blocked by this root cause.

**L1-02 [SEVERITY UPGRADE #277750]** No duplicate guard on entity attachments — API stores separate records for each duplicate add (data integrity, not display-only). Each add increments case `version`. 4 records confirmed for 1 entity. No guard at any UI layer. Badge inflates; table deduplicates silently. "Select case" dialog gives no "already attached" indication. Also: no self-referential guard (L2-06) — entity from case row can be re-attached to same case.

### Level 2 (suspicious — review needed)

- **L2-01** Search filter while on page 2 renders "Page 2 of 1" — matching entities inaccessible. Filter must reset page cursor to 1. `POST /internal/cases/{id}/findAttachments` returns 404 on every Update click (falls back to cached data). Flow 1.
- **L2-02** Entities badge (32) does not match navigable count (30) — 2 attachments silently absent. Likely cause: entity with missing `riskScore`/`riskLevel` in attachment metadata triggers silent rendering failure. Flow 1.
- **L2-03** `GET /api/cases/{id}` returns `totalComment: 0` for cases with entity attachments (`security.entity` type excluded from public count). UI uses internal-only `/resolve` endpoint (gated by `x-elastic-internal-origin: Kibana`). External API consumers get false negative. Confirmed on two cases (32-entity and duplicate-entity cases). Flows 2, 3.
- **L2-04** `/resolve` endpoint called twice per page load; second call returns HTTP 400 ("not available with current configuration"). Silently swallowed. Flows 2.
- **L2-05** Entity store install API (`POST /api/security/entity_store/install → 403`) fires on every EA page load for a read-only user, **after** all four privilege checks confirmed missing privs and the "Privileges required" empty state rendered. Frontend gate failing. Flow 5.
- **L2-06** No self-referential duplicate guard — the current case appears as selectable in the "Add to existing case" modal with no disabled state or "already attached" badge. Creates new API record silently. No toast. Count updates only on reload. Flow 7.
- **L2-07** Case Attachments tab entity group card shows 0.00 risk score — reads `entity.relationships.resolution.risk.calculated_score_norm` (resolution cluster aggregate = 0 for directly indexed entities) instead of `entity.risk.calculated_score_norm` (entity's own risk) or `attachment.metadata.riskScore` (stored snapshot = 92.6). Activity tab correctly reads stored snapshot. Confirmed in Flows 8 and 12.
- **L2-08** Entity attachment row shows wrong empty state when entity not in store — renders alerts-grouping component message "No grouping results match your selected Group alerts field" instead of a contextual "entity not found" message. Attachment metadata not used as fallback. Systemic: affects deleted entities, never-indexed entities, stale ILM-rotated attachments. Flow 9.
- **L2-09** No success notification after attaching Timeline to a case — both "Attach to existing case" and "Attach to new case" paths succeed (HTTP 200) with zero user feedback. No toast, no navigation to new case. Flow 10.
- **L2-10 [#277996 scope expanded]** No success toast after "Add to existing case" from entity table — confirmed in BOTH fullscreen AND standard (non-fullscreen) view. Bug filed as "Full Screen view only" — scope is broader. Fix must cover entity flyout "Add to case" callback regardless of parent table display mode. Flow 11.

### Privilege testing gap (action required for future runs)

Both #277724 and #277736 require EA ES index read privileges in addition to Kibana cases privileges. Test roles `cases-read-role` and `cases-all-limited-role` were missing these; EA home rendered "Privileges required" and entity flyout was unreachable. Add five ES index `read` privileges (listed under Navigation patterns above) to both roles. Also add Machine Learning (read) Kibana feature for `cases-read-role`. Test users remain in environment (`cases-read-tester / ReadOnly123!`, `cases-all-tester / AllCases123!`).

### Upgrade compatibility (positive, Flow 12)

Case `6252d052` created 2026-07-14 renders correctly in Kibana 9.5.0 build 106168 — entity attachment records intact, metadata fields present, flyout opens, Activity tab shows stored snapshots. No schema migration breakage. `totalComment: 5` via resolve endpoint matches UI badge.
