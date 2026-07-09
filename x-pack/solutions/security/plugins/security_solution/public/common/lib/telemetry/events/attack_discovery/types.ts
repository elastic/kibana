/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stub: the full event schema (with RootSchema and params interfaces) is
// added by a later PR in the stack (PR5 — Telemetry / EBT Events). PR3 only
// needs the enum + a permissive map so `useAttackDiscovery` can call
// `telemetry.reportEvent(...)` with its expected payloads. The enum is
// FF-off safe — it is purely a set of string constants; calling reportEvent
// is a no-op until PR5 registers the corresponding event types with the
// analytics service.
export type AttackDiscoveryTelemetryEventsMap = {
  [K in AttackDiscoveryEventTypes]: Record<string, unknown>;
};

export enum AttackDiscoveryEventTypes {
  SettingsFlyoutOpened = 'Attack Discovery Settings Flyout Opened',
  SettingsTabChanged = 'Attack Discovery Settings Tab Changed',
  SettingsSaved = 'Attack Discovery Settings Saved',
  SettingsReset = 'Attack Discovery Settings Reset',
  SaveAndRunClicked = 'Attack Discovery Save And Run Clicked',
  AlertRetrievalModeChanged = 'Attack Discovery Alert Retrieval Mode Changed',
  QueryModeChanged = 'Attack Discovery Query Mode Changed',
  AlertRetrievalWorkflowsChanged = 'Attack Discovery Alert Retrieval Workflows Changed',
  ValidationWorkflowChanged = 'Attack Discovery Validation Workflow Changed',
  EditWithAiClicked = 'Attack Discovery Edit With AI Clicked',
  ScheduleCreateFlyoutOpened = 'Attack Discovery Schedule Create Flyout Opened',
  ScheduleCreated = 'Attack Discovery Schedule Created',
  ScheduleUpdated = 'Attack Discovery Schedule Updated',
  ScheduleDeleted = 'Attack Discovery Schedule Deleted',
  ScheduleEnabled = 'Attack Discovery Schedule Enabled',
  ScheduleDisabled = 'Attack Discovery Schedule Disabled',
  GenerationStarted = 'Attack Discovery Generation Started',
  ExecutionDetailsOpened = 'Attack Discovery Execution Details Opened',
  GenerationDismissed = 'Attack Discovery Generation Dismissed',
  PipelineStepInspected = 'Attack Discovery Pipeline Step Inspected',
  TroubleshootWithAiClicked = 'Attack Discovery Troubleshoot With AI Clicked',
}
