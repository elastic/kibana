/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { type CoreSetup, type Logger, type LoggerFactory } from '@kbn/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import { SLOConfig } from '../../types';
import { CleanUpTempSummary } from '../management/clean_up_temp_summary';

export const TYPE = 'slo:temp-summary-cleanup-task';
export const VERSION = '1.0.0';

interface TaskSetupContract {
  taskManager: TaskManagerSetupContract;
  core: CoreSetup;
  logFactory: LoggerFactory;
  config: SLOConfig;
}

export class TempSummaryCleanupTask {
  private abortController = new AbortController();
  private logger: Logger;
  private config: SLOConfig;
  private wasStarted: boolean = false;

  constructor(setupContract: TaskSetupContract) {
    const { core, config, taskManager, logFactory } = setupContract;
    this.logger = logFactory.get(this.taskId);
    this.config = config;

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: 'SLO temp summary cleanup task',
        timeout: '5m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core);
            },

            cancel: async () => {
              this.abortController.abort('Timed out');
            },
          };
        },
      },
    });
  }

  public async start({ taskManager }: { taskManager: TaskManagerStartContract }) {
    if (!taskManager) {
      this.logger.error('Missing required service during start');
      return;
    }

    if (!this.config.tempSummaryCleanupTaskEnabled) {
      return await taskManager.removeIfExists(this.taskId);
    }

    this.logger.info(`Started with 1h interval`);
    this.wasStarted = true;

    try {
      await taskManager.ensureScheduled({
        id: this.taskId,
        taskType: TYPE,
        scope: ['observability', 'slo'],
        schedule: {
          interval: '1h',
        },
        state: {},
        params: { version: VERSION },
      });
    } catch (e) {
      this.logger.error(`Error scheduling task, error: ${e}`);
    }
  }

  private get taskId(): string {
    return `${TYPE}:${VERSION}`;
  }

  public async runTask(taskInstance: ConcreteTaskInstance, core: CoreSetup) {
    if (!this.wasStarted) {
      this.logger.info('runTask Aborted. Task not started yet');
      return;
    }

    if (taskInstance.id !== this.taskId) {
      this.logger.info(
        `Outdated task version: Got [${taskInstance.id}], current version is [${this.taskId}]`
      );
      return getDeleteTaskRunResult();
    }

    this.logger.debug(`runTask() started`);

    const [coreStart] = await core.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;

    try {
      const cleanUpTempSummary = new CleanUpTempSummary(esClient, this.logger);
      await cleanUpTempSummary.execute();
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(`Request aborted due to timeout: ${err}`);

        return;
      }
      this.logger.error(`Error: ${err}`);
    }
  }
}
