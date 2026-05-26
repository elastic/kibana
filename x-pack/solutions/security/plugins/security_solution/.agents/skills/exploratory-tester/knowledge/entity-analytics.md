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
