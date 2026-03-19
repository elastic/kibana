# Plan: Option B – Expose Role/Effective-Privilege API for EDR Visibility

## Context

When a role has only **global "all"** for Security (`feature_siemV5.all`), the **Privilege Summary** correctly shows EDR sub-features as "None", but the **UI** (Manage section nav, direct EDR URLs) can show EDR tabs if capabilities incorrectly grant them. **Option A** fixes capability resolution (or adds a defensive switcher). **Option B** hardens the UI by deriving EDR visibility from the **same logic as Privilege Summary** and using that in link filtering.

This document plans **Option B** using an **effective-privilege API** exposed to the client.

---

## Goal

- Expose an API that returns the **effective feature privileges** for the **current user** (and optionally for a given space), using the same logic as the Privilege Summary in Stack Management → Roles.
- Security Solution (and optionally other consumers) use this API in `getManagementFilteredLinks()` (and route guards) to decide EDR link visibility, so nav matches the Privilege Summary even if capabilities are wrong.

---

## Privilege Summary Logic (reference)

- **Location:** `x-pack/platform/plugins/shared/security/public/management/roles/edit_role/privileges/kibana/privilege_summary/privilege_summary_calculator.ts`
- **Inputs:** A **role** (with `role.kibana`: array of `RoleKibanaPrivilege` entries: `{ base, feature, spaces }`) and **KibanaPrivileges** (from `@kbn/security-role-management-model`: secured features, primary/sub-feature privileges, `includeIn`, etc.).
- **Behavior:** For a given privilege **entry** (e.g. global `spaces: ['*']` or space-specific `spaces: ['default']`):
  1. **Collect assigned privileges:** Merge global entry (if any) with this entry via `createCollectionFromRoleKibanaPrivileges([global, entry])`.
  2. For each **feature**, compute:
     - **Displayed primary:** Which primary privilege (e.g. `all`, `read`) is effectively granted (including minimal variants).
     - **Effective sub-features:** Sub-feature privileges that are **granted** by the collection. Sub-features with `includeIn: 'none'` are **not** granted by primary "all" alone; they appear only if explicitly in the role’s `feature` for that entry.
- **Output:** `EffectiveFeaturePrivileges`: `{ [featureId]: { primary?, subFeature: string[], hasCustomizedSubFeaturePrivileges } }`.

So for a role with only `feature_siemV5.all` (no EDR sub-feature IDs in `feature`), effective privileges for siemV5 would be `primary: 'all'`, `subFeature: []` (no EDR sub-feature IDs). That is the single source of truth we want to expose.

---

## API Design

### Endpoint

- **Path (suggested):** `GET /internal/security/effective_privileges` or `GET /api/security/user/effective_privileges`
  - Prefer **internal** if only Security Solution (or other server-side plugins) will call it; use **api** if the browser client will call it directly. For Option B the **client** (Security Solution public) needs it, so an **API** route is required (or an internal route plus a BFF in Security Solution that proxies to it).
- **Query (optional):** `spaceId` – effective privileges can be space-specific (role can have different kibana entries per space). Default: current space from request context or `default`.
- **Auth:** Authenticated only; returns effective privileges for the **current user** only (no way to ask for another user/role).

### Response body (suggested)

```ts
// Effective privileges for the current user in the requested space.
interface EffectivePrivilegesResponse {
  spaceId: string;
  privileges: {
    [featureId: string]: {
      primary?: 'all' | 'read' | string;  // id of primary privilege
      subFeature: string[];               // ids of granted sub-feature privileges
      hasCustomizedSubFeaturePrivileges?: boolean;
    };
  };
}
```

- Security Solution only needs a subset (e.g. `privileges.siemV5`). Other consumers could use the full map.
- **Caching:** Response can be cached per (user, space) with invalidation on role/space change or short TTL (e.g. 60s) to avoid stale nav after role edits.

---

## Server Implementation

### 1. Where to implement

