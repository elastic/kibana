/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, LoggerFactory } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { SLOPluginStartDependencies } from '../../../types';
import type { ResourceInstallState } from '../../resource_install_state';

export const TYPE = 'slo:resources-reconcile-task';

interface TaskSetupContract {
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
  resourceInstallState: Pick<ResourceInstallState, 'reconcile'>;
}

/** Periodically reinstalls missing or outdated SLO shared resources. */
export class ResourcesReconcileTask {
  private logger: Logger;
  private resourceInstallState: Pick<ResourceInstallState, 'reconcile'>;
  private wasStarted: boolean = false;

  constructor(setupContract: TaskSetupContract) {
    const { taskManager, logFactory, resourceInstallState } = setupContract;
    this.logger = logFactory.get(this.taskId);
    this.resourceInstallState = resourceInstallState;

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: 'SLO resources reconcile task',
        description: 'Reinstalls missing or outdated SLO shared resources',
        timeout: '5m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance);
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

  public async runTask(taskInstance: ConcreteTaskInstance) {
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

    try {
      if (!(await this.resourceInstallState.reconcile())) {
        this.logger.debug('SLO resources are being installed by another process');
      }
    } catch (err) {
      this.logger.warn(`Failed to reconcile SLO resources: ${err.message}`);
    }

    return { state: {} };
  }
}
