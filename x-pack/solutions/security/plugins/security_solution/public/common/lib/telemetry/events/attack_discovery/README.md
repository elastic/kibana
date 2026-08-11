# Attack Discovery Client-Side Telemetry

Event-Based Telemetry (EBT) events for the Attack Discovery 2.0 Workflows integration UI.

## Privacy

All events avoid collecting user-defined names, query content, alert data, or user identifiers. Only anonymous metadata (counts, modes, boolean flags, enum values) is captured.

## Events

Paths below are relative to `x-pack/solutions/security/plugins/security_solution/public/attack_discovery/pages/`. All events are **registered** (defined in `types.ts` + `index.ts`); the "Emitted From" column shows where `telemetry.reportEvent` is actually called. Some events are registered but not yet emitted — see [Registered but unemitted](#registered-but-unemitted) below.

| Event Name | Key Fields | Emitted From |
| --- | --- | --- |
| `Attack Discovery Settings Flyout Opened` | `tab` (settings/schedule) | `settings_flyout/index.tsx` |
| `Attack Discovery Settings Tab Changed` | `tab` (settings/schedule) | `settings_flyout/hooks/use_tabs_view.tsx` |
| `Attack Discovery Settings Saved` | `default_alert_retrieval_mode`, `custom_retrieval_workflow_count`, `uses_default_validation`, `query_mode` | `settings_flyout/hooks/use_settings_view.tsx` |
| `Attack Discovery Settings Reset` | _(none)_ | `settings_flyout/hooks/use_settings_view.tsx` |
| `Attack Discovery Save And Run Clicked` | `default_alert_retrieval_mode`, `custom_retrieval_workflow_count`, `uses_default_validation`, `query_mode` | `settings_flyout/hooks/use_settings_view.tsx` |
| `Attack Discovery Query Mode Changed` | `mode` (custom_query/esql) | `settings_flyout/workflow_settings_view/alert_retrieval_step/alert_retrieval_content/index.tsx` |
| `Attack Discovery Alert Retrieval Workflows Changed` | `workflow_count` | `settings_flyout/workflow_configuration/workflow_configuration_panel/index.tsx` |
| `Attack Discovery Validation Workflow Changed` | `is_default` | `settings_flyout/workflow_configuration/validation_panel/index.tsx` |
| `Attack Discovery Edit With AI Clicked` | _(none)_ | `settings_flyout/workflow_configuration/edit_with_ai/index.tsx` |
| `Attack Discovery Schedule Create Flyout Opened` | `source` (empty_state/schedule_tab) | `settings_flyout/hooks/use_schedule_view.tsx` |
| `Attack Discovery Generation Started` | `execution_mode` (workflow/legacy), `trigger` (manual/save_and_run) | `use_attack_discovery/index.tsx` |
| `Attack Discovery Execution Details Opened` | _(none)_ | `loading_callout/index.tsx` |
| `Attack Discovery Generation Dismissed` | _(none)_ | `loading_callout/index.tsx` |
| `Attack Discovery Pipeline Step Inspected` | `step_type` (alert_retrieval/generation/validation) | `loading_callout/workflow_execution_details_flyout/index.tsx` |
| `Attack Discovery Troubleshoot With AI Clicked` | _(none)_ | `loading_callout/workflow_execution_details_flyout/troubleshoot_with_ai/index.tsx` |

### Registered but unemitted

These event types are defined in `types.ts`/`index.ts` but no component currently calls `reportEvent` for them:

- `Attack Discovery Alert Retrieval Mode Changed` (`AlertRetrievalModeChanged`) — registered but not emitted (only `QueryModeChanged` is emitted from the alert-retrieval content).
- `Attack Discovery Schedule Created` / `Updated` / `Deleted` / `Enabled` / `Disabled` — registered on `AttackDiscoveryEventTypes`, but the schedule CRUD hooks under `settings_flyout/schedule/logic/` actually emit the **`AttackDiscoverySchedulesEventTypes`** events instead (`CreateSuccess`/`CreateFailed`, `UpdateSuccess`/`UpdateFailed`, `DeleteSuccess`/`DeleteFailed`, `StatusUpdateSuccess`/`StatusUpdateFailed`, and the `Bulk*` variants).

## Architecture

- **Types**: `types.ts` defines the `AttackDiscoveryEventTypes` enum, parameter interfaces, and `AttackDiscoveryTelemetryEventsMap`.
- **Schemas**: `index.ts` defines `RootSchema` objects for each event and exports `attackDiscoveryTelemetryEvents`.
- **Registration**: Events are registered via `telemetry_events.ts` and wired into the global type system via `types.ts`.
- **Emission**: Components access `telemetry` from `useKibana().services` and call `telemetry.reportEvent(AttackDiscoveryEventTypes.XYZ, params)`.

## Product Questions Answered

1. **Adoption**: `GenerationStarted.execution_mode` distinguishes workflow vs legacy paths.
2. **Configuration patterns**: `SettingsSaved` captures retrieval mode, workflow count, and validation choices.
3. **Schedule adoption**: the schedule lifecycle is tracked by the `AttackDiscoverySchedulesEventTypes` events (`CreateSuccess`, `UpdateSuccess`, `DeleteSuccess`, `StatusUpdateSuccess`, and their `Failed`/`Bulk*` variants) emitted from `settings_flyout/schedule/logic/`.
4. **Edit with AI**: `EditWithAiClicked` tracks AI-assisted ES|QL editing usage; `TroubleshootWithAiClicked` tracks AI-assisted troubleshooting from the execution-details failure section.
5. **Feature engagement**: `PipelineStepInspected` and `ExecutionDetailsOpened` track execution monitoring usage.
