/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from './definitions/constants';
import type { EntityStoreLogger } from '../infra/logging';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { entityTasks } from '../tasks/entity_task';

export class ResourcesService {
  logger: EntityStoreLogger;

  constructor(logger: EntityStoreLogger) {
    this.logger = logger;
  }

  install(types: EntityType[], taskManager: TaskManagerSetupContract) {
    this.logger.info(`Should initialize entity store for types ${JSON.stringify(types)}`);
    
    types.forEach(entityType => {
      const task = entityTasks[entityType](this.logger);
      task.register(taskManager);
    });
  }
}
