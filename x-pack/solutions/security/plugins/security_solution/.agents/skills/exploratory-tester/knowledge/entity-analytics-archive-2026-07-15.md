# Entity Analytics — Exploratory Testing Knowledge

**Last updated:** 2026-05-26  
**Session:** Serverless QA, SAML project owner role, 7 journeys, space `exploratory-testing`

---

## Confirmed bugs (open as of 2026-05-26)

| Bug # | Title | Status |
|-------|-------|--------|
| #270175 | Platform Engineer unable to view Engine Status tab | Open |
| #266453 | Watchlists UI vs Entity Store off | Open |

## Key findings from this session

### Authentication (serverless)
- Serverless Elastic Cloud requires SAML login via `?auth_provider_hint=cloud-saml-kibana`; cloud-basic auth does not work for SAML-only deployments.
- SAML users are assigned a numeric internal ID (e.g., `898899895`); if the ID appears in privilege errors, it indicates the SAML role mapping is not assigning the correct Kibana security privileges.

### EA enablement (Status toggle)
- The SAML project owner may lack `entity_analytics` management privileges in serverless environments — the toggle produces HTTP 500 on `/internal/risk_score/engine/settings` and HTTP 403 on `/api/security/entity_store/install`.
- This is the root blocker for all downstream EA features.

