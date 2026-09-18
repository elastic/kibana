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
  DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE,
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
/** 20m bump retries before falling back to the leftover 24h cadence. */
export const MAX_FAILED_BUMP_FAST_RETRIES = 3;
export const TEST_NOW_LIST_PAGE_SIZE = 1000;
/** Leftovers are not produced on the happy path, so a daily enumeration is enough. */
export const LEFTOVER_SCAN_INTERVAL_HOURS = 24;

export { getFilterForTestNowRun };

export interface CleanUpPackagePoliciesTaskState {
  failedAgentPolicyBumps?: string[];
  failedBumpFastRetries?: number;
  leftoverRecreateRetries?: number;
  lastLeftoverScanAt?: string;
}

/**
 * Keeps the leftover enumeration on its own daily cadence. Test Now cleanup runs
 * every 20m while a run-once policy is alive, and that schedule used to drag a
 * full cross-space monitor and package-policy scan along with it.
 */
const hasScannedLeftoversRecently = (state: ConcreteTaskInstance['state']): boolean => {
  const value = state.lastLeftoverScanAt;
  if (typeof value !== 'string') {
    return false;
  }
  const lastScan = moment(value);
  return (
    lastScan.isValid() && lastScan.isAfter(moment().subtract(LEFTOVER_SCAN_INTERVAL_HOURS, 'hours'))
  );
};

/**
 * Recreate budget survives runs: a rebuild that can never succeed would otherwise
 * queue a sync for every private location on every scan, forever.
 */
const getLeftoverRecreateRetries = (state: ConcreteTaskInstance['state']): number => {
  const value = state.leftoverRecreateRetries;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return DEFAULT_MAX_CLEANUP_RETRIES;
  }
  return Math.min(DEFAULT_MAX_CLEANUP_RETRIES, Math.floor(value));
};

const getFailedAgentPolicyBumps = (state: ConcreteTaskInstance['state']): string[] => {
  const value = state.failedAgentPolicyBumps;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((id): id is string => typeof id === 'string' && id.length > 0);
};

const getFailedBumpFastRetries = (state: ConcreteTaskInstance['state']): number => {
  const value = state.failedBumpFastRetries;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.min(MAX_FAILED_BUMP_FAST_RETRIES, Math.floor(value));
};

