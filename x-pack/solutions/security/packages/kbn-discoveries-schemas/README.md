# @kbn/discoveries-schemas

OpenAPI-generated TypeScript types and Zod schemas for Security Insights APIs and workflow steps.

## Overview

This package contains **generated code** — TypeScript types and Zod runtime validators produced from OpenAPI 3.0.0 schema YAML files. It provides the API contract types used by the `discoveries` plugin (route validation) and `security_solution` (UI request/response types).

The package is `shared-common` (`kibana.jsonc`), meaning it can be imported by both server and browser code.

## Structure

```
kbn-discoveries-schemas/
├── schemas/
│   ├── common_attributes.schema.yaml      # Shared: Replacements, InsightType, Provider, ApiConfig
│   ├── anonymization_fields/              # AnonymizationFieldResponse (internal)
│   ├── attack_discovery/                  # AttackDiscoveryApiAlert, CreateAttackDiscoveryAlertsParams (internal)
│   ├── common/
│   │   └── schedules/                     # InsightsSchedule, InsightsScheduleCreateProps, etc.
│   ├── routes/
│   │   ├── post/generate/                 # PostGenerateRequestBody, PostGenerateResponse
│   │   ├── post/generate_workflow/        # PostGenerateWorkflowRequestBody, PostGenerateWorkflowResponse
│   │   ├── post/validate/                 # PostValidateRequestBody, PostValidateResponse
│   │   ├── post/schedules/               # Create, Enable, Disable schedule routes
│   │   ├── get/schedules/                 # Find, Get schedule routes
│   │   ├── put/schedules/                 # Update schedule route
│   │   └── delete/schedules/              # Delete schedule route
│   ├── workflow_steps/
│   │   ├── default_alert_retrieval.*      # DefaultAlertRetrievalInput, DefaultAlertRetrievalOutput
│   │   └── default_validation.*           # DefaultValidationInput, DefaultValidationOutput
│   └── index.ts                           # Curated public exports
├── scripts/
│   └── openapi/
│       └── generate.js                    # Generation script
└── index.ts                               # Re-exports from schemas/index.ts
```

Each schema YAML file produces a corresponding `.gen.ts` file containing Zod schemas and TypeScript types.

## Public exports

### Route types

| Export | Description |
|--------|-------------|
| `PostGenerateRequestBody`, `PostGenerateResponse` | `POST _generate` (orchestrated pipeline) |
| `PostGenerateWorkflowRequestBody`, `PostGenerateWorkflowResponse` | `POST _generate_workflow` (custom workflow) |
| `PostValidateRequestBody`, `PostValidateResponse` | `POST _validate` (validate and persist) |

### Common attributes

| Export | Description |
|--------|-------------|
| `Replacements` | Anonymization replacement map |
| `InsightType` | `'attack_discovery'` or `'defend_insights'` |
| `Provider` | LLM provider identifier |
| `ApiConfig` | Connector configuration. Only `connector_id` is required; `action_type_id` is resolved from the connector at runtime when omitted |

### Attack Discovery

| Export | Description |
|--------|-------------|
| `AttackDiscoveryApiAlert` | Alert document shape for the Attack Discovery API |

### Workflow step types

| Export | Description |
|--------|-------------|
| `DefaultAlertRetrievalInput`, `DefaultAlertRetrievalOutput` | Alert retrieval step contract |
| `DefaultValidationInput`, `DefaultValidationOutput` | Validation step contract |

### Schedule types

| Export | Description |
|--------|-------------|
| `InsightsSchedule`, `InsightsScheduleCreateProps`, `InsightsScheduleUpdateProps` | Schedule CRUD shapes |
| `InsightsScheduleParams`, `InsightsApiConfig` | Schedule parameters and API config |
| `IntervalSchedule`, `ScheduleAction`, `ScheduleActionFrequency`, etc. | Schedule sub-types |
| `WorkflowConfig` | Workflow configuration within a schedule |
| `CreateInsightsScheduleRequestBody`, `CreateInsightsScheduleResponse` | Create schedule route |
| `FindInsightsSchedulesRequestQuery`, `FindInsightsSchedulesResponse` | Find schedules route |
| `GetInsightsScheduleRequestParams`, `GetInsightsScheduleResponse` | Get schedule route |
| `UpdateInsightsScheduleRequestBody`, `UpdateInsightsScheduleResponse` | Update schedule route |
| `DeleteInsightsScheduleRequestParams`, `DeleteInsightsScheduleResponse` | Delete schedule route |
| `EnableInsightsScheduleRequestParams`, `EnableInsightsScheduleResponse` | Enable schedule route |
| `DisableInsightsScheduleRequestParams`, `DisableInsightsScheduleResponse` | Disable schedule route |

## Regenerating types

When you modify a `.schema.yaml` file, regenerate the corresponding `.gen.ts`:

```bash
cd x-pack/solutions/security/packages/kbn-discoveries-schemas
npm run openapi:generate
```

The script uses `@kbn/openapi-generator` with the `zod_operation_schema` template. It discovers all `schemas/**/*.schema.yaml` files and produces `.gen.ts` (and `.gen.d.ts`) files alongside each schema.

## Adding a new schema

1. Create a `.schema.yaml` file under `schemas/` in the appropriate subdirectory (e.g., `schemas/routes/post/my_route/`).
2. Run `npm run openapi:generate` to produce the `.gen.ts` file.
3. Export the generated types from `schemas/index.ts`.
