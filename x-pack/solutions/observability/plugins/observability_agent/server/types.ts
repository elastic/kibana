/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatPluginSetup, OnechatPluginStart } from '@kbn/onechat-plugin/server/types';
import type {
  ApmDataAccessPluginSetup,
  ApmDataAccessPluginStart,
} from '@kbn/apm-data-access-plugin/server';
import type {
  LogsDataAccessPluginSetup,
  LogsDataAccessPluginStart,
} from '@kbn/logs-data-access-plugin/server';
import type {
  MetricsDataPluginSetup,
  MetricsDataPluginStart,
} from '@kbn/metrics-data-access-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
export type ObservabilityAgentPluginSetup = Record<string, never>;
export type ObservabilityAgentPluginStart = Record<string, never>;

export interface ObservabilityAgentPluginSetupDependencies {
  onechat: OnechatPluginSetup;
  apmDataAccess: ApmDataAccessPluginSetup;
  logsDataAccess: LogsDataAccessPluginSetup;
  metricsDataAccess: MetricsDataPluginSetup;
  security: SecurityPluginSetup;
}

export interface ObservabilityAgentPluginStartDependencies {
  onechat: OnechatPluginStart;
  apmDataAccess: ApmDataAccessPluginStart;
  logsDataAccess: LogsDataAccessPluginStart;
  metricsDataAccess: MetricsDataPluginStart;
  security: SecurityPluginStart;
}
