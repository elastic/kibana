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
import { cleanupOrphanPipelines } from './cleanup_orphan_pipelines';
import { cleanupOrphanSummaries } from './cleanup_orphan_summary';
import { cleanupOrphanTransforms } from './cleanup_orphan_transforms';

export const TYPE = 'SLO:ORPHAN_SUMMARIES-CLEANUP-TASK';

interface TaskSetupContract {
  taskManager: TaskManagerSetupContract;
  core: CoreSetup;
  logFactory: LoggerFactory;
  config: SLOConfig;
}

export class OrphanSummaryCleanupTask {
  private logger: Logger;
  private config: SLOConfig;
  private wasStarted: boolean = false;

  constructor(setupContract: TaskSetupContract) {
    const { core, config, taskManager, logFactory } = setupContract;
    this.logger = logFactory.get(this.taskId);
    this.config = config;

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: 'SLO orphan summary cleanup task',
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

    if (!this.config.sloOrphanSummaryCleanUpTaskEnabled) {
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
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const internalSoClient = new SavedObjectsClient(
      coreStart.savedObjects.createInternalRepository()
    );

    this.logger.debug(`Task started with previous state: ${JSON.stringify(taskInstance.state)}`);

    const { summaryParams, transformParams, pipelineParams } =
      this.parseTaskInstanceState(taskInstance);

    try {
      const summaryResult = await cleanupOrphanSummaries(summaryParams, {
        esClient,
        soClient: internalSoClient,
        logger: this.logger,
        signal,
      });

      if (summaryResult.aborted) {
        this.logger.debug(`Summary cleanup aborted, will resume on next run`);
        return {
          state: {
            summary: summaryResult.nextState,
            transform: transformParams,
            pipeline: pipelineParams,
          },
        };
      }

      this.logger.debug(`Summary cleanup completed, starting transform cleanup`);

      const transformResult = await cleanupOrphanTransforms(transformParams, {
        esClient,
        soClient: internalSoClient,
        logger: this.logger,
        signal,
      });

      if (transformResult.aborted) {
        this.logger.debug(`Transform cleanup aborted, will resume on next run`);
        return {
          state: {
            transform: transformResult.nextState,
            pipeline: pipelineParams,
          },
        };
      }

      this.logger.debug(`Transform cleanup completed, starting pipeline cleanup`);

      const pipelineResult = await cleanupOrphanPipelines(pipelineParams, {
        esClient,
        soClient: internalSoClient,
        logger: this.logger,
        signal,
      });

      if (pipelineResult.aborted) {
        this.logger.debug(`Pipeline cleanup aborted, will resume on next run`);
        return {
          state: {
            pipeline: pipelineResult.nextState,
          },
        };
      }

      this.logger.debug(`Task completed successfully`);
      return { state: {} };
    } catch (err) {
      this.logger.debug(`Error: ${err}`);
    }
  }

  private parseTaskInstanceState(taskInstance: ConcreteTaskInstance) {
    const state = taskInstance.state || {};
    // Accept legacy `{ searchAfter }` state from earlier task versions.
    const legacySearchAfter = state.searchAfter;
    const summary = state.summary ?? (legacySearchAfter ? { searchAfter: legacySearchAfter } : {});
    const transform = state.transform ?? {};
    const pipeline = state.pipeline ?? {};

    return {
      summaryParams: { searchAfter: summary.searchAfter },
      transformParams: { from: transform.from },
      pipelineParams: { after: pipeline.after },
    };
  }
}
