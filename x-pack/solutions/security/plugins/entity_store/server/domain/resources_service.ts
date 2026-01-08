/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { EntityType } from './definitions/entity_type';
import { ALL_ENTITY_TYPES } from './definitions/entity_type';
import type { TaskManagers } from '../tasks/task_manager';
import { scheduleExtractEntityTasks } from '../tasks/extract_entity_task';

export class ResourcesService {
  constructor(private logger: Logger, private taskManagers: TaskManagers) {}

  public async install(entityTypes: EntityType[] = ALL_ENTITY_TYPES) {
    this.logger.info(`Should initialize entity store for types ${JSON.stringify(entityTypes)}`);

    await scheduleExtractEntityTasks({
      taskManager: this.taskManagers.taskManagerStart,
      logger: this.logger,
      entityTypes,
    });
  }
}
