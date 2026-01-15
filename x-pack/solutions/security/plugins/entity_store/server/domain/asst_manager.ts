/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { EntityType } from './definitions/entity_type';
import { ALL_ENTITY_TYPES } from './definitions/entity_type';
import { scheduleExtractEntityTasks, stopExtractEntityTasks } from '../tasks/extract_entity_task';

export class AssetManager {
  constructor(private logger: Logger, private taskManager: TaskManagerStartContract) {}

  public async install(
    entityTypes: EntityType[] = ALL_ENTITY_TYPES,
    logExtractionFrequency?: string
  ) {
    this.logger.debug(`Should initialize entity store for types ${JSON.stringify(entityTypes)}`);
    await scheduleExtractEntityTasks({
      taskManager: this.taskManager,
      entityTypes,
      assetManager: this,
      logger: this.logger,
      frequency: logExtractionFrequency,
    });
  }

  async stop(entityTypes: EntityType[] = ALL_ENTITY_TYPES): Promise<{ stoppedTasks: string[] }> {
    const stoppedTasks = await stopExtractEntityTasks({
      taskManager: this.taskManager,
      logger: this.logger,
      entityTypes,
    });

    return { stoppedTasks };
  }
}
