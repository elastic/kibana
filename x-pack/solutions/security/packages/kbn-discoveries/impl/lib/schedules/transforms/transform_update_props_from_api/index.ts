/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttackDiscoveryScheduleParams,
  AttackDiscoveryScheduleUpdateProps,
} from '@kbn/elastic-assistant-common';
import type { AttackDiscoveryScheduleUpdateProps as AttackDiscoveryScheduleUpdatePropsApi } from '@kbn/discoveries-schemas';
import { transformActionsFromApi } from '../transform_actions_from_api';

/**
 * Transforms a snake_case AttackDiscoveryScheduleUpdateProps (from the API request)
 * to a camelCase AttackDiscoveryScheduleUpdateProps (for the DataClient).
 *
 * When `workflow_config` is absent from the API request, `existingWorkflowConfig`
 * is used as the fallback (preserving the schedule's current config). If neither
 * is provided, `workflowConfig` is `undefined` — pre-FF schedules are NOT silently
 * migrated to workflow mode.
 */
export const transformUpdatePropsFromApi = (
  apiUpdateProps: AttackDiscoveryScheduleUpdatePropsApi,
  existingWorkflowConfig?: AttackDiscoveryScheduleParams['workflowConfig']
): AttackDiscoveryScheduleUpdateProps => ({
  actions: transformActionsFromApi(apiUpdateProps.actions) ?? [],
  name: apiUpdateProps.name,
  params: {
    alertsIndexPattern: apiUpdateProps.params.alerts_index_pattern,
    apiConfig: {
      actionTypeId: apiUpdateProps.params.api_config.action_type_id,
      connectorId: apiUpdateProps.params.api_config.connector_id,
      defaultSystemPromptId: apiUpdateProps.params.api_config.default_system_prompt_id,
      model: apiUpdateProps.params.api_config.model,
      name: apiUpdateProps.params.api_config.name ?? '',
      provider: apiUpdateProps.params.api_config.provider,
    },
    combinedFilter: apiUpdateProps.params.combined_filter,
    end: apiUpdateProps.params.end,
    filters: apiUpdateProps.params.filters,
    query: apiUpdateProps.params.query,
    size: apiUpdateProps.params.size,
    start: apiUpdateProps.params.start,
    workflowConfig:
      apiUpdateProps.params.workflow_config != null
        ? {
            alertRetrievalWorkflowIds:
              apiUpdateProps.params.workflow_config.alert_retrieval_workflow_ids,
            alertRetrievalMode:
              apiUpdateProps.params.workflow_config.alert_retrieval_mode ?? 'custom_query',
            esqlQuery: apiUpdateProps.params.workflow_config.esql_query,
            validationWorkflowId: apiUpdateProps.params.workflow_config.validation_workflow_id,
          }
        : existingWorkflowConfig,
  },
  schedule: apiUpdateProps.schedule,
});
