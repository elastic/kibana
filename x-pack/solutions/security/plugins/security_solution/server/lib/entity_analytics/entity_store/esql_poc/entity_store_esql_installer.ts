/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { startEntityStoreESQLExecuteTask } from './kibana_task_run_cycle';

export const install = (
  namespace: string,
  taskManager: TaskManagerStartContract,
  logger: Logger
) => {
  startEntityStoreESQLExecuteTask(namespace, taskManager, logger);
};
