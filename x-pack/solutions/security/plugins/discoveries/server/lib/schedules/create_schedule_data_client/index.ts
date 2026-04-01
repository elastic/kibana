/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AlertingApiRequestHandlerContext } from '@kbn/alerting-plugin/server';
import { AttackDiscoveryScheduleDataClient } from '@kbn/attack-discovery-schedules-common';
import { ATTACK_DISCOVERY_SCHEDULE_TAG } from '../constants';

/**
 * Creates the alerting-backed schedule data client.
 */
export const createScheduleDataClient = async ({
  alertingContext,
  logger,
  request,
  startPlugins,
}: {
  alertingContext: AlertingApiRequestHandlerContext;
  logger: Logger;
  request: KibanaRequest;
  startPlugins: { actions: ActionsPluginStart };
}): Promise<AttackDiscoveryScheduleDataClient> => {
  const actionsClient = await startPlugins.actions.getActionsClientWithRequest(request);
  const rulesClient = await alertingContext.getRulesClient();

  return new AttackDiscoveryScheduleDataClient({
    actionsClient,
    applyTags: [ATTACK_DISCOVERY_SCHEDULE_TAG],
    filterTags: { includeTags: [ATTACK_DISCOVERY_SCHEDULE_TAG] },
    logger,
    rulesClient,
  });
};
