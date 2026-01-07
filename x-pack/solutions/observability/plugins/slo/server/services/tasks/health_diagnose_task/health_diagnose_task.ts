/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { type CoreSetup, type Logger, type LoggerFactory } from '@kbn/core/server';
import type { RunContext, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { SLOConfig, SLOPluginStartDependencies } from '../../../types';
import { runHealthDiagnose } from './run_health_diagnose';

export const HEALTH_DIAGNOSE_TASK_TYPE = 'slo:health-diagnose-task';
export const HEALTH_DIAGNOSE_TASK_VERSION = '1.0.0';

interface TaskSetupContract {
  core: CoreSetup<SLOPluginStartDependencies>;
  logFactory: LoggerFactory;
  taskManager: TaskManagerSetupContract;
  config: SLOConfig;
}

export interface HealthDiagnoseTaskState {
  isDone: boolean;
  processed?: number;
  problematic?: number;
  error?: string;
}

export interface HealthDiagnoseTaskParams {
  taskId: string;
}

export class HealthDiagnoseTask {
  private logger: Logger;
  private config: SLOConfig;

  constructor(setupContract: TaskSetupContract) {
    const { core, taskManager, logFactory, config } = setupContract;
    this.logger = logFactory.get(HEALTH_DIAGNOSE_TASK_TYPE);
    this.config = config;

    this.logger.debug('Registering health diagnose task with [5m] timeout');

    taskManager.registerTaskDefinitions({
      [HEALTH_DIAGNOSE_TASK_TYPE]: {
        title: 'SLO health diagnose task',
        timeout: '5m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance, fakeRequest, abortController }: RunContext) => {
          return {
            run: async () => {
              if (!this.config.healthDiagnoseTaskEnabled) {
                this.logger.debug('Health diagnose task is disabled');
                return {
                  state: {
                    isDone: true,
                    error: 'Task is disabled',
                  } satisfies HealthDiagnoseTaskState,
                };
              }

              this.logger.debug('Starting health diagnose task');

              if (!fakeRequest) {
                this.logger.debug('fakeRequest is not defined');
                return {
                  state: {
                    isDone: true,
                    error: 'fakeRequest is not defined',
                  } satisfies HealthDiagnoseTaskState,
                };
              }

              const state = taskInstance.state as HealthDiagnoseTaskState;
              if (state.isDone) {
                // Task was done in previous run, keeping ephemeral state for the user
                return;
              }

              const [coreStart] = await core.getStartServices();
              const esClient = coreStart.elasticsearch.client.asInternalUser;
              const scopedClusterClient = coreStart.elasticsearch.client.asScoped(fakeRequest);

              const params = taskInstance.params as HealthDiagnoseTaskParams;

              try {
                const result = await runHealthDiagnose(
                  { taskId: params.taskId },
                  {
                    esClient,
                    scopedClusterClient,
                    logger: this.logger,
                    abortController,
                  }
                );

                this.logger.debug(
                  `Health diagnose task completed: ${result.processed} processed, ${result.problematic} problematic`
                );

                return {
                  runAt: new Date(Date.now() + 60 * 60 * 1000),
                  state: {
                    isDone: true,
                    processed: result.processed,
                    problematic: result.problematic,
                  } satisfies HealthDiagnoseTaskState,
                };
              } catch (err) {
                if (err instanceof errors.RequestAbortedError) {
                  this.logger.warn(`Health diagnose task aborted due to timeout: ${err}`);
                  return {
                    runAt: new Date(Date.now() + 60 * 60 * 1000),
                    state: {
                      isDone: true,
                      error: 'Task aborted due to timeout',
                    } satisfies HealthDiagnoseTaskState,
                  };
                }

                this.logger.error(`Health diagnose task error: ${err}`);
                return {
                  runAt: new Date(Date.now() + 60 * 60 * 1000),
                  state: {
                    isDone: true,
                    error: err.message,
                  } satisfies HealthDiagnoseTaskState,
                };
              }
            },
            cancel: async () => {},
          };
        },
      },
    });
  }
}
