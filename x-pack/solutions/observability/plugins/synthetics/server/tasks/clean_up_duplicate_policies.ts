/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { syntheticsMonitorSOTypes } from '../../common/types/saved_objects';
import type { EncryptedSyntheticsMonitorAttributes } from '../../common/runtime_types';
import { SyntheticsPrivateLocation } from '../synthetics_service/private_location/synthetics_private_location';
import { getFilterForTestNowRun } from '../synthetics_service/private_location/clean_up_task';
import {
  DEFAULT_MAX_CLEANUP_RETRIES,
  LEFTOVER_CLEANUP_SCAN_VERSION,
  type SyncTaskState,
} from './sync_private_locations_monitors_task';
import type { SyntheticsServerSetup } from '../types';

/** Fleet SO bulk-delete allows 10k; keep well under that and getByIDs payload size. */
export const DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE = 500;

export async function cleanUpDuplicatedPackagePolicies(
  serverSetup: SyntheticsServerSetup,
  soClient: SavedObjectsClientContract,
  taskState: SyncTaskState
) {
  let performCleanupSync = false;
  const { fleet } = serverSetup.pluginsStart;
  const { logger } = serverSetup;

  const debugLog = (msg: string) => {
    logger.debug(`[PrivateLocationCleanUpTask] ${msg}`);
  };

  if ((taskState.cleanupScanVersion ?? 0) < LEFTOVER_CLEANUP_SCAN_VERSION) {
    if (taskState.hasAlreadyDoneCleanup) {
      taskState.hasAlreadyDoneCleanup = false;
      taskState.maxCleanUpRetries = DEFAULT_MAX_CLEANUP_RETRIES;
    }
    taskState.cleanupScanVersion = LEFTOVER_CLEANUP_SCAN_VERSION;
  }

  if (taskState.hasAlreadyDoneCleanup) {
    debugLog('Skipping cleanup of duplicated package policies as it has already been done once');
    return { performCleanupSync };
  }

  // Same budget for leftover deletes and recreate. Clearing it on every
  // extras pass would retry a failing delete forever.
  if (taskState.maxCleanUpRetries <= 0) {
    // `warn`, not `debug`: this is cleanup giving up, and the caller still gets a
    // success response. Leave the spent budget on the state so the exhaustion is
    // visible — `resetSyncPrivateCleanUpState` restores it when cleanup is
    // explicitly requested again.
    logger.warn(
      `[PrivateLocationCleanUpTask] Skipping cleanup of duplicated package policies as max retries have been reached. ` +
        `Request cleanup again to retry.`
    );
    taskState.hasAlreadyDoneCleanup = true;
    return { performCleanupSync };
  }
  debugLog('Starting cleanup of duplicated package policies');

  try {
    const esClient = serverSetup.coreStart?.elasticsearch?.client.asInternalUser;

    const finder = soClient.createPointInTimeFinder<EncryptedSyntheticsMonitorAttributes>({
      type: syntheticsMonitorSOTypes,
      fields: ['id', 'name', 'locations', 'origin'],
      namespaces: ['*'],
    });

    const privateLocationAPI = new SyntheticsPrivateLocation(serverSetup);

    const expectedPackagePolicies = new Set<string>();
    for await (const result of finder.find()) {
      result.saved_objects.forEach((monitor) => {
        monitor.attributes.locations?.forEach((location) => {
          if (!location.isServiceManaged) {
            const policyId = privateLocationAPI.getPolicyId(
              {
                origin: monitor.attributes.origin,
                id: monitor.attributes.id,
              },
              location.id
            );
            expectedPackagePolicies.add(policyId);
          }
        });
      });
    }

    finder.close().catch(() => {});

    const packagePoliciesKuery = getFilterForTestNowRun(true);

    const policiesIterator = await fleet.packagePolicyService.fetchAllItemIds(soClient, {
      kuery: packagePoliciesKuery,
      spaceIds: ['*'],
      perPage: DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE,
    });
    const packagePoliciesToDelete: string[] = [];

    for await (const packagePoliciesIds of policiesIterator) {
      for (const packagePolicyId of packagePoliciesIds) {
        if (!expectedPackagePolicies.has(packagePolicyId)) {
          packagePoliciesToDelete.push(packagePolicyId);
        }
        // remove it from the set to mark it as found
        expectedPackagePolicies.delete(packagePolicyId);
      }
    }

    const wasLatched = taskState.hasAlreadyDoneCleanup;
    const hasExtras = packagePoliciesToDelete.length > 0;
    const hasMissing = expectedPackagePolicies.size > 0;

    debugLog(`Found ${packagePoliciesToDelete.length} duplicate package policies to delete.`);
    if (hasExtras) {
      debugLog(`Policies to delete: [${packagePoliciesToDelete.join(', ')}]`);
    }
    debugLog(
      `Found ${expectedPackagePolicies.size} expected package policies that were not found.`
    );
    if (hasMissing) {
      debugLog(`Missing expected policies: [${[...expectedPackagePolicies].join(', ')}]`);
    }

    if (hasExtras) {
      const deletedCount = await deleteDuplicatePackagePolicies(
        packagePoliciesToDelete,
        soClient,
        esClient,
        serverSetup
      );
      if (deletedCount > 0) {
        taskState.hasAlreadyDoneCleanup = false;
        taskState.maxCleanUpRetries = DEFAULT_MAX_CLEANUP_RETRIES;
        performCleanupSync = true;
      } else {
        taskState.maxCleanUpRetries -= 1;
        if (taskState.maxCleanUpRetries <= 0) {
          logger.warn(
            `[PrivateLocationCleanUpTask] Skipping cleanup of duplicated package policies as max retries have been reached. ` +
              `Request cleanup again to retry.`
          );
          taskState.hasAlreadyDoneCleanup = true;
        }
      }
    }

    if (hasMissing) {
      // Latch means we already gave up on recreate. Do not reopen that loop
      // when the only problem is still-missing expected policies.
      if (wasLatched && !hasExtras) {
        return { performCleanupSync };
      }
      performCleanupSync = true;
      if (!hasExtras) {
        taskState.maxCleanUpRetries -= 1;
      }
    } else if (!hasExtras) {
      taskState.hasAlreadyDoneCleanup = true;
      taskState.maxCleanUpRetries = DEFAULT_MAX_CLEANUP_RETRIES;
    }
    return { performCleanupSync };
  } catch (e) {
    taskState.maxCleanUpRetries -= 1;
    if (taskState.maxCleanUpRetries <= 0) {
      logger.warn(
        `[PrivateLocationCleanUpTask] Skipping cleanup of duplicated package policies as max retries have been reached. ` +
          `Request cleanup again to retry.`
      );
      taskState.hasAlreadyDoneCleanup = true;
    }
    logger.error(
      '[SyncPrivateLocationMonitorsTask] Error cleaning up duplicated package policies',
      { error: e }
    );
    return { performCleanupSync };
  }
}

