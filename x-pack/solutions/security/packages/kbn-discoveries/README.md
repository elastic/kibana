# @kbn/discoveries

Shared server-side business logic for Attack Discovery and Defend Insights.

## Why this package exists

`@kbn/discoveries` extracts shared server-side logic out of `elastic_assistant` so both `elastic_assistant` and the `discoveries` plugin can consume the same code without duplication. It is the canonical home for the LangGraph generation pipeline, the event-log writer, the anonymization helpers, hallucination detection, and the EBT telemetry event definitions and reporters.

This package is **server-only** (`"type": "shared-server"` in `kibana.jsonc`). It cannot be imported by browser code; the `kbn/imports` ESLint rule enforces this at build time.

For the full architectural context — the four entry points, five workflow steps, anonymization boundary, security surfaces — see the canonical [discoveries plugin README](../../plugins/discoveries/README.md).

## Overview

This package contains reusable logic consumed by both the `elastic_assistant` and `discoveries` plugins:

- **LangGraph graphs** for Attack Discovery and Defend Insights generation
- **Orchestration** (`runManualOrchestration`, `executeGenerationWorkflow`) — chains alert retrieval → generation → validation+persist with timeout budgets
- **Event logging utilities** for generation tracking (shared across both plugins)
- **Hallucination detection** for filtering invalid discoveries
- **Alert anonymization and field definitions** — including `replaceAnonymizedValuesWithOriginalValues` (the de-anonymization helper that bridges raw and anonymized data)
- **Schedule transforms** for converting between API and internal representations
- **LangChain utilities** for output chunking (generate/refine nodes and edges)
- **Telemetry event definitions and reporters** for EBT

## Structure

All implementation code lives under `impl/`, organized into three layers:

```
kbn-discoveries/
├── impl/
│   ├── lib/                          # Generic, domain-agnostic utilities
│   │   ├── build_default_esql_query/ # Default ES|QL query builder
│   │   ├── create_traced_logger/     # Logger with [execution: {uuid}] prefix
│   │   ├── errors/                   # AttackDiscoveryError, InvalidDefendInsightTypeError
│   │   ├── helpers/                  # get_llm_type, get_space_id, is_workflows_enabled
│   │   ├── langchain/               # Output chunking: generate/refine nodes and edges
│   │   ├── log_health_check/         # DEBUG-level health check logging
│   │   ├── persistence/              # getDurationNanoseconds
│   │   ├── schedules/                # Schedule transforms (API ↔ internal)
│   │   ├── telemetry/                # EBT event definitions
│   │   └── types/                    # Graph types, invoke params, alertsToDocuments
│   ├── attack_discovery/             # Attack Discovery-specific logic
│   │   ├── alert_fields/             # Alert field constants and field map
│   │   ├── anonymization/            # Anonymization, replacements, rule IDs
│   │   ├── generation/               # Orchestration, workflow invocation, event writing
│   │   │   └── run_manual_orchestration/  # pipeline + gate-phase helpers
│   │   ├── graphs/                   # LangGraph: default_attack_discovery_graph
│   │   ├── hallucination_detection/  # filterHallucinatedAlerts, getValidDiscoveries
│   │   └── persistence/
│   │       └── event_logging/        # writeAttackDiscoveryEvent, event action constants
│   └── defend_insights/              # Defend Insights-specific logic
│       └── graphs/                   # LangGraph: default_defend_insights_graph
├── scripts/
│   └── openapi/
│       └── generate.js               # Generates types into @kbn/discoveries-schemas
├── index.ts                          # Curated public API (explicit named exports)
└── kibana.jsonc
```

### The `impl/` pattern

- **`impl/lib/`** — Generic utilities with no Attack Discovery or Defend Insights domain knowledge. These could be reused by any future insight type.
- **`impl/attack_discovery/`** — Attack Discovery-specific graphs, event logging, hallucination detection, alert field definitions, and anonymization logic.
- **`impl/defend_insights/`** — Defend Insights-specific graphs and types.

## Public API

The root `index.ts` exports a curated set of named exports. There are no barrel (`export *`) re-exports.

### Generic library (`impl/lib/`)

| Export | Kind | Description |
|--------|------|-------------|
| `createTracedLogger` | Function | Creates a logger prefixed with `[execution: {uuid}]` |
| `AttackDiscoveryError`, `InvalidDefendInsightTypeError` | Classes | Error types (`AttackDiscoveryError` carries an `errorCategory`) |
| `getLlmType` | Function | Resolves LLM type from action type ID |
| `getGenerateNode`, `getRefineNode` | Functions | LangChain output chunking nodes |
| `getGenerateOrEndEdge`, `getGenerateOrRefineOrEndEdge`, `getRefineOrEndEdge`, `getRetrieveAnonymizedDocsOrGenerateEdge`, `getMaxHallucinationFailuresReached`, `getMaxRetriesReached` | Functions | LangChain conditional edges |
| `NodeType` | Enum | Node type identifiers for LangChain graphs |
| `getDurationNanoseconds` | Function | Calculates duration in nanoseconds for event metrics |
| `alertsToDocuments` | Function | Converts alert strings to LangChain Documents |
| `AttackDiscoveryGraphState`, `BaseGraphState`, etc. | Types | Graph state and metadata types |

