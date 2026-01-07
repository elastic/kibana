/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { ExtractEntityTask } from './extract_entity_task';
import { ALL_ENTITY_TYPES } from '../domain/definitions/entity_type';
import type { TaskManager } from '../types';

export function registerTasks(taskManager: TaskManager, logger: Logger) {
  const tasks = ALL_ENTITY_TYPES.map((type) => new ExtractEntityTask(taskManager, logger, type));
  tasks.forEach((task) => task.register());
}
