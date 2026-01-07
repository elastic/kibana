/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { EntityStorePlugins, TaskManager } from '../types';

export async function getTaskManager(
  core: CoreSetup,
  setupPlugins: EntityStorePlugins
): Promise<TaskManager> {
  const [, startPlugins] = await core.getStartServices();
  const taskManagerStart = (startPlugins as { taskManager: TaskManagerStartContract }).taskManager;
  const taskManagerSetup = setupPlugins.taskManager;

  return {
    ...taskManagerSetup,
    ...taskManagerStart,
  };
}
