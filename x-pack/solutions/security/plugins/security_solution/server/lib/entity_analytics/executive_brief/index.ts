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
 * report in the user's document (`store/`), which the GET routes read.
 * Set up only when `entityAnalyticsExecutiveBriefEnabled` is on.
 */

import type { Logger, StartServicesAccessor } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { StartPlugins } from '../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { registerBriefRoutes } from './routes';
import { BriefStore } from './store/brief_store';
import { createBriefStorageClient } from './store/storage';
import { registerBriefTasks, scheduleCleanupTask } from './task';

/** Plugin setup: registers the routes and tasks, sharing one store created on first use. */
export const setupExecutiveBrief = ({
  router,
  taskManager,
  getStartServices,
  logger: pluginLogger,
  hasEncryptionKey,
}: {
  router: SecuritySolutionPluginRouter;
  taskManager: TaskManagerSetupContract | undefined;
  getStartServices: StartServicesAccessor<StartPlugins>;
  logger: Logger;
  hasEncryptionKey: boolean;
}): void => {
  const logger = pluginLogger.get('executive_brief');
  let store: Promise<BriefStore> | undefined;
  // No index is created until the first brief is written.
  const getBriefStore = (): Promise<BriefStore> => {
    store ??= getStartServices().then(([coreStart]) => {
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      return new BriefStore(createBriefStorageClient(esClient, logger), esClient);
    });
    return store;
  };

  if (taskManager) {
    registerBriefTasks({ taskManager, getStartServices, getBriefStore, logger });
  }
  registerBriefRoutes({ router, logger, getStartServices, getBriefStore, hasEncryptionKey });
};

/** Plugin start: ensures the daily cleanup task is scheduled. */
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
  scheduleCleanupTask(taskManager).catch((error) => {
    logger.error(`Error scheduling the executive brief cleanup task: ${error.message}`);
  });
};
