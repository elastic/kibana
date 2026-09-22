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
import { schema } from '@kbn/config-schema';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { BROWSER_TEST_NOW_RUN } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { getPrivateLocations } from '../synthetics_service/get_private_locations';
import type { SyntheticsServerSetup } from '../types';
import { getFilterForTestNowRun } from './test_now_run_filter';
import {
  DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE,
  deletePackagePolicies,
  findLeftoverPackagePolicies,
} from './clean_up_duplicate_policies';
import { runTaskPerPrivateLocation } from './sync_private_locations_monitors_task';

export const SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE = 'Synthetics:Clean-Up-Package-Policies';
export const SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID =
  'SyntheticsService:clean-up-package-policies-task-id';
const DAILY_INTERVAL = '24h';
const BROWSER_TEST_NOW_TTL_MINUTES = 15;
const LIGHTWEIGHT_TEST_NOW_TTL_MINUTES = 2;
const MINUTE = 60 * 1000;

const paramsSchema = schema.object({
  packagePolicyIds: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 10_000 })),
});

export const registerCleanUpTask = (
  taskManager: TaskManagerSetupContract,
  serverSetup: SyntheticsServerSetup
) => {
  taskManager.registerTaskDefinitions({
    [SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE]: {
      title: 'Synthetics Plugin Clean Up Task',
      description:
        'Deletes the run-once package policies of a Test Now run, and daily removes leftover private-location synthetics integrations.',
      timeout: '10m',
      maxAttempts: 3,
      paramsSchema,
      createTaskRunner: ({ taskInstance, signal }) => ({
        run: async () => runCleanUpTask(serverSetup, taskInstance, signal),
      }),
    },
  });
};

/**
 * One-shot instances carry the package policies a Test Now run created; the
 * recurring singleton has no params and does the daily sweep. Neither keeps state.
 */
export async function runCleanUpTask(
  server: SyntheticsServerSetup,
  taskInstance: ConcreteTaskInstance,
  signal?: AbortSignal
) {
  const soClient = server.coreStart.savedObjects.createInternalRepository();
  const esClient = server.coreStart.elasticsearch.client.asInternalUser;

  const testNowPolicyIds: string[] = taskInstance.params?.packagePolicyIds ?? [];
  if (testNowPolicyIds.length > 0) {
    // A failure throws so task manager retries it; returning no schedule keeps
    // this instance from becoming recurring.
    await deletePackagePolicies(testNowPolicyIds, soClient, esClient, server, signal);
    return { state: {} };
  }

  try {
    const expiredTestNowIds = await findExpiredTestNowPolicyIds(server, soClient);
    const { leftoverIds, missingLocationIds } = await findLeftoverPackagePolicies(server, soClient);
    await deletePackagePolicies(
      [...expiredTestNowIds, ...leftoverIds],
      soClient,
      esClient,
      server,
      signal
    );
    if (missingLocationIds.length > 0) {
      await recreateAtLocations(server, soClient, missingLocationIds);
    }
  } catch (e) {
    server.logger.error(e);
  }
  // Nothing to carry over: whatever this run did not finish, the next daily scan
  // finds again.
  return { state: {}, schedule: { interval: DAILY_INTERVAL } };
}

/**
 * Safety net for Test Now policies whose own one-shot cleanup never ran, such as
 * those created before these runs carried their policy ids.
 */
const findExpiredTestNowPolicyIds = async (
  server: SyntheticsServerSetup,
  soClient: ReturnType<
    SyntheticsServerSetup['coreStart']['savedObjects']['createInternalRepository']
  >
) => {
  const cutoff = new Date(Date.now() - BROWSER_TEST_NOW_TTL_MINUTES * MINUTE).toISOString();
  const pages = await server.pluginsStart.fleet.packagePolicyService.fetchAllItemIds(soClient, {
    kuery: `${getFilterForTestNowRun()} and ingest-package-policies.created_at < "${cutoff}"`,
    spaceIds: ['*'],
    perPage: DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE,
  });
  const ids: string[] = [];
  for await (const page of pages) {
    ids.push(...page);
  }
  return ids;
};

const recreateAtLocations = async (
  server: SyntheticsServerSetup,
  soClient: ReturnType<
    SyntheticsServerSetup['coreStart']['savedObjects']['createInternalRepository']
  >,
  missingLocationIds: string[]
) => {
  // A per-location sync rewrites and redeploys every policy on its location, so
  // only touch locations that actually have something missing.
  const missing = new Set(missingLocationIds);
  const privateLocations = await getPrivateLocations(soClient, ALL_SPACES_ID);
  for (const { id } of privateLocations) {
    if (missing.has(id)) {
      await runTaskPerPrivateLocation({ server, privateLocationId: id });
    }
  }
};

/** Schedules the removal of the run-once package policies a Test Now run just created. */
export const scheduleTestNowCleanUp = async (
  server: SyntheticsServerSetup,
  createdPolicies: Array<{ id: string; name?: string }>
): Promise<void> => {
  if (createdPolicies.length === 0) {
    return;
  }
  const ttlMinutes = createdPolicies.some(({ name }) => name === BROWSER_TEST_NOW_RUN)
    ? BROWSER_TEST_NOW_TTL_MINUTES
    : LIGHTWEIGHT_TEST_NOW_TTL_MINUTES;
  try {
    await server.pluginsStart.taskManager.schedule({
      taskType: SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE,
      params: { packagePolicyIds: createdPolicies.map(({ id }) => id) },
      state: {},
      runAt: new Date(Date.now() + ttlMinutes * MINUTE),
      scope: ['uptime'],
    });
  } catch (e) {
    server.logger.error(
      `Failed to schedule clean up of Test Now package policies [${createdPolicies
        .map(({ id }) => id)
        .join(', ')}]; the daily clean up removes them instead`,
      { error: e }
    );
  }
};

export async function ensureCleanUpTaskScheduled(server: SyntheticsServerSetup) {
  await server.pluginsStart.taskManager.ensureScheduled({
    id: SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID,
    taskType: SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE,
    schedule: { interval: DAILY_INTERVAL },
    params: {},
    state: {},
    scope: ['uptime'],
  });
}

/** Runs the daily clean up now, for the private location cleanup API. */
export async function runCleanUpTaskNow(server: SyntheticsServerSetup) {
  await ensureCleanUpTaskScheduled(server);
  const result = await server.pluginsStart.taskManager.runSoon(SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID);
  // A conflict resolves rather than throws, and reporting success on one would
  // leave the caller waiting on a run that was never rescheduled.
  if (result?.conflict) {
    throw new Error(
      `Task ${SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID} could not be scheduled to run now due to a conflict.`
    );
  }
}
