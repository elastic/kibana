/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { type CoreSetup, type Logger, type LoggerFactory } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { SLOConfig, SLOPluginStartDependencies } from '../../../types';
import { CleanUpTempSummary } from './clean_up_temp_summary';

export const TYPE = 'slo:temp-summary-cleanup-task';
export const VERSION = '1.0.0';

interface TaskSetupContract {
  taskManager: TaskManagerSetupContract;
  core: CoreSetup;
  logFactory: LoggerFactory;
  config: SLOConfig;
}

export class TempSummaryCleanupTask {
  private logger: Logger;
  private config: SLOConfig;
  private wasStarted: boolean = false;

  constructor(setupContract: TaskSetupContract) {
    const { core, config, taskManager, logFactory } = setupContract;
    this.logger = logFactory.get(this.taskId);
    this.config = config;

    this.logger.debug('Registering task with [2m] timeout');

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: 'SLO temp summary cleanup task',
        timeout: '2m',
        maxAttempts: 1,
        createTaskRunner: ({
          taskInstance,
          abortController,
        }: {
          taskInstance: ConcreteTaskInstance;
          abortController: AbortController;
        }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core, abortController);
            },
          };
        },
      },
    });
  }

  public async start(plugins: SLOPluginStartDependencies) {
    const hasCorrectLicense = (await plugins.licensing.getLicense()).hasAtLeast('platinum');
    if (!hasCorrectLicense) {
      this.logger.debug('Platinum license is required');
      return;
    }

    if (!plugins.taskManager) {
      this.logger.debug('Missing required service during start');
      return;
    }

    if (!this.config.tempSummaryCleanupTaskEnabled) {
      this.logger.debug('Unscheduling task');
      return await plugins.taskManager.removeIfExists(this.taskId);
    }

    this.logger.debug('Scheduling task with [1h] interval');
    this.wasStarted = true;

    try {
      await plugins.taskManager.ensureScheduled({
        id: this.taskId,
        taskType: TYPE,
        scope: ['observability', 'slo'],
        schedule: {
          interval: '1h',
        },
        state: {},
        params: {},
      });
    } catch (e) {
      this.logger.error(`Error scheduling task, error: ${e}`);
    }
  }

  private get taskId(): string {
    return `${TYPE}:${VERSION}`;
  }

  public async runTask(
    taskInstance: ConcreteTaskInstance,
    core: CoreSetup,
    abortController: AbortController
  ) {
    if (!this.wasStarted) {
      this.logger.debug('runTask Aborted. Task not started yet');
      return;
    }

    if (taskInstance.id !== this.taskId) {
      this.logger.debug(
        `Outdated task version: Got [${taskInstance.id}], current version is [${this.taskId}]`
      );
      return getDeleteTaskRunResult();
    }

    this.logger.debug(`runTask started`);

    const [coreStart] = await core.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;

    try {
      const cleanUpTempSummary = new CleanUpTempSummary(esClient, this.logger, abortController);
      await cleanUpTempSummary.execute();
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(`Request aborted due to timeout: ${err}`);

        return;
      }
      this.logger.debug(`Error: ${err}`);
    }
  }
}
