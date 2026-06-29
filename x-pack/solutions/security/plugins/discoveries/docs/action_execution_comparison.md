# Attack Discovery Action Execution: Hybrid Architecture (Option C)

**Branch:** `attack_discovery_workflows_integration`
**Date:** 2026-03-27
**Feature flag:** `securitySolution.attackDiscoveryWorkflowsEnabled`

---

## Executive Summary

Attack Discovery scheduling uses a **unified hybrid architecture** (Option C) regardless of the feature flag state:

- **Alerting Framework** always owns scheduling, alert persistence, and action execution — with full throttling and frequency support.
- **Workflows engine** owns only the generation pipeline (alert retrieval → generation → validation).

The feature flag controls which *generation API* and *schedule CRUD API* the UI calls, but it does not change *how schedules are stored* or *how actions are executed*. Both FF ON and FF OFF use alerting-backed schedules. Action frequency settings (`onActiveAlert`, `onThrottleInterval`, `onActionGroupChange`) are always enforced by the Alerting Framework's `ActionScheduler`.

---

## 1. Feature Flag Mechanics

### Server Side

The feature flag is **not read directly** on the server for schedule storage. Both the public API (`elastic_assistant`) and the internal API (`discoveries`) create alerting rules via `AttackDiscoveryScheduleDataClient`. The `workflowConfig` field on the alerting rule's params tells the executor whether to delegate generation to the workflows engine.

**File:** `x-pack/solutions/security/plugins/discoveries/server/lib/schedules/create_schedule_data_client/index.ts`

### UI Side

The UI reads the feature flag asynchronously and swaps which CRUD API it calls:

```
// use_schedule_api.ts
const enabled = await featureFlags.getBooleanValue(
  'securitySolution.attackDiscoveryWorkflowsEnabled',
  false
);
setIsWorkflowsEnabled(enabled);
```

When `isWorkflowsEnabled` is `true`, CRUD hooks target the internal `discoveries` API. When `false`, they target the public `elastic_assistant` API.

**File:** `x-pack/solutions/security/plugins/security_solution/public/attack_discovery/pages/settings_flyout/schedule/logic/use_schedule_api.ts`

For generation, `useAttackDiscovery` checks the flag and calls either `callInternalGenerateApi()` or `callPublicGenerateApi()`:

**File:** `x-pack/solutions/security/plugins/security_solution/public/attack_discovery/pages/use_attack_discovery/index.tsx`

---

## 2. Unified Architecture Summary

| Dimension | FF OFF (Legacy) | FF ON (Internal) |
|---|---|---|
| **Generation API** | `POST /api/attack_discovery/_generate` (public, `elastic_assistant`) | `POST /internal/attack_discovery/_generate` (internal, `discoveries`) |
| **Schedule API** | `POST /api/attack_discovery/schedules` (public) | `POST /internal/attack_discovery/schedules` (internal) |
| **Schedule storage** | Alerting Rules | Alerting Rules (same) |
| **Execution engine** | Alerting Framework task runner | Alerting Framework task runner (same) |
| **Pipeline shape** | Monolithic: retrieve + generate + validate in one executor call | Three-phase: retrieval workflow → generation workflow → validation workflow |
| **Action execution** | Implicit: `alertsClient.report()` → `ActionScheduler` queues actions async | Implicit: `alertsClient.report()` → `ActionScheduler` queues actions async (same) |
| **Action frequency/throttling** | Fully enforced | Fully enforced (same) |
| **Data client** | `AttackDiscoveryScheduleDataClient` | `AttackDiscoveryScheduleDataClient` (same) |
| **Tag** | None | `attack-discovery-schedule` |
| **Workflow config** | Not supported | `workflow_config` field enables delegation to workflows engine |

---

## 3. Action Execution Deep Dive

### 3.1 Legacy Path (FF OFF)

**File:** `x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/schedules/register_schedule/executor.ts`

The alerting rule executor:

1. Retrieves anonymization fields
2. Calls `generateAttackDiscoveries()` — a monolithic graph that handles alert retrieval, LLM invocation, and validation
3. Filters hallucinated alerts
4. Deduplicates discoveries against existing ones
5. For each discovery, **reports an alert** to the framework:
   ```
   const { uuid: alertDocId } = alertsClient.report({
     id: alertInstanceId,
     actionGroup: 'default',
   });
   alertsClient.setAlertData({ id: alertInstanceId, payload: baseAlertDocument, context });
   ```
6. **The executor exits.** It never calls `actionsClient.execute()`.

After the executor completes, the Alerting Framework's `ActionScheduler`:
- Reads the rule's configured `actions` array
- Applies frequency/throttling settings per action
- Enqueues qualifying actions to the task queue via `actionsClient.bulkEnqueueExecution()`
- Actions execute asynchronously in a separate task manager cycle

### 3.2 Hybrid Path (FF ON)

**File:** `x-pack/solutions/security/plugins/discoveries/server/lib/alert_executor/workflow_executor/index.ts`

The alerting rule executor detects the `workflowConfig` field in rule params and delegates to `executeGenerationWorkflow()`:

