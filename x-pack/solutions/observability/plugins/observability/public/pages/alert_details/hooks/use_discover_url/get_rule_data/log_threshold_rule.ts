/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import { OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID } from '@kbn/management-settings-ids';

export const getLogThresholdRuleData = ({ uiSettings }: { uiSettings: IUiSettingsClient }) => {
  const logSources: string[] =
    uiSettings?.get<string[]>(OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID) ?? [];

  return logSources.length > 0
    ? {
        discoverAppLocatorParams: {
          dataViewSpec: { title: logSources.join(','), timeFieldName: '@timestamp' },
        },
      }
    : {};
};