- **Owner:** Kibana Security plugin (platform). The logic is the same as Privilege Summary; the Security plugin already has access to roles, features, and the current user.
- **Option A (reuse model):** If `@kbn/security-role-management-model` (or equivalent) is usable on the server, add a server-side calculator that takes (role, spaceId, features) and returns `EffectiveFeaturePrivileges` for the entry that applies to `spaceId`. Register a route that: gets current user → loads their roles (with kibana privileges) → resolves the privilege entry for the requested space → runs the calculator → returns the result.
- **Option B (reimplement):** If the role-management-model is client-only, reimplement the effective-privilege rules on the server (same rules as PrivilegeSummaryCalculator: global + space entry merge, which primary is granted, which sub-feature privileges are granted). This is more work and must be kept in sync with the UI.

### 2. Resolving the privilege entry for the user + space

- Current user has `roles: string[]`.
- For the requested `spaceId`, we need the **merged** Kibana privilege that applies: same as in the calculator, we need the **global** kibana entry (spaces: `['*']`) if any, and the **space-specific** entry for `spaceId` if any, then merge (e.g. `createCollectionFromRoleKibanaPrivileges([global, entry])`).
- **Multi-role:** If the user has multiple roles, effective privileges are typically the **union** of what each role grants (Kibana usually unions privileges across roles). The API should return the effective result for the union of the user’s roles.

### 3. Dependencies

- **Features:** Use the same feature definitions as the rest of the stack (e.g. `features.getKibanaFeatures()`).
- **Roles:** Load role definitions (kibana privileges) via the existing role service or Elasticsearch role API. The Security plugin already has role CRUD and get-by-name; need a way to get “roles by names” for the current user’s role list.

### 4. Security and performance

- **Authorization:** Only return the **current user’s** effective privileges. Do not allow requesting another user or role name in the API.
- **Rate / caching:** Consider a short-lived cache (e.g. per user + space) to avoid recalculating on every nav load. Invalidate on role update or space switch if feasible.

---

## Client Implementation (Security Solution)

### 1. Call the API

- In code paths that need effective privileges (e.g. before rendering Manage nav), call the new API (e.g. `GET /api/security/user/effective_privileges?spaceId=<currentSpaceId>`).
- Prefer calling once per “app load” or “Manage section load” and reusing the result (or using a React context/store) so the nav and route guards share the same data.

### 2. Use in `getManagementFilteredLinks()`

- **Current behavior:** Uses `calculateEndpointAuthz(licenseService, fleetAuthz, currentUser.roles)` where `fleetAuthz` comes from **Fleet plugin** (capabilities-based). So EDR visibility is driven by capabilities.
- **Option B change:** Additionally (or instead) call the effective-privilege API. From the response, read `privileges.siemV5.subFeature`. Map EDR link visibility to required sub-feature IDs (e.g. Endpoint list → `endpoint_list_all` or `endpoint_list_read`; Trusted applications → `trusted_applications_all` or `trusted_applications_read`; etc.). If the user’s effective `subFeature` does **not** include the required ID for an EDR link, exclude that link.
- **Mapping:** Define a small map from `SecurityPageName` (or link id) to the minimum required siemV5 sub-feature privilege id(s). If `privileges.siemV5.subFeature` does not include any of those ids, hide the link. Primary "all" with empty `subFeature` → hide all EDR links.

### 3. Route guards

- For EDR pages, the privileged route can also use the same effective-privilege API (or the same cached result): if the user does not have the required sub-feature in `privileges.siemV5.subFeature`, show `NoPrivilegesPage` even if capabilities say otherwise.

### 4. Fallback / coexistence with capabilities

- Option B can run **in addition** to Option A (capabilities): e.g. show a link only if **both** capabilities and effective privileges allow it. That way, if capabilities are fixed later, behavior stays correct; if capabilities are wrong, effective privileges still hide EDR when appropriate.

---