1. Calls `executeGenerationWorkflow()` — invokes the three-phase workflows pipeline (alert retrieval → generation → validation)
2. For each discovery returned by the pipeline, **reports an alert** to the framework:
   ```
   alertsClient.report({ id: alertInstanceId, actionGroup: 'default' });
   alertsClient.setAlertData({ id: alertInstanceId, payload: baseAlertDocument, context });
   ```
3. **The executor exits.** It never calls `actionsClient.execute()` directly.

The Alerting Framework's `ActionScheduler` then handles action execution identically to the legacy path — with full frequency/throttling enforcement.

**Key insight:** The executor's `workflowConfig` check is the only branch point. Actions are always handled by the framework regardless of which branch the executor takes.

---

## 4. Schedule CRUD Operations

### 4.1 Data Client Factory

**File:** `x-pack/solutions/security/plugins/discoveries/server/lib/schedules/create_schedule_data_client/index.ts`

The `createScheduleDataClient()` factory always returns `AttackDiscoveryScheduleDataClient` (alerting-backed). There is no `AttackDiscoveryWorkflowScheduleDataClient` — the dual-client architecture has been removed.

### 4.2 Route Pattern

All CRUD routes follow a simple pattern:

```typescript
const dataClient = await createScheduleDataClient({ ... });
await dataClient.someOperation({ id, ...params });
```

No branching, no fallback, no dual-client try/catch.

---

## 5. Cross-Mode Compatibility

### 5.1 Schedule Created with FF OFF, then FF Turned ON

**Behavior:** Works seamlessly.

Schedules are alerting rules in both modes. The two APIs apply different tag strategies to maintain isolation:

- **Public API:** no `applyTags` or `filterTags` — creates untagged schedules and reads all untagged alerting-backed schedules.
- **Internal API:** `applyTags: ['attack-discovery-schedule']` on write + `filterTags: { includeTags: ['attack-discovery-schedule'] }` on read — creates and reads only internally-tagged schedules.

When FF is turned ON, previously untagged schedules remain visible and manageable via the public API. The UI automatically switches to the internal API for new schedules.

**Why isolation is maintained:** The public API's update path (`rulesClient.update()`) performs full parameter replacement. Its update transform omits `workflowConfig`, so updating an internally-created schedule via the public API would silently wipe ESQL queries and custom workflow IDs. Tag isolation prevents this data loss by ensuring each API only surfaces schedules it safely knows how to update.

### 5.2 Schedule Created with FF ON, then FF Turned OFF

**Behavior:** Works seamlessly for execution; internally-tagged schedules are not visible via the public API.

Schedules created via the internal API are tagged with `attack-discovery-schedule`. When FF is OFF, the UI targets the public API. Because the internal API's `filterTags` restricts reads to the internal tag, and the public API has no `filterTags`, internally-tagged schedules do not appear in the public API's `_find` results.

However, because all schedules are stored as alerting rules, they continue to execute normally. Re-enabling the flag restores full UI visibility via the internal API.

### 5.3 No Orphaned Schedules

Because both APIs use the same underlying storage (alerting rules), toggling the feature flag never orphans schedules. There is no separate workflow-definition storage that could become inaccessible.

---

## 6. Action Frequency/Throttling

The Alerting Framework's `ActionScheduler` supports:

| Setting | Behavior |
|---|---|
| `onActiveAlert` | Execute action every time the alert is active |
| `onThrottleInterval` | Execute at most once per interval (e.g., "1h") |
| `onActionGroupChange` | Execute only when alert transitions between action groups |
| `summary: true` | Aggregate all alerts into a single action execution |

These settings are configured per-action on the alerting rule and **always enforced** — in both the legacy path (FF OFF) and the hybrid path (FF ON). There is no path where frequency/throttling settings are ignored.

---

## 7. Key File Reference

| File | Purpose |
|---|---|
| `x-pack/solutions/security/plugins/discoveries/server/lib/schedules/create_schedule_data_client/index.ts` | Data client factory — always returns alerting-backed client |
| `x-pack/solutions/security/plugins/discoveries/server/lib/alert_executor/workflow_executor/index.ts` | Hybrid executor — delegates generation to workflows, reports via `alertsClient` |
| `x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/schedules/register_schedule/executor.ts` | Legacy executor — monolithic generation, reports via `alertsClient` |
| `x-pack/solutions/security/plugins/discoveries/server/routes/post/schedules/create_schedule.ts` | Create route (internal API) |
| `x-pack/solutions/security/plugins/discoveries/server/routes/get/schedules/find_schedules.ts` | Find route (internal API, tag-scoped) |
| `x-pack/solutions/security/plugins/discoveries/server/routes/put/schedules/update_schedule.ts` | Update route (internal API) |
| `x-pack/solutions/security/plugins/security_solution/public/attack_discovery/pages/settings_flyout/schedule/logic/use_schedule_api.ts` | UI hook swapper based on FF |
| `x-pack/solutions/security/plugins/security_solution/public/attack_discovery/pages/use_attack_discovery/index.tsx` | Generation hook — FF branch for API selection |
