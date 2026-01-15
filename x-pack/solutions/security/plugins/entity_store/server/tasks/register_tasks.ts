/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { ALL_ENTITY_TYPES } from '../domain/definitions/entity_type';
import { registerExtractEntityTasks } from './extract_entity_task';

export function registerTasks(taskManager: TaskManagerSetupContract, logger: Logger) {
  registerExtractEntityTasks({ taskManager, logger, entityTypes: ALL_ENTITY_TYPES });
}
