/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import type { DataView } from '@kbn/data-plugin/common';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { AIConnector } from '@kbn/elastic-assistant';
import type { RuleAction, RuleSystemAction } from '@kbn/alerting-plugin/common';

import { convertToBuildEsQuery } from '../../../../../common/lib/kuery';
import type { AttackDiscoveryScheduleSchema } from '../edit_form/types';
import { getGenAiConfig } from '../../../use_attack_discovery/helpers';
import { parseFilterQuery } from '../../parse_filter_query';
import { workflowConfigFormToApi } from './workflow_config_form_to_api';

const isGeneralAction = (action: RuleAction | RuleSystemAction): action is RuleAction =>
  'group' in action;

/**
 * Converts camelCase form actions (RuleAction / RuleSystemAction) to the
 * snake_case format expected by the internal discoveries schedule API.
 */
export const convertActionsToSnakeCase = (
  actions: Array<RuleAction | RuleSystemAction>
): unknown[] =>
  actions.map((action) => {
    if (isGeneralAction(action)) {
      return {
        action_type_id: action.actionTypeId,
        ...(action.alertsFilter != null ? { alerts_filter: action.alertsFilter } : {}),
        ...(action.frequency != null
          ? {
              frequency: {
                notify_when: action.frequency.notifyWhen,
                summary: action.frequency.summary,
                throttle: action.frequency.throttle,
              },
            }
          : {}),
        group: action.group,
        id: action.id,
        params: action.params,
        ...(action.uuid != null ? { uuid: action.uuid } : {}),
      };
    }

    return {
      action_type_id: action.actionTypeId,
      id: action.id,
      params: action.params,
      ...(action.uuid != null ? { uuid: action.uuid } : {}),
    };
  });

/**
 * Converts form data to the camelCase base (public elastic_assistant) schedule
 * shape used when the workflows feature flag is OFF.
 *
 * This path intentionally does NOT carry `workflowConfig`: the composite
 * retrieval toggles are only rendered (and only set on the form) when the
 * workflows feature flag is ON, which routes through
 * {@link convertFormDataToWorkflowSchedule} instead. Keeping the
 * `workflowConfig` mapping in a single place ({@link workflowConfigFormToApi})
 * removes a duplicate, drift-prone builder.
 */
export const convertFormDataInBaseSchedule = (
  scheduleData: AttackDiscoveryScheduleSchema,
  alertsIndexPattern: string,
  connector: AIConnector,
  uiSettings: IUiSettingsClient,
  dataView: DataView
) => {
  const alertsSelectionSettings = scheduleData.alertsSelectionSettings;

  const [filterQuery, kqlError] = convertToBuildEsQuery({
    config: getEsQueryConfig(uiSettings),
    dataView,
    queries: [alertsSelectionSettings.query],
    filters: alertsSelectionSettings.filters,
  });
  const combinedFilter = parseFilterQuery({ filterQuery, kqlError });

  const genAiConfig = getGenAiConfig(connector);
  const apiConfig = {
    actionTypeId: connector.actionTypeId,
    connectorId: connector.id,
    ...(genAiConfig?.defaultModel != null ? { model: genAiConfig.defaultModel } : {}),
    name: connector.name,
    ...(connector.apiProvider != null ? { provider: connector.apiProvider } : {}),
  };

  return {
    actions: scheduleData.actions,
    enabled: true,
    name: scheduleData.name,
    params: {
      alertsIndexPattern: alertsIndexPattern ?? '',
      apiConfig,
      combinedFilter,
      end: alertsSelectionSettings.end,
      filters: alertsSelectionSettings.filters,
      query: alertsSelectionSettings.query,
      size: alertsSelectionSettings.size,
      start: alertsSelectionSettings.start,
      ...(scheduleData.type != null ? { type: scheduleData.type } : {}),
    },
    schedule: { interval: scheduleData.interval },
  };
};

/**
 * Converts form data to the snake_case format expected by the internal
 * discoveries schedule API (`AttackDiscoveryScheduleCreateProps`).
 */
export const convertFormDataToWorkflowSchedule = (
  scheduleData: AttackDiscoveryScheduleSchema,
  alertsIndexPattern: string,
  connector: AIConnector,
  uiSettings: IUiSettingsClient,
  dataView: DataView
) => {
  const alertsSelectionSettings = scheduleData.alertsSelectionSettings;

  const [filterQuery, kqlError] = convertToBuildEsQuery({
    config: getEsQueryConfig(uiSettings),
    dataView,
    queries: [alertsSelectionSettings.query],
    filters: alertsSelectionSettings.filters,
  });
  const combinedFilter = parseFilterQuery({ filterQuery, kqlError });

  const genAiConfig = getGenAiConfig(connector);

  const { workflowConfig } = scheduleData;
  const workflowConfigPayload =
    workflowConfig != null ? workflowConfigFormToApi(workflowConfig) : undefined;

  return {
    actions: convertActionsToSnakeCase(scheduleData.actions),
    enabled: true,
    name: scheduleData.name,
    params: {
      alerts_index_pattern: alertsIndexPattern ?? '',
      api_config: {
        action_type_id: connector.actionTypeId,
        connector_id: connector.id,
        ...(genAiConfig?.defaultModel != null ? { model: genAiConfig.defaultModel } : {}),
        name: connector.name,
        ...(connector.apiProvider != null ? { provider: connector.apiProvider } : {}),
      },
      combined_filter: combinedFilter,
      end: alertsSelectionSettings.end,
      filters: alertsSelectionSettings.filters,
      query: alertsSelectionSettings.query,
      size: alertsSelectionSettings.size,
      start: alertsSelectionSettings.start,
      ...(scheduleData.type != null ? { type: scheduleData.type } : {}),
      ...(workflowConfigPayload != null ? { workflow_config: workflowConfigPayload } : {}),
    },
    schedule: { interval: scheduleData.interval },
  };
};
