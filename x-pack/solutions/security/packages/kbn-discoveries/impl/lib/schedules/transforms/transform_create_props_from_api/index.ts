/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryScheduleCreateProps } from '@kbn/elastic-assistant-common';
import type { AttackDiscoveryScheduleCreateProps as AttackDiscoveryScheduleCreatePropsApi } from '@kbn/discoveries-schemas';
import { transformActionsFromApi } from '../transform_actions_from_api';

const DEFAULT_WORKFLOW_CONFIG = {
  alertRetrievalMode: 'custom_query' as const,
  alertRetrievalWorkflowIds: [] as string[],
  validationWorkflowId: 'default',
};

/**
 * Transforms a snake_case AttackDiscoveryScheduleCreatePropsApi (from the API request)
 * to a camelCase AttackDiscoveryScheduleCreateProps (for the DataClient).
 *
 * Always includes workflowConfig so the alerting framework delegates to the
 * generation workflow executor, which writes tracking events to the event
 * log (enabling the workflow execution details flyout in the UI).
 */
export const transformCreatePropsFromApi = (
  apiCreateProps: AttackDiscoveryScheduleCreatePropsApi
): AttackDiscoveryScheduleCreateProps => ({
  actions: transformActionsFromApi(apiCreateProps.actions),
  enabled: apiCreateProps.enabled,
  name: apiCreateProps.name,
  params: {
    alertsIndexPattern: apiCreateProps.params.alerts_index_pattern,
    apiConfig: {
      actionTypeId: apiCreateProps.params.api_config.action_type_id,
      connectorId: apiCreateProps.params.api_config.connector_id,
      defaultSystemPromptId: apiCreateProps.params.api_config.default_system_prompt_id,
      model: apiCreateProps.params.api_config.model,
      name: apiCreateProps.params.api_config.name ?? '',
      provider: apiCreateProps.params.api_config.provider,
    },
    combinedFilter: apiCreateProps.params.combined_filter,
    end: apiCreateProps.params.end,
    filters: apiCreateProps.params.filters,
    query: apiCreateProps.params.query,
    size: apiCreateProps.params.size,
    start: apiCreateProps.params.start,
    workflowConfig:
      apiCreateProps.params.workflow_config != null
        ? {
            alertRetrievalWorkflowIds:
              apiCreateProps.params.workflow_config.alert_retrieval_workflow_ids,
            alertRetrievalMode:
              apiCreateProps.params.workflow_config.alert_retrieval_mode ?? 'custom_query',
            esqlQuery: apiCreateProps.params.workflow_config.esql_query,
            validationWorkflowId: apiCreateProps.params.workflow_config.validation_workflow_id,
          }
        : DEFAULT_WORKFLOW_CONFIG,
  },
  schedule: apiCreateProps.schedule,
});
