# Managed System Workflows

## Background

The Attack Discovery 2.0 Workflows Integration ships **7 managed workflows** and **5 custom step types** as part of the `discoveries` plugin. These workflows are essential for Attack Discovery to function correctly.

The managed workflows are:

| Managed workflow ID | Kind |
|---------------------|------|
| `system-attack-discovery-alert-retrieval` | Required |
| `system-attack-discovery-generation` | Required |
| `system-attack-discovery-validate` | Required |
| `system-attack-discovery-run-example` | Optional (example) |
| `system-attack-discovery-custom-validation-example` | Optional (example) |
| `system-attack-discovery-skill-alert-retrieval` | Skill |
| `system-attack-discovery-skill-report` | Skill |

> **Historical note:** Earlier iterations of this feature predated first-class platform support for managed workflows and relied on plugin-side workarounds — a `WorkflowInitializationService` that lazily provisioned bundled YAML per space, a reactive "verify-and-repair" self-healing gate, and tag-based workflow discovery. Those workarounds have been **removed**. The Kibana Workflows platform now provides a managed-workflow framework (`@kbn/workflows-extensions`, `@kbn/workflows/managed`), and Attack Discovery uses it directly.

---

## How managed workflows work now

### Deterministic IDs and definitions

Managed workflow IDs and their YAML definitions live in the platform package `@kbn/workflows/managed` (source: `src/platform/packages/shared/kbn-workflows/managed/definitions/`). IDs are deterministic constants (`ATTACK_DISCOVERY_*_WORKFLOW_ID`), so the plugin looks workflows up directly by ID — no tag-based discovery.

### Installation

At plugin `start()`, `installStatic` ([`server/managed_workflows/install_static.ts`](./server/managed_workflows/install_static.ts)) installs every ID in `AD_WORKFLOW_IDS` into the **global** workflow space (`GLOBAL_WORKFLOW_SPACE_ID`) via the platform managed-workflows client:

```ts
const client = await workflowsExtensions.initManagedWorkflowsClient('discoveries');
for (const id of AD_WORKFLOW_IDS) {
  await client.install(id, { spaceId: GLOBAL_WORKFLOW_SPACE_ID });
}
await client.ready();
```

Installation is eager (at start, gated by `xpack.discoveries.enabled`) and global — not lazy per-space and not request-triggered.

### Integrity check (diagnostic only)

Before a generation run, [`checkManagedWorkflowIntegrity`](./server/managed_workflows/check_managed_workflow_integrity.ts) inspects the 3 required and 2 optional example workflows via the platform's `getWorkflowStatus(id, { spaceId })`. It is **diagnostic and telemetry-only** — it does not overwrite, recreate, or re-enable workflows. The platform owns reconciliation.

| `getWorkflowStatus` result | Required workflow | Optional workflow |
|----------------------------|-------------------|-------------------|
| `intact` | Proceed (also checks the definition's step types are registered) | Proceed |
| `drifted` | Log + emit `workflow_modified` telemetry; **platform reconciles on next restart** | Log + emit `workflow_modified` telemetry |
| `missing` / `not_managed` / `invalid` / `disabled` | Unrepairable error → `repair_failed` (aborts generation) | Warning logged; generation continues |

The returned `WorkflowIntegrityResult.status` is one of `all_intact`, `repaired` (drift detected, platform will reconcile), or `repair_failed` (a required workflow is unusable).

---

## Integrity outcomes

| Status | Meaning | Pipeline Effect | Telemetry |
|--------|---------|-----------------|-----------|
| `all_intact` | All required workflows are managed and match their registered definitions | Continues | None |
| `repaired` | One or more workflows drifted from their registered definition | Continues (platform reconciles on next restart) | `workflow_modified` (`attack_discovery_misconfiguration`) per drifted workflow |
| `repair_failed` | A required workflow is missing, not managed, invalid, or disabled | **Aborted** with a `generation-failed` event | Unrepairable errors surfaced to the caller |

---

## References

### READMEs

- [Plugin README](./README.md) — feature overview, managed workflow integrity, and error visibility
- [Managed workflow definitions](../../../../../src/platform/packages/shared/kbn-workflows/managed/definitions/discoveries/index.ts) — the seven inline-YAML system workflows (runtime source-of-truth)
- [Workflow Steps README](./server/workflows/steps/README.md) — the 5 custom step types with inputs/outputs

### Key Implementation Files

| File | Purpose |
|------|---------|
| `server/managed_workflows/install_static.ts` | `installStatic` — installs `AD_WORKFLOW_IDS` into the global workflow space at start |
| `server/managed_workflows/check_managed_workflow_integrity.ts` | `checkManagedWorkflowIntegrity` — diagnostic status check + drift telemetry |
| `@kbn/workflows/managed` (`src/platform/packages/shared/kbn-workflows/managed/definitions/`) | Deterministic managed workflow IDs and YAML definitions |
| `@kbn/workflows-extensions/server` | Platform managed-workflows client (`initManagedWorkflowsClient`, `install`, `getWorkflowStatus`) |
| `@kbn/discoveries` `impl/attack_discovery/generation/execute_generation_workflow.ts` | Execution flow: runs the integrity check before the pipeline |
