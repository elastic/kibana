/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import {
  FakeRawRequest,
  SavedObjectsClient,
  type CoreSetup,
  type Headers,
  type Logger,
  type LoggerFactory,
} from '@kbn/core/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import { ConcreteTaskInstance, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { runBulkDelete } from './run_bulk_delete';

export const TYPE = 'slo:bulk-delete-task';

interface TaskSetupContract {
  taskManager: TaskManagerSetupContract;
  core: CoreSetup;
  logFactory: LoggerFactory;
}

export class BulkDeleteTask {
  private abortController = new AbortController();
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
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              this.logger.debug(`started`);
              const [coreStart] = await core.getStartServices();
              const internalEsClient = coreStart.elasticsearch.client.asInternalUser;
              const internalSoClient = new SavedObjectsClient(
                coreStart.savedObjects.createInternalRepository()
              );

              // @ts-ignore
              const request = getFakeKibanaRequest(params.spaceId, params.authorizationHeader);

              // add zod checks
              if (!taskInstance.params.list || taskInstance.params.list.length === 0) {
                return;
              }

              try {
                const params = { list: taskInstance.params.list as string[] };
                return await runBulkDelete(params, {
                  internalEsClient,
                  internalSoClient,
                  request,
                  logger: this.logger,
                  abortController: this.abortController,
                });
              } catch (err) {
                if (err instanceof errors.RequestAbortedError) {
                  this.logger.warn(`Request aborted due to timeout: ${err}`);

                  return;
                }
                this.logger.debug(`Error: ${err}`);
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

export function getFakeKibanaRequest(spaceId: string, apiKey: string) {
  const requestHeaders: Headers = {};

  if (apiKey) {
    requestHeaders.authorization = `ApiKey ${apiKey}`;
  }

  const path = addSpaceIdToPath('/', spaceId);

  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    path,
  };

  const fakeRequest = kibanaRequestFactory(fakeRawRequest);

  return fakeRequest;
}
