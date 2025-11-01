/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CoreSetup, type Logger, type LoggerFactory } from '@kbn/core/server';
import type { BulkOperationParams, BulkOperationStatusResponse } from '@kbn/slo-schema';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import type { SLOPluginSetupDependencies, SLOPluginStartDependencies } from '../../../types';
import { ResetSLO } from '../../reset_slo';
import { KibanaSavedObjectsSLORepository } from '../../slo_repository';
import { DefaultSummaryTransformGenerator } from '../../summary_transform_generator/summary_transform_generator';
import { DefaultSummaryTransformManager } from '../../summay_transform_manager';
import { createTransformGenerators } from '../../transform_generators';
import { DefaultTransformManager } from '../../transform_manager';
import { runBulkReset } from './run_bulk_reset';
import { TYPE } from '../types/task_types';

interface TaskSetupContract {
  core: CoreSetup<SLOPluginStartDependencies>;
  logFactory: LoggerFactory;
  plugins: {
    [key in keyof SLOPluginSetupDependencies]: {
      setup: Required<SLOPluginSetupDependencies>[key];
    };
  } & {
    [key in keyof SLOPluginStartDependencies]: {
      start: () => Promise<Required<SLOPluginStartDependencies>[key]>;
    };
  };
  isServerless: boolean;
}

export class BulkResetTask {
  private logger: Logger;
  private isServerless: boolean;

  constructor(setupContract: TaskSetupContract) {
    const { core, plugins, logFactory, isServerless } = setupContract;
    this.logger = logFactory.get(TYPE.RESET);
    this.isServerless = isServerless;

    this.logger.debug('Registering task with [10m] timeout');

    plugins.taskManager.setup.registerTaskDefinitions({
      [TYPE.RESET]: {
        title: 'SLO bulk reset',
        timeout: '10m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance, fakeRequest, abortController }: RunContext) => {
          return {
            run: async () => {
              this.logger.debug(`starting bulk reset operation`);

              if (!fakeRequest) {
                this.logger.debug('fakeRequest is not defined');
                return;
              }

              const state = taskInstance.state as BulkOperationStatusResponse;
              if (state.isDone) {
                // The task was done in the previous run,
                // we only rescheduled it once for keeping an ephemeral state for the user
                return;
              }

              const [coreStart, pluginStart] = await core.getStartServices();

              const scopedClusterClient = coreStart.elasticsearch.client.asScoped(fakeRequest);
              const scopedSoClient = coreStart.savedObjects.getScopedClient(fakeRequest);
              const rulesClient = await pluginStart.alerting.getRulesClientWithRequest(fakeRequest);

              const [dataViewsService, { id: spaceId }] = await Promise.all([
                pluginStart.dataViews.dataViewsServiceFactory(
                  scopedSoClient,
                  scopedClusterClient.asCurrentUser
                ),
                pluginStart.spaces?.spacesService.getActiveSpace(fakeRequest) ?? { id: 'default' },
              ]);

              const transformGenerators = createTransformGenerators(
                spaceId,
                dataViewsService,
                this.isServerless
              );

              const repository = new KibanaSavedObjectsSLORepository(scopedSoClient, this.logger);
              const transformManager = new DefaultTransformManager(
                transformGenerators,
                scopedClusterClient,
                this.logger,
                abortController
              );
              const summaryTransformManager = new DefaultSummaryTransformManager(
                new DefaultSummaryTransformGenerator(),
                scopedClusterClient,
                this.logger,
                abortController
              );

              const resetSLO = new ResetSLO(
                scopedClusterClient,
                repository,
                transformManager,
                summaryTransformManager,
                this.logger,
                spaceId,
                core.http.basePath
              );

              try {
                const params = taskInstance.params as BulkOperationParams;

                const results = await runBulkReset(params, {
                  resetSLO,
                  scopedClusterClient,
                  rulesClient,
                  logger: this.logger,
                  abortController,
                });

                return {
                  runAt: new Date(Date.now() + 60 * 60 * 1000),
                  state: {
                    isDone: true,
                    results,
                  } satisfies BulkOperationStatusResponse,
                };
              } catch (err) {
                this.logger.debug(`Error: ${err}`);
                return {
                  runAt: new Date(Date.now() + 60 * 60 * 1000),
                  state: {
                    isDone: true,
                    error: err.message,
                  } satisfies BulkOperationStatusResponse,
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
