/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance, TaskManagerSetupContract, TaskManagerStartContract, TaskRunCreatorFunction } from '@kbn/task-manager-plugin/server';
import type { RunResult } from '@kbn/task-manager-plugin/server/task';
import type { Logger } from '@kbn/logging';
import type { TaskConfig } from './config';
import type { TaskManager } from '../types';

export abstract class EntityStoreTask {
  constructor(
    protected readonly taskManager: TaskManager,
    protected readonly config: TaskConfig,
    protected logger: Logger
  ) {}

  public abstract get name(): string;

  public register(): void {
    (this.taskManager as TaskManagerSetupContract).registerTaskDefinitions({
      [this.name]: {
        title: this.config.title,
        timeout: this.config.timeout,
        createTaskRunner: this.createRunnerFactory(),
      },
    });
  }

  public async schedule(): Promise<void> {
    const taskName = this.name;
    const interval = this.config.interval;

    try {
      await (this.taskManager as TaskManagerStartContract).ensureScheduled({
        id: taskName,
        taskType: taskName,
        schedule: {
          interval,
        },
        params: {},
        state: {},
      });
      this.logger.info(`Task ${taskName} scheduled successfully with interval ${interval}`);
    } catch (e) {
      this.logger.error(`Error scheduling task ${taskName}: ${e}`);
      throw e;
    }
  }

  private createRunnerFactory(): TaskRunCreatorFunction {
    return ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
      this.logger = this.logger.get(taskInstance.id);
      return {
        run: async () => this.run(taskInstance),
        cancel: async () => this.cancel(),
      };
    };
  }

  protected abstract run(taskInstance: ConcreteTaskInstance): Promise<RunResult>;

  protected abstract cancel(): Promise<RunResult | void>;
}
