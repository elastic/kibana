# Task Plan: EDR Tabs Visible Despite Global "All" Not Granting Access

## Problem Summary

When assigning **global "all"** permissions for the Security application (Manage / EDR section):

1. **Privilege Summary** (Stack Management → Roles → Edit role → View privilege summary) correctly shows EDR-related tabs as **none** access (sub-features are not granted).
2. **UI behavior**: The EDR tabs remain **visible** in the navigation. The user can open them but cannot perform actions (or sees no-privileges / disabled state).

**EDR tabs in scope:** Endpoint list, Automatic troubleshooting (Response Actions History), Trusted applications, Host isolation exceptions, Block list, Event filters (and related: Endpoint exceptions, Policies, Trusted devices, Scripts library where applicable).

---

## Root Cause Analysis (from codebase + Semantic Code Search MCP)

### 1. Where permissions are defined and displayed

| Area | Location | Behavior |
|------|----------|----------|
| **Privilege Summary** | `x-pack/platform/plugins/shared/security/public/management/roles/edit_role/privileges/kibana/privilege_summary/` | Uses `PrivilegeSummaryCalculator` and role's assigned Kibana privileges. Primary "all" does **not** auto-grant sub-feature privileges; expanded row shows EDR sub-features as "None" when only global "all" is assigned. |
| **Endpoint authz (backend)** | `x-pack/platform/plugins/shared/fleet/server/services/security/security.ts` | `getAuthzFromRequest` uses `calculatePackagePrivilegesFromKibanaPrivileges(privileges.kibana)` — derives Fleet authz from **resolved Kibana privileges** (role → privileges API). |
| **Endpoint authz (UI)** | `x-pack/platform/plugins/shared/fleet/public/plugin.ts` | Uses **capabilities**: `calculatePackagePrivilegesFromCapabilities(capabilities)`. So UI nav filtering depends on **Kibana capabilities**, not the role document. |
| **Management link filtering** | `x-pack/solutions/security/plugins/security_solution/public/management/links.ts` → `getManagementFilteredLinks()` | Calls `calculateEndpointAuthz(licenseService, fleetAuthz, currentUser.roles)` where `fleetAuthz` comes from **Fleet plugin's authz** (client-side = capabilities-based). Excludes EDR links when `canRead*` is false. |
| **Nav rendering** | `security_solution/public/common/links/nav_links.ts` → `useNavLinks()` | Consumes `applicationLinksUpdater.links$`, which is updated with **filtered** links from `getFilteredLinks()` (which includes `getManagementFilteredLinks()`). So nav **should** only show links that pass the filter. |
| **Route guard** | `security_solution/public/management/components/privileged_route/privileged_route.tsx` | When `hasPrivilege` is false, renders `NoPrivilegesPage` instead of the tab content. |

### 2. Likely root cause

- **Privilege Summary** reflects the **role** (assigned privileges). Global "all" = primary feature only; EDR sub-features are not in the role → shown as "None."
- **Capabilities** are resolved from the same role by Kibana core. If the **Security feature** (or the feature actually used for the role, e.g. `siem` / `securitySolution`) is defined so that primary **"all"** implies or merges with sub-feature privileges in capability resolution, then `capabilities.siem.readEndpointList`, etc., could still be **true**.
- **Fleet client-side authz** is built from capabilities. So if capabilities grant EDR read, `getManagementFilteredLinks` would **not** exclude those links → EDR tabs stay visible.
- **Backend** (e.g. artifact APIs) uses privileges from the request; those may correctly deny when only global "all" is assigned → user sees tabs but actions fail or show no data.

So the inconsistency is: **capability resolution** (role → capabilities) likely grants EDR-related capabilities when only global "all" is assigned, while **Privilege Summary** and **backend privilege checks** do not.

### 3. Key code references (for implementation)

- **Fleet authz from capabilities (UI):**  
  `x-pack/platform/plugins/shared/fleet/public/plugin.ts` (authz from `calculatePackagePrivilegesFromCapabilities(capabilities)`).
- **Fleet authz from Kibana privileges (server):**  
  `x-pack/platform/plugins/shared/fleet/common/authz.ts` — `calculatePackagePrivilegesFromKibanaPrivileges`, `ENDPOINT_PRIVILEGES`.
- **Endpoint authz calculation:**  
  `x-pack/solutions/security/plugins/security_solution/common/endpoint/service/authz/authz.ts` — `calculateEndpointAuthz(licenseService, fleetAuthz, currentUser.roles)`; `hasAuth` uses `fleetAuthz.packagePrivileges?.endpoint?.actions[...].executePackageAction`.
