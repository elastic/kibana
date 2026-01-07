/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { RunResult } from '@kbn/task-manager-plugin/server/task';
import type { Logger } from '@kbn/logging';
import type { EntityType } from '../domain/definitions/entity_type';
import { TasksConfig } from './config';
import { EntityStoreTaskType } from './constants';
import { EntityStoreTask } from './entity_store_task';
import type { TaskManager } from '../types';

export class ExtractEntityTask extends EntityStoreTask {

  constructor(taskManager: TaskManager, logger: Logger, private readonly entityType: EntityType) {
    super(taskManager, TasksConfig[EntityStoreTaskType.Values.extractEntity], logger);
    this.entityType = entityType;
    this.name = `${this.config.type}:${this.entityType}`;
  }

  protected async run(taskInstance: ConcreteTaskInstance): Promise<RunResult> {
    this.logger.info(`Executing entity task for entity type ${this.entityType}`);

    // Read the current state from the previous run (or default empty object)
    const currentState = taskInstance.state || {};
    const runs = currentState.runs || 0;

    try {
      // TODO: Implement your entity extraction logic here
      // Example: await this.extractEntities(this.entityType);

      // Update state with execution information
      const updatedState = {
        lastExecutionTimestamp: new Date().toISOString(),
        runs: runs + 1,
        entityType: this.entityType,
      };

      this.logger.info(`Completed successfully. Total runs: ${updatedState.runs}`);

      return {
        state: updatedState,
      };
    } catch (e) {
      this.logger.error(`Error running task, received ${e.message}`);
      return {
        state: {
          ...currentState,
          lastError: e.message,
          lastErrorTimestamp: new Date().toISOString(),
        },
      };
    }
  }

  protected async cancel(): Promise<RunResult | void> {
    // The cancel method is called when the task is cancelled (e.g., due to timeout or manual cancellation)
    // This is a good place to:
    // 1. Set cancellation flags if you have long-running operations
    // 2. Clean up any resources
    // 3. Log the cancellation

    // If you have async operations that support cancellation, you should:
    // - Check for abortController.signal.aborted in your run method
    // - Abort any ongoing operations here
    this.logger.warn(`[task ${this.name}]: cancellation requested`);
  }
}