const nextCleanupSchedule = (
  remainingTestNow: number,
  failedAgentPolicyBumps: string[],
  failedBumpFastRetries: number,
  leftoverWorkPending: boolean
): '20m' | '24h' => {
  if (remainingTestNow > 0) {
    return '20m';
  }
  if (failedAgentPolicyBumps.length > 0 && failedBumpFastRetries > 0) {
    return '20m';
  }
  // A requested recreate is only confirmed by the next scan; 24h is too long to
  // leave monitors without their package policy.
  if (leftoverWorkPending) {
    return '20m';
  }
  return '24h';
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

    const previousFailedBumps = getFailedAgentPolicyBumps(state);
    let failedAgentPolicyBumps = previousFailedBumps;
    let failedBumpFastRetries = getFailedBumpFastRetries(state);
    let leftoverRecreateRetries = getLeftoverRecreateRetries(state);
    let leftoverWorkPending = false;
    let lastLeftoverScanAt = state.lastLeftoverScanAt;
    const skipLeftoverScan =
      hasScannedLeftoversRecently(state) ||
      (remainingTestNow === 0 && previousFailedBumps.length > 0 && failedBumpFastRetries > 0);

    try {
      if (skipLeftoverScan) {
        failedAgentPolicyBumps = await bumpAgentPolicyRevisions(previousFailedBumps, serverSetup);
        failedBumpFastRetries =
          failedAgentPolicyBumps.length === 0 ? 0 : Math.max(0, failedBumpFastRetries - 1);
      } else {
        const leftover = await cleanUpLeftoverPrivateLocationPolicies(
          serverSetup,
          soClient,
          previousFailedBumps,
          leftoverRecreateRetries
        );
        failedAgentPolicyBumps = leftover.failedAgentPolicyBumps;
        leftoverRecreateRetries = leftover.recreateRetries;
        leftoverWorkPending = leftover.recreateRequested;
        // Only a pass that finished with nothing outstanding starts the clock;
        // anything else has to be re-checked on the next run.
        if (leftover.scanCompleted && !leftover.recreateRequested) {
          lastLeftoverScanAt = new Date().toISOString();
        }
        const previousFailed = new Set(previousFailedBumps);
        if (failedAgentPolicyBumps.length === 0) {
          failedBumpFastRetries = 0;
        } else if (failedAgentPolicyBumps.some((id) => !previousFailed.has(id))) {
          failedBumpFastRetries = MAX_FAILED_BUMP_FAST_RETRIES;
        } else {
          failedBumpFastRetries = 0;
        }
      }
    } catch (e) {
      logger.error(e);
    }

    const nextState = {
      ...state,
      failedAgentPolicyBumps,
      failedBumpFastRetries,
      leftoverRecreateRetries,
      lastLeftoverScanAt,
    };
    return {
      state: nextState,
      schedule: {
        interval: nextCleanupSchedule(
          remainingTestNow,
          failedAgentPolicyBumps,
          failedBumpFastRetries,
          leftoverWorkPending
        ),
      },
    };
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
  // Fleet's default page size is 20, which left every older Test Now policy behind.
  const items: Array<{ id: string; name?: string; created_at?: string }> = [];
  for (let page = 1; ; page++) {
    const { items: pageItems } = await fleet.packagePolicyService.list(soClient, {
      kuery: getFilterForTestNowRun(),
      fields: ['name', 'created_at'],
      page,
      perPage: TEST_NOW_LIST_PAGE_SIZE,
    });
    items.push(...pageItems);
    if (pageItems.length < TEST_NOW_LIST_PAGE_SIZE) {
      break;
    }
  }

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
  // Batched for the same reason leftover deletes are: one request per backlog
  // would exceed the saved-object bulk limit and fail every run.
  const toDelete = allItems.filter((item) => item.shouldDelete).map((item) => item.id);
  for (let i = 0; i < toDelete.length; i += DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE) {
    await fleet.packagePolicyService.delete(
      soClient,
      esClient,
      toDelete.slice(i, i + DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE),
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
  previousFailedBumps: string[],
  recreateRetries: number
): Promise<{
  failedAgentPolicyBumps: string[];
  recreateRetries: number;
  recreateRequested: boolean;
  scanCompleted: boolean;
}> {
  let failedAgentPolicyIds: string[] = [];
  let attemptedAgentPolicyIds: string[] = [];
  let recreateRequested = false;
  let scanCompleted = false;
  let scanFailed = false;
  // Fresh leftover-scan latch each run: leftovers are not created on the happy
  // path, so a daily scan is enough and a persisted latch would hide them. Only
  // the recreate budget carries over.
  const leftoverState: LeftoverCleanupTaskState = {
    hasAlreadyDoneCleanup: false,
    maxCleanUpRetries: recreateRetries,
    cleanupScanVersion: LEFTOVER_CLEANUP_SCAN_VERSION,
  };

  try {
    const leftover = await cleanUpDuplicatedPackagePolicies(serverSetup, soClient, leftoverState);
    failedAgentPolicyIds = leftover.failedAgentPolicyIds ?? [];
    attemptedAgentPolicyIds = leftover.attemptedAgentPolicyIds ?? [];

    recreateRequested = leftover.performCleanupSync;
    scanFailed = leftover.scanFailed;

    if (leftover.performCleanupSync) {
      const allPrivateLocations = await getPrivateLocations(soClient, ALL_SPACES_ID);
      for (const location of allPrivateLocations) {
        await runTaskPerPrivateLocation({
          server: serverSetup,
          privateLocationId: location.id,
        });
      }
    }
    scanCompleted = !scanFailed;
  } catch (e) {
    serverSetup.logger.error(e);
  }

  const attempted = new Set(attemptedAgentPolicyIds);
  const pendingRetry = previousFailedBumps.filter((id) => !attempted.has(id));
  const retriedFailed =
    pendingRetry.length > 0 ? await bumpAgentPolicyRevisions(pendingRetry, serverSetup) : [];

  return {
    failedAgentPolicyBumps: [...new Set([...failedAgentPolicyIds, ...retriedFailed])],
    recreateRetries: leftoverState.maxCleanUpRetries,
    recreateRequested,
    scanCompleted,
  };
}

/**
 * Creates the recurring task without forcing a run, so leftover cleanup exists on
 * clusters that never trigger it through Test Now or the cleanup API.
 */
export async function ensureCleanUpTaskScheduled(server: SyntheticsServerSetup) {
  const { logger, pluginsStart } = server;

  const taskInstance = await pluginsStart.taskManager.ensureScheduled({
    id: SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID,
    taskType: SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE,
    schedule: {
      interval: SYNTHETICS_SERVICE_CLEAN_UP_INTERVAL_DEFAULT,
    },
    params: {},
    state: {},
    scope: ['uptime'],
  });

  logger?.debug(
    `Task ${SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID} scheduled with interval ${taskInstance.schedule?.interval}.`
  );
}

const runCleanUpTaskSoon = async (server: SyntheticsServerSetup) => {
  const { pluginsStart } = server;

  await ensureCleanUpTaskScheduled(server);

  const result = await pluginsStart.taskManager.runSoon(SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID);

  // A conflict resolves rather than throws, and reporting success on one would
  // leave the caller waiting on a run that was never rescheduled.
  if (result?.conflict) {
    throw new Error(
      `Task ${SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID} could not be scheduled to run now due to a conflict.`
    );
  }
};

/**
 * Runs cleanup now on an operator's request, clearing the state that would
 * otherwise make the run skip the leftover scan or refuse to recreate.
 *
 * Only for the explicit cleanup route. Automatic callers must use
 * {@link scheduleCleanUpTask}, or routine traffic would keep resetting the
 * daily scan throttle and the recreate budget.
 */
export async function triggerCleanUpPackagePoliciesTask(server: SyntheticsServerSetup) {
  const { pluginsStart } = server;

  await ensureCleanUpTaskScheduled(server);

  await pluginsStart.taskManager.bulkUpdateState(
    [SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID],
    (state) => ({
      ...state,
      failedBumpFastRetries: 0,
      leftoverRecreateRetries: DEFAULT_MAX_CLEANUP_RETRIES,
      lastLeftoverScanAt: undefined,
    })
  );

  await runCleanUpTaskSoon(server);
}

/** Fire-and-forget path for Test Now cleanup: runs the task, resets no state. */
export const scheduleCleanUpTask = async (server: SyntheticsServerSetup) => {
  try {
    await runCleanUpTaskSoon(server);
  } catch (e) {
    server.logger?.error(e);
    server.logger?.error(
      `Error running synthetics clean up task: ${SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID}, ${e?.message}`
    );
  }
};
