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
import type { ExperimentalFeatures } from '../../../../common';
import type { StartPlugins } from '../../../plugin';
import { deleteBriefRoute } from './routes/delete_brief';
import { generateBriefRoute } from './routes/generate_brief';
import { getBriefRoute } from './routes/get_brief';
import type { ExecutiveBriefRouteDeps } from './routes/route_utils';
import { BriefStore } from './store/brief_store';
import { createBriefStorage } from './store/storage';
import { registerCleanupBriefsTask, scheduleCleanupBriefsTask } from './tasks/cleanup_briefs_task';
import { registerGenerateBriefTask } from './tasks/generate_brief_task';

type FlagGate = Pick<ExperimentalFeatures, 'entityAnalyticsExecutiveBriefEnabled'>;

/**
 * Lazily creates one brief store (and storage adapter) per caller, on first use, as the internal
 * user. No index is created until the first brief is written.
 */
export const createBriefStoreProvider = ({
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

/** Plugin setup: registers the generate and cleanup task types when the flag is on. */
export const registerExecutiveBriefTaskTypes = ({
  taskManager,
  getStartServices,
  logger,
  experimentalFeatures,
}: {
  taskManager: TaskManagerSetupContract | undefined;
  getStartServices: StartServicesAccessor<StartPlugins>;
  logger: Logger;
  experimentalFeatures: FlagGate;
}): void => {
  if (!experimentalFeatures.entityAnalyticsExecutiveBriefEnabled || !taskManager) {
    return;
  }
  const briefLogger = logger.get('executive_brief');
  const getBriefStore = createBriefStoreProvider({ getStartServices, logger: briefLogger });
  registerGenerateBriefTask({ taskManager, getStartServices, getBriefStore, logger: briefLogger });
  registerCleanupBriefsTask({ taskManager, getBriefStore, logger: briefLogger });
};

/** Route registration (setup): POST/GET/DELETE at EXECUTIVE_BRIEF_API_PATH, when the flag is on. */
export const registerExecutiveBriefRoutes = ({
  router,
  logger,
  getStartServices,
  hasEncryptionKey,
  experimentalFeatures,
}: Omit<ExecutiveBriefRouteDeps, 'getBriefStore'> & { experimentalFeatures: FlagGate }): void => {
  if (!experimentalFeatures.entityAnalyticsExecutiveBriefEnabled) {
    return;
  }
  const briefLogger = logger.get('executive_brief');
  const deps: ExecutiveBriefRouteDeps = {
    router,
    logger: briefLogger,
    getStartServices,
    hasEncryptionKey,
    getBriefStore: createBriefStoreProvider({ getStartServices, logger: briefLogger }),
  };
  generateBriefRoute(deps);
  getBriefRoute(deps);
  deleteBriefRoute(deps);
};

/** Plugin start: ensures the daily cleanup task is scheduled, when the flag is on. */
export const scheduleExecutiveBriefCleanup = ({
  taskManager,
  logger,
  experimentalFeatures,
}: {
  taskManager: TaskManagerStartContract | undefined;
  logger: Logger;
  experimentalFeatures: FlagGate;
}): void => {
  if (!experimentalFeatures.entityAnalyticsExecutiveBriefEnabled || !taskManager) {
    return;
  }
  scheduleCleanupBriefsTask(taskManager).catch((error) => {
    logger.error(`Error scheduling the executive brief cleanup task: ${error.message}`);
  });
};
