/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from './definitions/constants';
import type { EntityStoreLogger } from '../infra/logging';
import type { TaskManager } from '../types';
import { ExtractEntityTask } from '../tasks/extract_entity_task';

export class ResourcesService {
  logger: EntityStoreLogger;

  constructor(logger: EntityStoreLogger) {
    this.logger = logger;
  }

  public async install(types: EntityType[], taskManager: TaskManager) {
    this.logger.info(`Should initialize entity store for types ${JSON.stringify(types)}`);
    await this.initExtractEntitiesTasks(taskManager, this.logger, types);
  }

  private async initExtractEntitiesTasks(taskManager: TaskManager, logger: EntityStoreLogger, types: EntityType[]) {
    const tasks = types.map(type => new ExtractEntityTask(taskManager, logger, type));
    await Promise.all(tasks.map(async task => {
      task.register();
      await task.schedule();
    }));
  }
}
