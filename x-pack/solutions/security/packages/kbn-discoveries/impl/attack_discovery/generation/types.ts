/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Placeholder — real types added in PR 4
export type DefaultWorkflowKey =
  | 'custom_validation_example'
  | 'default_alert_retrieval'
  | 'esql_example_alert_retrieval'
  | 'generation'
  | 'run_example'
  | 'validate';

export type RequiredDefaultWorkflowKey = 'default_alert_retrieval' | 'generation' | 'validate';
export type OptionalDefaultWorkflowKey = Exclude<DefaultWorkflowKey, RequiredDefaultWorkflowKey>;
export type DefaultWorkflowIds = Record<RequiredDefaultWorkflowKey, string> &
  Partial<Record<OptionalDefaultWorkflowKey, string>>;

export type DefaultAlertRetrievalMode = 'custom_query' | 'disabled' | 'esql' | 'provided';

export interface WorkflowConfig {
  additional_context?: string;
  alert_retrieval_workflow_ids: string[];
  default_alert_retrieval_mode: DefaultAlertRetrievalMode;
  esql_query?: string;
  provided_context?: string[];
  validation_workflow_id: string;
}

export interface ParsedApiConfig {
  action_type_id: string;
  connector_id: string;
  model?: string;
  provider?: string;
}

// Alias the workflows management API type from the platform plugin.
// The full named alias is added in PR 4; this gives PR 3 code a stable type to import.
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

export type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];
