/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';
import type {
  AttackDiscoverySchedule as AttackDiscoveryScheduleApi,
  ScheduleAction,
  ScheduleGeneralAction,
} from '@kbn/discoveries-schemas';

const isGeneralAction = (action: ScheduleAction): action is ScheduleGeneralAction =>
  Object.hasOwn(action, 'group');

const transformActions = (actions: ScheduleAction[]): AttackDiscoverySchedule['actions'] =>
  actions.map((action) => {
    if (isGeneralAction(action)) {
      return {
        actionTypeId: action.action_type_id,
        alertsFilter: action.alerts_filter,
        frequency: action.frequency
          ? {
              notifyWhen: action.frequency.notify_when,
              summary: action.frequency.summary,
              throttle: action.frequency.throttle,
            }
          : undefined,
        group: action.group,
        id: action.id,
        params: action.params,
        uuid: action.uuid,
      };
    }
    return {
      actionTypeId: action.action_type_id,
      id: action.id,
      params: action.params,
      uuid: action.uuid,
    };
  });

/**
 * Transforms an AttackDiscoveryScheduleApi (snake_case, from the internal API) into an
 * AttackDiscoverySchedule (camelCase, used by the table and other UI components).
 */
export const transformAttackDiscoveryScheduleToAttackDiscoverySchedule = (
  schedule: AttackDiscoveryScheduleApi
): AttackDiscoverySchedule => ({
  actions: transformActions(schedule.actions ?? []),
  createdAt: schedule.created_at,
  createdBy: schedule.created_by,
  enabled: schedule.enabled,
  id: schedule.id,
  lastExecution: schedule.last_execution,
  name: schedule.name,
  params: {
    alertsIndexPattern: schedule.params.alerts_index_pattern,
    apiConfig: {
      actionTypeId: schedule.params.api_config.action_type_id,
      connectorId: schedule.params.api_config.connector_id,
      defaultSystemPromptId: schedule.params.api_config.default_system_prompt_id,
      model: schedule.params.api_config.model,
      name: schedule.params.api_config.name ?? '',
      provider: schedule.params.api_config.provider,
    },
    combinedFilter: schedule.params.combined_filter,
    end: schedule.params.end,
    filters: schedule.params.filters,
    query: schedule.params.query,
    size: schedule.params.size,
    start: schedule.params.start,
    workflowConfig:
      schedule.params.workflow_config != null
        ? {
            alertRetrievalWorkflowIds:
              schedule.params.workflow_config.alert_retrieval_workflow_ids ?? [],
            defaultAlertRetrievalMode:
              schedule.params.workflow_config.default_alert_retrieval_mode ?? 'custom_query',
            ...(schedule.params.workflow_config.esql_query != null
              ? { esqlQuery: schedule.params.workflow_config.esql_query }
              : {}),
            validationWorkflowId:
              schedule.params.workflow_config.validation_workflow_id ?? 'default',
          }
        : undefined,
  },
  schedule: schedule.schedule,
  updatedAt: schedule.updated_at,
  updatedBy: schedule.updated_by,
});
