/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, LoggerFactory } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { SLOConfig, SLOPluginStartDependencies } from '../../../types';
import { runSliRetention } from './run_sli_retention';

export const TYPE = 'slo:sli-retention-task';

interface TaskSetupContract {
  taskManager: TaskManagerSetupContract;
  core: CoreSetup;
  logFactory: LoggerFactory;
  config: SLOConfig;
}

/** Daily task deleting SLI indices older than the configured retention period, and empty SLI indices. */
export class SliRetentionTask {
  private logger: Logger;
  private config: SLOConfig;
  private wasStarted: boolean = false;

  constructor(setupContract: TaskSetupContract) {
    const { core, config, taskManager, logFactory } = setupContract;
    this.logger = logFactory.get(this.taskId);
    this.config = config;

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: 'SLO SLI data retention task',
        description: 'Deletes SLI indices older than the retention period and empty SLI indices',
        timeout: '5m',
        maxAttempts: 1,
        createTaskRunner: ({
          taskInstance,
          signal,
        }: {
          taskInstance: ConcreteTaskInstance;
          signal: AbortSignal;
        }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core, signal);
            },
          };
        },
      },
    });
  }

  private get taskId() {
    return `${TYPE}:1.0.0`;
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

    if (!this.config.sliRetentionTaskEnabled) {
      this.logger.debug('Unscheduling task');
      return await plugins.taskManager.removeIfExists(this.taskId);
    }

    this.logger.debug('Scheduling task with [1d] interval');
    this.wasStarted = true;

    try {
      await plugins.taskManager.ensureScheduled({
        id: this.taskId,
        taskType: TYPE,
        scope: ['observability', 'slo'],
        schedule: {
          interval: '1d',
        },
        state: {},
        params: {},
      });
    } catch (e) {
      this.logger.debug(`Error scheduling task, error: ${e}`);
    }
  }

  public async runTask(taskInstance: ConcreteTaskInstance, core: CoreSetup, signal: AbortSignal) {
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

    const [coreStart] = await core.getStartServices();

    await runSliRetention({
      esClient: coreStart.elasticsearch.client.asInternalUser,
      logger: this.logger,
      signal,
      now: new Date(),
      retentionMs: this.config.sliRetentionPeriod.asMilliseconds(),
    });

    return { state: {} };
  }
}
