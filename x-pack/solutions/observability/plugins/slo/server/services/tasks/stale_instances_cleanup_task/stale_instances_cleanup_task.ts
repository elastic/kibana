/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClient,
  type CoreSetup,
  type Logger,
  type LoggerFactory,
} from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { SLOConfig, SLOPluginStartDependencies } from '../../../types';
import { cleanupStaleInstances } from './cleanup_stale_instances';
import type { TaskState } from './types';

export const TYPE = 'slo:stale-instances-cleanup-task';

interface TaskSetupContract {
  taskManager: TaskManagerSetupContract;
  core: CoreSetup;
  logFactory: LoggerFactory;
  config: SLOConfig;
}

export class StaleInstancesCleanupTask {
  private logger: Logger;
  private config: SLOConfig;
  private wasStarted: boolean = false;

  constructor(setupContract: TaskSetupContract) {
    const { core, config, taskManager, logFactory } = setupContract;
    this.logger = logFactory.get(this.taskId);
    this.config = config;

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: 'Stale SLO instances cleanup task',
        description: 'Removes SLO summary documents not updated within configured threshold',
        timeout: '5m',
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

    if (!this.config.staleInstancesCleanupTaskEnabled) {
      this.logger.debug('Unscheduling task');
      return await plugins.taskManager.removeIfExists(this.taskId);
    }

    this.logger.debug('Scheduling task with [4h] interval');
    this.wasStarted = true;

    try {
      await plugins.taskManager.ensureScheduled({
        id: this.taskId,
        taskType: TYPE,
        scope: ['observability', 'slo'],
        schedule: {
          interval: '4h',
        },
        state: {},
        params: {},
      });
    } catch (e) {
      this.logger.debug(`Error scheduling task, error: ${e}`);
    }
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

    const [coreStart] = await core.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const internalSoClient = new SavedObjectsClient(
      coreStart.savedObjects.createInternalRepository()
    );

    this.logger.debug(`Task started with previous state: ${JSON.stringify(taskInstance.state)}`);

    const previousState = this.parseTaskInstanceState(taskInstance);

    const result = await cleanupStaleInstances(previousState, {
      esClient,
      soClient: internalSoClient,
      logger: this.logger,
      abortController,
    });

    return { state: result.nextState };
  }

  private parseTaskInstanceState(taskInstance: ConcreteTaskInstance): TaskState {
    const state = taskInstance.state || {};

    return {
      searchAfter: state.searchAfter,
      deleteTaskId: state.deleteTaskId,
    };
  }
}
