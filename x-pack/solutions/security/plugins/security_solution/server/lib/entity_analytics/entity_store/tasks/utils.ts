/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

export const entityStoreTaskLogFactory =
  (logger: Logger, taskId: string) =>
  (message: string): void =>
    logger.info(`[Entity Store] [task ${taskId}]: ${message}`);

export const entityStoreTaskDebugLogFactory =
  (logger: Logger, taskId: string) =>
  (message: string): void =>
    logger.debug(`[Entity Store] [task ${taskId}]: ${message}`);
