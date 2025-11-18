/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import { OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID } from '@kbn/management-settings-ids';

export function getLogSources({ uiSettings }: { uiSettings: IUiSettingsClient }) {
  return uiSettings.get(OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID) as Promise<string[]>;
}
