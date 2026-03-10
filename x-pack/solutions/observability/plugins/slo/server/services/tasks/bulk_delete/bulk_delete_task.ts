/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CoreSetup, type Logger, type LoggerFactory } from '@kbn/core/server';
import type { BulkDeleteParams, BulkDeleteStatusResponse } from '@kbn/slo-schema';
import type { RunContext, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { IndicatorTypes } from '../../../domain/models';
import type { SLOPluginStartDependencies } from '../../../types';
import { DeleteSLO } from '../../delete_slo';
import { DefaultSLODefinitionRepository } from '../../slo_definition_repository';
import { DefaultSummaryTransformGenerator } from '../../summary_transform_generator/summary_transform_generator';
import { DefaultSummaryTransformManager } from '../../summay_transform_manager';
import type { TransformGenerator } from '../../transform_generators';
import { DefaultTransformManager } from '../../transform_manager';
import { runBulkDelete } from './run_bulk_delete';

export const TYPE = 'slo:bulk-delete-task';

interface TaskSetupContract {
  core: CoreSetup<SLOPluginStartDependencies>;
  logFactory: LoggerFactory;
  taskManager: TaskManagerSetupContract;
}

export class BulkDeleteTask {
  private logger: Logger;

  constructor(setupContract: TaskSetupContract) {
    const { core, taskManager, logFactory } = setupContract;
    this.logger = logFactory.get(TYPE);

    this.logger.debug('Registering task with [10m] timeout');

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: 'SLO bulk delete',
        timeout: '10m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance, fakeRequest, abortController }: RunContext) => {
          return {
            run: async () => {
              this.logger.debug(`starting bulk delete operation`);

              if (!fakeRequest) {
                this.logger.debug('fakeRequest is not defined');
                return;
              }

              const state = taskInstance.state as BulkDeleteStatusResponse;
              if (state.isDone) {
                // The task was done in the previous run,
                // we only rescheduled it once for keeping an ephemeral state for the user
                return;
              }

              const [coreStart, pluginStart] = await core.getStartServices();

              // TODO [CPS routing]: this client currently preserves the existing "origin-only" behavior.
              //   Review and choose one of the following options:
              //   A) Still unsure? Leave this comment as-is.
              //   B) Confirmed origin-only is correct? Replace this TODO with a concise explanation of why.
              //   C) Want to use current space’s NPRE (Named Project Routing Expression)? Change 'origin-only' to 'space' and remove this comment.
              //      Note: 'space' requires the request passed to asScoped() to carry a `url: URL` property.
              const scopedClusterClient = coreStart.elasticsearch.client.asScoped(fakeRequest, { projectRouting: 'origin-only' });
              const scopedSoClient = coreStart.savedObjects.getScopedClient(fakeRequest);
              const rulesClient = await pluginStart.alerting.getRulesClientWithRequest(fakeRequest);

              const repository = new DefaultSLODefinitionRepository(scopedSoClient, this.logger);
              const transformManager = new DefaultTransformManager(
                {} as Record<IndicatorTypes, TransformGenerator>,
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

              const deleteSLO = new DeleteSLO(
                repository,
                transformManager,
                summaryTransformManager,
                scopedClusterClient,
                rulesClient,
                abortController
              );

              try {
                const params = taskInstance.params as BulkDeleteParams;

                const results = await runBulkDelete(params, {
                  deleteSLO,
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
          };
        },
      },
    });
  }
}
