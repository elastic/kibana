/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, LoggerFactory } from '@kbn/core/server';
import type { LockManagerService } from '@kbn/lock-manager';
import { isLockAcquisitionError } from '@kbn/lock-manager';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import { LOCK_ID_RESOURCE_INSTALLER } from '../../../../common/constants';
import type { SLOConfig, SLOPluginStartDependencies } from '../../../types';
import { DefaultResourceInstaller } from '../../resource_installer';
import { migrateSliPipelines } from './migrate_sli_pipelines';
import { parseTaskInstanceState } from './types';
import type { TaskState } from './types';

export const TYPE = 'slo:resources-reconcile-task';

interface TaskSetupContract {
  taskManager: TaskManagerSetupContract;
  core: CoreSetup;
  logFactory: LoggerFactory;
  config: SLOConfig;
  lockManager: Pick<LockManagerService, 'withLock'>;
}

/** Periodically reinstalls the SLO shared resources and migrates per-SLO SLI pipelines to the routing pipelines. */
export class ResourcesReconcileTask {
  private logger: Logger;
  private config: SLOConfig;
  private lockManager: Pick<LockManagerService, 'withLock'>;
  private wasStarted: boolean = false;

  constructor(setupContract: TaskSetupContract) {
    const { core, config, taskManager, logFactory, lockManager } = setupContract;
    this.logger = logFactory.get(this.taskId);
    this.config = config;
    this.lockManager = lockManager;

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: 'SLO resources reconcile task',
        description:
          'Reinstalls missing or outdated SLO shared resources and migrates SLI pipelines to the routing pipelines',
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
      await plugins.taskManager.runSoon(this.taskId);
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
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const previousState = parseTaskInstanceState(taskInstance);
    const installer = new DefaultResourceInstaller(
      esClient,
      this.logger,
      this.config.sliIndexRounding
    );

    try {
      await this.lockManager.withLock(LOCK_ID_RESOURCE_INSTALLER, () => installer.install());
    } catch (err) {
      if (isLockAcquisitionError(err)) {
        this.logger.debug('SLO resources are being installed by another process');
      } else {
        this.logger.warn(`Failed to reconcile SLO resources: ${err.message}`);
      }
    }

    // The migration checks that the routing pipeline of each version is installed before using it,
    // so it does not depend on the install outcome.
    let nextState: TaskState = previousState;
    try {
      nextState = await migrateSliPipelines(previousState, {
        esClient,
        logger: this.logger,
        signal,
        now: new Date(),
      });
    } catch (err) {
      this.logger.warn(`Failed to migrate SLI pipelines: ${err.message}`);
    }

    return { state: nextState };
  }
}
