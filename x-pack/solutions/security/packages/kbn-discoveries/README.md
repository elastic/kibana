# @kbn/discoveries

Shared server-side business logic for Attack Discovery and Defend Insights.

## Overview

This package contains reusable logic consumed by both the `elastic_assistant` and `discoveries` plugins:

- **LangGraph graphs** for Attack Discovery and Defend Insights generation
- **Event logging utilities** for generation tracking (shared across both plugins)
- **Hallucination detection** for filtering invalid discoveries
- **Alert anonymization and field definitions**
- **Schedule transforms** for converting between API and internal representations
- **LangChain utilities** for output chunking (generate/refine nodes and edges)
- **Telemetry event definitions** for EBT reporting

This package is **server-only** (`"type": "shared-server"` in `kibana.jsonc`). It must not be imported by browser code.

## Structure

All implementation code lives under `impl/`, organized into three layers:

```
kbn-discoveries/
├── impl/
│   ├── lib/                          # Generic, domain-agnostic utilities
│   │   ├── build_default_esql_query/ # Default ES|QL query builder
│   │   ├── create_traced_logger/     # Logger with [execution: {uuid}] prefix
│   │   ├── errors/                   # InvalidDefendInsightTypeError
│   │   ├── helpers/                  # get_llm_type, get_space_id
│   │   ├── langchain/               # Output chunking: generate/refine nodes and edges
│   │   ├── log_health_check/         # DEBUG-level health check logging
│   │   ├── persistence/              # getDurationNanoseconds
│   │   ├── schedules/                # Schedule transforms (API ↔ internal)
│   │   ├── telemetry/                # EBT event definitions
│   │   └── types/                    # Graph types, invoke params, alertsToDocuments
│   ├── attack_discovery/             # Attack Discovery-specific logic
│   │   ├── alert_fields/             # Alert field constants and field map
│   │   ├── anonymization/            # Anonymization, replacements, rule IDs
│   │   ├── constants/                # Workflow IDs
│   │   ├── generation/               # Orchestration, workflow invocation, event writing
│   │   │   └── run_manual_orchestration/
│   │   │       └── steps/            # retrieval_step, generation_step, validation_step
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
| `InvalidDefendInsightTypeError` | Class | Error for invalid defend insight types |
| `getLlmType` | Function | Resolves LLM type from action type ID |
| `getGenerateNode`, `getRefineNode` | Functions | LangChain output chunking nodes |
| `getGenerateOrEndEdge`, `getRefineOrEndEdge`, etc. | Functions | LangChain conditional edges |
| `NodeType` | Enum | Node type identifiers for LangChain graphs |
| `getDurationNanoseconds` | Function | Calculates duration in nanoseconds for event metrics |
| `transformActionsFromApi`, `transformActionsToApi` | Functions | Schedule action transforms |
| `transformCreatePropsFromApi`, `transformUpdatePropsFromApi` | Functions | Schedule create/update transforms |
| `transformScheduleToApi` | Function | Schedule-to-API response transform |
| `ATTACK_DISCOVERY_MISCONFIGURATION_EVENT`, etc. | Constants | EBT telemetry event definitions |
| `alertsToDocuments` | Function | Converts alert strings to LangChain Documents |
| `AttackDiscoveryGraphState`, `BaseGraphState`, etc. | Types | Graph state and metadata types |

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
| `ATTACK_DISCOVERY_*_WORKFLOW_ID` | Constants | Default workflow definition IDs |
| `replaceAnonymizedValuesWithOriginalValues` | Function | De-anonymization utility |
| `WorkflowConfig`, `WorkflowInitializationService` | Types | Generation workflow configuration types |

### Defend Insights (`impl/defend_insights/`)

| Export | Kind | Description |
|--------|------|-------------|
| `getDefaultDefendInsightsGraph` | Function | Creates the default Defend Insights LangGraph |
| `DEFEND_INSIGHTS_GRAPH_RUN_NAME` | Constant | Graph run name identifier |
| `DefaultDefendInsightsGraph`, `DefendInsightsCombinedPrompts`, etc. | Types | Defend Insights graph types |

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
