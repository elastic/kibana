# @kbn/attack-discovery-schedules-common

Shared package for attack discovery schedule infrastructure, used by both
`elastic_assistant` (public API) and `discoveries` (internal API).

## Overview

This package provides the data client, transforms, field definitions, and types
needed to manage attack discovery schedules backed by the Kibana Alerting
Framework. Both the public schedule API (`elastic_assistant`) and the internal
schedule API (`discoveries`) depend on this shared infrastructure.

For background on why the Alerting Framework is used for scheduling, see
[`docs/adr_scheduling_strategy.md`](docs/adr_scheduling_strategy.md).

## Structure

All implementation code lives under `impl/`:

```
kbn-attack-discovery-schedules-common/
├── impl/
│   ├── constants.ts                          # AAD config, alert context, app path
│   ├── data_client/                          # AttackDiscoveryScheduleDataClient (CRUD via RulesClient)
│   ├── fields/
│   │   ├── field_map.ts                      # Elasticsearch field map
│   │   └── field_names.ts                    # ALERT_ATTACK_DISCOVERY_* constants
│   ├── schedule_params_extended.ts           # Zod schema extending schedule params
│   ├── transforms/
│   │   ├── convert_alerting_rule_to_schedule.ts
│   │   ├── convert_schedule_actions_to_alerting_actions.ts
│   │   ├── create_schedule_execution_summary.ts
│   │   └── transform_to_alert_documents/     # Alert document generation + hashing
│   │       ├── get_alert_risk_score/
│   │       └── get_alert_url/
│   ├── types.ts                              # Type aliases for alerting rule types
│   ├── update_alerts_with_attack_ids/        # Updates security alerts with attack IDs
│   └── __mocks__/                            # Test mocks
├── docs/
│   └── adr_scheduling_strategy.md            # Architecture decision record
├── index.ts                                  # Curated public API
└── kibana.jsonc
```

## Public API

### Constants

| Export | Description |
|--------|-------------|
| `ATTACK_DISCOVERY_ALERTS_AAD_CONFIG` | Alerts-as-data configuration for the attack discovery rule type |
| `ATTACK_DISCOVERY_ALERTS_CONTEXT` | Alert context identifier (`'security.attack.discovery'`) |
| `SECURITY_APP_PATH` | Path to the security app (`'/app/security'`) |
| `ALERTS_INDEX_PATTERN` | Security alerts index pattern (`'.alerts-security.alerts-'`) |

### Data client

| Export | Kind | Description |
|--------|------|-------------|
| `AttackDiscoveryScheduleDataClient` | Class | CRUD for schedules backed by `RulesClient`, supports tag-based filtering |
| `AttackDiscoveryScheduleDataClientParams` | Type | Constructor params: `actionsClient`, `filterTags?`, `logger`, `rulesClient` |
| `CreateAttackDiscoveryScheduleDataClientParams` | Type | Factory function params |
| `FilterTags` | Type | `{ includeTags?: string[], excludeTags?: string[] }` |

### Field map and field names

| Export | Kind | Description |
|--------|------|-------------|
| `attackDiscoveryAlertFieldMap` | Object | Elasticsearch `FieldMap` for attack discovery alert documents |
| `ALERT_ATTACK_DISCOVERY` | Constant | Base field path |
| `ALERT_ATTACK_DISCOVERY_*` | Constants | Individual alert field paths (27 constants) |
| `ALERT_ATTACK_IDS` | Constant | Alert-to-attack ID mapping field |
| `ALERT_RISK_SCORE` | Constant | Risk score field |

### Extended schema

| Export | Kind | Description |
|--------|------|-------------|
| `AttackDiscoveryScheduleParamsExtended` | Zod schema | Extends `AttackDiscoveryScheduleParams` with optional `insightType` and `workflowConfig` |

### Transforms

| Export | Kind | Description |
|--------|------|-------------|
| `convertAlertingRuleToSchedule` | Function | Converts a `SanitizedRule` to an `AttackDiscoverySchedule` response |
| `convertScheduleActionsToAlertingActions` | Function | Splits schedule actions into general and system actions |
| `createScheduleExecutionSummary` | Function | Extracts last execution summary from a rule |
| `generateAttackDiscoveryAlertHash` | Function | SHA-256 hash for alert deduplication |
| `transformToBaseAlertDocument` | Function | Converts an `AttackDiscovery` to an `AttackDiscoveryAlertDocumentBase` |
| `AttackDiscoveryAlertDocumentBase` | Type | Base alert document shape (before runtime fields) |

### Update alerts

| Export | Kind | Description |
|--------|------|-------------|
| `updateAlertsWithAttackIds` | Function | Updates security alerts with attack IDs via `updateByQuery` |
| `UpdateAlertsWithAttackIdsParams` | Type | `{ alertIdToAttackIdsMap, esClient, spaceId }` |

### Types

| Export | Kind | Description |
|--------|------|-------------|
| `AttackDiscoveryAlertDocument` | Type | Full alert document (re-exported from `@kbn/elastic-assistant-common`) |
| `AttackDiscoveryExecutorOptions` | Type | `RuleExecutorOptions` for the attack discovery rule type |
| `AttackDiscoveryScheduleContext` | Type | `AlertInstanceContext` with `attack` field |
| `AttackDiscoveryScheduleFindOptions` | Type | `{ page?, perPage?, sort? }` |
| `AttackDiscoveryScheduleSort` | Type | `{ sortDirection?, sortField? }` |
| `AttackDiscoveryScheduleType` | Type | `RuleType<...>` for the attack discovery rule type |
