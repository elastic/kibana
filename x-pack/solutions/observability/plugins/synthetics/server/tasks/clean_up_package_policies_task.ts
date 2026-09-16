/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import moment from 'moment';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { BROWSER_TEST_NOW_RUN } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import type { SyntheticsServerSetup } from '../types';
import { getFilterForTestNowRun } from './test_now_run_filter';
import {
  bumpAgentPolicyRevisions,
  cleanUpDuplicatedPackagePolicies,
} from './clean_up_duplicate_policies';
import {
  DEFAULT_MAX_CLEANUP_RETRIES,
  LEFTOVER_CLEANUP_SCAN_VERSION,
  runTaskPerPrivateLocation,
  type LeftoverCleanupTaskState,
} from './sync_private_locations_monitors_task';
import { getPrivateLocations } from '../synthetics_service/get_private_locations';

export const SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE = 'Synthetics:Clean-Up-Package-Policies';
export const SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID =
  'SyntheticsService:clean-up-package-policies-task-id';
const SYNTHETICS_SERVICE_CLEAN_UP_INTERVAL_DEFAULT = '60m';
const DELETE_BROWSER_MINUTES = 15;
const DELETE_LIGHTWEIGHT_MINUTES = 2;

export { getFilterForTestNowRun };

export interface CleanUpPackagePoliciesTaskState {
  failedAgentPolicyBumps?: string[];
}

const getFailedAgentPolicyBumps = (state: ConcreteTaskInstance['state']): string[] => {
  const value = state.failedAgentPolicyBumps;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((id): id is string => typeof id === 'string' && id.length > 0);
};

export const registerCleanUpTask = (
  taskManager: TaskManagerSetupContract,
  serverSetup: SyntheticsServerSetup
) => {
  const { logger } = serverSetup;

  taskManager.registerTaskDefinitions({
    [SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE]: {
      title: 'Synthetics Plugin Clean Up Task',
      description:
        'Cleans up Test Now run-once package policies and leftover private-location synthetics integrations.',
      timeout: '10m',
      maxAttempts: 3,

      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
        return {
          async run() {
            logger.debug(
              `Executing synthetics clean up task: ${SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID}`
            );
            return runCleanUpPackagePoliciesTask(serverSetup, taskInstance);
          },
        };
      },
    },
  });
};

export async function runCleanUpPackagePoliciesTask(
  serverSetup: SyntheticsServerSetup,
  taskInstance: ConcreteTaskInstance
) {
  const { logger } = serverSetup;
  const { state } = taskInstance;
  const interval = SYNTHETICS_SERVICE_CLEAN_UP_INTERVAL_DEFAULT;

  try {
    const esClient = serverSetup.coreStart?.elasticsearch?.client.asInternalUser;
    if (!esClient) {
      return { state, schedule: { interval } };
    }

    const { fleet } = serverSetup.pluginsStart;
    const soClient = serverSetup.coreStart.savedObjects.createInternalRepository();

    const remainingTestNow = await deleteExpiredTestNowPolicies({
      soClient,
      fleet,
      esClient,
    });

    let failedAgentPolicyBumps = getFailedAgentPolicyBumps(state);
    try {
      failedAgentPolicyBumps = await cleanUpLeftoverPrivateLocationPolicies(
        serverSetup,
        soClient,
        esClient,
        failedAgentPolicyBumps
      );
    } catch (e) {
      logger.error(e);
    }

    const nextState = { ...state, failedAgentPolicyBumps };
    if (remainingTestNow === 0 && failedAgentPolicyBumps.length === 0) {
      return { state: nextState, schedule: { interval: '24h' } };
    }
    return { state: nextState, schedule: { interval: '20m' } };
  } catch (e) {
    logger.error(e);
  }

  return { state, schedule: { interval } };
}