- **Management link filtering:**  
  `x-pack/solutions/security/plugins/security_solution/public/management/links.ts` — `getManagementFilteredLinks`; excludes links when `!canRead*` from `calculateEndpointAuthz`.
- **Security feature definitions (primary vs sub-features):**  
  `x-pack/solutions/security/packages/features/src/security/` — v1 (siem), v5 (securitySolution) kibana features; sub-features in `kibana_sub_features.ts`. Product feature config: `product_feature_config.ts`.
- **Privilege Summary:**  
  `x-pack/platform/plugins/shared/security/public/management/roles/edit_role/privileges/kibana/privilege_summary/privilege_summary_calculator.ts` — `getEffectiveFeaturePrivileges`; sub-features only granted if explicitly in assigned privileges.

---

## Recommended Fix (align UI with Privilege Summary)

**Goal:** When a role has only global "all" (no EDR sub-feature privileges), EDR tabs must **not** be visible in the Manage section. Optionally, ensure backend and UI both deny EDR actions for such roles.

**Chosen approach: Option A** (fix capability resolution).

### Option A – Fix capability resolution (preferred) ✓ CHOSEN

- **Owner:** Kibana Security / Fleet or Platform (whoever owns feature → capability resolution).
- **Action:** Ensure that for the Security application feature, primary privilege **"all"** does **not** automatically grant EDR sub-feature capabilities (e.g. `readEndpointList`, `readTrustedApplications`, `readEventFilters`, `readBlocklist`, `readHostIsolationExceptions`, `readPolicyManagement`, `readActionsLogManagement`, etc.) unless the role explicitly has those sub-feature privileges or a dedicated "all" that includes them.
- **Result:** Capabilities will match Privilege Summary; Fleet's client-side authz will have no EDR read → `getManagementFilteredLinks` will exclude EDR links → tabs hidden. Route guard and APIs will continue to deny as today.

### Option B – Harden UI using same source as Privilege Summary

- **Action:** If changing capability resolution is not feasible, the Security Solution could derive "effective" EDR access from the **same logic as Privilege Summary** (e.g. from role + feature model) and pass that into link filtering. This would require either:
  - Exposing a role/effective-privilege API to the client and using it in `getManagementFilteredLinks`, or
  - Duplicating the privilege-summary logic in the client (fragile and not ideal).
- **Result:** Nav and route guards could hide/block EDR even when capabilities incorrectly grant them. Backend would still rely on privilege checks.
- **Detailed plan (effective-privilege API):** See [edr_option_b_effective_privilege_api_plan.md](./edr_option_b_effective_privilege_api_plan.md).

### Option C – Document and accept; only fix UX

- **Action:** If product decision is that global "all" **should** grant EDR in the future, then:
  - Fix **Privilege Summary** to show EDR as having access when global "all" is assigned (so summary matches actual capability resolution), and/or
  - Ensure **backend** grants EDR when role has global "all", so that users with "all" can actually perform actions. Then tab visibility would be correct and actions would work.
- **Result:** No inconsistency; either summary and capabilities both grant EDR, or both don’t.

---

## Implementation Steps (if Option A)

1. **Confirm capability source**  
   - Reproduce with a role that has only global "all" for Security.  
   - Inspect `core.application.capabilities` (or the capabilities passed to Fleet) and confirm that EDR-related keys (e.g. `siem.readEndpointList`, `siem.readTrustedApplications`, …) are `true` when they should be `false`.

2. **Locate feature → capability mapping**  
   - Find where the Security feature (siem / securitySolution) primary "all" is translated into capabilities (Kibana core or x-pack feature service).  
   - Ensure EDR sub-feature UI/API privileges are only added when the role has the corresponding sub-feature or an explicit "all" that includes them (per feature definition).

3. **Adjust feature definition or capability merger**  
   - Either remove EDR privileges from the primary "all" grant in the feature config, or change the merger so that sub-features are not auto-granted when only primary "all" is assigned.  
   - Re-run role → capability resolution tests and confirm EDR capabilities are false for "global all only" roles.

4. **Regression tests**  
   - Role with global "all" only: EDR tabs not visible; opening EDR URL shows no-privileges or redirect.  
   - Role with global "all" + explicit EDR sub-features: EDR tabs visible and actions work.  
   - Existing E2E for management RBAC (e.g. `endpoint_role_rbac_with_space_awareness.cy.ts`) and any privilege-summary tests.

