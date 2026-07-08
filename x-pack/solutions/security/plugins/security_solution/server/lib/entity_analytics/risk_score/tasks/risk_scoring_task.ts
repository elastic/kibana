/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Logger, SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { TYPE, VERSION } from './constants';

const getTaskId = (namespace: string): string => `${TYPE}:${namespace}:${VERSION}`;

export const removeRiskScoringTask = async ({
  logger,
  namespace,
  taskManager,
}: {
  logger: Logger;
  namespace: string;
  taskManager: TaskManagerStartContract;
}) => {
  try {
    await taskManager.remove(getTaskId(namespace));
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      logger.error(`Failed to remove risk scoring task: ${err.message}`);
      throw err;
    }
  }
};
