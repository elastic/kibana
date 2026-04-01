/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

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

export type AttackDiscoverySettingsTab = 'monitoring' | 'settings' | 'schedule';

export type AttackDiscoveryAlertRetrievalMode = 'custom_query' | 'disabled' | 'esql' | 'provided';

export type AttackDiscoveryQueryMode = 'custom_query' | 'esql';

export type AttackDiscoveryExecutionMode = 'workflow' | 'legacy';

export type AttackDiscoveryGenerationTrigger = 'manual' | 'save_and_run';

export type AttackDiscoveryScheduleSource = 'empty_state' | 'schedule_tab';

export type AttackDiscoveryPipelineStepType = 'alert_retrieval' | 'generation' | 'validation';

interface AttackDiscoverySettingsFlyoutOpenedParams {
  tab: AttackDiscoverySettingsTab;
}

interface AttackDiscoverySettingsTabChangedParams {
  tab: AttackDiscoverySettingsTab;
}

interface AttackDiscoveryWorkflowConfigParams {
  custom_retrieval_workflow_count: number;
  default_alert_retrieval_mode: AttackDiscoveryAlertRetrievalMode;
  query_mode: AttackDiscoveryQueryMode;
  uses_default_validation: boolean;
}

type AttackDiscoverySettingsSavedParams = AttackDiscoveryWorkflowConfigParams;

type AttackDiscoverySaveAndRunClickedParams = AttackDiscoveryWorkflowConfigParams;

interface AttackDiscoveryAlertRetrievalModeChangedParams {
  mode: AttackDiscoveryAlertRetrievalMode;
}

interface AttackDiscoveryQueryModeChangedParams {
  mode: AttackDiscoveryQueryMode;
}

interface AttackDiscoveryAlertRetrievalWorkflowsChangedParams {
  workflow_count: number;
}

interface AttackDiscoveryValidationWorkflowChangedParams {
  is_default: boolean;
}

interface AttackDiscoveryScheduleCreateFlyoutOpenedParams {
  source: AttackDiscoveryScheduleSource;
}

interface AttackDiscoveryScheduleCreatedParams {
  has_actions: boolean;
  interval: string;
}

interface AttackDiscoveryScheduleUpdatedParams {
  has_actions: boolean;
  interval: string;
}

interface AttackDiscoveryGenerationStartedParams {
  execution_mode: AttackDiscoveryExecutionMode;
  trigger: AttackDiscoveryGenerationTrigger;
}

interface AttackDiscoveryPipelineStepInspectedParams {
  step_type: AttackDiscoveryPipelineStepType;
}

export interface AttackDiscoveryTelemetryEventsMap {
  [AttackDiscoveryEventTypes.SettingsFlyoutOpened]: AttackDiscoverySettingsFlyoutOpenedParams;
  [AttackDiscoveryEventTypes.SettingsTabChanged]: AttackDiscoverySettingsTabChangedParams;
  [AttackDiscoveryEventTypes.SettingsSaved]: AttackDiscoverySettingsSavedParams;
  [AttackDiscoveryEventTypes.SettingsReset]: Record<string, never>;
  [AttackDiscoveryEventTypes.SaveAndRunClicked]: AttackDiscoverySaveAndRunClickedParams;
  [AttackDiscoveryEventTypes.AlertRetrievalModeChanged]: AttackDiscoveryAlertRetrievalModeChangedParams;
  [AttackDiscoveryEventTypes.QueryModeChanged]: AttackDiscoveryQueryModeChangedParams;
  [AttackDiscoveryEventTypes.AlertRetrievalWorkflowsChanged]: AttackDiscoveryAlertRetrievalWorkflowsChangedParams;
  [AttackDiscoveryEventTypes.ValidationWorkflowChanged]: AttackDiscoveryValidationWorkflowChangedParams;
  [AttackDiscoveryEventTypes.EditWithAiClicked]: Record<string, never>;
  [AttackDiscoveryEventTypes.ScheduleCreateFlyoutOpened]: AttackDiscoveryScheduleCreateFlyoutOpenedParams;
  [AttackDiscoveryEventTypes.ScheduleCreated]: AttackDiscoveryScheduleCreatedParams;
  [AttackDiscoveryEventTypes.ScheduleUpdated]: AttackDiscoveryScheduleUpdatedParams;
  [AttackDiscoveryEventTypes.ScheduleDeleted]: Record<string, never>;
  [AttackDiscoveryEventTypes.ScheduleEnabled]: Record<string, never>;
  [AttackDiscoveryEventTypes.ScheduleDisabled]: Record<string, never>;
  [AttackDiscoveryEventTypes.GenerationStarted]: AttackDiscoveryGenerationStartedParams;
  [AttackDiscoveryEventTypes.ExecutionDetailsOpened]: Record<string, never>;
  [AttackDiscoveryEventTypes.GenerationDismissed]: Record<string, never>;
  [AttackDiscoveryEventTypes.PipelineStepInspected]: AttackDiscoveryPipelineStepInspectedParams;
  [AttackDiscoveryEventTypes.TroubleshootWithAiClicked]: Record<string, never>;
}

export interface AttackDiscoveryTelemetryEvent {
  eventType: AttackDiscoveryEventTypes;
  schema: RootSchema<AttackDiscoveryTelemetryEventsMap[AttackDiscoveryEventTypes]>;
}