5. **Optional: Backend consistency**  
   - Verify that artifact/EDR APIs use the same privilege model (no EDR access when only global "all") so that API and UI stay in sync. **Verified:** Server-side EDR authz uses the same privilege model. `EndpointAppContextService.getEndpointAuthz(request)` calls Fleet’s `getAuthzFromRequest(request)` (`x-pack/platform/plugins/shared/fleet/server/services/security/security.ts`), which uses `checkPrivilegesDynamicallyWithRequest(req)` with the same EDR UI/API actions as in `ENDPOINT_PRIVILEGES`. So when the role has only `feature_siemV5.all` (no EDR actions in registered privileges), the backend correctly denies EDR API access. Artifact routes use `withEndpointAuthz` or validators that rely on this `getEndpointAuthz()`; no change needed.

### Option A – Implementation notes

- **Feature definitions:** Security (siemV5) primary "all" already has only `ui: [show, crud]`. EDR sub-features in `kibana_sub_features.ts` use `includeIn: 'none'`, so they should not be merged into base "all" when `featurePrivilegeIterator` runs with `augmentWithSubFeaturePrivileges: true` (see `x-pack/platform/plugins/shared/features/server/feature_privilege_iterator` tests: "ignores sub features when includeIn is none").
- **Capability key:** Fleet reads `capabilities[SECURITY_SOLUTION_APP_ID]` where `SECURITY_SOLUTION_APP_ID = 'siemV5'` (`x-pack/platform/plugins/shared/fleet/common/constants/authz.ts`). So the capability namespace for EDR is `siemV5` (e.g. `siemV5.readEndpointList`).
- **Where to fix if resolution is wrong:**  
  - **Privilege registration:** `x-pack/platform/packages/private/security/authorization_core/src/privileges/privileges.ts` — ensure primary "all" for siemV5 (and composable siem.all → siemV5.all) never gets EDR actions.  
  - **Capability switcher:** Security plugin’s switcher uses `disable_ui_capabilities.ts` and `checkPrivilegesDynamically`; each capability is gated by the corresponding UI action. So if "all" does not grant EDR actions in the registered privileges, capabilities should already be false. If the bug reproduces, add a test that assigns only `feature_siemV5.all` and assert resolved capabilities do not include any EDR UI keys.
- **Defensive fallback (if root cause is outside Security Solution):** Register a **capabilities switcher** in the Security Solution plugin that, for the `siemV5` (or `securitySolution`) feature, calls the authorization service to check EDR-related UI actions and sets each EDR capability to `false` when the user does not have that action. This keeps the fix in the Security Solution codebase and guarantees EDR tabs stay hidden even if another layer incorrectly grants EDR capabilities.

---

## Semantic Code Search MCP usage (for follow-up)

The plan was informed by:

- **Server:** `user-SemanticCodeSearch`  
- **Tool:** `semantic_code_search`  
- **Queries used:**  
  - "EDR Manage section permissions privilege summary global all override" with `filePath: *security*`  
  - (Second query was skipped by user; remaining context came from grep and codebase search.)

Further MCP queries that can help during implementation:

- "Where are Kibana capabilities for Security feature resolved from role privileges?"
- "How does Fleet get endpoint package privileges from capabilities or Kibana privileges?"
- "Security feature primary all privilege and sub-feature privileges mapping"

---

## Files to touch (summary)

| Purpose | Files / areas |
|--------|----------------|
| Capability / feature resolution | Kibana core feature service or Security feature definitions in `x-pack/solutions/security/packages/features/`, product_features |
| Fleet client authz | `x-pack/platform/plugins/shared/fleet/public/plugin.ts`, `common/authz.ts` |
| Management link filtering | `x-pack/solutions/security/plugins/security_solution/public/management/links.ts` |
| Tests | Management RBAC Cypress, Fleet authz tests, privilege summary tests |

---

## Acceptance criteria

1. For a role with **only** global "all" on the Security application (no EDR sub-features):  
   - Privilege Summary shows EDR tabs as "None" (unchanged).  
   - EDR tabs are **not** visible in the Manage section navigation.  
   - Direct URL access to EDR pages shows no-privileges (or equivalent) and no actions are possible.

2. For a role with global "all" **plus** explicit EDR sub-feature privileges:  
   - EDR tabs are visible and actions work as today.

3. No regression for roles that already have explicit EDR sub-feature assignments.

---

## Next steps (Option A)

