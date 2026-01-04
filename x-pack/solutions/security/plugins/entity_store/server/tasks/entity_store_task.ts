/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskRunCreatorFunction,
} from '@kbn/task-manager-plugin/server';
import type { EntityStoreLogger } from '../infra/logging';
import type { TaskConfig } from './config';

export abstract class EntityStoreTask {
  protected config: TaskConfig;
  protected logger: EntityStoreLogger;

  constructor(config: TaskConfig, logger: EntityStoreLogger) {
    this.config = config;
    this.logger = logger;
  }
  
  static generate(...params: any): EntityStoreTask {
    throw new Error(`can't generate EntityStoreTask`);
  }
  
  abstract get name(): string;

  register(taskManager: TaskManagerSetupContract): void {
    const taskName = this.name;
    this.logger.info(`Registering task ${taskName}`);
    
    try {
      taskManager.registerTaskDefinitions({
        [taskName]: {
          title: this.config.title,
          timeout: this.config.timeout,
          createTaskRunner: this.createRunnerFactory(),
        },
      });
    } catch (e) {
      this.logger.error(`Error registering task ${taskName}`, e);
      if (
        e instanceof Error &&
        e.message.includes('is already defined') &&
        e.message.includes(taskName)
      ) {
        this.logger.warn(`Task ${taskName} is already registered`);
        throw new Error(`Task ${taskName} is already registered`);
      }
      throw e;
    }
  }

  private createRunnerFactory(): TaskRunCreatorFunction {
    return ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
        return {
            run: async () => {
                return this.run(taskInstance);
            },
            cancel: async () => {
                return this.cancel();
            },
        };
    };
  }

  protected abstract run(taskInstance: ConcreteTaskInstance): Promise<{
    state: Record<string, unknown>;
  }>;

  protected abstract cancel(): Promise<void>;
}

