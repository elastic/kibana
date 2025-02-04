/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import {
  SavedObjectsClient,
  type CoreSetup,
  type Logger,
  type LoggerFactory,
} from '@kbn/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import { SLOConfig } from '../../types';
import { ComputeHealth } from '../management/compute_health';

export const TYPE = 'slo:health-task';
export const VERSION = '1.0.0';

interface HealthTaskSetupContract {
  taskManager: TaskManagerSetupContract;
  core: CoreSetup;
  logFactory: LoggerFactory;
  config: SLOConfig;
}

export class HealthTask {
  private abortController = new AbortController();
  private logger: Logger;
  private config: SLOConfig; // replace with Settings SO when ready for production
  private wasStarted: boolean = false;

  constructor(setupContract: HealthTaskSetupContract) {
    const { core, config, taskManager, logFactory } = setupContract;
    this.logger = logFactory.get(this.taskId);
    this.config = config;

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: 'SLOs Health Task',
        timeout: '5m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core);
            },

            cancel: async () => {
              this.abortController.abort('[HealthTask] Timed out');
            },
          };
        },
      },
    });
  }

  public async start({ taskManager }: { taskManager: TaskManagerStartContract }) {
    if (!taskManager) {
      this.logger.error('[HealthTask] Missing required service during start');
      return;
    }

    if (!this.config.healthEnabled) {
      return await taskManager.removeIfExists(this.taskId);
    }

    this.logger.info(`[HealthTask] Started with 20m interval`);
    this.wasStarted = true;

    try {
      await taskManager.ensureScheduled({
        id: this.taskId,
        taskType: TYPE,
        scope: ['observability', 'slo'],
        schedule: {
          interval: '20m',
        },
        state: {},
        params: { version: VERSION },
      });
    } catch (e) {
      this.logger.error(`Error scheduling HealthTask, error: ${e}`);
    }
  }

  private get taskId(): string {
    return `${TYPE}:${VERSION}`;
  }

  public async runTask(taskInstance: ConcreteTaskInstance, core: CoreSetup) {
    if (!this.wasStarted) {
      this.logger.info('[HealthTask] runTask Aborted. Task not started yet');
      return;
    }

    if (taskInstance.id !== this.taskId) {
      this.logger.info(
        `[HealthTask] Outdated task version: Got [${taskInstance.id}], current version is [${this.taskId}]`
      );
      return getDeleteTaskRunResult();
    }

    if (!this.config.healthEnabled) {
      this.logger.debug('[HealthTask] Task is disabled');
      return;
    }

    this.logger.debug(`[HealthTask] runTask() started`);

    const [coreStart] = await core.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const soClient = new SavedObjectsClient(coreStart.savedObjects.createInternalRepository());

    try {
      const computeHealth = new ComputeHealth(esClient, soClient, this.logger);
      await computeHealth.execute();
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(`[HealthTask] request aborted due to timeout: ${err}`);

        return;
      }
      this.logger.error(`[HealthTask] error: ${err}`);
    }
  }
}
