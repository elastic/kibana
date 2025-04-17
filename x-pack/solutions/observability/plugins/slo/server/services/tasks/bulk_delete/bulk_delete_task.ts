/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { FakeRawRequest, type CoreSetup, type Logger, type LoggerFactory } from '@kbn/core/server';
import { BulkDeleteParams, BulkDeleteStatusResponse } from '@kbn/slo-schema';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { IndicatorTypes } from '../../../domain/models';
import { SLOPluginSetupDependencies, SLOPluginStartDependencies } from '../../../types';
import { DeleteSLO } from '../../delete_slo';
import { KibanaSavedObjectsSLORepository } from '../../slo_repository';
import { DefaultSummaryTransformGenerator } from '../../summary_transform_generator/summary_transform_generator';
import { DefaultSummaryTransformManager } from '../../summay_transform_manager';
import { TransformGenerator } from '../../transform_generators';
import { DefaultTransformManager } from '../../transform_manager';
import { runBulkDelete } from './run_bulk_delete';

export const TYPE = 'slo:bulk-delete-task';

interface TaskSetupContract {
  core: CoreSetup;
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
}

export class BulkDeleteTask {
  private abortController = new AbortController();
  private logger: Logger;

  constructor(setupContract: TaskSetupContract) {
    const { core, plugins, logFactory } = setupContract;
    this.logger = logFactory.get(TYPE);

    this.logger.debug('Registering task with [10m] timeout');

    plugins.taskManager.setup.registerTaskDefinitions({
      [TYPE]: {
        title: 'SLO bulk delete',
        timeout: '20m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              this.logger.debug(`starting bulk delete operation`);
              const state = taskInstance.state as BulkDeleteStatusResponse;

              if (state.isDone) {
                // The task was done in the previous run,
                // we only rescheduled it once for keeping an ephemeral state for the user
                return;
              }

              const [coreStart] = await core.getStartServices();
              const fakeRawRequest: FakeRawRequest = {
                headers: { authorization: `ApiKey ${taskInstance?.apiKey}` },
                path: '/',
              };
              const path = addSpaceIdToPath('/', taskInstance?.userScope?.spaceId ?? 'default');

              // Fake request from the API key
              const fakeRequest = kibanaRequestFactory(fakeRawRequest);
              coreStart.http.basePath.set(fakeRequest, path);

              const scopedClusterClient = coreStart.elasticsearch.client.asScoped(fakeRequest);
              const scopedSoClient = coreStart.savedObjects.getScopedClient(fakeRequest);
              const alerting = await plugins.alerting.start();
              const rulesClient = await alerting.getRulesClientWithRequest(fakeRequest);

              const repository = new KibanaSavedObjectsSLORepository(scopedSoClient, this.logger);
              const transformManager = new DefaultTransformManager(
                {} as Record<IndicatorTypes, TransformGenerator>,
                scopedClusterClient,
                this.logger
              );
              const summaryTransformManager = new DefaultSummaryTransformManager(
                new DefaultSummaryTransformGenerator(),
                scopedClusterClient,
                this.logger
              );

              const deleteSLO = new DeleteSLO(
                repository,
                transformManager,
                summaryTransformManager,
                scopedClusterClient,
                rulesClient
              );

              try {
                const params = taskInstance.params as BulkDeleteParams;

                const results = await runBulkDelete(params, {
                  deleteSLO,
                  scopedClusterClient,
                  rulesClient,
                  logger: this.logger,
                });

                return {
                  runAt: new Date(Date.now() + 60 * 60 * 1000),
                  state: {
                    isDone: true,
                    results,
                  } satisfies BulkDeleteStatusResponse,
                };
              } catch (err) {
                this.logger.debug(`Error: ${err}`);
                return {
                  runAt: new Date(Date.now() + 60 * 60 * 1000),
                  state: {
                    isDone: true,
                    error: err.message,
                  } satisfies BulkDeleteStatusResponse,
                };
              }
            },

            cancel: async () => {
              this.abortController.abort('Timed out');
            },
          };
        },
      },
    });
  }
}
