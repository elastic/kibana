/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import {
  ElasticsearchClient,
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
import { SLO_SUMMARY_DESTINATION_INDEX_PATTERN } from '../../../common/constants';
import { SLOConfig } from '../../types';
import { StoredSLODefinition } from '../../domain/models';
import { SO_SLO_TYPE } from '../../saved_objects';

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
              this.abortController.abort('HealthTask timed out');
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

    this.wasStarted = true;
    this.logger.info(`[HealthTask] Started with 20m interval`);

    try {
      await taskManager.ensureScheduled({
        id: this.taskId,
        taskType: TYPE,
        scope: ['observability', 'slo'],
        schedule: {
          // interval: '20m',
          interval: '1m',
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

    this.logger.info(`[HealthTask] runTask() started`);

    const [coreStart] = await core.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const soClient = new SavedObjectsClient(coreStart.savedObjects.createInternalRepository());

    try {
      // Use SLOSettings saved object to store health task settings/flags
      if (!this.config.healthEnabled) {
        this.logger.info('[HealthTask] Task is disabled');
        return;
      }

      await this.computeHealth(esClient, soClient);
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(`[HealthTask] request aborted due to timeout: ${err}`);

        return;
      }
      this.logger.error(`[HealthTask] error: ${err}`);
    }
  }

  private async computeHealth(esClient: ElasticsearchClient, soClient: SavedObjectsClient) {
    this.logger.info('[HealthTask] Computing health...');

    const finder = await soClient.createPointInTimeFinder<StoredSLODefinition>({
      type: SO_SLO_TYPE,
      perPage: 100,
      namespaces: ['*'],
    });

    for await (const definitions of finder.find()) {
      console.dir(definitions, { depth: 4 });

      // extract the transform ID from every definitions.attributes using the id and revision
      // get the transform stats for each transform ID
    }

    await finder.close();
  }
}
