/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';
import type { AttackDiscoverySchedule as AttackDiscoveryScheduleApi } from '@kbn/discoveries-schemas';
import { transformActionsToApi } from '../transform_actions_to_api';

/**
 * Transforms a camelCase AttackDiscoverySchedule (from the DataClient)
 * to a snake_case AttackDiscoveryScheduleApi (for the API response).
 */
export const transformScheduleToApi = (
  schedule: AttackDiscoverySchedule
): AttackDiscoveryScheduleApi => ({
  actions: transformActionsToApi(schedule.actions),
  created_at: schedule.createdAt,
  created_by: schedule.createdBy,
  enabled: schedule.enabled,
  id: schedule.id,
  last_execution: schedule.lastExecution,
  name: schedule.name,
  params: {
    alerts_index_pattern: schedule.params.alertsIndexPattern,
    api_config: {
      action_type_id: schedule.params.apiConfig.actionTypeId,
      connector_id: schedule.params.apiConfig.connectorId,
      default_system_prompt_id: schedule.params.apiConfig.defaultSystemPromptId,
      model: schedule.params.apiConfig.model,
      name: schedule.params.apiConfig.name,
      provider: schedule.params.apiConfig.provider,
    },
    combined_filter: schedule.params.combinedFilter,
    end: schedule.params.end,
    filters: schedule.params.filters,
    query: schedule.params.query,
    size: schedule.params.size,
    start: schedule.params.start,
    workflow_config:
      schedule.params.workflowConfig != null
        ? (() => {
            const wc = schedule.params.workflowConfig as {
              alertRetrievalWorkflowIds?: string[];
              defaultAlertRetrievalEnabled?: boolean;
              defaultAlertRetrievalMode?: 'custom_query' | 'disabled' | 'esql';
              esqlQuery?: string;
              validationWorkflowId?: string;
            };
            const defaultAlertRetrievalMode =
              wc.defaultAlertRetrievalMode ??
              (wc.defaultAlertRetrievalEnabled === false ? 'disabled' : 'custom_query');
            return {
              alert_retrieval_workflow_ids: wc.alertRetrievalWorkflowIds ?? [],
              default_alert_retrieval_mode: defaultAlertRetrievalMode,
              esql_query: wc.esqlQuery,
              validation_workflow_id: wc.validationWorkflowId ?? 'default',
            };
          })()
        : undefined,
  },
  schedule: schedule.schedule,
  updated_at: schedule.updatedAt,
  updated_by: schedule.updatedBy,
});
