# AlertZero onboarding e2e — ROUTE_MAP (Task 0 deliverable, gates Tasks 3+)

Verified against this worktree's `upstream/main` base (commit `4ffa88335b75f`), 2026-10-26.
All paths relative to repo root. This file is the route/privilege/index map the onboarding
e2e suite depends on; Task 3+ fixtures must match it.

## 1. Enable/disable semantics — what defines "onboarding shown" vs "main app"

- The landing page decides **client-side from worker state**, not from a route:
  `hasEnabledWorker = workers.data?.workers.some((w) => w.enabled) ?? false`
  (`x-pack/solutions/security/plugins/alertzero/public/pages/landing_page.tsx:33`) — any
  enabled worker → queue ("main app"); none → `OnboardingPage` (landing_page.tsx:78).
- A **session latch** (`decision: 'queue' | 'onboarding'`, landing_page.tsx:19,52) keeps a
  mid-session window-focus refetch from flipping queue→onboarding while saves settle
  (landing_page.tsx:56-63). Test 4.3 (reload latch) drives this.
- Server-side, every worker route is wrapped by `withAlertZeroEnabled`
  (`server/routes/with_alertzero_enabled.ts:21-53`):
  - `securitySolution:enableAlertZero` (`ALERTZERO_ENABLED_SETTING_ID`,
    `kbn-alertzero-common/constants.ts:25`) off → **404** (line 27-30)
  - subscription ≠ `available` → **403** (lines 31-45)
  - dependencies unavailable → **503** (lines 46-51)
- There is **no `onboarding/enable` route** — enablement is the per-worker PATCH flow:
  `use_enable_workers.ts` (public/pages/onboarding) creates service accounts then PATCHes
  each selected worker `enabled:true`. Confirmed: `grep -rn "onboarding" server/` → no route.
- Enablement writes managed workflows via `managedWorkflows`
  (`server/services/workers/workers_service.ts:29-32,270-335`): no account →
  `{outcome:'rejected', what:'a worker that is enabled without a service account'}`
  (workers_service.ts:281-283); missing account on enable is rejected.

**Onboarding shown = zero enabled workers in GET /internal/alertzero/workers.**
**Main app = ≥1 enabled worker.** Both reachable through the workers API alone.

## 2. Disable path — surface + managed-workflow assertion

- API: `PATCH ALERTZERO_WORKER_URL_TEMPLATE` (`/internal/alertzero/workers/{workerId}`,
  `kbn-alertzero-common/constants.ts:42-47`) with `{enabled:false}`. Authz identical to
  enable (see §3).
- UI surface in the main app (Watches settings): `alertZeroWorkerEnabledSwitch-${id}`
  switches; same PATCH under the hood.
- Managed-workflow assertion route: **`GET /api/workflows?managed=managed`**
  (`src/platform/plugins/shared/workflows_management/server/api/routes/workflows/get_workflows.ts:91`,
  managed filter literal at :55-57). Disable → the worker's managed workflow disappears
  from this list (worker_id → workflowId mapping via `worker_registry` +
  `getManagedWorkflowDefinition`, workers_service.ts:29-32,52-56).

## 3. Privileges — gating Continue/Enable + minimal read-only role

- Route authz (`server/routes/workers/update_worker.ts:80-115`):
  - `requiredPrivileges: [ALERTZERO_API_PRIVILEGE_WRITE]` → `'alertzero_write'`
    (`common/constants.ts:37`)
  - `extendedPrivileges: [...WorkflowsManagementOperationPrivileges.updateManaged]` —
    "Enabling or disabling a worker requires update access to managed workflows" (:114)
  - cluster privilege `manage_security` (:103) — "Modifying a worker requires the
    manage_security cluster privilege"
- UI write gate: `canWrite = Boolean(application.capabilities[ALERTZERO_FEATURE_ID]?.write)`
  (`public/pages/onboarding/onboarding_page.tsx:43`) — drives Continue/Enable disabled +
  `alertZeroOnboardingModifyForbidden`.
- Read side: `ALERTZERO_API_PRIVILEGE_READ = 'alertzero_read'` (`common/constants.ts:30`).
- **Minimal read-only `KibanaRole`** for `browserAuth.loginWithCustomRole` (Task 4.4):
  feature privileges `alertzero: ["read"]` only — no `write` capability, no
  `manage_security` cluster privilege, no `updateManaged` extended privilege. Built as a
  `KibanaRole` descriptor in the spec (pattern: `kbn-scout-security`
  `browser_auth/index.ts:49`).

## 4. Proposals closed-window — index, doc shape, field, constant