## Mapping: EDR link → required sub-feature privilege(s)

Security Solution must define which sub-feature privilege IDs are required to see each EDR link. These should match the feature model (e.g. `kibana_sub_features.ts`). Example (to be validated against actual feature IDs):

| Link (SecurityPageName)     | Required siemV5 sub-feature privilege(s) (example) |
|----------------------------|------------------------------------------------------|
| endpoints                  | `endpoint_list_all` or `endpoint_list_read`         |
| policies                   | `policy_management_all` or `policy_management_read` |
| trustedApps                | `trusted_applications_all` or `trusted_applications_read` |
| trustedDevices             | `trusted_devices_*`                                  |
| eventFilters               | `event_filters_*`                                   |
| hostIsolationExceptions    | `host_isolation_exceptions_*`                       |
| blocklist                  | `blocklist_*`                                       |
| endpointExceptions         | `endpoint_exceptions_*`                             |
| responseActionsHistory     | `actions_log_management_*`                          |
| scriptsLibrary             | `scripts_management_*`                              |

(Exact IDs from `x-pack/solutions/security/packages/features` / sub-feature privilege ids.)

---

## Files to Touch (summary)

| Purpose | Location |
|--------|----------|
| **API route** | New route in Security plugin server, e.g. `x-pack/platform/plugins/shared/security/server/routes/authorization/` (e.g. `effective_privileges.ts`) |
| **Effective-privilege calculation (server)** | Either reuse role-management-model on server or new module that mirrors PrivilegeSummaryCalculator logic (same inputs: role kibana entries + features; same output shape) |
| **Client: call API** | Security Solution public: new hook or service that fetches effective privileges (e.g. `useEffectivePrivileges()` or `getEffectivePrivileges(core.http, spaceId)`) |
| **Client: link filtering** | `x-pack/solutions/security/plugins/security_solution/public/management/links.ts` – in `getManagementFilteredLinks()`, use effective privileges (and optionally keep Fleet authz as additional filter) to build `linksToExclude` |
| **Client: mapping** | New small module or constant in Security Solution: map SecurityPageName (EDR) → required siemV5 sub-feature privilege id(s) |
| **Route guard (optional)** | `privileged_route.tsx` or EDR route wrappers: use effective privileges to show NoPrivileges when sub-feature not granted |

---

## Testing

- **Server:** Unit tests for the effective-privilege calculation (same cases as PrivilegeSummaryCalculator: global all only → siemV5 subFeature empty; global all + explicit EDR sub-feature → subFeature contains those ids).
- **API:** Integration test: user with only `feature_siemV5.all` → GET effective_privileges → response has `privileges.siemV5.subFeature === []` (or equivalent).
- **Client:** Unit test for link-filter logic: given effective privileges with no EDR sub-features, `getManagementFilteredLinks` excludes all EDR links.
- **E2E:** Same as Option A: role with only global "all" → Manage section does not show EDR tabs; direct EDR URL shows no-privileges.

---

## Pros and cons vs Option A

- **Pros:** UI is correct even if capability resolution is wrong or slow to fix; single source of truth (Privilege Summary logic) for “what the user actually has”; no change to capability resolution or Fleet.
- **Cons:** New API and client dependency; must keep server calculation in sync with Privilege Summary; extra request (and possible cache) for nav; backend EDR APIs still rely on existing privilege checks (unchanged).

---

## Acceptance criteria

1. New API returns effective feature privileges for the current user (and optionally space).
2. For a user with only `feature_siemV5.all`, the API returns siemV5 with no EDR sub-feature ids in `subFeature`.
3. Security Solution uses this API in `getManagementFilteredLinks()` so that when effective privileges have no EDR sub-features, EDR links are excluded.
4. Direct navigation to an EDR path when effective privileges do not grant it shows no-privileges (via route guard using the same data).
5. No regression for users who have explicit EDR sub-feature privileges: they still see EDR links and can perform actions.
