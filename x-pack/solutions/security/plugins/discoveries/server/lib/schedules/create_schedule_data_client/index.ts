/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Placeholder — real implementation added in PR 10
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AlertingApiRequestHandlerContext } from '@kbn/alerting-plugin/server';
import type { AttackDiscoveryScheduleDataClient } from '@kbn/attack-discovery-schedules-common';

export const createScheduleDataClient = async (_params: {
  alertingContext: AlertingApiRequestHandlerContext;
  logger: Logger;
  request: KibanaRequest;
  startPlugins: { actions: ActionsPluginStart };
}): Promise<AttackDiscoveryScheduleDataClient> => {
  throw new Error('Not implemented — real implementation added in PR 10');
};
