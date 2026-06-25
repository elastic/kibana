# Platform RFC: Packageable Kibana assets (Agent Builder agents)

Status: **Implemented (SDLC Intelligence POC — P1/P2/P3)**  
Audience: Fleet, Agent Builder, Workflows platform teams

## Summary

Extend the Fleet EPM install pattern used for **`KibanaAssetType.workflow`** to **Agent Builder persisted agents**, so integration packages ship agent definitions as static assets with placeholder substitution—without registering SDLC-specific code in solution plugins.

Knowledge base and alerting rule templates are **already partially supported**; this RFC focuses on the highest-value gap: **`KibanaAssetType.agent`**.

## Problem

Today, agentic Fleet workflows (`ai.agent` steps) require agents to exist before install. Options:

1. **Built-in agents** in solution plugins → pollutes `security_solution`, requires allow-list entries per agent.
2. **Manual Agent Builder setup** after Fleet install → poor UX, not reproducible across spaces.
3. **Generic `elastic-ai-agent` only** → works but weak routing without package-owned instructions/tools.

Workflows solved (1) and (2) via `stepInstallWorkflowAssets`. Agents need the same treatment.

## Goals

- Package ships `kibana/agent/*.yaml` with SDLC-specific instructions, tool allowlists, connector bindings.
- Platform install step creates **persisted** agents (not built-in readonly agents).
- Same placeholder substitution as workflows (`REPLACE_WITH_AI_CONNECTOR_ID`, etc.).
- Graceful skip when `agentBuilder` plugin unavailable.
- Uninstall removes package-owned agents (mirror workflow cleanup).
- **No custom builtin tools required** when agents use `platform.core.executeEsql` + integration knowledge base.

## Non-goals

- Shipping arbitrary TypeScript tool handlers inside Fleet zips.
- Replacing built-in platform agents (`elastic-ai-agent`, streams investigators).
- Liquid rendering of `agent-id` in workflow YAML (separate workflows platform item).

## Proposed design

### 1. Asset type

```ts
// x-pack/platform/plugins/shared/fleet/common/types/models/epm.ts
export enum KibanaAssetType {
  // ...
  agent = 'agent',
}

export enum KibanaSavedObjectType {
  // ...
  agent = 'agent'; // or 'agent-builder-agent' — align with Agent Builder persistence model
}
```

Fleet package layout:

```text
kibana/agent/sdlc-coverage-analysis.yaml
kibana/agent/sdlc-scope-alignment.yaml
```

### 2. Agent YAML schema (illustrative)

```yaml
version: '1'
id: sdlc-coverage-analysis          # optional; default = file base name
name: SDLC Coverage Analysis
description: Planning coverage over sdlc-epic-phases and project items
labels: [sdlc, planning, coverage]
configuration:
  instructions: |
    Analyze SDLC planning coverage. Start with ES|QL over sdlc-epic-phases...
  skill_ids:
    - sdlc-intel                        # optional persisted skill from docs/knowledge_base
  tools:
    - tool_ids:
        - platform.core.executeEsql
        - platform.core.generateEsql
  connector_ids:
    - REPLACE_WITH_AI_CONNECTOR_ID
  enable_elastic_capabilities: false
```

Maps to Agent Builder `CreateAgentRequest` body (persisted agent registry).

### 3. Install step

**File:** `step_install_agent_assets.ts`  
**State machine:** after `create_workflow_assets` (workflows may reference fleet agent IDs).

```ts
export async function stepInstallAgentAssets(context: InstallContext) {
  const agentBuilder = appContextService.getAgentBuilderSetup();
  if (!agentBuilder?.management || !context.request) {
    logger.debug('Skipping agent install: agentBuilder unavailable');
    return;
  }

  const vars = await resolvePackagePolicyConnectorVars(savedObjectsClient, pkgName);
  for (const { fileName, yaml } of agentEntries) {
    const agentId = getFleetPackageAgentId({ spaceId, pkgName, fileName });
    const agentYaml = substituteWorkflowConnectorIds(yaml, vars); // reuse substitution helper
    const definition = parseAgentYaml(agentYaml);
    await agentBuilder.management.createOrUpdateAgent({ id: agentId, ...definition }, spaceId, request);
    assetRefs.push({ id: agentId, type: KibanaSavedObjectType.agent });
  }
  await saveKibanaAssetsRefs(...);
}
```

**ID convention:** `fleet-{spaceId}-{pkgName}-{fileBase}` (same as workflows).

### 4. Agent Builder setup contract

Expose internal management API on **setup** (not only HTTP routes at start):

