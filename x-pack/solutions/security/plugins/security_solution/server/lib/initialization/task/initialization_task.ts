/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, CoreStart } from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { InitializationFlowId } from '../../../../common/api/initialization';
import type { InitializationFlowRegistry } from '../flow_registry';
import type { InitializationFlowDefinition } from '../types';
import {
  InitializationFlowStateClient,
  type FlowState,
} from '../saved_object/initialization_flow_state_client';

export const INITIALIZATION_TASK_TYPE = 'security_solution:initialization';
const TASK_TIMEOUT = '5m';
const DEP_POLL_INTERVAL_MS = 2_000;
const DEP_MAX_WAIT_MS = 4 * 60 * 1_000; // 4 minutes (within the 5m task timeout)

export const getTaskId = (flowId: string, spaceId: string): string =>
  `${INITIALIZATION_TASK_TYPE}:${flowId}:${spaceId}`;

const buildInternalClients = (coreStart: CoreStart, spaceId: string) => {
  const esClient = coreStart.elasticsearch.client.asInternalUser;
  const fakeRequest = kibanaRequestFactory({ headers: {}, path: '/' });
  coreStart.http.basePath.set(fakeRequest, addSpaceIdToPath('/', spaceId));

  const soClient = coreStart.savedObjects.getScopedClient(fakeRequest, {
    excludedExtensions: [SECURITY_EXTENSION_ID],
  });

  return { esClient, soClient };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Waits until all dependencies of a flow have reached `ready` status.
 * Returns an error string if a dependency failed or timed out, otherwise undefined.
 */
const waitForDependencies = async (
  flow: InitializationFlowDefinition,
  stateClient: InitializationFlowStateClient,
  logger: Logger
): Promise<string | undefined> => {
  const deps = flow.dependencies;
  if (!deps || deps.length === 0) {
    return undefined;
  }

  const startTime = Date.now();

  while (Date.now() - startTime < DEP_MAX_WAIT_MS) {
    const pending: InitializationFlowId[] = [];

    for (const depId of deps) {
      const depState: FlowState | undefined = await stateClient.get(depId);

      if (!depState || depState.status === 'not_requested') {
        return `Dependency '${depId}' was never scheduled`;
      }
      if (depState.status === 'error') {
        return `Dependency '${depId}' failed: ${depState.error ?? 'unknown error'}`;
      }
      if (depState.status !== 'ready') {
        pending.push(depId);
      }
    }

    if (pending.length === 0) {
      return undefined;
    }

    logger.debug(`Flow '${flow.id}' waiting for dependencies: ${pending.join(', ')}`);
    await sleep(DEP_POLL_INTERVAL_MS);
  }

  return `Timed out waiting for dependencies after ${DEP_MAX_WAIT_MS / 1000}s`;
};

export const registerInitializationTask = ({
  taskManager,
  logger,
  getStartServices,
  flowRegistry,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  getStartServices: () => Promise<[CoreStart, unknown, unknown]>;
  flowRegistry: InitializationFlowRegistry;
}): void => {
  taskManager.registerTaskDefinitions({
    [INITIALIZATION_TASK_TYPE]: {
      title: 'Security Solution - Initialization Flow Task',
      timeout: TASK_TIMEOUT,
      maxAttempts: 1,
      createTaskRunner: ({ taskInstance }) => ({
        run: async () => {
          const { flowId, spaceId } = taskInstance.state as {
            flowId: InitializationFlowId;
            spaceId: string;
          };

          const flow = flowRegistry.getFlow(flowId);
          if (!flow) {
            logger.error(
              `Initialization task for flow '${flowId}' in space '${spaceId}': flow not registered`
            );
            return { state: { flowId, spaceId } };
          }

          const [coreStart] = await getStartServices();
          const { esClient, soClient } = buildInternalClients(coreStart, spaceId);
          const stateClient = new InitializationFlowStateClient(soClient, spaceId);

          try {
            const depError = await waitForDependencies(flow, stateClient, logger);
            if (depError) {
              logger.error(
                `Initialization flow '${flowId}' in space '${spaceId}' aborted: ${depError}`
              );
              await stateClient.setError(flowId, depError);
              return { state: { flowId, spaceId } };
            }

            await stateClient.setRunning(flowId);

            const result = await flow.provision({
              esClient,
              soClient,
              spaceId,
              logger,
            });

            if (result.status === 'ready') {
              await stateClient.setReady(flowId);
            } else {
              await stateClient.setError(flowId, result.error ?? 'Unknown error');
            }

            logger.info(
              `Initialization flow '${flowId}' in space '${spaceId}' completed with status '${result.status}'`
            );
          } catch (err) {
            logger.error(
              `Initialization flow '${flowId}' in space '${spaceId}' failed: ${err.message}`
            );
            try {
              await stateClient.setError(flowId, err.message);
            } catch (soErr) {
              logger.error(
                `Failed to persist error state for flow '${flowId}' in space '${spaceId}': ${soErr.message}`
              );
            }
          }

          return { state: { flowId, spaceId } };
        },
      }),
    },
  });
};

export const scheduleInitializationTask = async ({
  taskManager,
  flowId,
  spaceId,
  logger,
}: {
  taskManager: TaskManagerStartContract;
  flowId: InitializationFlowId;
  spaceId: string;
  logger: Logger;
}): Promise<void> => {
  const taskId = getTaskId(flowId, spaceId);

  await taskManager.ensureScheduled({
    id: taskId,
    taskType: INITIALIZATION_TASK_TYPE,
    scope: ['securitySolution'],
    params: {},
    state: { flowId, spaceId },
  });

  try {
    await taskManager.runSoon(taskId);
  } catch (err) {
    logger.debug(
      `runSoon for initialization task '${taskId}' could not trigger immediate run: ${err.message}`
    );
  }
};