export async function deleteDuplicatePackagePolicies(
  packagePoliciesToDelete: string[],
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  serverSetup: SyntheticsServerSetup
): Promise<number> {
  const { logger } = serverSetup;
  const { fleet } = serverSetup.pluginsStart;

  logger.info(
    `[PrivateLocationCleanUpTask] Found ${packagePoliciesToDelete.length} duplicate package policies to delete.`
  );
  const total = packagePoliciesToDelete.length;
  const totalBatches = Math.ceil(total / DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE);
  const agentPolicyIds = new Set<string>();
  let deletedCount = 0;
  for (let i = 0; i < total; i += DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE) {
    const batch = packagePoliciesToDelete.slice(i, i + DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE);
    const batchIndex = Math.floor(i / DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE) + 1;
    logger.info(
      `[PrivateLocationCleanUpTask] Deleting batch ${batchIndex}/${totalBatches} (size=${
        batch.length
      }), with ids [${batch.join(`, `)}]`
    );
    // `bumpRevision: false`: one agent-policy bump after every leftover is
    // gone. Default bump-per-delete would redeploy the full policy once per
    // batch (thousands of units on a Windows private location).
    const results = await fleet.packagePolicyService.delete(soClient, esClient, batch, {
      force: true,
      spaceIds: ['*'],
      ignoreMissing: true,
      bumpRevision: false,
    });
    for (const result of results ?? []) {
      if (!result.success) {
        continue;
      }
      deletedCount += 1;
      for (const policyId of result.policy_ids ?? []) {
        agentPolicyIds.add(policyId);
      }
      if (result.policy_id) {
        agentPolicyIds.add(result.policy_id);
      }
    }
  }

  if (agentPolicyIds.size === 0) {
    return deletedCount;
  }

  logger.info(
    `[PrivateLocationCleanUpTask] Bumping agent policy revision once for [${[
      ...agentPolicyIds,
    ].join(', ')}] after leftover package-policy deletes`
  );
  for (const policyId of agentPolicyIds) {
    await fleet.agentPolicyService.bumpRevision(soClient, esClient, policyId, {
      asyncDeploy: true,
    });
  }
  return deletedCount;
}
