/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Entity Analytics executive brief. A POST route starts a job and schedules a task as the user;
 * the task gathers evidence from the signals (`signals/`), has the AI compose a brief from it
 * (`composition/`), verifies the brief against that evidence (`verification/`), and stores the
 * report in the user's document (`data_client/`), which the GET routes read.
 * Set up only when `entityAnalyticsExecutiveBriefEnabled` is on.
 */

import type { AnalyticsServiceSetup, Logger, StartServicesAccessor } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { StartPlugins } from '../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { ExecutiveBriefDataClient } from './data_client/data_client';
import type { ExecutiveBriefStorage } from './data_client/storage';
import { createStorage } from './data_client/storage';
import type { BriefOwner } from './data_client/types';
import { registerBriefRoutes } from './routes';
import { registerBriefTask } from './task';
import { ENTITY_ANALYTICS_EXECUTIVE_BRIEF_COMPLETED_EVENT } from './telemetry';

/** Plugin setup: registers the routes, task and usage event, sharing one storage adapter. */
export const setupExecutiveBrief = ({
  analytics,
  router,
  taskManager,
  getStartServices,
  logger: pluginLogger,
  hasEncryptionKey,
}: {
  analytics: AnalyticsServiceSetup;
  router: SecuritySolutionPluginRouter;
  taskManager: TaskManagerSetupContract | undefined;
  getStartServices: StartServicesAccessor<StartPlugins>;
  logger: Logger;
  hasEncryptionKey: boolean;
}): void => {
  const logger = pluginLogger.get('executive_brief');
  // No index is created until the first brief is written.
  let storage: ExecutiveBriefStorage | undefined;
  const getDataClient = async (owner: BriefOwner): Promise<ExecutiveBriefDataClient> => {
    const [coreStart] = await getStartServices();
    storage ??= createStorage({ esClient: coreStart.elasticsearch.client.asInternalUser, logger });
    return new ExecutiveBriefDataClient({ storage, owner });
  };

  analytics.registerEventType(ENTITY_ANALYTICS_EXECUTIVE_BRIEF_COMPLETED_EVENT);
  if (taskManager) {
    registerBriefTask({ taskManager, getStartServices, getDataClient, logger });
  }
  registerBriefRoutes({ router, logger, getStartServices, getDataClient, hasEncryptionKey });
};