> **Not root exports.** Schedule transforms (`transformCreatePropsFromApi`, `transformUpdatePropsFromApi`, `transformScheduleToApi`, `transformActionsFromApi`/`transformActionsToApi`), the EBT event definitions and reporters (`ATTACK_DISCOVERY_MISCONFIGURATION_EVENT`, `reportMisconfiguration`, `reportStepFailure`, `reportScheduleAction`, `reportWorkflowSuccess`/`reportWorkflowError`), the feature-flag helper (`isWorkflowsEnabled` / `ATTACK_DISCOVERY_WORKFLOWS_ENABLED_FEATURE_FLAG`), and the orchestration entry points (`executeGenerationWorkflow`, `runManualOrchestration`) are **deep imports** (e.g. `@kbn/discoveries/impl/lib/schedules/transforms`, `@kbn/discoveries/impl/lib/telemetry/report_misconfiguration`, `@kbn/discoveries/impl/lib/helpers/is_workflows_enabled`, `@kbn/discoveries/impl/attack_discovery/generation/execute_generation_workflow`), not root `index.ts` exports.

### Attack Discovery (`impl/attack_discovery/`)

| Export | Kind | Description |
|--------|------|-------------|
| `getDefaultAttackDiscoveryGraph` | Function | Creates the default Attack Discovery LangGraph |
| `getAnonymizedAlerts` | Function | Retrieves and anonymizes alerts |
| `ATTACK_DISCOVERY_GRAPH_RUN_NAME` | Constant | Graph run name identifier |
| `filterHallucinatedAlerts`, `getValidDiscoveries` | Functions | Hallucination detection and filtering |
| `writeAttackDiscoveryEvent` | Function | Writes events to the Elasticsearch event log |
| `ATTACK_DISCOVERY_EVENT_LOG_ACTION_*` | Constants | Event action constants |
| `ALERT_ATTACK_DISCOVERY_*` | Constants | Alert field name constants |
| `attackDiscoveryAlertFieldMap` | Object | Elasticsearch field map for alert documents |
| `replaceAnonymizedValuesWithOriginalValues`, `getOriginalAlertIds` | Functions | De-anonymization utilities |
| `ATTACK_DISCOVERY_AD_HOC_RULE_ID`, `ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID`, `ATTACK_DISCOVERY_TAG` | Constants | Ad-hoc rule identifiers and the attack-discovery tag |

> The managed workflow IDs (`ATTACK_DISCOVERY_*_WORKFLOW_ID`) now live in `@kbn/workflows/managed`, not this package. `WorkflowConfig` is defined in `@kbn/discoveries-schemas`. The former `WorkflowInitializationService` has been removed (managed workflows are installed via the platform).

### Defend Insights (`impl/defend_insights/`)

| Export | Kind | Description |
|--------|------|-------------|
| `getDefaultDefendInsightsGraph` | Function | Creates the default Defend Insights LangGraph |
| `DEFEND_INSIGHTS_GRAPH_RUN_NAME` | Constant | Graph run name identifier |
| `DefaultDefendInsightsGraph`, `DefendInsightsCombinedPrompts`, etc. | Types | Defend Insights graph types |

### Security-relevant exports (cross-link map)

These exports cross the security boundaries described in the plugin README. Read them alongside the relevant plugin-README section before changing them:

| Export | Boundary | See |
|--------|----------|-----|
| `replaceAnonymizedValuesWithOriginalValues`, `getOriginalAlertIds` | Anonymization boundary | [Anonymization Boundary](../../plugins/discoveries/README.md#anonymization-boundary) |
| `writeAttackDiscoveryEvent`, `ATTACK_DISCOVERY_EVENT_LOG_ACTION_*`, `getDurationNanoseconds` | Event log privacy contract | [Event Logging](../../plugins/discoveries/README.md#event-logging) |
| `executeGenerationWorkflow`, `runManualOrchestration` *(deep import)* | Orchestrator entry points (pipeline + gate phase; throw when the FF is OFF) | [Orchestration, event logging, pre-execution validation](../../plugins/discoveries/README.md#orchestration-event-logging-pre-execution-validation-landed-in-pr-4) |
| `reportMisconfiguration`, `reportStepFailure`, `reportScheduleAction`, `reportWorkflowSuccess`, `reportWorkflowError` *(deep import)* | EBT privacy contract | [Telemetry README](impl/lib/telemetry/README.md) |
| `attackDiscoveryAlertFieldMap`, `ALERT_ATTACK_DISCOVERY_*` | Alert document schema | (no public-facing boundary; see field map source) |

## Consumers

| Plugin | Uses |
|--------|------|
| `elastic_assistant` | Graphs, event logging, hallucination detection, graph types |
| `discoveries` | Orchestration, event logging, schedule transforms, telemetry, traced logger |

## OpenAPI generation

This package contains a generation script that produces types into the sibling `@kbn/discoveries-schemas` package:

```bash
cd x-pack/solutions/security/packages/kbn-discoveries
npm run openapi:generate
```

## Adding new exports

1. Add your implementation under the appropriate `impl/` subdirectory:
   - `impl/lib/` for generic utilities
   - `impl/attack_discovery/` for Attack Discovery logic
   - `impl/defend_insights/` for Defend Insights logic
2. Export from the root `index.ts` using an explicit named export (no barrel re-exports).
3. Write unit tests alongside the implementation.

## Testing

Run the package's Jest battery:

```bash
node scripts/jest --coverage x-pack/solutions/security/packages/kbn-discoveries
```

The four Jest jobs that should always pass with zero failures when changing this package or its consumers are:

```bash
node scripts/jest --coverage x-pack/solutions/security/packages/kbn-discoveries
node scripts/jest --coverage x-pack/solutions/security/plugins/discoveries
node scripts/jest --coverage x-pack/solutions/security/plugins/elastic_assistant
node scripts/jest --coverage x-pack/solutions/security/plugins/security_solution/public/attack_discovery
```

Type check (scoped):

```bash
node scripts/type_check --project x-pack/solutions/security/packages/kbn-discoveries/tsconfig.json
```
