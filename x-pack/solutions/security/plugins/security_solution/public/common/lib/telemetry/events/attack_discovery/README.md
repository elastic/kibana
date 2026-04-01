# Attack Discovery Client-Side Telemetry

Event-Based Telemetry (EBT) events for the Attack Discovery 2.0 Workflows integration UI.

## Privacy

All events avoid collecting user-defined names, query content, alert data, or user identifiers. Only anonymous metadata (counts, modes, boolean flags, enum values) is captured.

## Events

| Event Name | Key Fields | Emitted From |
| --- | --- | --- |
| `Attack Discovery Settings Flyout Opened` | `tab` (settings/schedule) | `settings_flyout/index.tsx` |
| `Attack Discovery Settings Tab Changed` | `tab` (settings/schedule) | `hooks/use_tabs_view.tsx` |
| `Attack Discovery Settings Saved` | `default_alert_retrieval_mode`, `custom_retrieval_workflow_count`, `uses_default_validation`, `query_mode` | `hooks/use_settings_view.tsx` |
| `Attack Discovery Settings Reset` | _(none)_ | `hooks/use_settings_view.tsx` |
| `Attack Discovery Save And Run Clicked` | `default_alert_retrieval_mode`, `custom_retrieval_workflow_count`, `uses_default_validation`, `query_mode` | `hooks/use_settings_view.tsx` |
| `Attack Discovery Alert Retrieval Mode Changed` | `mode` (custom_query/esql/disabled) | `alert_retrieval_content/index.tsx` |
| `Attack Discovery Query Mode Changed` | `mode` (custom_query/esql) | `alert_retrieval_content/index.tsx` |
| `Attack Discovery Alert Retrieval Workflows Changed` | `workflow_count` | `workflow_configuration_panel/index.tsx` |
| `Attack Discovery Validation Workflow Changed` | `is_default` | `validation_panel/index.tsx` |
| `Attack Discovery Edit With AI Clicked` | _(none)_ | `edit_with_ai/index.tsx` |
| `Attack Discovery Schedule Create Flyout Opened` | `source` (empty_state/schedule_tab) | `hooks/use_schedule_view.tsx` |
| `Attack Discovery Schedule Created` | `has_actions`, `interval` | `schedule/create_flyout/index.tsx` |
| `Attack Discovery Schedule Updated` | `has_actions`, `interval` | `schedule/details_flyout/index.tsx` |
| `Attack Discovery Schedule Deleted` | _(none)_ | `schedule/schedules_table/index.tsx` |
| `Attack Discovery Schedule Enabled` | _(none)_ | `schedule/schedules_table/index.tsx` |
| `Attack Discovery Schedule Disabled` | _(none)_ | `schedule/schedules_table/index.tsx` |
| `Attack Discovery Generation Started` | `execution_mode` (workflow/legacy), `trigger` (manual/save_and_run) | `use_attack_discovery/index.tsx` |
| `Attack Discovery Execution Details Opened` | _(none)_ | `loading_callout/index.tsx` |
| `Attack Discovery Generation Dismissed` | _(none)_ | `loading_callout/index.tsx` |
| `Attack Discovery Pipeline Step Inspected` | `step_type` (alert_retrieval/generation/validation) | `workflow_execution_details_flyout/index.tsx` |

## Architecture

- **Types**: `types.ts` defines the `AttackDiscoveryEventTypes` enum, parameter interfaces, and `AttackDiscoveryTelemetryEventsMap`.
- **Schemas**: `index.ts` defines `RootSchema` objects for each event and exports `attackDiscoveryTelemetryEvents`.
- **Registration**: Events are registered via `telemetry_events.ts` and wired into the global type system via `types.ts`.
- **Emission**: Components access `telemetry` from `useKibana().services` and call `telemetry.reportEvent(AttackDiscoveryEventTypes.XYZ, params)`.

## Product Questions Answered

1. **Adoption**: `GenerationStarted.execution_mode` distinguishes workflow vs legacy paths.
2. **Configuration patterns**: `SettingsSaved` captures retrieval mode, workflow count, and validation choices.
3. **Schedule adoption**: `ScheduleCreated`/`Enabled`/`Disabled`/`Deleted` track the schedule lifecycle.
4. **Edit with AI**: `EditWithAiClicked` tracks AI-assisted ES|QL editing usage.
5. **Feature engagement**: `PipelineStepInspected` and `ExecutionDetailsOpened` track execution monitoring usage.