### Management page tab structure
- The management page always shows exactly 3 tabs when EA is Off: **Entity Risk Score**, **Asset Criticality**, **Entity Resolution**.
- The **Engine Status** tab is absent when EA is Off (possibly conditional on enablement; also related to known bug #270175).
- Error callouts from the Status toggle persist across all 3 tabs and have no dismiss button.

### Asset criticality import
- Entry: `Security > Admin and settings > Entity analytics > Asset Criticality` tab.
- Format: CSV/TSV/TXT, max 1 MB. Required columns: `type`, `criticality_level`. Identifier columns: `user.name`, `user.email`, `host.name`, `host.hostname`, `service.name`, etc.
- Valid criticality values: `extreme_impact`, `high_impact`, `medium_impact`, `low_impact`, `unassigned`.
- **Known gap:** Client-side validation does not check for required columns before showing the Assign button. A file missing `criticality_level` is accepted in preview with a misleading "N levels will be assigned" count.
- **Known gap:** When the entity store index does not exist, all rows fail with `index_not_found_exception: no such index [.entities.v2.latest.security_<space>-<suffix>]`.
- API: `POST /internal/asset_criticality/upload_csv_v2`

### Entity resolution import
- Entry: `Security > Admin and settings > Entity analytics > Entity Resolution` tab.
- Format: CSV/TSV/TXT, max 1 MB. Required columns: `type`, `resolved_to`. Additional columns are identity fields for AND-combined matching.
- The wizard has 3 steps: Select file → File validation → Results.
- **Positive:** Step 2 validates file structure client-side and shows "N valid rows" before allowing upload — better than Asset Criticality.
- **Known gap:** The upload API (`POST /api/entity_store/resolution/upload_csv`) returns 404 in this environment build. The Results step renders blank with no error message on failure — user is stranded.

### Watchlists
- No standalone URL exists for Watchlists — it is embedded in the Entity Analytics home page, only accessible when EA is On.
- When EA is Off, all watchlist-related navigation redirects to either the EA home page (empty state) or the Get Started launchpad.
- Known bug #266453 covers this exact scenario.
- API `POST /api/entity_analytics/watchlists/install` returned 404 during the toggle attempt, suggesting the watchlists API route may also be missing in some builds.

### Environment setup notes
- The API endpoint `POST /api/entity_store/enable` (using API key auth) can initialize 3 engines (user, host, service) reporting "installing" status, but this does NOT enable EA via the UI toggle or create the entity store index.
- The entity store index name pattern is: `.entities.v2.latest.security_<space-id>-<suffix>` (e.g., `.entities.v2.latest.security_exploratory-testing-00001`).
- The Alerts page requires a security data view to be configured; without one it shows "Unable to retrieve the data view".
- The Hosts and Users Explore pages show the onboarding empty state when no security integrations are configured.

---

## Entity Cases Attachments — Session findings (2026-07-14)

**Session:** Stateful, elastic admin, default space, `upgrade-with-bc-ce734a` environment, 10 flows

### Feature mechanics
- Entity attachments are attached via "Take action → Add to new/existing case" from entity flyouts.
- Attachments are **not counted** in `totalComment` on the Cases API — always 0 regardless of how many entity attachments exist. The "Entities N" counter in the case Attachments tab UI is the authoritative count.
- Entity attachments appear in two places: the **Attachments tab** (Entities section) and the **Activity stream**.
- The API endpoint to list them is `GET /api/cases/{id}/comments?type=externalReference`.
- flyout URL uses `contextID: entity-analytics-home-table` from EA page vs `contextID: entity-analytics-case-attachment-table` from case Attachments tab row.

### Entry points confirmed
- EA home page (`/app/security/entity_analytics_home_page`) — full flyout, "Take action" directly accessible
- Hosts Explore page (`/app/security/hosts/allHosts`) — full flyout, "Take action" accessible (clicking hostname also triggers field-actions dialog; F-06)
- Alerts table (`/app/security/alerts`) — requires 2 extra steps: alert → preview panel (no Take action) → "Show full host details" → full flyout → Take action
- Case Attachments tab row ("Open entity details") — full flyout opens with correct contextID and "Take action" accessible

### Lifecycle behaviors
- **Closed case guard:** "Select" button is `disabled:true` for closed cases in the picker modal. No API call fires. No tooltip or accessible description provided for the disabled state (F-09).
- **Delete:** Only accessible from Activity tab → entity event → ellipsis → "Delete attachment" → confirmation dialog. No delete control exists on the Entities section row in Attachments tab (F-08).
- **Double-click idempotency:** Two synchronous `.click()` calls on "Select" create exactly 1 attachment. Modal unmounts on first click; second click is a no-op (detached element).
- **Case reopened via API:** `PATCH /api/cases` with `{status: "open", version: "..."}` — requires current version from `GET /api/cases/{id}`.

### UX gaps confirmed
- Toast says "Case updated" on new case creation (should say "created") (F-01)
- Description required but no asterisk marker in Create Case form (F-02)
- Beforeunload dialog fires on unmodified case page (comment editor mounts dirty) (F-03)
- "Select case" modal defaults to Last 30 days, no visible filter indicator (F-04)
- Cancel on empty Create Case form shows "Discard case?" confirmation dialog (F-05)
- Entities section search not real-time; requires "Update" button click; header count not updated on filter (F-10)

### Known bugs (as of 2026-07-14)
| Bug # | Title | Triggered? |
|-------|-------|------------|
| #277724 | Unauthorized with READ cases access | Not triggered (admin user) |
| #277736 | Unauthorized with disabled sub-feature privileges | Not triggered (no privilege customization) |
| #277750 | Incorrect entity count on duplicate attach | **Reproduced** 2026-07-15: heading "Entities 4" shown with 2 distinct entities after same entity attached twice |

### Test environment notes
- `GET /api/asset_criticality?id_value=X&id_field=host.name` returns 404 when no criticality is set (by design; UI shows "Unassigned")
- `POST /api/security/api_key` returned 404 — ES API key used for ES operations; basic auth used for Kibana API
- Case page: Kibana native API key (`/api/security/api_key`) not available; use `Authorization: Basic` header for all Kibana REST calls

---

## Entity Cases Attachments — Steps 2–5 findings (2026-07-15)

**Session:** `entity-analytics-entity-cases-attachments-20260715-041422` (continuation of 20260714 session)
**Coverage:** All 10 flows × all 5 checklist steps now complete.

### New bugs found in Steps 2–5

**[LEVEL 1 — File this] "Create case" button not disabled while in-flight — double-click creates duplicate cases**
- Two `POST /api/cases` requests fire 18ms apart when "Create case" is double-clicked; both return 200 and create identical cases.
- Button `disabled` state is NOT set between clicks — no submit guard.
- No error toast or duplicate warning shown to the user.
- Likely affects ALL case creation paths in Security Solution, not only entity attachment flow. (Deferred investigation: `/app/security/cases` → Create case directly.)

**[LEVEL 2] Entity ID colon-notation unsearchable in case Entities tab**
- Searching `host:entity-name` in the case Attachments tab search box returns 0 results.
- The colon is parsed as an Elasticsearch field separator, not a literal character.
- Workaround: search by bare hostname (e.g., `ahmadkie` instead of `host:ahmadkie`).
- Entity IDs are the primary identifier shown in the Entities table — this makes them non-searchable.

**[LEVEL 2] Select-case modal survives parent flyout close**
- Closing the entity flyout while the "Add to existing case" modal is open leaves the modal orphaned but functional.
- Clicking "Select" in the orphaned modal successfully creates an entity attachment.
- Reproduced consistently in Flow 9 and Flow 10. Product decision needed: close modal with flyout, or retain it.

### Additional Step 2–5 observations

- **No maxlength on Name field** — 160-char server limit discovered only on submit; no character counter.
- **Case picker fires search twice per click** — `POST /internal/cases/_search` double-trigger on "Update" button.
- **Empty search doesn't reset list** — clearing case picker search returns 0 results instead of full list; must use × button.
- **Entities section absent when 0 attachments** — no empty-state placeholder (Observables section does have one).
- **Delete button no in-flight guard** — modal unmount prevents duplicate DELETE in practice, but DOM guard is absent.
- **Entity search filter not URL-encoded** — filter persists via React state across tab switches but is lost on page reload.
- **"Add to new case" independent of existing case status** — creating a new case works even when another case is closed.
- **Host not in entity store shows Take action** — feature not gated on entity store membership.
- **Flyout URL-encoded correctly** — entity flyout survives page refresh, re-opens to correct entity with Take action functional.
- **XSS protection on Create Case** — HTML tags stripped in description; no injection or script execution.

### Navigation notes (Steps 2–5 additions)
- After `browser_navigate`, always call `browser_handle_dialog(accept: true)` if beforeunload fires, then retry.
- The "Expand details" button in the entity flyout opens a LEFT panel within the flyout framework — does NOT navigate away from the case page.
- The entity search filter in case Attachments tab uses `POST /internal/cases/{id}/findAttachments` (not a URL param) — clearing requires the × button, not backspace.

---

## Checklist coverage per journey (this session)

| Journey | Steps tested | Blocked by |
|---------|-------------|------------|
| A — Setup & Enablement | 1–5 (all) | Level 1 on step 1; steps 3–5 observable |
| B — Daily Risk Monitoring | 1 | EA Off |
| C — Entity Investigation from Alerts | 1 | No data view |
| D — Asset Criticality Management | 1, 3 | Entity store index missing |
| E — Host/User Risk Investigation | 1 | No security data |
| F — Entity Resolution Administration | 1 | API 404 |
| G — Watchlists Management | 1 | EA Off, no URL |

---

## Session findings — Entity Cases Attachments (2026-07-14 / 2026-07-15-041422)

_Archived from `entity-analytics.md` on 2026-07-29 per Task 6 (hash-gated, compact knowledge loading) — narrative session findings are no longer kept in the active, auto-loaded knowledge file; they remain here for explicit lookup only. Bug numbers already tracked as suppressible non-bugs or known open bugs are still reflected in `entity-analytics.md`'s `## Known non-bugs` section and `config.json → known_open_bugs`; this section is the full original narrative for reference._

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

Both #277724 and #277736 require EA ES index read privileges in addition to Kibana cases privileges. Test roles `cases-read-role` and `cases-all-limited-role` were missing these; EA home rendered "Privileges required" and entity flyout was unreachable. Add five ES index `read` privileges (listed under Navigation patterns above) to both roles. Also add Machine Learning (read) Kibana feature for `cases-read-role`. Test users (`cases-read-tester`, `cases-all-tester`) remain in that session's now-torn-down environment — credentials intentionally not recorded here; recreate fresh test users per `phases/1-wait-and-login.md` for any future run.

### Upgrade compatibility (positive, Flow 12)

Case `6252d052` created 2026-07-14 renders correctly in Kibana 9.5.0 build 106168 — entity attachment records intact, metadata fields present, flyout opens, Activity tab shows stored snapshots. No schema migration breakage. `totalComment: 5` via resolve endpoint matches UI badge.
