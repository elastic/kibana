/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { UxPluginStartDeps } from '../plugin_types';
import { readSessionReplaySettings } from '../routes/session_replay/settings';
import { reconcileRumSessionsTransform } from '../transforms/rum_sessions';

export const RUM_SESSIONS_RECONCILE_TASK_TYPE = 'ux:rum-sessions-reconcile';
export const RUM_SESSIONS_RECONCILE_TASK_ID = 'ux-rum-sessions-reconcile';

export const registerRumSessionsReconcileTask = ({
  core,
  logger,
  taskManager,
}: {
  core: CoreSetup<UxPluginStartDeps>;
  logger: Logger;
  taskManager: TaskManagerSetupContract;
}): void => {
  taskManager.registerTaskDefinitions({
    [RUM_SESSIONS_RECONCILE_TASK_TYPE]: {
      title: 'UX session analytics reconcile',
      description: 'Ensures ux-rum-sessions and daily RUM rollups exist and are running.',
      timeout: '2m',
      maxAttempts: 1,
      cost: TaskCost.Tiny,
      priority: TaskPriority.Low,
      createTaskRunner: () => ({
        run: async () => {
          const [coreStart] = await core.getStartServices();
          const settings = await readSessionReplaySettings(
            coreStart.savedObjects.createInternalRepository()
          );
          await reconcileRumSessionsTransform({
            client: coreStart.elasticsearch.client.asInternalUser,
            logger,
            syncDelay: settings.syncDelay,
            sourceLookbackDays: settings.sourceLookbackDays,
          });
        },
      }),
    },
  });
};

export const scheduleRumSessionsReconcileTask = async (
  taskManager: TaskManagerStartContract
): Promise<void> => {
  await taskManager.ensureScheduled({
    id: RUM_SESSIONS_RECONCILE_TASK_ID,
    taskType: RUM_SESSIONS_RECONCILE_TASK_TYPE,
    schedule: { interval: '10m' },
    params: {},
    state: {},
  });
};