async function deleteExpiredTestNowPolicies({
  soClient,
  fleet,
  esClient,
}: {
  soClient: SavedObjectsClientContract;
  fleet: SyntheticsServerSetup['pluginsStart']['fleet'];
  esClient: ElasticsearchClient;
}): Promise<number> {
  const { items } = await fleet.packagePolicyService.list(soClient, {
    kuery: getFilterForTestNowRun(),
    fields: ['name', 'created_at'],
  });

  const allItems = items.map((item) => {
    const minutesAgo = moment().diff(moment(item.created_at), 'minutes');
    const isBrowser = item.name === BROWSER_TEST_NOW_RUN;
    return {
      id: item.id,
      shouldDelete: isBrowser
        ? minutesAgo > DELETE_BROWSER_MINUTES
        : minutesAgo > DELETE_LIGHTWEIGHT_MINUTES,
    };
  });
  const toDelete = allItems.filter((item) => item.shouldDelete);
  if (toDelete.length > 0) {
    await fleet.packagePolicyService.delete(
      soClient,
      esClient,
      toDelete.map((item) => item.id),
      {
        force: true,
      }
    );
  }
  return allItems.filter((item) => !item.shouldDelete).length;
}

async function cleanUpLeftoverPrivateLocationPolicies(
  serverSetup: SyntheticsServerSetup,
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  previousFailedBumps: string[]
): Promise<string[]> {
  let failedAgentPolicyIds: string[] = [];
  let attemptedAgentPolicyIds: string[] = [];

  try {
    // Fresh leftover-scan latch each run: leftovers are not created on the
    // happy path, so a daily scan is enough and a persisted latch would hide them.
    const leftoverState: LeftoverCleanupTaskState = {
      hasAlreadyDoneCleanup: false,
      maxCleanUpRetries: DEFAULT_MAX_CLEANUP_RETRIES,
      cleanupScanVersion: LEFTOVER_CLEANUP_SCAN_VERSION,
    };
    const leftover = await cleanUpDuplicatedPackagePolicies(serverSetup, soClient, leftoverState);
    failedAgentPolicyIds = leftover.failedAgentPolicyIds ?? [];
    attemptedAgentPolicyIds = leftover.attemptedAgentPolicyIds ?? [];

    if (leftover.performCleanupSync) {
      const allPrivateLocations = await getPrivateLocations(soClient, ALL_SPACES_ID);
      for (const location of allPrivateLocations) {
        await runTaskPerPrivateLocation({
          server: serverSetup,
          privateLocationId: location.id,
        });
      }
    }
  } catch (e) {
    serverSetup.logger.error(e);
  }

  const attempted = new Set(attemptedAgentPolicyIds);
  const pendingRetry = previousFailedBumps.filter((id) => !attempted.has(id));
  const retriedFailed =
    pendingRetry.length > 0
      ? await bumpAgentPolicyRevisions(pendingRetry, soClient, esClient, serverSetup)
      : [];

  return [...new Set([...failedAgentPolicyIds, ...retriedFailed])];
}

export async function triggerCleanUpPackagePoliciesTask(server: SyntheticsServerSetup) {
  const { logger, pluginsStart } = server;
  const interval = SYNTHETICS_SERVICE_CLEAN_UP_INTERVAL_DEFAULT;

  const taskInstance = await pluginsStart.taskManager.ensureScheduled({
    id: SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID,
    taskType: SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE,
    schedule: {
      interval,
    },
    params: {},
    state: {},
    scope: ['uptime'],
  });

  logger?.debug(
    `Task ${SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID} scheduled with interval ${taskInstance.schedule?.interval}.`
  );

  await pluginsStart.taskManager.runSoon(SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID);
}

export const scheduleCleanUpTask = async (server: SyntheticsServerSetup) => {
  try {
    await triggerCleanUpPackagePoliciesTask(server);
  } catch (e) {
    server.logger?.error(e);
    server.logger?.error(
      `Error running synthetics clean up task: ${SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID}, ${e?.message}`
    );
  }
};
