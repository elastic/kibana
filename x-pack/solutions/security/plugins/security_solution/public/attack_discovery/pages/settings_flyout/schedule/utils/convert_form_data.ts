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

import { convertToBuildEsQuery } from '../../../../../common/lib/kuery';
import type { AttackDiscoveryScheduleSchema } from '../edit_form/types';
import { getGenAiConfig } from '../../../use_attack_discovery/helpers';
import { parseFilterQuery } from '../../parse_filter_query';

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
    connectorId: connector.id,
    name: connector.name,
    actionTypeId: connector.actionTypeId,
    provider: connector.apiProvider,
    model: genAiConfig?.defaultModel,
  };
  return {
    name: scheduleData.name,
    enabled: true,
    params: {
      alertsIndexPattern: alertsIndexPattern ?? '',
      apiConfig,
      end: alertsSelectionSettings.end,
      query: alertsSelectionSettings.query,
      filters: alertsSelectionSettings.filters,
      combinedFilter,
      size: alertsSelectionSettings.size,
      start: alertsSelectionSettings.start,
    },
    schedule: { interval: scheduleData.interval },
    actions: scheduleData.actions,
  };
};