```ts
export interface AgentBuilderManagementSetup {
  createOrUpdateAgent(params: CreateAgentParams, spaceId: string, request: KibanaRequest): Promise<AgentDefinition>;
  deleteAgent(agentId: string, spaceId: string, request: KibanaRequest): Promise<void>;
}
```

Fleet optional dependency: add `agentBuilder?: AgentBuilderPluginSetup` to Fleet `kibana.jsonc`.

### 5. Workflow linkage

Update SDLC agentic workflows to reference fleet-installed agent IDs:

```yaml
agent-id: fleet-default-sdlc_intel-sdlc-coverage-analysis
```

Or introduce `REPLACE_WITH_AGENT_ID` placeholders per agent file (parallel to connector substitution).

**Note:** `ai.agent` step `agent-id` and `connector-id` are currently static (no Liquid). Fleet substitution at install time is sufficient.

### 6. Uninstall

Mirror `remove.ts` workflow deletion:

- Read package `installed_kibana` refs for type `agent`.
- Call `agentBuilder.management.deleteAgent` for each ref.

### 7. Tooling strategy (no SDLC builtin tools)

Package-owned agents should **not** depend on `security.sdlc_intel.*` builtin tools. Instead:

| Layer | Owner | Content |
|-------|-------|---------|
| Schema semantics | `docs/knowledge_base/*.md` | Already installed via `step_save_knowledge_base` |
| Query patterns | `elasticsearch/esql_view/sdlc_*.yml` | Packaged views |
| Agent instructions + tool allowlist | `kibana/agent/*.yaml` | This RFC |
| Scheduled synthesis | `kibana/workflow/agent-*.yaml` | Existing `ai.agent` workflows |

This removes the need for SDLC code in `security_solution/server/agent_builder`.

## Related assets (already available)

### Integration knowledge base ✅

- **Step:** `step_save_knowledge_base`
- **Path:** `docs/knowledge_base/*.md` (and any `docs/*.md`)
- **Requires:** Enterprise license + integration knowledge setting
- SDLC package now ships schema guides under `docs/knowledge_base/`

No new `KibanaAssetType.knowledgeEntry` required unless targeting a different index (e.g. Agent Builder persisted skills).

### Alerting rule templates ✅ (with gap)

- **Asset type:** `KibanaAssetType.alertingRuleTemplate`
- **Path:** `kibana/alerting_rule_template/*.json`
- **Install:** Saved objects via standard Kibana asset import
- **Rule materialization:** `stepCreateAlertingAssets` currently creates rules from templates only for **`elastic_agent`** package

**Follow-up:** Extend rule creation loop to all integration packages (or opt-in via manifest flag), so Fleet → Integration → Alerting can enable SDLC templates without manual rule creation.

### Connector `isTool: false` contract ✅

Document in `@kbn/connector-specs` CONTRIBUTOR guide:

- `isTool: false` → workflow/ingest-only actions
- `isTool: true` → Agent Builder exposed

No Fleet changes required.

## Implementation phases

| Phase | Deliverable | Owner |
|-------|-------------|-------|
| **P0** | SDLC `docs/knowledge_base/` + `alerting_rule_template/` in Fleet package | SDLC (done) |
| **P1** | `AgentBuilderManagementSetup` internal API | Agent Builder | ✅ |
| **P2** | `KibanaAssetType.agent` + `stepInstallAgentAssets` + uninstall | Fleet | ✅ |
| **P3** | Migrate SDLC agentic workflows to fleet agent IDs; remove `security_solution` SDLC agent registration | SDLC | ✅ |
| **P4** | Generalize alerting rule creation for integration packages | Fleet + Alerting |

## Testing

- Unit: `substituteWorkflowConnectorIds` covers agent YAML connector placeholders.
- Unit: `stepInstallAgentAssets` mocks `agentBuilder.management`.
- Package: extend `sdlc_intel_package.test.ts` golden-path assertions.
- FTR/API: install package → verify agent exists → run agentic workflow manually.

## Open questions

1. Should persisted Fleet agents be **read-only** in Agent Builder UI (package-managed)?
2. Should agent YAML support **`workflow_ids`** pre-hooks (run package workflows before agent)?
3. Namespace reserved prefix: `fleet-*` agent IDs vs user-created collision policy?
4. Persisted **skills** from package (`agentBuilder.plugins.register` vs markdown-only knowledge base)?

## References

- Workflow install: `step_install_workflow_assets.ts`
- Knowledge base: `step_save_knowledge_base.ts`
- Alerting templates: `step_create_alerting_assets.ts`
- Agent create API: `x-pack/platform/plugins/shared/agent_builder/server/routes/agents.ts`
- Managed workflows pattern: `workflows_extensions/dev_docs/MANAGED_WORKFLOWS.md`
