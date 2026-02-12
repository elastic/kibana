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
import type { RunContext, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { SLOConfig, SLOPluginStartDependencies } from '../../../types';
import { runHealthScan } from './run_health_scan';

export const HEALTH_SCAN_TASK_TYPE = 'slo:health-scan-task';
export const HEALTH_SCAN_TASK_VERSION = '1.0.0';

interface TaskSetupContract {
  core: CoreSetup<SLOPluginStartDependencies>;
  logFactory: LoggerFactory;
  taskManager: TaskManagerSetupContract;
  config: SLOConfig;
}

export interface HealthScanTaskState {
  isDone: boolean;
  processed?: number;
  problematic?: number;
  error?: string;
}

export interface HealthScanTaskParams {
  scanId: string;
}

export class HealthScanTask {
  private logger: Logger;
  private config: SLOConfig;

  constructor(setupContract: TaskSetupContract) {
    const { core, taskManager, logFactory, config } = setupContract;
    this.logger = logFactory.get(HEALTH_SCAN_TASK_TYPE);
    this.config = config;

    this.logger.debug('Registering health scan task with [5m] timeout');

    taskManager.registerTaskDefinitions({
      [HEALTH_SCAN_TASK_TYPE]: {
        title: 'SLO health scan task',
        timeout: '5m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance, fakeRequest, abortController }: RunContext) => {
          return {
            run: async () => {
              if (!this.config.healthScanTaskEnabled) {
                this.logger.debug('Health scan task is disabled');
                return {
                  state: {
                    isDone: true,
                    error: 'Health scan task is disabled via configuration',
                  } satisfies HealthScanTaskState,
                };
              }

              this.logger.debug('Starting health scan task');

              if (!fakeRequest) {
                this.logger.warn('fakeRequest is not defined');
                return {
                  state: {
                    isDone: true,
                    error: 'fakeRequest is not defined',
                  } satisfies HealthScanTaskState,
                };
              }

              const state = taskInstance.state as HealthScanTaskState;
              if (state.isDone) {
                // Task was done in previous run, keeping ephemeral state for the user
                return;
              }

              const [coreStart] = await core.getStartServices();
              const scopedClusterClient = coreStart.elasticsearch.client.asScoped(fakeRequest);
              const soClient = new SavedObjectsClient(
                coreStart.savedObjects.createInternalRepository()
              );

              const params = taskInstance.params as HealthScanTaskParams;

              try {
                const result = await runHealthScan(
                  { scanId: params.scanId },
                  {
                    scopedClusterClient,
                    soClient,
                    logger: this.logger,
                    abortController,
                  }
                );

                this.logger.debug(
                  `Health scan task completed: ${result.processed} processed, ${result.problematic} problematic`
                );

                return {
                  runAt: new Date(Date.now() + 60 * 60 * 1000),
                  state: {
                    isDone: true,
                    processed: result.processed,
                    problematic: result.problematic,
                  } satisfies HealthScanTaskState,
                };
              } catch (err) {
                if (err instanceof errors.RequestAbortedError) {
                  this.logger.warn(`Health scan task aborted due to timeout: ${err}`);
                  return {
                    runAt: new Date(Date.now() + 60 * 60 * 1000),
                    state: {
                      isDone: true,
                      error: 'Task aborted due to timeout',
                    } satisfies HealthScanTaskState,
                  };
                }

                this.logger.error(`Health scan task error: ${err}`);
                return {
                  runAt: new Date(Date.now() + 60 * 60 * 1000),
                  state: {
                    isDone: true,
                    error: err.message,
                  } satisfies HealthScanTaskState,
                };
              }
            },
          };
        },
      },
    });
  }
}