1. **Reproduce** with a role that has only global "all" for Security (e.g. `feature_siemV5.all` or `feature_siem.all` with no EDR sub-features). Confirm EDR tabs are visible and capabilities include EDR keys (e.g. in browser devtools or by logging `core.application.capabilities` after login).
2. **Trace** capability resolution: confirm which feature id and privilege are used (siemV5 vs siem), and whether the registered privilege "all" for that feature includes EDR actions in `x-pack/platform/packages/private/security/authorization_core/src/privileges/privileges.ts` (e.g. by adding a unit test with only primary "all" and asserting no EDR actions). **Done:** see [Trace: Capability Resolution (Plan 2)](#trace-capability-resolution-plan-2--completed) below; feature id is siemV5, and with `includeIn: 'none'` the registered "all" should not include EDR actions. Unit test added in `privileges.test.ts` (siemV5-like feature, includeIn: 'none', assert no EDR in all).
3. **Fix** either in authorization core (ensure primary "all" never gets EDR actions) or via the defensive capabilities switcher in the Security Solution plugin (clear EDR capabilities when the user lacks the corresponding UI privilege). **Done:** defensive capabilities switcher added in Security Solution server: `server/lib/capabilities/edr_capabilities_switcher.ts` clears each EDR capability under `siemV5` when the user does not have the corresponding UI action; registered in `plugin.ts` setup with `capabilityPath: ['siemV5']`.
4. **Add** E2E or Cypress test: role with global "all" only → Manage section does not show EDR tabs; direct navigation to an EDR path shows no-privileges. **Done:** extended `navigation.cy.ts` (ESS, "NONE access" with `siemVersion: ['all']` only): added it "direct navigation to EDR paths shows no-privileges page" that visits `APP_ENDPOINTS_PATH` and `APP_TRUSTED_APPS_PATH` and asserts `getNoPrivilegesPage().should('exist')`. The existing tests in that block already assert no EDR links in nav and no EDR cards on Management page.

---

## Trace: Capability Resolution (Plan 2 – completed)

This section documents the capability resolution flow so we can see where EDR capabilities come from and why they might stay visible when only global "all" is assigned.

### 1. End-to-end flow

| Step | Location | What happens |
|------|----------|--------------|
| **1. Base capabilities** | `x-pack/platform/plugins/shared/features/server/ui_capabilities_for_features.ts` | `getCapabilitiesFromFeature()` builds capabilities from every Kibana feature. For each feature it flattens **all** privileges (primary + sub-feature) and sets each `privilege.ui` capability to `true`. So `capabilities.siemV5.readEndpointList`, `capabilities.siemV5.readTrustedApplications`, etc. are initially `true` for everyone. |
| **2. Capabilities provider** | `x-pack/platform/plugins/shared/features/server/plugin.ts` | Features plugin registers `core.capabilities.registerProvider(() => this.capabilities)` where `this.capabilities = uiCapabilitiesForFeatures(...)`. So the **default** capabilities include all feature UI keys as true. |
| **3. Capabilities switcher** | `x-pack/platform/plugins/shared/security/server/authorization/disable_ui_capabilities.ts` + `authorization_service.ts` | Security plugin registers a switcher that runs per request. It calls `disableUICapabilities.usingPrivileges(uiCapabilities)`. For each capability it: gets the action via `authz.actions.ui.get(featureId, uiCapability)` (e.g. `siemV5`, `readEndpointList`), then checks if the user has that action in `checkPrivilegesResponse.privileges.kibana`. If not authorized, the capability is set to `false`. |
| **4. User’s actions** | Resolved from role | The user’s authorized actions come from the role’s **assigned** Kibana privileges (e.g. `feature_siemV5.all`) mapped to **registered** privileges. Registered privileges are built in `x-pack/platform/packages/private/security/authorization_core/src/privileges/privileges.ts` by `privilegesFactory()` using the same feature definitions from the Features plugin. |
| **5. Fleet UI authz** | `x-pack/platform/plugins/shared/fleet/public/plugin.ts` + `common/authz.ts` | Fleet uses **capabilities** (not raw role) for client-side authz: `calculatePackagePrivilegesFromCapabilities(capabilities)`. It reads `capabilities[SECURITY_SOLUTION_APP_ID]` = `capabilities['siemV5']` and maps keys like `readEndpointList`, `readTrustedApplications` to endpoint package privileges. So if the switcher has set `capabilities.siemV5.readEndpointList === false`, Fleet will not grant that EDR privilege. |
| **6. Management links** | `x-pack/solutions/security/plugins/security_solution/public/management/links.ts` | `getManagementFilteredLinks()` uses `calculateEndpointAuthz(licenseService, fleetAuthz, currentUser.roles)` where `fleetAuthz` comes from Fleet’s authz (capabilities-based on the client). So EDR tab visibility follows Fleet’s package privileges, which follow **resolved capabilities** after the switcher. |

**Conclusion:** If the **registered** privilege `siemV5.all` (built by `privilegesFactory`) does **not** include EDR UI actions, then a role with only `feature_siemV5.all` will not have those actions → the switcher will set EDR capabilities to false → Fleet and management links will hide EDR. So the critical point is what ends up in `featurePrivileges.siemV5.all` in authorization_core.

### 2. Feature id used for capabilities

- **Fleet** uses `SECURITY_SOLUTION_APP_ID = 'siemV5'` (`x-pack/platform/plugins/shared/fleet/common/constants/authz.ts`) when reading capabilities: `capabilities['siemV5']`.
- **Security feature** is registered with id `SECURITY_FEATURE_ID_V5 = 'siemV5'` (`x-pack/solutions/security/packages/features/src/constants.ts`).
- **Capability namespace** for EDR is therefore `siemV5` (e.g. `siemV5.readEndpointList`). The switcher uses `authz.actions.ui.get('siemV5', 'readEndpointList')` and checks that action against the user’s resolved privileges.

So the feature id used for capability resolution and for EDR is **siemV5** (not `siem` or `securitySolution`).

### 3. Whether primary "all" includes EDR actions

- **Feature definition:** `x-pack/solutions/security/packages/features/src/security/v5_features/kibana_features.ts` defines siemV5 with `privileges.all.ui: [SECURITY_UI_SHOW, SECURITY_UI_CRUD]` only (no EDR).
- **Sub-features:** EDR sub-features (endpoint list, trusted applications, event filters, etc.) are defined in `x-pack/solutions/security/packages/features/src/security/kibana_sub_features.ts` with **`includeIn: 'none'`**.
- **Feature privilege iterator:** `x-pack/platform/plugins/shared/features/server/feature_privilege_iterator/feature_privilege_iterator.ts` merges sub-feature privileges into a base privilege only when `subFeaturePrivilege.includeIn === 'read'` or `subFeaturePrivilege.includeIn === privilegeId` (e.g. `'all'`). For `includeIn: 'none'` it **does not** merge (line 79: `continue`). So when building `siemV5.all`, the iterator does **not** add EDR sub-feature UI actions.
- **Privileges registration:** In `privileges.ts`, `featurePrivileges[feature.id]['all']` is built from `featuresService.featurePrivilegeIterator(feature, { augmentWithSubFeaturePrivileges: true })`. So the registered `siemV5.all` should contain only the primary privilege actions (show, crud) plus login, and **no** EDR UI actions.

**Conclusion:** With the current feature definitions and iterator behavior, the registered privilege **siemV5.all** should **not** include EDR actions. So in theory, a role with only `feature_siemV5.all` should get EDR capabilities set to false by the switcher.

### 4. If the bug still reproduces – what to check next

1. **Reproduce and inspect:** Create a role with only `feature_siemV5.all`, log in, and inspect `core.application.capabilities['siemV5']` (e.g. in browser or via `/api/core/capabilities`). If EDR keys are still `true`, the switcher is not disabling them, which would mean the user’s resolved privileges **do** include those actions (so either the registered `siemV5.all` is wrong, or the role has additional privileges).
2. **Unit test with real feature:** Add (or run) a test that uses the **actual** Security feature definition (from the features package) in `privilegesFactory` and asserts that `actual.features.siemV5.all` does not contain any EDR UI action IDs. The existing test in `privileges.test.ts` uses a **mock** siemV5-like feature with `includeIn: 'none'` and already asserts no EDR in `all`; that validates the iterator + privileges logic. A test that loads the real registered feature would confirm no other code path adds EDR to `all`.
3. **Global / space “all”:** Confirm the role has only **feature** `feature_siemV5.all` and not **global** or **space** “all” that might pull in a different set of actions (e.g. `global.all` includes `allActions` from base privileges; for siemV5 base “all” we’ve established it should still be show/crud only).
4. **Defensive fix:** If the root cause is elsewhere or hard to change, implement the defensive capabilities switcher in the Security Solution plugin (per plan): for `siemV5`, explicitly set each EDR capability to false when the user does not have the corresponding UI action.
