# AlertZero onboarding e2e — route map

The routes, privileges and indices this suite depends on. Citations name files and
symbols rather than line numbers. Paths are relative to the repo root; `alertzero/`
abbreviates `x-pack/solutions/security/plugins/alertzero/`.

## 1. "Onboarding shown" vs "main app"

- The landing page decides **client-side from worker state**, not from a route:
  `hasEnabledWorker` in `alertzero/public/pages/landing_page.tsx`. Any enabled worker
  shows the queue ("main app"); none shows `OnboardingPage`.
- A session latch (`decision: 'queue' | 'onboarding'`, same file) keeps a window-focus
  refetch from flipping queue → onboarding while saves settle. The reload spec drives it.
- Server-side, every worker route is wrapped by `withAlertZeroEnabled`
  (`alertzero/server/routes/with_alertzero_enabled.ts`):
  - `securitySolution:enableAlertZero` (`ALERTZERO_ENABLED_SETTING_ID`) off → **404**
  - subscription not `available` → **403**
  - dependencies unavailable → **503**
- There is **no onboarding route**. Enablement is the per-worker PATCH flow in
  `alertzero/public/pages/onboarding/use_enable_workers.ts`: create service accounts,
  then PATCH each selected worker `enabled: true`.
- Enabling a worker without a service account is rejected by `workers_service.ts`
  (`alertzero/server/services/workers/`).

**Onboarding shown = zero enabled workers in `GET /internal/alertzero/workers`.**
**Main app = at least one enabled worker.** Both are reachable through the workers API.

## 2. Disable path

- API: `PATCH ALERTZERO_WORKER_URL_TEMPLATE` (`/internal/alertzero/workers/{workerId}`)
  with `{ enabled: false }`. Authz is identical to enable (see §3).
- UI: the `alertZeroWorkerEnabledSwitch-${id}` switches in Watches settings send the
  same PATCH.
- Managed-workflow assertion: `GET /api/workflows?managed=managed`
  (`src/platform/plugins/shared/workflows_management/server/api/routes/workflows/get_workflows.ts`).
  Disabling sets the worker's managed workflow to `enabled: false`; the workflow stays
  installed and keeps its settings, so a disabled worker still reports its
  `serviceAccountId` (the cleanup in §5 relies on this).

## 3. Privileges

- Route authz in `alertzero/server/routes/workers/update_worker.ts`:
  - `requiredPrivileges: [ALERTZERO_API_PRIVILEGE_WRITE]` (`'alertzero_write'`)
  - `extendedPrivileges: WorkflowsManagementOperationPrivileges.updateManaged`
  - the `manage_security` cluster privilege
- UI write gate: `canWrite` in `alertzero/public/pages/onboarding/onboarding_page.tsx`
  (`capabilities.alertzero.write`) disables Continue / Enable and shows
  `alertZeroOnboardingModifyForbidden`.
- Read-only role for `browserAuth.loginWithCustomRole`: `ALERTZERO_READ_ONLY_ROLE`
  (feature privileges `siem: read`, `alertzero: read`; no write, no cluster privileges).

## 4. Closed proposals window

- Index: write alias `.kibana-proposals` (backing index `.kibana-proposals-000001`),
  the same alias the plugin's storage adapter uses. `seedClosedProposal` creates it
  idempotently with the adapter's mappings.
- Settled statuses: `SETTLED_PROPOSAL_STATUSES`
  (`x-pack/platform/packages/shared/kbn-proposals-common/src/proposal.ts`).
- Filter: `decidedWithinHours: CLOSED_DECIDED_WITHIN_HOURS`, sorted by `decidedAt desc`
  (`conversation_proposals_service.ts`). `CLOSED_DECIDED_WITHIN_HOURS = 72`
  (`alertzero/common/proposals/list.ts`). The origin filter keeps other solutions'
  proposals out, so seeded docs set `origin: 'alertzero'`.
- **Known mismatch (product/doc question, not a test bend):** the route summary and the
  constant both say 72 hours, but the manual-QA scenario text says 24 hours. The tests
  encode the code: a 71h-old decision is listed, a 73h-old one is not. The age is
  `decidedAt`, not `@timestamp`.

## 5. Service accounts

- Routes: `SECURITY_SERVICE_ACCOUNT_URL` (`/internal/security/service_account`) and the
  per-account URL (`?force=true` on delete). Service accounts are cluster-scoped and
  survive space deletion.
- The UI creates accounts during "Enable and run": `ensureWorkerServiceAccounts` reuses
  an existing account with the built-in worker name, otherwise it creates one. Then each
  worker is PATCHed with `settings: { serviceAccountId }`.
- Cleanup ownership: a space snapshots the existing account ids before any enable and
  deletes only referenced accounts that are missing from that snapshot. Accounts the
  fixtures create themselves (`enableFirstWorker`) are always deleted.
- Enabling the Hunt worker also ensures the threat-intel supply, with rollback, so reset
  has to tolerate 404s.

## 6. Stub model (plumbing only)

`seedStubModel` follows `setupHuntPrerequisites` in `test/scout_alertzero/api/fixtures/helpers.ts`:

1. The space setup turns `securitySolution:enableAlertZero` on first.
2. Create a space-scoped `.gen-ai` connector via `POST api/actions/connector`, pointing
   at `https://example.invalid/v1`. It is never invoked and exists only to clear
   `no_model`.
3. If the AlertZero parent inference feature (`ALERTZERO_INFERENCE_PARENT_FEATURE_ID`)
   has no endpoints, assign the connector to it through
   `/internal/search_inference_endpoints/settings`.

Cleanup restores the inference-settings document, then deletes the connector. Otherwise
the assignment leaks into sibling specs.

## 7. Real-model (EIS) layer

This suite is plumbing-only: it never calls a model. Flows that need a real model, such
as "configure a model → controls unlock", belong to the EIS layer
(`test/scout_alertzero_e2e/ui/`, introduced by #296995). Nothing here imports from it.
