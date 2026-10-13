/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, StartServicesAccessor } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { StartPlugins } from '../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { deleteBriefRoute } from './routes/delete_brief';
import { generateBriefRoute } from './routes/generate_brief';
import { getBriefRoute } from './routes/get_brief';
import { getBriefStatusRoute } from './routes/get_brief_status';
import type { ExecutiveBriefRouteDeps } from './routes/route_utils';
import { BriefStore } from './store/brief_store';
import { createBriefStorage } from './store/storage';
import { registerCleanupBriefsTask, scheduleCleanupBriefsTask } from './tasks/cleanup_briefs_task';
import { registerGenerateBriefTask } from './tasks/generate_brief_task';
import type { BriefTelemetry } from './telemetry/types';

/**
 * Lazily creates the brief store (and storage adapter) on first use, as the internal user.
 * No index is created until the first brief is written.
 */
const createBriefStoreProvider = ({
  getStartServices,
  logger,
}: {
  getStartServices: StartServicesAccessor<StartPlugins>;
  logger: Logger;
}): (() => Promise<BriefStore>) => {
  let store: Promise<BriefStore> | undefined;
  return () => {
    if (!store) {
      store = getStartServices().then(([coreStart]) => {
        const esClient = coreStart.elasticsearch.client.asInternalUser;
        return new BriefStore({
          storageClient: createBriefStorage({ esClient, logger }).getClient(),
          esClient,
          logger,
        });
      });
    }
    return store;
  };
};

export interface SetupExecutiveBriefParams {
  router: SecuritySolutionPluginRouter;
  taskManager: TaskManagerSetupContract | undefined;
  getStartServices: StartServicesAccessor<StartPlugins>;
  logger: Logger;
  hasEncryptionKey: boolean;
  telemetry: BriefTelemetry;
}

/**
 * Plugin setup: registers the brief routes and the generate and cleanup task types, sharing one
 * store. Call only when `entityAnalyticsExecutiveBriefEnabled` is on.
 */
export const setupExecutiveBrief = ({
  router,
  taskManager,
  getStartServices,
  logger,
  hasEncryptionKey,
  telemetry,
}: SetupExecutiveBriefParams): void => {
  const briefLogger = logger.get('executive_brief');
  const getBriefStore = createBriefStoreProvider({ getStartServices, logger: briefLogger });

  if (taskManager) {
    registerGenerateBriefTask({
      taskManager,
      getStartServices,
      getBriefStore,
      logger: briefLogger,
      telemetry,
    });
    registerCleanupBriefsTask({ taskManager, getBriefStore, logger: briefLogger });
  }

  const routeDeps: ExecutiveBriefRouteDeps = {
    router,
    logger: briefLogger,
    getStartServices,
    getBriefStore,
    hasEncryptionKey,
    telemetry,
  };
  generateBriefRoute(routeDeps);
  getBriefRoute(routeDeps);
  getBriefStatusRoute(routeDeps);
  deleteBriefRoute(routeDeps);
};

/**
 * Plugin start: ensures the daily cleanup task is scheduled. Call only when
 * `entityAnalyticsExecutiveBriefEnabled` is on.
 */
export const startExecutiveBrief = ({
  taskManager,
  logger,
}: {
  taskManager: TaskManagerStartContract | undefined;
  logger: Logger;
}): void => {
  if (!taskManager) {
    return;
  }
  scheduleCleanupBriefsTask(taskManager).catch((error) => {
    logger.error(`Error scheduling the executive brief cleanup task: ${error.message}`);
  });
};
