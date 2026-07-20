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