- Index: write alias **`.kibana-proposals`** (write index `.kibana-proposals-000001`);
  same alias the plugin's storage adapter uses. Index template + mapping install and doc
  shape for ES-write seeding: **port `seedProposal` + `ensureProposalsIndex` verbatim from
  `x-pack/platform/plugins/shared/proposals/test/scout_alertzero/api/fixtures/helpers.ts`**
  (`seedProposal` at :227-275, template at :78-170; mapping fields incl.
  `decidedAt: date/strict_date_optional_time` :135, `origin` :117, `status`, `spaceId`).
- `SETTLED_PROPOSAL_STATUSES` = `succeeded | failed | expired | no_action`
  (`x-pack/platform/packages/shared/kbn-proposals-common/src/proposal.ts:460-479`).
- Filter: **`decidedWithinHours: CLOSED_DECIDED_WITHIN_HOURS`** with sort
  `decidedAt desc`
  (`server/services/conversation_proposals/conversation_proposals_service.ts:93-121`).
  **`CLOSED_DECIDED_WITHIN_HOURS = 72`** (`common/proposals/list.ts:16`). Origin filter
  `ALERTZERO_PROPOSAL_ORIGIN` (`common/proposals/origin.ts`) keeps other solutions'
  proposals out — **seed docs must set `origin: 'alertzero'`**.
- **Mismatch recorded (product/doc question, not a test bend):** route description says
  "decided in the last 72 hours" (get_closed_proposals.ts:57-59) and the constant is 72h,
  but the manual-QA scenario text says 24h. Tests encode the code (72h): boundary seed **73h →
  absent**, control **71h → present**. Age **`decidedAt`**, not `@timestamp` (sort key +
  `decidedWithinHours` field).
- Response: `ProposalsPageResponse { proposals, total }` — decision-time field
  `decidedAt` per doc (seed shape above).

## 5. Service accounts — routes + naming

- Routes (`kbn-alertzero-common/constants.ts:36-39`):
  `SECURITY_SERVICE_ACCOUNT_URL = '/internal/security/service_account'`,
  per-account `${URL}/{serviceAccountId}` (`?force=true` on delete).
- Accounts are created **by the UI** during "Enable and run"
  (`public/pages/onboarding/use_enable_workers.ts:63-108`): for every selected worker
  without `settings.serviceAccountId`, `ensureWorkerServiceAccounts` creates an account,
  then each worker is PATCHed with `settings: { serviceAccountId }` (:94).
- Server enforces the invariant: enabling a worker without an account → `rejected`
  (workers_service.ts:281-283). API-level fixture pattern (create + `?force=true`
  cleanup): `test/scout_alertzero/api/fixtures/helpers.ts:295-330`.
- Hunt worker enable additionally `assertHardGate` → ensure threat-intel supply, with
  rollback (`workers_service.ts:317-335`) — enable order matters; reset must be
  404-tolerant.

## 6. Stub-model recipe (plumbing-only enabler — port, do not reinvent)

Port **`setupHuntPrerequisites`** from
`x-pack/solutions/security/plugins/security_solution/test/scout_alertzero/api/fixtures/helpers.ts:192-260`
(see :295-330 for the service-account half). Three parts, all required:

1. `enableAlertZeroInSpace` — set `securitySolution:enableAlertZero` uiSetting on for the
   space (helpers.ts:185-188; `setAlertZeroEnabledInSpace` writes the space's ui settings
   via `api/saved_objects`-style space URL).
2. Create space-scoped `.gen-ai` stub connector via `POST api/actions/connector`
   (helpers.ts:209-230): name `scout-hunt-genai-${spaceId}-${suffix}`,
   `connector_type_id: '.gen-ai'`, config `{apiProvider:'OpenAI',
   apiUrl:'https://example.invalid/v1', defaultModel:'gpt-4'}`, secrets
   `{apiKey:'scout-test-key'}` — **never invoked**, exists only to clear `no_model`.
3. **Conditional** inference-feature assignment (helpers.ts:232-260): GET
   `/internal/search_inference_endpoints/settings` (api version `1` headers) → if the
   AlertZero parent feature has no endpoints (`!parent || parent.endpoints.length === 0`),
   PUT the settings adding `feature_id: ALERTZERO_INFERENCE_PARENT_FEATURE_ID` =
   `'alertzero_parent'` (kbn-alertzero-common/constants.ts:371) with
   `endpoints: [{id: connectorId}]`.

**Cleanup restores the inference-settings document** (PUT back the pre-test features
array), then deletes the connector and throwaway accounts — otherwise `getForFeature`
stays polluted for sibling specs.

## 7. EIS-layer follow-up owner

PR #296995 (`scout/alertzero-e2e-p1`) is **OPEN** as of 2026-10-26 → the EIS layer
(`test/scout_alertzero_e2e/ui/`) is deferred to a tracked follow-up (internal card
"AlertZero onboarding e2e — real-EIS layer"). Nothing in this suite imports from that
branch.
